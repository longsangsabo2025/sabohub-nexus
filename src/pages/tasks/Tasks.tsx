import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTaskRealtime } from '@/hooks/useRealtime';
import type { Task } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Filter, Edit, Trash2, Eye } from 'lucide-react';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const priorityColors = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const statusColors = {
  pending: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

export default function Tasks() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, priorityFilter],
    queryFn: async () => {
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quản lý công việc</h2>
          <p className="text-muted-foreground">Theo dõi và quản lý tất cả công việc</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo công việc mới
        </Button>
        <CreateTaskDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
        <EditTaskDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          taskId={selectedTaskId}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách công việc</CardTitle>
              <CardDescription>Tất cả công việc trong hệ thống</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Chờ xử lý</SelectItem>
                  <SelectItem value="in_progress">Đang làm</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Độ ưu tiên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="low">Thấp</SelectItem>
                  <SelectItem value="medium">Trung bình</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                  <SelectItem value="urgent">Khẩn cấp</SelectItem>
                </SelectContent>
              </Select>
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
          ) : tasks && tasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Độ ưu tiên</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Hạn chót</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task: Task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusColors[task.status as keyof typeof statusColors] || 'bg-gray-500'} text-white`}
                      >
                        {task.status === 'pending' && 'Chờ xử lý'}
                        {task.status === 'in_progress' && 'Đang làm'}
                        {task.status === 'completed' && 'Hoàn thành'}
                        {task.status === 'cancelled' && 'Đã hủy'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${priorityColors[task.priority as keyof typeof priorityColors] || 'bg-gray-500'} text-white`}
                      >
                        {task.priority === 'low' && 'Thấp'}
                        {task.priority === 'medium' && 'Trung bình'}
                        {task.priority === 'high' && 'Cao'}
                        {task.priority === 'urgent' && 'Khẩn cấp'}
                      </Badge>
                    </TableCell>
                    <TableCell>{task.category || 'Khác'}</TableCell>
                    <TableCell>
                      {new Date(task.created_at).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString('vi-VN')
                        : 'Không có'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            setEditDialogOpen(true);
                          }}
                          title="Chỉnh sửa"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (confirm('Bạn có chắc muốn xóa công việc này?')) {
                              const { error } = await supabase
                                .from('tasks')
                                .delete()
                                .eq('id', task.id);
                              if (error) {
                                toast({
                                  title: 'Lỗi',
                                  description: error.message,
                                  variant: 'destructive',
                                });
                              } else {
                                toast({
                                  title: 'Thành công',
                                  description: 'Đã xóa công việc',
                                });
                                queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
            <div className="text-center py-8 text-muted-foreground">
              Không có công việc nào
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

