import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeRealtime } from '@/hooks/useRealtime';
import type { Employee } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Edit, Eye } from 'lucide-react';
import { CreateEmployeeDialog } from '@/components/employees/CreateEmployeeDialog';
import { EditEmployeeDialog } from '@/components/employees/EditEmployeeDialog';
import { EmployeeDetailsDialog } from '@/components/employees/EmployeeDetailsDialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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

export default function Employees() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { employeeUser, user } = useAuth();
  
  // Enable realtime updates
  useEmployeeRealtime();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', searchQuery, employeeUser?.company_id],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by company_id if logged in as employee
      if (employeeUser?.company_id) {
        query = query.eq('company_id', employeeUser.company_id);
      } else if (user) {
        // If logged in as Supabase user (CEO), we might need to find their company
        // But usually CEO sees all their created companies or specific one.
        // For now, let's assume CEO sees all they have access to via RLS.
        // But if we want to be safe:
        // query = query.eq('company_id', ...);
      }

      // Add search filter if query exists
      if (searchQuery.trim()) {
        query = query.or(
          `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quản lý nhân viên</h2>
          <p className="text-muted-foreground">Quản lý thông tin nhân viên</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm nhân viên
        </Button>
        <CreateEmployeeDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
        <EditEmployeeDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          employeeId={selectedEmployeeId}
        />
        <EmployeeDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          employeeId={selectedEmployeeId}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách nhân viên</CardTitle>
              <CardDescription>Tất cả nhân viên trong hệ thống</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  className="pl-8 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : employees && employees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Ngày tham gia</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee: Employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(employee.full_name || employee.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{employee.full_name || 'Chưa có tên'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={`${roleColors[employee.role as keyof typeof roleColors] || 'bg-gray-500'} text-white`}
                      >
                        {roleLabels[employee.role as keyof typeof roleLabels] || employee.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(employee.created_at).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployeeId(employee.id);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployeeId(employee.id);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (confirm('Bạn có chắc muốn xóa nhân viên này?')) {
                              const { error } = await supabase
                                .from('employees')
                                .delete()
                                .eq('id', employee.id);
                              if (error) {
                                toast({
                                  title: 'Lỗi',
                                  description: error.message,
                                  variant: 'destructive',
                                });
                              } else {
                                toast({
                                  title: 'Thành công',
                                  description: 'Đã xóa nhân viên',
                                });
                                queryClient.invalidateQueries({ queryKey: ['employees'] });
                                queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Không có nhân viên nào</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

