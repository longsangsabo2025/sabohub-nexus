import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';
import { Mail, Phone, Building, CreditCard, Calendar, User, DollarSign, Clock } from 'lucide-react';

interface EmployeeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
}

const roleLabels = {
  ceo: 'CEO',
  manager: 'Quản lý',
  shift_leader: 'Tổ trưởng',
  staff: 'Nhân viên',
};

const roleColors = {
  ceo: 'bg-purple-500',
  manager: 'bg-blue-500',
  shift_leader: 'bg-green-500',
  staff: 'bg-gray-500',
};

export function EmployeeDetailsDialog({
  open,
  onOpenChange,
  employeeId,
}: EmployeeDetailsDialogProps) {
  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!employeeId && open,
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Thông tin chi tiết nhân viên</DialogTitle>
          <DialogDescription>
            Xem thông tin chi tiết của nhân viên
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : employee ? (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Avatar className="h-16 w-16 border-2 border-background">
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {getInitials(employee.full_name || employee.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {employee.full_name || 'Chưa có tên'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={`${
                      roleColors[employee.role as keyof typeof roleColors] || 'bg-gray-500'
                    } text-white hover:opacity-90`}
                  >
                    {roleLabels[employee.role as keyof typeof roleLabels] || employee.role}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Tham gia: {new Date(employee.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Contact Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Thông tin liên hệ
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{employee.email}</p>
                    </div>
                  </div>
                  {employee.phone_number && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Số điện thoại</p>
                        <p className="font-medium">{employee.phone_number}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Work Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Thông tin công việc
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vai trò</p>
                      <p className="font-medium">
                        {roleLabels[employee.role as keyof typeof roleLabels] || employee.role}
                      </p>
                    </div>
                  </div>
                  {employee.employment_type && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Loại hợp đồng</p>
                        <p className="font-medium">
                          {employee.employment_type === 'full_time' ? 'Toàn thời gian' : 'Bán thời gian'}
                        </p>
                      </div>
                    </div>
                  )}
                  {employee.salary_type && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hình thức lương</p>
                        <p className="font-medium">
                          {employee.salary_type === 'fixed' ? 'Lương cố định' : 'Lương theo giờ'}
                        </p>
                      </div>
                    </div>
                  )}
                  {employee.department && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                        <Building className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phòng ban</p>
                        <p className="font-medium">{employee.department}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payroll Info */}
              <div className="col-span-2 space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Thông tin lương & Tài khoản
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lương cơ bản</p>
                        <p className="font-medium">
                          {employee.base_salary
                            ? formatCurrency(employee.base_salary)
                            : 'Chưa thiết lập'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lương theo giờ</p>
                        <p className="font-medium">
                          {employee.hourly_rate
                            ? formatCurrency(employee.hourly_rate) + '/giờ'
                            : 'Chưa thiết lập'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(employee.bank_name || employee.bank_account_number) ? (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tài khoản ngân hàng</p>
                          <p className="font-medium">{employee.bank_name}</p>
                          <p className="text-muted-foreground">{employee.bank_account_number}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <span>Chưa có thông tin tài khoản</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Không tìm thấy thông tin nhân viên
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
