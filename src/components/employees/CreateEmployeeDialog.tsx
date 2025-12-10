import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface CreateEmployeeDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function CreateEmployeeDialog({ open, onOpenChange }: CreateEmployeeDialogProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'SHIFT_LEADER' | 'STAFF'>('STAFF');
  const [companyId, setCompanyId] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch companies for CEO to assign employee
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { mutate: createEmployee, isPending } = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Vui lòng chọn công ty');
      
      // Call RPC to create employee with password hash
      const { data, error } = await supabase.rpc('create_employee_with_auth', {
        p_company_id: companyId,
        p_username: username.trim().toLowerCase(),
        p_password: password,
        p_full_name: fullName.trim(),
        p_role: role,
        p_email: email.trim() || null,
        p_phone: phone.trim() || null,
        p_branch_id: null,
      });

      if (error) throw error;
      
      // Check if RPC returned success
      if (data && !data.success) {
        throw new Error(data.error || 'Không thể tạo nhân viên');
      }
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Thành công',
        description: 'Đã tạo nhân viên mới. Nhân viên có thể đăng nhập bằng tên đăng nhập và mật khẩu.',
      });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onOpenChange(false);
      // Reset form
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFullName('');
    setUsername('');
    setPassword('');
    setEmail('');
    setPhone('');
    setRole('STAFF');
    setCompanyId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập họ tên', variant: 'destructive' });
      return;
    }
    if (!username.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập tên đăng nhập', variant: 'destructive' });
      return;
    }
    if (!password || password.length < 6) {
      toast({ title: 'Lỗi', description: 'Mật khẩu phải có ít nhất 6 ký tự', variant: 'destructive' });
      return;
    }
    if (!companyId) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn công ty', variant: 'destructive' });
      return;
    }
    createEmployee();
  };

  const roleLabels = {
    MANAGER: 'Quản lý',
    SHIFT_LEADER: 'Tổ trưởng',
    STAFF: 'Nhân viên',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo nhân viên mới</DialogTitle>
          <DialogDescription>Thêm nhân viên mới vào hệ thống. Nhân viên sẽ dùng tên đăng nhập và mật khẩu để đăng nhập.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Company Selection */}
            <div className="grid gap-2">
              <Label htmlFor="company">Công ty *</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger id="company">
                  <SelectValue placeholder="Chọn công ty" />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fullName">Họ và tên *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Tên đăng nhập *</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="nguyenvana"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Mật khẩu *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Vai trò *</Label>
              <Select
                value={role}
                onValueChange={(value: 'MANAGER' | 'SHIFT_LEADER' | 'STAFF') => setRole(value)}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">{roleLabels.STAFF}</SelectItem>
                  <SelectItem value="SHIFT_LEADER">{roleLabels.SHIFT_LEADER}</SelectItem>
                  <SelectItem value="MANAGER">{roleLabels.MANAGER}</SelectItem>
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
                'Tạo nhân viên'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

