import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTaskRealtime } from '@/hooks/useRealtime';
import type { Task } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Filter, Edit, Trash2, Eye, CheckSquare, 
  LayoutGrid, List, Clock, AlertTriangle, CheckCircle2, Target, FileText 
} from 'lucide-react';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog';
import { TaskReportDialog } from '@/components/tasks/TaskReportDialog';
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
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAuth } from '@/contexts/AuthContext';

const priorityColors = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-600 animate-pulse',
};

const statusColors = {
  pending: 'bg-slate-500',
  in_progress: 'bg-blue-600',
  completed: 'bg-green-600',
  cancelled: 'bg-red-500',
};

export default function Tasks() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, employeeUser, currentRole } = useAuth();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, priorityFilter, currentRole, user?.id, employeeUser?.id],
    queryFn: async () => {
      // 1. Fetch tasks without join (to avoid FK issues)
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter tasks based on role
      if (currentRole === 'ceo') {
        // CEO sees all tasks - no filter needed
      } else if (currentRole === 'manager') {
        // Manager sees tasks assigned to them AND their subordinates (Staff, Shift Leader)
        let companyId = employeeUser?.company_id;
        let managerId = employeeUser?.id;
        
        if ((!companyId || !managerId) && user?.email) {
          const { data: empData } = await supabase
            .from('employees')
            .select('id, company_id')
            .eq('email', user.email)
            .single();
          companyId = empData?.company_id;
          managerId = empData?.id;
        }

        if (companyId && managerId) {
          // Fetch subordinates (Staff & Shift Leader)
          const { data: subordinates } = await supabase
            .from('employees')
            .select('id')
            .eq('company_id', companyId)
            .in('role', ['STAFF', 'SHIFT_LEADER']);
            
          const subordinateIds = subordinates?.map(s => s.id) || [];
          const visibleUserIds = [managerId, ...subordinateIds];
          
          // Filter tasks: Assigned to Manager OR Subordinates
          query = query.in('assigned_to', visibleUserIds);
        }
      } else {
        // Shift Leader & Staff only see tasks assigned to them
        if (employeeUser) {
          query = query.eq('assigned_to', employeeUser.id);
        } else if (user?.email) {
          const { data: empData } = await supabase
            .from('employees')
            .select('id')
            .eq('email', user.email)
            .single();
            
          if (empData) {
            query = query.eq('assigned_to', empData.id);
          } else {
            return [];
          }
        }
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      const { data: tasksData, error } = await query.limit(50);

      if (error) throw error;
      if (!tasksData || tasksData.length === 0) return [];

      // 2. Manual join for assignee details
      const assigneeIds = [...new Set(tasksData.map((t: any) => t.assigned_to).filter(Boolean))];
      
      if (assigneeIds.length > 0) {
        const { data: employeesData } = await supabase
          .from('employees')
          .select('id, full_name, avatar_url')
          .in('id', assigneeIds);
          
        if (employeesData) {
          const empMap = new Map(employeesData.map((e: any) => [e.id, e]));
          return tasksData.map((task: any) => ({
            ...task,
            assignee: task.assigned_to ? empMap.get(task.assigned_to) : null
          }));
        }
      }

      return tasksData;
    },
  });

  // Calculate Stats
  const stats = {
    total: tasks?.length || 0,
    inProgress: tasks?.filter((t: any) => t.status === 'in_progress').length || 0,
    urgent: tasks?.filter((t: any) => t.priority === 'urgent').length || 0,
    completed: tasks?.filter((t: any) => t.status === 'completed').length || 0,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const KanbanColumn = ({ title, status, items }: { title: string, status: string, items: any[] }) => (
    <div className="flex-1 min-w-[300px] bg-muted/30 p-4 rounded-lg border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusColors[status as keyof typeof statusColors]}`} />
          {title}
        </h3>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <div className="space-y-3">
        {items.map(task => (
          <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer bg-card" onClick={() => navigate(`/tasks/${task.id}`)}>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <span className="font-medium line-clamp-2 text-sm">{task.title}</span>
                <Badge variant="outline" className={`${priorityColors[task.priority as keyof typeof priorityColors]} text-white border-none text-[10px] px-1.5 py-0`}>
                  {task.priority === 'urgent' ? '!' : ''}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Tiến độ</span>
                  <span>{task.progress || 0}%</span>
                </div>
                <Progress value={task.progress || 0} className="h-1.5" />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  {task.assignee && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.assignee.avatar_url} />
                      <AvatarFallback className="text-[10px]">{task.assignee.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <span className="text-xs text-muted-foreground">{new Date(task.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="flex gap-1">
                  {task.notes && (
                    <div className="h-6 w-6 flex items-center justify-center" title="Có báo cáo">
                      <FileText className="h-3 w-3 text-blue-500" />
                    </div>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setReportDialogOpen(true); }}>
                    <CheckSquare className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Quản lý công việc</h2>
            <p className="text-muted-foreground">Theo dõi hiệu suất và tiến độ dự án</p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'kanban')}>
              <TabsList>
                <TabsTrigger value="list"><List className="h-4 w-4 mr-2"/> Danh sách</TabsTrigger>
                <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4 mr-2"/> Bảng</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Tạo công việc
            </Button>
          </div>
        </div>

        {/* Musk-style Stats Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng công việc</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Nhiệm vụ trong hệ thống</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang thực hiện</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground">Cần tập trung xử lý</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Khẩn cấp</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.urgent}</div>
              <p className="text-xs text-muted-foreground">Cần xử lý ngay lập tức</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hiệu suất</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate}%</div>
              <Progress value={completionRate} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateTaskDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        taskId={selectedTaskId}
      />
      <TaskReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        task={selectedTask}
      />

      {/* Main Content Area */}
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-background">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="pending">Chờ xử lý</SelectItem>
                  <SelectItem value="in_progress">Đang làm</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="Độ ưu tiên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ưu tiên</SelectItem>
                  <SelectItem value="low">Thấp</SelectItem>
                  <SelectItem value="medium">Trung bình</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                  <SelectItem value="urgent">Khẩn cấp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : tasks && tasks.length > 0 ? (
            viewMode === 'list' ? (
              <div className="rounded-md border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Tiêu đề</TableHead>
                      <TableHead>Người thực hiện</TableHead>
                      <TableHead>Tiến độ</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Độ ưu tiên</TableHead>
                      <TableHead>Hạn chót</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task: any) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{task.title}</span>
                              {task.notes && <FileText className="h-3 w-3 text-blue-500" />}
                            </div>
                            <span className="text-xs text-muted-foreground">{task.category || 'Chưa phân loại'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {task.assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={task.assignee.avatar_url} />
                                <AvatarFallback className="text-[10px]">{task.assignee.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{task.assignee.full_name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Chưa giao</span>
                          )}
                        </TableCell>
                        <TableCell className="w-[150px]">
                          <div className="flex items-center gap-2">
                            <Progress value={task.progress || 0} className="h-2" />
                            <span className="text-xs text-muted-foreground w-[30px]">{task.progress || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${statusColors[task.status as keyof typeof statusColors] || 'bg-gray-500'} text-white hover:opacity-90`}
                          >
                            {task.status === 'pending' && 'Chờ xử lý'}
                            {task.status === 'in_progress' && 'Đang làm'}
                            {task.status === 'completed' && 'Hoàn thành'}
                            {task.status === 'cancelled' && 'Đã hủy'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${priorityColors[task.priority as keyof typeof priorityColors] || 'bg-gray-500'} text-white border-none`}
                          >
                            {task.priority === 'low' && 'Thấp'}
                            {task.priority === 'medium' && 'Trung bình'}
                            {task.priority === 'high' && 'Cao'}
                            {task.priority === 'urgent' && 'Khẩn cấp'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.due_date ? (
                            <div className={`flex items-center gap-1 ${new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-red-500 font-medium' : ''}`}>
                              <Clock className="h-3 w-3" />
                              {new Date(task.due_date).toLocaleDateString('vi-VN')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedTask(task);
                                setReportDialogOpen(true);
                              }}
                              title="Báo cáo tiến độ"
                              className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <CheckSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedTaskId(task.id);
                                setEditDialogOpen(true);
                              }}
                              title="Chỉnh sửa"
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
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
                                  }
                                }
                              }}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4">
                <KanbanColumn 
                  title="Chờ xử lý" 
                  status="pending" 
                  items={tasks.filter((t: any) => t.status === 'pending')} 
                />
                <KanbanColumn 
                  title="Đang thực hiện" 
                  status="in_progress" 
                  items={tasks.filter((t: any) => t.status === 'in_progress')} 
                />
                <KanbanColumn 
                  title="Hoàn thành" 
                  status="completed" 
                  items={tasks.filter((t: any) => t.status === 'completed')} 
                />
              </div>
            )
          ) : (
            <div className="text-center py-12 bg-muted/10 rounded-lg border border-dashed">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Chưa có công việc nào</h3>
              <p className="text-muted-foreground mb-4">Hãy tạo công việc mới để bắt đầu theo dõi tiến độ</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tạo công việc ngay
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

