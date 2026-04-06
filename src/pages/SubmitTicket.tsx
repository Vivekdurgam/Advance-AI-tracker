import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTicketStore } from '@/context/TicketContext';
import { Ticket, AIAnalysis } from '@/types/ticket';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Brain, CheckCircle, ArrowRight, ThumbsUp, ThumbsDown } from 'lucide-react';

const severityColor: Record<string, string> = {
  Critical: 'bg-destructive/20 text-destructive',
  High: 'bg-warning/20 text-warning',
  Medium: 'bg-info/20 text-info',
  Low: 'bg-muted text-muted-foreground',
};

const sentimentColor: Record<string, string> = {
  Frustrated: 'bg-destructive/20 text-destructive',
  Neutral: 'bg-muted text-muted-foreground',
  Polite: 'bg-success/20 text-success',
};

export const SubmitTicketPage = () => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [ticketCreated, setTicketCreated] = useState(false);
  const { addTicket, employees, setFeedback, tickets } = useTicketStore();
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!subject.trim() || !description.trim() || !name.trim() || !email.trim()) {
      toast.error('Please fill all fields');
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const activeEmployees = employees.filter(e => e.isActive);
      const data = await api.analyzeTicket({ subject, description });
      setAnalysis(data as AIAnalysis);
    } catch (e: any) {
      toast.error(e.message || 'AI analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    if (!analysis) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const isAuto = analysis.resolutionPath === 'Auto-resolve';
    const ticket: Ticket = {
      id,
      subject,
      description,
      submitterName: name,
      submitterEmail: email,
      status: isAuto ? 'Resolved' : 'Assigned',
      createdAt: now,
      updatedAt: now,
      aiAnalysis: analysis,
      assignedTo: isAuto ? undefined : analysis.suggestedEmployeeId || undefined,
      assignedDepartment: analysis.suggestedDepartment,
      timeline: [
        { id: crypto.randomUUID(), timestamp: now, action: 'Ticket created', actor: name },
        { id: crypto.randomUUID(), timestamp: now, action: `AI analyzed: ${analysis.category} (${analysis.severity})`, actor: 'AI Engine' },
        ...(isAuto
          ? [{ id: crypto.randomUUID(), timestamp: now, action: 'Auto-resolved by AI', actor: 'AI Engine' }]
          : [{ id: crypto.randomUUID(), timestamp: now, action: `Assigned to ${analysis.suggestedDepartment}`, actor: 'AI Engine' }]),
      ],
      internalNotes: [],
      feedbackHelpful: null,
      isAutoResolved: isAuto,
      escalated: false,
    };
    addTicket(ticket);
    setTicketCreated(true);
    toast.success(isAuto ? 'Ticket auto-resolved!' : 'Ticket created and assigned');
  };

  const createdTicket = ticketCreated ? tickets[0] : null;

  const handleFeedback = (helpful: boolean) => {
    if (createdTicket) {
      setFeedback(createdTicket.id, helpful);
      toast.success('Thanks for your feedback!');
    }
  };

  if (ticketCreated && createdTicket?.isAutoResolved) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Ticket Submitted</h1>
        <Card className="p-6 border-success/30">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-success" />
            <h2 className="text-lg font-semibold">Auto-Resolved</h2>
          </div>
          <div className="bg-muted rounded-lg p-4 mb-4">
            <p className="text-sm leading-relaxed">{analysis?.autoResponse}</p>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <p className="text-sm text-muted-foreground">Was this helpful?</p>
            <Button size="sm" variant={createdTicket.feedbackHelpful === true ? 'default' : 'outline'} onClick={() => handleFeedback(true)}>
              <ThumbsUp className="w-4 h-4 mr-1" /> Yes
            </Button>
            <Button size="sm" variant={createdTicket.feedbackHelpful === false ? 'destructive' : 'outline'} onClick={() => handleFeedback(false)}>
              <ThumbsDown className="w-4 h-4 mr-1" /> No
            </Button>
          </div>
          <Button onClick={() => navigate('/tickets')}>View All Tickets <ArrowRight className="w-4 h-4 ml-1" /></Button>
        </Card>
      </div>
    );
  }

  if (ticketCreated) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Ticket Created</h1>
        <Card className="p-6">
          <p className="mb-4 text-muted-foreground">Your ticket has been assigned to <span className="text-foreground font-medium">{analysis?.suggestedDepartment}</span>.</p>
          <Button onClick={() => navigate('/tickets')}>View All Tickets <ArrowRight className="w-4 h-4 ml-1" /></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Submit New Ticket</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Your Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="john@company.com" type="email" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Subject</label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of the issue" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your issue in detail..." rows={6} />
          </div>
          <Button onClick={handleAnalyze} disabled={analyzing} className="w-full">
            {analyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing with AI...</> : <><Brain className="w-4 h-4 mr-2" /> Analyze & Submit</>}
          </Button>
        </Card>

        {analysis && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" /> AI Analysis
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Category</p>
                <Badge variant="secondary">{analysis.category}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Severity</p>
                <span className={`status-badge ${severityColor[analysis.severity]}`}>{analysis.severity}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Sentiment</p>
                <span className={`status-badge ${sentimentColor[analysis.sentiment]}`}>{analysis.sentiment}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                <span className="text-sm font-mono text-primary">{analysis.confidenceScore}%</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Resolution Path</p>
                <Badge variant={analysis.resolutionPath === 'Auto-resolve' ? 'default' : 'outline'}>
                  {analysis.resolutionPath}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Est. Time</p>
                <span className="text-sm">{analysis.estimatedResolutionTime}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">AI Summary</p>
              <p className="text-sm bg-muted rounded-md p-3">{analysis.summary}</p>
            </div>
            {analysis.suggestedDepartment && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Routing</p>
                <p className="text-sm">
                  <span className="text-primary font-medium">{analysis.suggestedDepartment}</span>
                  {analysis.suggestedEmployeeId && (
                    <> → {employees.find(e => e.id === analysis.suggestedEmployeeId)?.name || 'Unknown'}</>
                  )}
                </p>
              </div>
            )}
            <Button onClick={handleSubmit} className="w-full">
              {analysis.resolutionPath === 'Auto-resolve' ? 'Accept Auto-Resolution' : 'Create & Assign Ticket'}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};
