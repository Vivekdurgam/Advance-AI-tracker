export type TicketCategory = 'Billing' | 'Bug' | 'Access' | 'HR' | 'Server' | 'DB' | 'Feature' | 'Other';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Sentiment = 'Frustrated' | 'Neutral' | 'Polite';
export type TicketStatus = 'New' | 'Assigned' | 'In Progress' | 'Pending Info' | 'Resolved' | 'Closed';
export type Department = 'Engineering' | 'DevOps' | 'Finance' | 'HR' | 'IT' | 'Product' | 'Marketing' | 'Legal';
export type AvailabilityStatus = 'Available' | 'Busy' | 'On Leave';
export type ResolutionPath = 'Auto-resolve' | 'Assign to department';

export interface AIAnalysis {
  category: TicketCategory;
  summary: string;
  severity: Severity;
  resolutionPath: ResolutionPath;
  sentiment: Sentiment;
  suggestedDepartment?: Department;
  suggestedEmployeeId?: string;
  confidenceScore: number;
  estimatedResolutionTime: string;
  autoResponse?: string;
}

export interface TicketTimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details?: string;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  submitterName: string;
  submitterEmail: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  aiAnalysis?: AIAnalysis;
  assignedTo?: string;
  assignedDepartment?: Department;
  timeline: TicketTimelineEntry[];
  internalNotes: string[];
  feedbackHelpful?: boolean | null;
  isAutoResolved: boolean;
  escalated: boolean;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: Department;
  role: string;
  skillTags: string[];
  avgResolutionTime: number; // in hours
  currentTicketLoad: number;
  availability: AvailabilityStatus;
  isActive: boolean;
}
