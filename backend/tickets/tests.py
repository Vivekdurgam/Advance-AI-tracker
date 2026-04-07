from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Ticket, TicketHistory


class AnalyticsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _create_ticket(
        self,
        *,
        title,
        category="Other",
        severity="Low",
        status="New",
        predicted_department="IT",
        auto_resolved=False,
        helpful_flag=None,
        created_at=None,
        updated_at=None,
    ):
        ticket = Ticket.objects.create(
            title=title,
            description=f"{title} description",
            category=category,
            severity=severity,
            status=status,
            predicted_department=predicted_department,
            auto_resolved=auto_resolved,
            helpful_flag=helpful_flag,
        )
        if created_at or updated_at:
            Ticket.objects.filter(pk=ticket.pk).update(
                created_at=created_at or ticket.created_at,
                updated_at=updated_at or ticket.updated_at,
            )
            ticket.refresh_from_db()
        return ticket

    def test_analytics_returns_required_counts_and_weekly_categories(self):
        now = timezone.now()
        week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)

        t1 = self._create_ticket(
            title="Access request 1",
            category="Access",
            status="Assigned",
            predicted_department="IT",
            created_at=week_start + timedelta(hours=2),
            updated_at=week_start + timedelta(hours=3),
        )
        self._create_ticket(
            title="Access request 2",
            category="Access",
            status="New",
            predicted_department="IT",
            created_at=week_start + timedelta(hours=4),
            updated_at=week_start + timedelta(hours=5),
        )
        self._create_ticket(
            title="Bug ticket",
            category="Bug",
            status="Closed",
            predicted_department="Engineering",
            created_at=week_start + timedelta(hours=6),
            updated_at=week_start + timedelta(hours=9),
        )
        self._create_ticket(
            title="Old billing ticket",
            category="Billing",
            status="Resolved",
            predicted_department="Finance",
            auto_resolved=True,
            helpful_flag=True,
            created_at=week_start - timedelta(days=7),
            updated_at=week_start - timedelta(days=6, hours=20),
        )

        TicketHistory.objects.create(ticket=t1, action="Escalated - Automated Re-assignment", notes="SLA breach")

        response = self.client.get("/api/analytics/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["total"], 4)
        self.assertEqual(payload["open"], 2)
        self.assertEqual(payload["resolved"], 2)
        self.assertEqual(payload["auto_resolved"], 1)
        self.assertEqual(payload["escalated"], 1)
        self.assertEqual(payload["auto_resolve_success_rate"], 100.0)

        weekly_categories = {row["category"]: row["count"] for row in payload["top_categories_this_week"]}
        self.assertEqual(weekly_categories.get("Access"), 2)
        self.assertEqual(weekly_categories.get("Bug"), 1)
        self.assertNotIn("Billing", weekly_categories)

    def test_analytics_returns_avg_resolution_time_by_department(self):
        now = timezone.now()
        self._create_ticket(
            title="Eng resolved 1",
            category="Server",
            severity="Critical",
            status="Resolved",
            predicted_department="Engineering",
            created_at=now - timedelta(hours=4),
            updated_at=now,
        )
        self._create_ticket(
            title="Eng resolved 2",
            category="Bug",
            status="Closed",
            predicted_department="Engineering",
            created_at=now - timedelta(hours=2),
            updated_at=now,
        )
        self._create_ticket(
            title="HR resolved",
            category="HR",
            status="Resolved",
            predicted_department="HR",
            created_at=now - timedelta(hours=1),
            updated_at=now,
        )

        response = self.client.get("/api/analytics/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        avg_by_department = {row["department"]: row for row in payload["avg_resolution_by_department"]}
        self.assertIn("Engineering", avg_by_department)
        self.assertIn("HR", avg_by_department)
        self.assertAlmostEqual(avg_by_department["Engineering"]["avg_hours"], 3.0, places=2)
        self.assertEqual(avg_by_department["Engineering"]["resolved_count"], 2)
        self.assertAlmostEqual(avg_by_department["HR"]["avg_hours"], 1.0, places=2)
        self.assertEqual(avg_by_department["HR"]["resolved_count"], 1)
