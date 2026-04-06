import { Employee } from '@/types/ticket';

export const initialEmployees: Employee[] = [
  {
    id: 'emp-1', name: 'Alice Chen', email: 'alice@company.com',
    department: 'Engineering', role: 'Senior Backend Engineer',
    skillTags: ['Database', 'Python', 'API', 'Performance'],
    avgResolutionTime: 4.2, currentTicketLoad: 3, availability: 'Available', isActive: true,
  },
  {
    id: 'emp-2', name: 'Bob Martinez', email: 'bob@company.com',
    department: 'Engineering', role: 'Frontend Engineer',
    skillTags: ['React', 'TypeScript', 'UI', 'Bug Fixing'],
    avgResolutionTime: 3.8, currentTicketLoad: 5, availability: 'Busy', isActive: true,
  },
  {
    id: 'emp-3', name: 'Carol Williams', email: 'carol@company.com',
    department: 'DevOps', role: 'DevOps Lead',
    skillTags: ['Server', 'Networking', 'AWS', 'Docker', 'Monitoring'],
    avgResolutionTime: 2.5, currentTicketLoad: 2, availability: 'Available', isActive: true,
  },
  {
    id: 'emp-4', name: 'David Kim', email: 'david@company.com',
    department: 'Finance', role: 'Finance Manager',
    skillTags: ['Payroll', 'Billing', 'Reimbursement', 'Invoicing'],
    avgResolutionTime: 6.0, currentTicketLoad: 1, availability: 'Available', isActive: true,
  },
  {
    id: 'emp-5', name: 'Eva Johnson', email: 'eva@company.com',
    department: 'HR', role: 'HR Specialist',
    skillTags: ['Onboarding', 'Leave', 'Policy', 'Benefits'],
    avgResolutionTime: 5.5, currentTicketLoad: 4, availability: 'Available', isActive: true,
  },
  {
    id: 'emp-6', name: 'Frank Lee', email: 'frank@company.com',
    department: 'IT', role: 'IT Administrator',
    skillTags: ['Access', 'Networking', 'Account Management', 'Security'],
    avgResolutionTime: 1.5, currentTicketLoad: 6, availability: 'Busy', isActive: true,
  },
  {
    id: 'emp-7', name: 'Grace Park', email: 'grace@company.com',
    department: 'Product', role: 'Product Manager',
    skillTags: ['Feature', 'Roadmap', 'User Research', 'Prioritization'],
    avgResolutionTime: 8.0, currentTicketLoad: 2, availability: 'Available', isActive: true,
  },
  {
    id: 'emp-8', name: 'Henry Thompson', email: 'henry@company.com',
    department: 'Marketing', role: 'Marketing Lead',
    skillTags: ['Branding', 'Content', 'Social Media', 'Campaigns'],
    avgResolutionTime: 7.0, currentTicketLoad: 1, availability: 'Available', isActive: true,
  },
  {
    id: 'emp-9', name: 'Iris Nakamura', email: 'iris@company.com',
    department: 'Legal', role: 'Legal Counsel',
    skillTags: ['Compliance', 'Contracts', 'Privacy', 'IP'],
    avgResolutionTime: 12.0, currentTicketLoad: 0, availability: 'Available', isActive: true,
  },
  {
    id: 'emp-10', name: 'Jake Rivera', email: 'jake@company.com',
    department: 'Engineering', role: 'Database Engineer',
    skillTags: ['Database', 'SQL', 'PostgreSQL', 'Performance', 'Data Migration'],
    avgResolutionTime: 3.0, currentTicketLoad: 2, availability: 'Available', isActive: true,
  },
  {
    id: 'emp-11', name: 'Karen Singh', email: 'karen@company.com',
    department: 'HR', role: 'HR Director',
    skillTags: ['Policy', 'Compensation', 'Culture', 'Hiring'],
    avgResolutionTime: 4.0, currentTicketLoad: 3, availability: 'On Leave', isActive: true,
  },
  {
    id: 'emp-12', name: 'Leo Zhang', email: 'leo@company.com',
    department: 'DevOps', role: 'SRE Engineer',
    skillTags: ['Server', 'Kubernetes', 'Monitoring', 'Incident Response'],
    avgResolutionTime: 1.8, currentTicketLoad: 4, availability: 'Busy', isActive: true,
  },
];
