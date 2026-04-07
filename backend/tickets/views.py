import re

from django.db import transaction
from django.db.models import Avg, Count, F
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError

from .models import Ticket, TicketHistory
from .serializers import TicketCreateInputSerializer, TicketSerializer
from .ai_service import analyze_ticket_text
from .routing import find_best_assignee
from users.models import Employee


AUTO_RESOLVE_PATH = "Auto-resolve"
ASSIGN_PATH = "Assign to department"

CRITICAL_INCIDENT_KEYWORDS = (
    "server down",
    "database down",
    "outage",
    "production down",
    "data corruption",
    "crash",
    "security breach",
    "incident",
)


def _normalize_resolution_path(route_value):
    text = str(route_value or "").strip().lower()
    if not text:
        return ASSIGN_PATH

    compact = re.sub(r"[\s_-]+", "", text)
    if "autoresolve" in compact or ("auto" in text and "resolve" in text):
        return AUTO_RESOLVE_PATH
    return ASSIGN_PATH


def _should_force_auto_resolve(title, description):
    text = f"{title} {description}".strip().lower()
    if not text:
        return False

    if any(keyword in text for keyword in CRITICAL_INCIDENT_KEYWORDS):
        return False

    password_reset = ("password" in text or "passcode" in text) and any(
        phrase in text for phrase in ("reset", "forgot", "forgotten", "change password")
    )
    leave_policy = ("leave" in text and "policy" in text) or ("hr policy" in text)
    general_faq = "faq" in text
    status_update = any(
        phrase in text
        for phrase in ("status update", "status of my ticket", "ticket status", "update on my ticket")
    )
    billing_clarification = any(term in text for term in ("billing", "invoice", "reimbursement", "charge")) and any(
        phrase in text for phrase in ("clarify", "clarification", "question", "explain", "breakdown")
    )

    return any((password_reset, leave_policy, general_faq, status_update, billing_clarification))


def _default_auto_response(title, description):
    text = f"{title} {description}".lower()
    if "password" in text or "passcode" in text:
        return (
            "You can reset your password from the login page using the 'Forgot Password' option. "
            "Use your work email, complete verification, and set a new strong password. "
            "If the reset email is delayed, check spam and then contact IT support."
        )
    if "leave" in text and "policy" in text:
        return (
            "You can find the leave policy on the HR portal under Policies > Leave. "
            "That page includes eligibility, carry-forward, and approval flow. "
            "If you need case-specific clarification, HR can review your request."
        )
    if any(phrase in text for phrase in ("status update", "status of my ticket", "ticket status", "update on my ticket")):
        return (
            "You can check the latest status directly in the Tickets page. "
            "Open your ticket to view timeline updates, notes, and current owner."
        )
    if any(term in text for term in ("billing", "invoice", "reimbursement", "charge")):
        return (
            "For billing clarification, please check the related invoice/reimbursement entry in the finance portal "
            "and compare amount, date, and cost center. If anything is still unclear, Finance can verify the line item."
        )
    return (
        "This appears to be a standard support request and can usually be resolved with self-service guidance. "
        "Please follow the documented steps in the internal help center, and reopen if the issue remains."
    )


def _normalize_ai_response(ai_data, title="", description=""):
    categories = {choice[0] for choice in Ticket.CATEGORY_CHOICES}
    severities = {choice[0] for choice in Ticket.SEVERITY_CHOICES}

    category = ai_data.get("category", "Other")
    if category not in categories:
        category = "Other"

    severity = ai_data.get("severity", "Low")
    if severity not in severities:
        severity = "Low"

    confidence_score = ai_data.get("confidence_score", 0.0)
    try:
        confidence_score = float(confidence_score)
    except (TypeError, ValueError):
        confidence_score = 0.0

    route = _normalize_resolution_path(ai_data.get("recommended_resolution_path"))
    if _should_force_auto_resolve(title, description):
        route = AUTO_RESOLVE_PATH

    auto_resolve_response = ai_data.get("auto_resolve_response")
    if route == AUTO_RESOLVE_PATH:
        if not isinstance(auto_resolve_response, str) or not auto_resolve_response.strip():
            auto_resolve_response = _default_auto_response(title, description)
        else:
            auto_resolve_response = auto_resolve_response.strip()

    return {
        "category": category,
        "summary": str(ai_data.get("summary", ""))[:4000],
        "severity": severity,
        "predicted_department": str(ai_data.get("predicted_department", ""))[:50],
        "sentiment": str(ai_data.get("sentiment", "Neutral"))[:50],
        "confidence_score": confidence_score,
        "estimated_resolution_time": str(ai_data.get("estimated_resolution_time", ""))[:50],
        "recommended_resolution_path": route,
        "auto_resolve_response": auto_resolve_response,
    }


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.select_related("assignee").prefetch_related("history").order_by("-created_at")
    serializer_class = TicketSerializer

    def create(self, request, *args, **kwargs):
        input_serializer = TicketCreateInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        title = input_serializer.validated_data["title"]
        description = input_serializer.validated_data["description"]

        ai_data = _normalize_ai_response(analyze_ticket_text(title, description), title=title, description=description)
        route = ai_data.get("recommended_resolution_path", "")
        is_auto_resolve = route == AUTO_RESOLVE_PATH

        with transaction.atomic():
            ticket = Ticket.objects.create(
                title=title,
                description=description,
                category=ai_data["category"],
                summary=ai_data["summary"],
                severity=ai_data["severity"],
                predicted_department=ai_data["predicted_department"],
                sentiment=ai_data["sentiment"],
                confidence_score=ai_data["confidence_score"],
                estimated_resolution_time=ai_data["estimated_resolution_time"],
                auto_resolved=is_auto_resolve,
                status="Resolved" if is_auto_resolve else "New",
            )

            if is_auto_resolve:
                TicketHistory.objects.create(
                    ticket=ticket,
                    action="Auto-resolved by AI engine",
                    notes=ai_data.get("auto_resolve_response") or "Ticket auto-resolved based on FAQ.",
                )
            else:
                assignee = find_best_assignee(ticket.predicted_department, ticket.category)
                if assignee:
                    ticket.assignee = assignee
                    ticket.status = "Assigned"
                    ticket.save(update_fields=["assignee", "status", "updated_at"])
                    Employee.objects.filter(pk=assignee.pk).update(current_load=F("current_load") + 1)

                TicketHistory.objects.create(
                    ticket=ticket,
                    action="Ticket submitted and analyzed",
                    notes=f"AI assigned category {ticket.category} with severity {ticket.severity}",
                )
                if assignee:
                    TicketHistory.objects.create(
                        ticket=ticket,
                        action="Assigned automatically",
                        notes=f"Routed to {assignee.name} ({assignee.department})",
                    )

        ticket.refresh_from_db()
        serializer = self.get_serializer(ticket)
        response_data = serializer.data
        if ticket.auto_resolved:
            response_data["auto_resolve_response"] = ai_data.get("auto_resolve_response")
        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def analyze(self, request):
        title = request.data.get("subject") or request.data.get("title", "")
        description = request.data.get("description", "")
        ai_data = _normalize_ai_response(analyze_ticket_text(title, description), title=title, description=description)
        return Response({
            "category": ai_data.get("category", "Other"),
            "summary": ai_data.get("summary", ""),
            "severity": ai_data.get("severity", "Low"),
            "resolutionPath": ai_data.get("recommended_resolution_path", ASSIGN_PATH),
            "sentiment": ai_data.get("sentiment", "Neutral"),
            "suggestedDepartment": ai_data.get("predicted_department"),
            "confidenceScore": ai_data.get("confidence_score"),
            "estimatedResolutionTime": ai_data.get("estimated_resolution_time"),
            "autoResponse": ai_data.get("auto_resolve_response"),
        })

    @action(detail=True, methods=["post"])
    def feedback(self, request, pk=None):
        ticket = self.get_object()
        helpful = request.data.get("helpful")
        if isinstance(helpful, str):
            helpful = helpful.strip().lower() in {"1", "true", "yes"}

        if isinstance(helpful, bool):
            ticket.helpful_flag = helpful
            ticket.save(update_fields=["helpful_flag", "updated_at"])
            return Response({"status": "Feedback updated"})
        raise ValidationError({"helpful": "Send true/false."})

    @action(detail=True, methods=["post"])
    def history(self, request, pk=None):
        ticket = self.get_object()
        action_text = request.data.get("action", "")
        notes = request.data.get("notes", "")

        if not isinstance(action_text, str) or not action_text.strip():
            raise ValidationError({"action": "This field is required."})

        TicketHistory.objects.create(
            ticket=ticket,
            action=action_text.strip()[:255],
            notes=str(notes)[:5000] if notes is not None else "",
        )
        return Response({"status": "History entry added"}, status=status.HTTP_201_CREATED)


class AnalyticsViewSet(viewsets.ViewSet):
    def list(self, request):
        total_tickets = Ticket.objects.count()
        resolved_tickets = Ticket.objects.filter(status="Resolved").count()
        auto_resolved = Ticket.objects.filter(auto_resolved=True).count()
        escalated = Ticket.objects.filter(history__action__icontains="Escalated").count()

        categories = list(Ticket.objects.values("category").annotate(count=Count("category")).order_by("-count")[:5])

        users_load = list(Employee.objects.values("department").annotate(load=Count("tickets")).order_by("-load"))
        avg_res_time = list(
            Employee.objects.values("department").annotate(avg_time=Avg("avg_resolution_time")).order_by("-avg_time")
        )

        success_rate = 0
        if auto_resolved > 0:
            helpful_count = Ticket.objects.filter(auto_resolved=True, helpful_flag=True).count()
            success_rate = (helpful_count / auto_resolved) * 100

        return Response({
            "total": total_tickets,
            "resolved": resolved_tickets,
            "auto_resolved": auto_resolved,
            "escalated": escalated,
            "top_categories": categories,
            "department_load": users_load,
            "avg_resolution_by_department": avg_res_time,
            "auto_resolve_success_rate": round(success_rate, 2),
        })
