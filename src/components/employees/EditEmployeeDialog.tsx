import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface EditEmployeeDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly employeeId: string | null;
}

export function EditEmployeeDialog({
  open,
  onOpenChange,
  employeeId,
}: EditEmployeeDialogProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ceo' | 'manager' | 'shift_leader' | 'staff'>('staff');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load employee data when dialog opens
  useEffect(() => {
    if (open && employeeId) {
      const loadEmployee = async () => {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('id', employeeId)
          .single();

        if (error) {
          toast({
            title: 'Lỗi',
            description: 'Không thể tải thông tin nhân viên',
            variant: 'destructive',
          });
          return;
        }

        if (data) {
          setFullName(data.full_name || '');
          setEmail(data.email || '');
          setRole(data.role || 'staff');
        }
      };

      loadEmployee();
    } else if (!open) {
      // Reset form when dialog closes
      setFullName('');
      setEmail('');
      setRole('staff');
    }
  }, [open, employeeId, toast]);

  const { mutate: updateEmployee, isPending } = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error('Employee ID không hợp lệ');

      const { data, error } = await supabase
        .from('employees')
        .update({
          full_name: fullName,
          email,
          role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật thông tin nhân viên',
      });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
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
    if (!fullName.trim() || !email.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin',
        variant: 'destructive',
      });
      return;
    }
    if (!employeeId) {
      toast({
        title: 'Lỗi',
        description: 'Employee ID không hợp lệ',
        variant: 'destructive',
      });
      return;
    }
    updateEmployee();
  };

  const roleLabels = {
    ceo: 'CEO',
    manager: 'Quản lý',
    shift_leader: 'Tổ trưởng',
    staff: 'Nhân viên',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa nhân viên</DialogTitle>
          <DialogDescription>Cập nhật thông tin nhân viên</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-fullName">Họ và tên *</Label>
              <Input
                id="edit-fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Vai trò</Label>
              <Select
                value={role}
                onValueChange={(value: 'ceo' | 'manager' | 'shift_leader' | 'staff') =>
                  setRole(value)
                }
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">{roleLabels.staff}</SelectItem>
                  <SelectItem value="shift_leader">{roleLabels.shift_leader}</SelectItem>
                  <SelectItem value="manager">{roleLabels.manager}</SelectItem>
                  <SelectItem value="ceo">{roleLabels.ceo}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending || !employeeId}>
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

