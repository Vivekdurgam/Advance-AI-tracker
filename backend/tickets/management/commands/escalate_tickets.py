from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from tickets.models import Ticket, TicketHistory
from tickets.routing import find_best_assignee

class Command(BaseCommand):
    help = 'Escalate High/Critical tickets not picked up within 2 hours'

    def handle(self, *args, **kwargs):
        two_hours_ago = timezone.now() - timedelta(hours=2)
        # Not picked up means status is 'New'
        tickets = Ticket.objects.filter(
            severity__in=['High', 'Critical'],
            status__in=['New', 'Assigned'],
            created_at__lt=two_hours_ago,
            history__action__icontains="Escalated"
        ).exclude(history__action__icontains="Escalated")
        
        # We need a simpler filter to avoid double escalate right now
        tickets = Ticket.objects.filter(
            severity__in=['High', 'Critical'],
            status__in=['New', 'Assigned'],
            created_at__lt=two_hours_ago
        )
        
        count = 0
        for ticket in tickets:
            if ticket.history.filter(action__icontains="Escalated").exists():
                continue
                
            new_assignee = find_best_assignee(ticket.predicted_department, ticket.category)
            if new_assignee and new_assignee != ticket.assignee:
                old_assignee = ticket.assignee
                ticket.assignee = new_assignee
                ticket.save()
                
                if old_assignee:
                    old_assignee.current_load = max(0, old_assignee.current_load - 1)
                    old_assignee.save()
                new_assignee.current_load += 1
                new_assignee.save()
                
                TicketHistory.objects.create(
                    ticket=ticket,
                    action="Escalated - Automated Re-assignment",
                    notes=f"Re-assigned from {old_assignee.name if old_assignee else 'None'} to {new_assignee.name} due to SLA limit"
                )
                count += 1
                
        self.stdout.write(self.style.SUCCESS(f'Successfully escalated {count} tickets'))
