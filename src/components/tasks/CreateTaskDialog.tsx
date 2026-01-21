import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { handleReactQueryError, ErrorCategory } from '@/lib/error-handling';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface CreateTaskDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function CreateTaskDialog({ open, onOpenChange }: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed' | 'cancelled'>('pending');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [category, setCategory] = useState('other');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, employeeUser } = useAuth();

  // Fetch employees for assignee selector
  const { data: employees, error: employeesError } = useQuery({
    queryKey: ['employees', employeeUser?.company_id],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select('id, full_name, email, role')
        .order('full_name');
      
      if (employeeUser?.company_id) {
        query = query.eq('company_id', employeeUser.company_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Handle employees query error
  if (employeesError) {
    const message = handleReactQueryError(employeesError, {
      category: ErrorCategory.DATABASE,
      context: 'Failed to fetch employees',
      operation: 'fetchEmployees',
    });
    toast({
      title: 'Lỗi',
      description: message,
      variant: 'destructive',
    });
  }

  const { mutate: createTask, isPending } = useMutation({
    mutationFn: async () => {
      // Determine creator ID
      let creatorId = user?.id;
      
      if (!creatorId && employeeUser) {
        // If logged in as employee, we need to handle created_by.
        // Since tasks.created_by is a UUID but usually references auth.users,
        // and employees.id is a UUID, we can store it there IF there is no FK constraint.
        // We verified there is NO FK constraint on created_by in tasks table.
        creatorId = employeeUser.id;
      }

      if (!creatorId) throw new Error('Chưa đăng nhập');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title,
          description,
          status,
          priority,
          category,
          due_date: dueDate || null,
          created_by: creatorId,
          assigned_to: assigneeId && assigneeId !== 'unassigned' ? assigneeId : null,
          company_id: employeeUser?.company_id // Ensure task is created in the correct company
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Thành công',
        description: 'Đã tạo công việc mới',
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onOpenChange(false);
      // Reset form
      setTitle('');
      setDescription('');
      setStatus('pending');
      setPriority('medium');
      setCategory('other');
      setDueDate('');
      setAssigneeId('');
    },
    onError: (error: Error) => {
      const message = handleReactQueryError(error, {
        category: ErrorCategory.DATABASE,
        context: 'Failed to create task',
        operation: 'createTask',
        userId: user?.id || employeeUser?.id,
      });
      toast({
        title: 'Lỗi',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tiêu đề',
        variant: 'destructive',
      });
      return;
    }
    createTask();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tạo công việc mới</DialogTitle>
          <DialogDescription>Thêm công việc mới vào hệ thống</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Tiêu đề *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề công việc"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập mô tả chi tiết"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Trạng thái</Label>
                <Select
                  value={status}
                  onValueChange={(value: 'pending' | 'in_progress' | 'completed' | 'cancelled') =>
                    setStatus(value)
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Chờ xử lý</SelectItem>
                    <SelectItem value="in_progress">Đang làm</SelectItem>
                    <SelectItem value="completed">Hoàn thành</SelectItem>
                    <SelectItem value="cancelled">Đã hủy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Độ ưu tiên</Label>
                <Select
                  value={priority}
                  onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
                    setPriority(value)
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Thấp</SelectItem>
                    <SelectItem value="medium">Trung bình</SelectItem>
                    <SelectItem value="high">Cao</SelectItem>
                    <SelectItem value="urgent">Khẩn cấp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Danh mục</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Kinh doanh</SelectItem>
                    <SelectItem value="admin">Hành chính</SelectItem>
                    <SelectItem value="operations">Vận hành</SelectItem>
                    <SelectItem value="maintenance">Bảo trì</SelectItem>
                    <SelectItem value="inventory">Kho hàng</SelectItem>
                    <SelectItem value="customer_service">Khách hàng</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Hạn chót</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignee">Giao cho</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Chọn nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Chưa giao</SelectItem>
                  {employees?.map((emp: { id: string; full_name: string | null; email: string; role: string | null }) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name || emp.email} ({emp.role || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                'Tạo công việc'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

