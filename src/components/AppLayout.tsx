import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, Users, BarChart3, Plus, Zap,
} from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { useEscalation } from '@/hooks/useEscalation';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/submit', label: 'New Ticket', icon: Plus },
  { to: '/directory', label: 'Directory', icon: Users },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  useEscalation();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        <div className="p-5 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-accent-foreground text-lg tracking-tight">TicketAI</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-muted-foreground">AI-Powered Ticketing v1.0</p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border px-6 py-3 flex justify-end items-center">
          <NotificationBell />
        </div>
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
