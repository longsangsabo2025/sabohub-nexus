import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
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

interface EditTaskDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly taskId: string | null;
}

export function EditTaskDialog({ open, onOpenChange, taskId }: EditTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed' | 'cancelled'>('pending');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [category, setCategory] = useState('other');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees for assignee selector
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email, role')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Load task data when dialog opens
  useEffect(() => {
    if (open && taskId) {
      const loadTask = async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (error) {
          toast({
            title: 'Lỗi',
            description: 'Không thể tải thông tin công việc',
            variant: 'destructive',
          });
          return;
        }

        if (data) {
          setTitle(data.title || '');
          setDescription(data.description || '');
          setStatus(data.status || 'pending');
          setPriority(data.priority || 'medium');
          setCategory(data.category || 'other');
          setDueDate(data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : '');
          setAssigneeId(data.assigned_to || 'unassigned');
        }
      };

      loadTask();
    } else if (!open) {
      // Reset form when dialog closes
      setTitle('');
      setDescription('');
      setStatus('pending');
      setPriority('medium');
      setCategory('other');
      setDueDate('');
      setAssigneeId('');
    }
  }, [open, taskId, toast]);

  const { mutate: updateTask, isPending } = useMutation({
    mutationFn: async () => {
      if (!taskId) throw new Error('Task ID không hợp lệ');

      const { data, error } = await supabase
        .from('tasks')
        .update({
          title,
          description,
          status,
          priority,
          category,
          due_date: dueDate || null,
          assigned_to: assigneeId && assigneeId !== 'unassigned' ? assigneeId : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật công việc',
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['recent-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
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
    if (!taskId) {
      toast({
        title: 'Lỗi',
        description: 'Task ID không hợp lệ',
        variant: 'destructive',
      });
      return;
    }
    updateTask();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa công việc</DialogTitle>
          <DialogDescription>Cập nhật thông tin công việc</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Tiêu đề *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề công việc"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Mô tả</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập mô tả chi tiết"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Trạng thái</Label>
                <Select
                  value={status}
                  onValueChange={(value: 'pending' | 'in_progress' | 'completed' | 'cancelled') =>
                    setStatus(value)
                  }
                >
                  <SelectTrigger id="edit-status">
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
                <Label htmlFor="edit-priority">Độ ưu tiên</Label>
                <Select
                  value={priority}
                  onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
                    setPriority(value)
                  }
                >
                  <SelectTrigger id="edit-priority">
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
                <Label htmlFor="edit-category">Danh mục</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operations">Vận hành</SelectItem>
                    <SelectItem value="maintenance">Bảo trì</SelectItem>
                    <SelectItem value="inventory">Kho hàng</SelectItem>
                    <SelectItem value="customerService">Khách hàng</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-dueDate">Hạn chót</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-assignee">Giao cho</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="edit-assignee">
                  <SelectValue placeholder="Chọn nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Chưa giao</SelectItem>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name || emp.email} ({emp.role})
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
            <Button type="submit" disabled={isPending || !taskId}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                'Cập nhật'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

