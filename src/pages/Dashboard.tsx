import { useTicketStore } from '@/context/TicketContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Plus, Ticket, Users, BarChart3, Brain, ArrowRight, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export const DashboardPage = () => {
  const { tickets, employees } = useTicketStore();

  const open = tickets.filter(t => !['Resolved', 'Closed'].includes(t.status)).length;
  const autoResolved = tickets.filter(t => t.isAutoResolved).length;
  const critical = tickets.filter(t => t.aiAnalysis?.severity === 'Critical' && !['Resolved', 'Closed'].includes(t.status)).length;
  const activeEmployees = employees.filter(e => e.isActive && e.availability === 'Available').length;

  const recentTickets = tickets.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-Powered Ticket Management</p>
        </div>
        <Link to="/submit">
          <Button><Plus className="w-4 h-4 mr-2" /> New Ticket</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tickets.length}</p>
              <p className="text-xs text-muted-foreground">Total Tickets</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{open}</p>
              <p className="text-xs text-muted-foreground">Open Tickets</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{autoResolved}</p>
              <p className="text-xs text-muted-foreground">Auto-Resolved</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{critical}</p>
              <p className="text-xs text-muted-foreground">Critical Open</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Tickets</h2>
            <Link to="/tickets" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentTickets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm mb-3">No tickets yet</p>
              <Link to="/submit"><Button size="sm"><Plus className="w-3 h-3 mr-1" /> Create your first ticket</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTickets.map(ticket => (
                <div key={ticket.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  {ticket.isAutoResolved ? (
                    <CheckCircle className="w-4 h-4 text-success shrink-0" />
                  ) : ticket.aiAnalysis?.severity === 'Critical' ? (
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  ) : (
                    <Ticket className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">{ticket.aiAnalysis?.category} · {ticket.status}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{ticket.aiAnalysis?.severity}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Team Status</h2>
            <Link to="/directory" className="text-sm text-primary hover:underline flex items-center gap-1">
              Directory <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available</span>
              <span className="text-success font-medium">{activeEmployees}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Busy</span>
              <span className="text-warning font-medium">{employees.filter(e => e.isActive && e.availability === 'Busy').length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">On Leave</span>
              <span className="font-medium">{employees.filter(e => e.isActive && e.availability === 'On Leave').length}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-3">
              <span className="text-muted-foreground">Total Active</span>
              <span className="font-medium">{employees.filter(e => e.isActive).length}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
