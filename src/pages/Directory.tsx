import { useState } from 'react';
import { useTicketStore } from '@/context/TicketContext';
import { Employee, Department, AvailabilityStatus } from '@/types/ticket';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, UserPlus, Edit, UserX, User } from 'lucide-react';

const departments: Department[] = ['Engineering', 'DevOps', 'Finance', 'HR', 'IT', 'Product', 'Marketing', 'Legal'];
const availabilities: AvailabilityStatus[] = ['Available', 'Busy', 'On Leave'];

const availColor: Record<AvailabilityStatus, string> = {
  Available: 'bg-success/20 text-success',
  Busy: 'bg-warning/20 text-warning',
  'On Leave': 'bg-muted text-muted-foreground',
};

export const DirectoryPage = () => {
  const { employees, addEmployee, updateEmployee } = useTicketStore();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState({
    name: '', email: '', department: 'Engineering' as Department, role: '',
    skillTags: '', availability: 'Available' as AvailabilityStatus,
  });

  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.skillTags.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchDept = filterDept === 'all' || e.department === filterDept;
    return matchSearch && matchDept;
  });

  const openAdd = () => {
    setEditingEmployee(null);
    setFormData({ name: '', email: '', department: 'Engineering', role: '', skillTags: '', availability: 'Available' });
    setShowForm(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name, email: emp.email, department: emp.department,
      role: emp.role, skillTags: emp.skillTags.join(', '), availability: emp.availability,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email required');
      return;
    }
    const skills = formData.skillTags.split(',').map(s => s.trim()).filter(Boolean);
    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        name: formData.name, email: formData.email, department: formData.department,
        role: formData.role, skillTags: skills, availability: formData.availability,
      });
      toast.success('Employee updated');
    } else {
      addEmployee({
        id: `emp-${crypto.randomUUID().slice(0, 8)}`,
        name: formData.name, email: formData.email, department: formData.department,
        role: formData.role, skillTags: skills, avgResolutionTime: 0,
        currentTicketLoad: 0, availability: formData.availability, isActive: true,
      });
      toast.success('Employee added');
    }
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employee Directory</h1>
        <Button onClick={openAdd}><UserPlus className="w-4 h-4 mr-2" /> Add Employee</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, skill..." className="pl-9" />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(emp => (
          <Card key={emp.id} className={`p-4 ${!emp.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.role}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(emp)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                  updateEmployee(emp.id, { isActive: !emp.isActive });
                  toast.success(emp.isActive ? 'Deactivated' : 'Activated');
                }}>
                  <UserX className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{emp.email}</p>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-xs">{emp.department}</Badge>
              <span className={`status-badge text-xs ${availColor[emp.availability]}`}>{emp.availability}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {emp.skillTags.map(tag => (
                <span key={tag} className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded">{tag}</span>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Load: {emp.currentTicketLoad} tickets</span>
              <span>Avg: {emp.avgResolutionTime}h</span>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit' : 'Add'} Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Name" />
            <Input value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="Email" />
            <Input value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))} placeholder="Role / Designation" />
            <Select value={formData.department} onValueChange={v => setFormData(p => ({ ...p, department: v as Department }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={formData.availability} onValueChange={v => setFormData(p => ({ ...p, availability: v as AvailabilityStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availabilities.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={formData.skillTags} onChange={e => setFormData(p => ({ ...p, skillTags: e.target.value }))} placeholder="Skills (comma separated)" />
            <Button onClick={handleSave} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
