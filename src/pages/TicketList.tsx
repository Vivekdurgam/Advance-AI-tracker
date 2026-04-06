import { useState } from 'react';
import { useTicketStore } from '@/context/TicketContext';
import { Ticket, TicketStatus } from '@/types/ticket';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Clock, AlertTriangle, MessageSquare, ChevronRight } from 'lucide-react';

const statusColors: Record<TicketStatus, string> = {
  New: 'bg-info/20 text-info',
  Assigned: 'bg-warning/20 text-warning',
  'In Progress': 'bg-primary/20 text-primary',
  'Pending Info': 'bg-muted text-muted-foreground',
  Resolved: 'bg-success/20 text-success',
  Closed: 'bg-muted text-muted-foreground',
};

const allStatuses: TicketStatus[] = ['New', 'Assigned', 'In Progress', 'Pending Info', 'Resolved', 'Closed'];

export const TicketListPage = () => {
  const { tickets, updateTicketStatus, addInternalNote, getEmployeeById } = useTicketStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [note, setNote] = useState('');

  const filtered = tickets.filter(t => {
    const matchSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchSeverity = filterSeverity === 'all' || t.aiAnalysis?.severity === filterSeverity;
    return matchSearch && matchStatus && matchSeverity;
  });

  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    updateTicketStatus(ticketId, status, 'Agent');
    toast.success(`Status updated to ${status}`);
  };

  const handleAddNote = (ticketId: string) => {
    if (!note.trim()) return;
    addInternalNote(ticketId, note);
    setNote('');
    toast.success('Note added');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            {['Critical', 'High', 'Medium', 'Low'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No tickets found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(ticket => {
            const assignee = ticket.assignedTo ? getEmployeeById(ticket.assignedTo) : null;
            return (
              <Card
                key={ticket.id}
                className="p-4 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{ticket.id.slice(0, 8)}</span>
                      {ticket.escalated && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                      {ticket.isAutoResolved && <Badge variant="outline" className="text-xs">Auto</Badge>}
                    </div>
                    <p className="font-medium truncate">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{ticket.submitterName} · {ticket.aiAnalysis?.category}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {ticket.aiAnalysis && (
                      <span className={`status-badge ${statusColors[ticket.status]}`}>{ticket.status}</span>
                    )}
                    {assignee && <span className="text-xs text-muted-foreground">{assignee.name}</span>}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        {selectedTicket && (
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="pr-6">{selectedTicket.subject}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`status-badge ${statusColors[selectedTicket.status]}`}>{selectedTicket.status}</span>
                {selectedTicket.aiAnalysis && (
                  <>
                    <Badge variant="secondary">{selectedTicket.aiAnalysis.category}</Badge>
                    <Badge variant="outline">{selectedTicket.aiAnalysis.severity}</Badge>
                  </>
                )}
              </div>

              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm">{selectedTicket.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  By {selectedTicket.submitterName} ({selectedTicket.submitterEmail})
                </p>
              </div>

              {selectedTicket.aiAnalysis?.summary && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">AI Summary</p>
                  <p className="text-sm">{selectedTicket.aiAnalysis.summary}</p>
                </div>
              )}

              {selectedTicket.isAutoResolved && selectedTicket.aiAnalysis?.autoResponse && (
                <div className="border border-success/20 rounded-lg p-4">
                  <p className="text-xs font-medium text-success mb-1">Auto-Response</p>
                  <p className="text-sm">{selectedTicket.aiAnalysis.autoResponse}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {allStatuses.map(s => (
                    <Button
                      key={s}
                      size="sm"
                      variant={selectedTicket.status === s ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(selectedTicket.id, s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Timeline</p>
                <div className="space-y-2">
                  {selectedTicket.timeline.map(entry => (
                    <div key={entry.id} className="flex gap-3 text-sm">
                      <Clock className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p>{entry.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.actor} · {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTicket.internalNotes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Internal Notes</p>
                  {selectedTicket.internalNotes.map((n, i) => (
                    <div key={i} className="bg-muted rounded-md p-2 mb-1 text-sm flex gap-2">
                      <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {n}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Add internal note..." />
                <Button onClick={() => handleAddNote(selectedTicket.id)} size="sm">Add</Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
