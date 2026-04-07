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
ALWAYS_ASSIGN_CATEGORIES = {"Server", "DB"}
ALWAYS_ASSIGN_SEVERITIES = {"Critical"}


def _normalize_resolution_path(route_value):
    text = str(route_value or "").strip().lower()
    if not text:
        return ASSIGN_PATH

    compact = re.sub(r"[\s_-]+", "", text)
    if "autoresolve" in compact or ("auto" in text and "resolve" in text):
        return AUTO_RESOLVE_PATH
    return ASSIGN_PATH


def _normalize_ai_response(ai_data):
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
    auto_resolve_response = ai_data.get("auto_resolve_response")
    if isinstance(auto_resolve_response, str):
        auto_resolve_response = auto_resolve_response.strip()
    else:
        auto_resolve_response = None

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


def _needs_human_assignment(ai_data):
    category = ai_data.get("category")
    severity = ai_data.get("severity")

    if category in ALWAYS_ASSIGN_CATEGORIES:
        return True
    if severity in ALWAYS_ASSIGN_SEVERITIES:
        return True
    return False


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.select_related("assignee").prefetch_related("history").order_by("-created_at")
    serializer_class = TicketSerializer

    def create(self, request, *args, **kwargs):
        input_serializer = TicketCreateInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        title = input_serializer.validated_data["title"]
        description = input_serializer.validated_data["description"]

        ai_data = _normalize_ai_response(analyze_ticket_text(title, description))
        route = ai_data.get("recommended_resolution_path", "")
        if _needs_human_assignment(ai_data):
            route = ASSIGN_PATH

        if route == AUTO_RESOLVE_PATH and not ai_data.get("auto_resolve_response"):
            route = ASSIGN_PATH

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
        ai_data = _normalize_ai_response(analyze_ticket_text(title, description))
        route = ai_data.get("recommended_resolution_path", ASSIGN_PATH)
        if _needs_human_assignment(ai_data):
            route = ASSIGN_PATH
        if route == AUTO_RESOLVE_PATH and not ai_data.get("auto_resolve_response"):
            route = ASSIGN_PATH

        return Response({
            "category": ai_data.get("category", "Other"),
            "summary": ai_data.get("summary", ""),
            "severity": ai_data.get("severity", "Low"),
            "resolutionPath": route,
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
