import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Ticket, Employee, TicketStatus, TicketTimelineEntry } from '@/types/ticket';
import { toast } from 'sonner';
import * as api from '@/lib/api';

interface Notification {
  id: string;
  ticket_id: string | null;
  recipient_email: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface TicketStore {
  tickets: Ticket[];
  employees: Employee[];
  notifications: Notification[];
  loading: boolean;
  backendWakeup: boolean;
  addTicket: (ticket: Ticket) => Promise<void>;
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
  updateTicketStatus: (id: string, status: TicketStatus, actor: string) => Promise<void>;
  addTimelineEntry: (ticketId: string, entry: TicketTimelineEntry) => Promise<void>;
  addInternalNote: (ticketId: string, note: string) => Promise<void>;
  setFeedback: (ticketId: string, helpful: boolean) => Promise<void>;
  addEmployee: (employee: Employee) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  getEmployeeById: (id: string) => Employee | undefined;
  markNotificationRead: (id: string) => Promise<void>;
  unreadCount: number;
  refreshTickets: () => Promise<void>;
}

const TicketContext = createContext<TicketStore | null>(null);

export const useTicketStore = () => {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTicketStore must be used within TicketProvider');
  return ctx;
};

// Map Django Ticket to React Ticket
function mapTicket(d: any): Ticket {
  return {
    id: String(d.id),
    subject: d.title,
    description: d.description,
    submitterName: 'Internal User',
    submitterEmail: 'user@company.com',
    status: d.status as TicketStatus,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    aiAnalysis: {
        category: d.category,
        summary: d.summary,
        severity: d.severity,
        resolutionPath: d.auto_resolved ? 'Auto-resolve' : 'Assign to department',
        sentiment: d.sentiment,
        suggestedDepartment: d.predicted_department,
        confidenceScore: d.confidence_score,
        estimatedResolutionTime: d.estimated_resolution_time,
        autoResponse: d.auto_resolve_response || ''
    },
    assignedTo: d.assignee ? String(d.assignee) : undefined,
    assignedDepartment: d.predicted_department,
    timeline: (d.history || []).map((h: any) => ({
        id: String(h.id),
        timestamp: h.created_at,
        action: h.action,
        actor: 'System'
    })),
    internalNotes: (d.history || []).filter((h: any) => h.notes).map((h: any) => h.notes),
    feedbackHelpful: d.helpful_flag,
    isAutoResolved: d.auto_resolved,
    escalated: d.history?.some((h: any) => h.action === 'Escalated') || false,
  };
}

function mapEmployee(e: any): Employee {
  return {
    id: String(e.id),
    name: e.name,
    email: e.email,
    department: e.department,
    role: e.role,
    skillTags: e.skill_tags ? e.skill_tags.split(',') : [],
    avgResolutionTime: e.avg_resolution_time,
    currentTicketLoad: e.current_load,
    availability: e.availability_status,
    isActive: true
  };
}

export const TicketProvider = ({ children }: { children: ReactNode }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendWakeup, setBackendWakeup] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [ts, es] = await Promise.all([api.fetchTickets(), api.fetchEmployees()]);

      setTickets((ts || []).map(mapTicket));
      setEmployees((es || []).map(mapEmployee));
      setHasLoadedOnce(true);
      setBackendWakeup(false);
      setLoading(false);
    } catch (err) {
      console.error(err);
      if (!hasLoadedOnce) {
        setBackendWakeup(true);
        setLoading(true);
      } else {
        setLoading(false);
      }
    }
  }, [hasLoadedOnce]);

  useEffect(() => {
    fetchAll();
    
    // Simple polling for real-time ticket updates (Bonus Alternative)
    const interval = setInterval(() => {
        fetchAll();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const refreshTickets = fetchAll;

  const addTicket = useCallback(async (ticket: Ticket) => {
    // Overriding the local ticket creation to use Django endpoint structure
    // But actually SubmitTicket.tsx creates the 'ticket' var and calls addTicket. 
    // We should parse it to Django structure inside SubmitTicket or here.
    // In our backend, we simply POST title and description.
    const res = await api.submitTicket({
        title: ticket.subject,
        description: ticket.description
    });
    
    if (res.id) {
       await fetchAll();
    }
  }, [fetchAll]);

  const updateTicket = useCallback(async (id: string, updates: Partial<Ticket>) => {
    // Only basic mapping
    const djangoUpdates: any = {};
    if (updates.status) djangoUpdates.status = updates.status;
    await api.updateTicket(Number(id), djangoUpdates);
    await fetchAll();
  }, [fetchAll]);

  const updateTicketStatus = useCallback(async (id: string, status: TicketStatus, actor: string) => {
    await api.updateTicket(Number(id), { status });
    await api.addTicketHistory(Number(id), `Status changed to ${status}`, `Updated by ${actor}`);
    toast.success(`Status changed to ${status}`);
    await fetchAll();
  }, [fetchAll]);

  const addTimelineEntry = useCallback(async (ticketId: string, entry: TicketTimelineEntry) => {
    // Handled by updateTicket typically or custom endpoint
    await fetchAll();
  }, [fetchAll]);

  const addInternalNote = useCallback(async (ticketId: string, note: string) => {
    await api.addTicketHistory(Number(ticketId), 'Internal Note', note);
    await fetchAll();
  }, [fetchAll]);

  const setFeedback = useCallback(async (ticketId: string, helpful: boolean) => {
    await api.submitFeedback(Number(ticketId), helpful);
    await fetchAll();
  }, [fetchAll]);

  const addEmployee = useCallback(async (employee: Employee) => {
      // Create employee
  }, []);

  const updateEmployee = useCallback(async (id: string, updates: Partial<Employee>) => {
      // Not implemented full
  }, []);

  const getEmployeeById = useCallback((id: string) => {
    return employees.find(e => e.id === String(id));
  }, [employees]);

  const markNotificationRead = useCallback(async (id: string) => {
      
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <TicketContext.Provider value={{
      tickets, employees, notifications, loading, backendWakeup,
      addTicket, updateTicket, updateTicketStatus,
      addTimelineEntry, addInternalNote, setFeedback,
      addEmployee, updateEmployee, getEmployeeById,
      markNotificationRead, unreadCount, refreshTickets,
    }}>
      {children}
    </TicketContext.Provider>
  );
};
