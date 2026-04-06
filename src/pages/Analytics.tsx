import { useTicketStore } from '@/context/TicketContext';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Ticket, ArrowUp, CheckCircle, AlertTriangle, Clock, ThumbsUp } from 'lucide-react';

const COLORS = [
  'hsl(173, 58%, 45%)', 'hsl(217, 91%, 60%)', 'hsl(38, 92%, 50%)',
  'hsl(142, 71%, 45%)', 'hsl(0, 72%, 51%)', 'hsl(280, 60%, 55%)',
  'hsl(200, 70%, 50%)', 'hsl(30, 80%, 55%)',
];

export const AnalyticsPage = () => {
  const { tickets, employees } = useTicketStore();

  const total = tickets.length;
  const open = tickets.filter(t => !['Resolved', 'Closed'].includes(t.status)).length;
  const resolved = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
  const autoResolved = tickets.filter(t => t.isAutoResolved).length;
  const escalated = tickets.filter(t => t.escalated).length;

  const autoHelpful = tickets.filter(t => t.isAutoResolved && t.feedbackHelpful === true).length;
  const autoFeedbackTotal = tickets.filter(t => t.isAutoResolved && t.feedbackHelpful !== null).length;
  const successRate = autoFeedbackTotal > 0 ? Math.round((autoHelpful / autoFeedbackTotal) * 100) : 0;

  // Department breakdown
  const deptData = tickets.reduce((acc, t) => {
    const dept = t.assignedDepartment || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const deptChartData = Object.entries(deptData).map(([name, value]) => ({ name, value }));

  // Category breakdown
  const catData = tickets.reduce((acc, t) => {
    const cat = t.aiAnalysis?.category || 'Unknown';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const catChartData = Object.entries(catData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const stats = [
    { label: 'Total Tickets', value: total, icon: Ticket, color: 'text-primary' },
    { label: 'Open', value: open, icon: ArrowUp, color: 'text-warning' },
    { label: 'Resolved', value: resolved, icon: CheckCircle, color: 'text-success' },
    { label: 'Auto-Resolved', value: autoResolved, icon: Clock, color: 'text-info' },
    { label: 'Escalated', value: escalated, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Auto Success Rate', value: `${successRate}%`, icon: ThumbsUp, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4 text-center">
            <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-sm font-semibold mb-4">Department Load</h2>
          {deptChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={deptChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215, 20%, 55%)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215, 20%, 55%)' }} />
                <Tooltip contentStyle={{ background: 'hsl(222, 44%, 8%)', border: '1px solid hsl(222, 30%, 16%)', borderRadius: 8 }} />
                <Bar dataKey="value" fill="hsl(173, 58%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No data yet</p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold mb-4">Top Categories</h2>
          {catChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={catChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, count }) => `${name}: ${count}`}>
                  {catChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(222, 44%, 8%)', border: '1px solid hsl(222, 30%, 16%)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No data yet</p>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-sm font-semibold mb-4">Employee Load Overview</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">Name</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Department</th>
                <th className="text-center py-2 text-muted-foreground font-medium">Open Tickets</th>
                <th className="text-center py-2 text-muted-foreground font-medium">Avg Res. Time</th>
                <th className="text-center py-2 text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.filter(e => e.isActive).map(emp => (
                <tr key={emp.id} className="border-b border-border/50">
                  <td className="py-2.5">{emp.name}</td>
                  <td className="py-2.5 text-muted-foreground">{emp.department}</td>
                  <td className="py-2.5 text-center">{emp.currentTicketLoad}</td>
                  <td className="py-2.5 text-center">{emp.avgResolutionTime}h</td>
                  <td className="py-2.5 text-center">
                    <span className={`status-badge text-xs ${emp.availability === 'Available' ? 'bg-success/20 text-success' : emp.availability === 'Busy' ? 'bg-warning/20 text-warning' : 'bg-muted text-muted-foreground'}`}>
                      {emp.availability}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
