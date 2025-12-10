import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useDailyReportsRealtime } from '@/hooks/useRealtime';
import type { DailyWorkReport } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  AlertTriangle,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, addDays, startOfDay, isToday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

export default function DailyReports() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyWorkReport | null>(null);
  const [newReport, setNewReport] = useState({
    achievements: '',
    challenges: '',
    tomorrow_plan: '',
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch daily reports for selected date
  const { data: reports, isLoading } = useQuery({
    queryKey: ['daily-reports', format(currentDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_work_reports')
        .select('*, employees(full_name, email, role)')
        .eq('report_date', format(currentDate, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch today's tasks for the current user
  const { data: todayTasks } = useQuery({
    queryKey: ['today-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return { completed: 0, total: 0 };
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('tasks')
        .select('id, status')
        .or(`assigned_to.eq.${user.id},assignee_id.eq.${user.id}`)
        .gte('created_at', today);
      
      if (error) return { completed: 0, total: 0 };
      
      const total = data?.length || 0;
      const completed = data?.filter(t => t.status === 'completed').length || 0;
      return { completed, total };
    },
    enabled: !!user?.id,
  });

  // Create report mutation
  const createReport = useMutation({
    mutationFn: async (report: {
      achievements: string;
      challenges: string;
      tomorrow_plan: string;
    }) => {
      const { data, error } = await supabase
        .from('daily_work_reports')
        .insert({
          employee_id: user?.id,
          report_date: format(new Date(), 'yyyy-MM-dd'),
          tasks_completed: todayTasks?.completed || 0,
          tasks_total: todayTasks?.total || 0,
          achievements: report.achievements || null,
          challenges: report.challenges || null,
          tomorrow_plan: report.tomorrow_plan || null,
          status: 'submitted',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      setIsCreateDialogOpen(false);
      setNewReport({ achievements: '', challenges: '', tomorrow_plan: '' });
      toast({
        title: 'Thành công',
        description: 'Đã gửi báo cáo công việc',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: `Không thể gửi báo cáo: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Review report mutation (for managers)
  const reviewReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await supabase
        .from('daily_work_reports')
        .update({ status: 'reviewed' })
        .eq('id', reportId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      if (selectedReport) {
        setSelectedReport({ ...selectedReport, status: 'reviewed' });
      }
      toast({
        title: 'Thành công',
        description: 'Đã đánh dấu báo cáo là đã xem',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: `Không thể cập nhật: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleCreateReport = () => {
    createReport.mutate(newReport);
  };

  const handleViewReport = (report: DailyWorkReport) => {
    setSelectedReport(report);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'Nháp', variant: 'outline' },
      submitted: { label: 'Đã gửi', variant: 'secondary' },
      reviewed: { label: 'Đã xem', variant: 'default' },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCompletionRate = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      ceo: { label: 'CEO', variant: 'default' },
      manager: { label: 'Quản lý', variant: 'secondary' },
      shift_leader: { label: 'Trưởng ca', variant: 'outline' },
      staff: { label: 'Nhân viên', variant: 'outline' },
    };
    const config = roleConfig[role] || roleConfig.staff;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Báo cáo công việc</h2>
          <p className="text-muted-foreground">Báo cáo công việc hàng ngày của nhân viên</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!isToday(currentDate)}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo báo cáo hôm nay
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Báo cáo công việc hôm nay</DialogTitle>
              <DialogDescription>
                {format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Task Summary */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Tiến độ công việc</span>
                    <span className="text-sm text-muted-foreground">
                      {todayTasks?.completed || 0}/{todayTasks?.total || 0} hoàn thành
                    </span>
                  </div>
                  <Progress value={getCompletionRate(todayTasks?.completed || 0, todayTasks?.total || 0)} />
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Thành tựu hôm nay
                </Label>
                <Textarea
                  value={newReport.achievements}
                  onChange={(e) => setNewReport({ ...newReport, achievements: e.target.value })}
                  placeholder="Những gì bạn đã hoàn thành tốt hôm nay..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Khó khăn gặp phải
                </Label>
                <Textarea
                  value={newReport.challenges}
                  onChange={(e) => setNewReport({ ...newReport, challenges: e.target.value })}
                  placeholder="Những vấn đề bạn gặp phải hôm nay..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-500" />
                  Kế hoạch ngày mai
                </Label>
                <Textarea
                  value={newReport.tomorrow_plan}
                  onChange={(e) => setNewReport({ ...newReport, tomorrow_plan: e.target.value })}
                  placeholder="Những việc bạn sẽ làm ngày mai..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreateReport} disabled={createReport.isPending}>
                {createReport.isPending ? 'Đang gửi...' : 'Gửi báo cáo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>
                {format(currentDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
              </CardTitle>
              {isToday(currentDate) && (
                <Badge variant="default">Hôm nay</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                Hôm nay
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setCurrentDate(addDays(currentDate, 1))}
                disabled={isToday(currentDate)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng báo cáo</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã xem</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports?.filter((r: DailyWorkReport) => r.status === 'reviewed').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Việc hoàn thành</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports?.reduce((sum: number, r: DailyWorkReport) => sum + (r.tasks_completed || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng việc</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports?.reduce((sum: number, r: DailyWorkReport) => sum + (r.tasks_total || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách báo cáo</CardTitle>
          <CardDescription>Tất cả báo cáo công việc trong ngày</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : reports && reports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Tiến độ</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report: DailyWorkReport) => {
                  const completionRate = getCompletionRate(report.tasks_completed, report.tasks_total);
                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {getInitials(report.employees?.full_name || '')}
                            </AvatarFallback>
                          </Avatar>
                          <span>{report.employees?.full_name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(report.employees?.role || 'staff')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={completionRate} className="w-[60px]" />
                          <span className="text-sm text-muted-foreground">
                            {report.tasks_completed}/{report.tasks_total}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(report.created_at), 'HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewReport(report)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Chưa có báo cáo nào trong ngày này
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Report Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết báo cáo</DialogTitle>
            <DialogDescription>
              {selectedReport && format(new Date(selectedReport.report_date), 'EEEE, dd/MM/yyyy', { locale: vi })}
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar>
                  <AvatarFallback>
                    {getInitials(selectedReport.employees?.full_name || '')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{selectedReport.employees?.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedReport.employees?.email}
                  </div>
                </div>
                {getRoleBadge(selectedReport.employees?.role || 'staff')}
              </div>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Tiến độ công việc</span>
                    <span className="text-sm">
                      {selectedReport.tasks_completed}/{selectedReport.tasks_total} hoàn thành
                    </span>
                  </div>
                  <Progress 
                    value={getCompletionRate(selectedReport.tasks_completed, selectedReport.tasks_total)} 
                  />
                </CardContent>
              </Card>

              {selectedReport.achievements && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Thành tựu
                  </Label>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                    {selectedReport.achievements}
                  </div>
                </div>
              )}

              {selectedReport.challenges && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Khó khăn
                  </Label>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                    {selectedReport.challenges}
                  </div>
                </div>
              )}

              {selectedReport.tomorrow_plan && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-500" />
                    Kế hoạch ngày mai
                  </Label>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                    {selectedReport.tomorrow_plan}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {selectedReport && selectedReport.status !== 'reviewed' && (
              <Button 
                variant="outline" 
                onClick={() => reviewReport.mutate(selectedReport.id)}
                disabled={reviewReport.isPending}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {reviewReport.isPending ? 'Đang xử lý...' : 'Đánh dấu đã xem'}
              </Button>
            )}
            <Button onClick={() => setIsViewDialogOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
