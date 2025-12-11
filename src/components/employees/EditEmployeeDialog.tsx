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
  
  // Payroll fields
  const [employmentType, setEmploymentType] = useState<'full_time' | 'part_time'>('full_time');
  const [salaryType, setSalaryType] = useState<'fixed' | 'hourly'>('fixed');
  const [baseSalary, setBaseSalary] = useState<string>('0');
  const [hourlyRate, setHourlyRate] = useState<string>('0');
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');

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
          
          // Load payroll data
          setEmploymentType(data.employment_type || 'full_time');
          setSalaryType(data.salary_type || 'fixed');
          setBaseSalary(data.base_salary?.toString() || '0');
          setHourlyRate(data.hourly_rate?.toString() || '0');
          setBankAccount(data.bank_account_number || '');
          setBankName(data.bank_name || '');
        }
      };

      loadEmployee();
    } else if (!open) {
      // Reset form when dialog closes
      setFullName('');
      setEmail('');
      setRole('staff');
      setEmploymentType('full_time');
      setSalaryType('fixed');
      setBaseSalary('0');
      setHourlyRate('0');
      setBankAccount('');
      setBankName('');
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
          employment_type: employmentType,
          salary_type: salaryType,
          base_salary: parseFloat(baseSalary) || 0,
          hourly_rate: parseFloat(hourlyRate) || 0,
          bank_account_number: bankAccount,
          bank_name: bankName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeId)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Không thể cập nhật. Vui lòng kiểm tra quyền hạn của bạn.');
      }

      return data[0];
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

            <div className="border-t pt-4 mt-2">
              <h3 className="font-medium mb-4">Thông tin lương & Chế độ</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Hình thức làm việc</Label>
                    <Select
                      value={employmentType}
                      onValueChange={(value: 'full_time' | 'part_time') => setEmploymentType(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full-time</SelectItem>
                        <SelectItem value="part_time">Part-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Cách tính lương</Label>
                    <Select
                      value={salaryType}
                      onValueChange={(value: 'fixed' | 'hourly') => setSalaryType(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Lương cố định</SelectItem>
                        <SelectItem value="hourly">Theo giờ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {salaryType === 'fixed' ? (
                  <div className="grid gap-2">
                    <Label>Lương cơ bản (VNĐ)</Label>
                    <Input
                      type="number"
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(e.target.value)}
                      placeholder="10000000"
                    />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label>Lương theo giờ (VNĐ/h)</Label>
                    <Input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="50000"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Ngân hàng</Label>
                    <Input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Vietcombank"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Số tài khoản</Label>
                    <Input
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="1234567890"
                    />
                  </div>
                </div>
              </div>
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

