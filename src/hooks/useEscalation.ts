import { useEffect, useRef } from 'react';
import { useTicketStore } from '@/context/TicketContext';
import { supabase } from '@/integrations/supabase/client';

const ESCALATION_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const CHECK_INTERVAL_MS = 60 * 1000; // check every minute

export const useEscalation = () => {
  const { tickets, employees, updateTicket, refreshTickets } = useTicketStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkEscalation = async () => {
      const now = Date.now();

      for (const ticket of tickets) {
        // Only escalate High/Critical tickets that are Assigned but not picked up
        if (
          ticket.escalated ||
          !['Assigned', 'New'].includes(ticket.status) ||
          !ticket.aiAnalysis ||
          !['High', 'Critical'].includes(ticket.aiAnalysis.severity)
        ) continue;

        const createdTime = new Date(ticket.createdAt).getTime();
        const elapsed = now - createdTime;

        if (elapsed >= ESCALATION_THRESHOLD_MS) {
          // Find a new assignee in the same department with lower load
          const availableEmployees = employees.filter(e =>
            e.isActive &&
            e.availability === 'Available' &&
            e.department === ticket.assignedDepartment &&
            e.id !== ticket.assignedTo
          ).sort((a, b) => a.currentTicketLoad - b.currentTicketLoad);

          const newAssignee = availableEmployees[0];

          const escalationEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            action: `⚠️ Escalated: ticket not picked up within 2 hours.${newAssignee ? ` Re-assigned to ${newAssignee.name}` : ' No available assignee found.'}`,
            actor: 'System',
          };

          const newTimeline = [...ticket.timeline, escalationEntry];

          await supabase.from('tickets').update({
            escalated: true,
            assigned_to: newAssignee?.id || ticket.assignedTo,
            timeline: newTimeline.map(t => JSON.stringify(t)),
            updated_at: new Date().toISOString(),
          }).eq('id', ticket.id);

          // Create escalation notification
          await supabase.from('notifications').insert({
            ticket_id: ticket.id,
            recipient_email: ticket.submitterEmail,
            subject: `⚠️ Escalation: ${ticket.subject}`,
            body: `Your ${ticket.aiAnalysis.severity} ticket has been escalated due to no response within 2 hours.${newAssignee ? ` Re-assigned to ${newAssignee.name}.` : ''}`,
          });

          if (newAssignee) {
            await supabase.from('notifications').insert({
              ticket_id: ticket.id,
              recipient_email: newAssignee.email,
              subject: `🔥 Escalated Ticket Assigned: ${ticket.subject}`,
              body: `A ${ticket.aiAnalysis.severity} ticket has been escalated and assigned to you. Please review immediately.`,
            });
          }
        }
      }
    };

    checkEscalation();
    intervalRef.current = setInterval(checkEscalation, CHECK_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tickets, employees, updateTicket, refreshTickets]);
};
