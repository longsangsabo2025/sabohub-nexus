import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useDailyReportsRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler, ErrorCategory } from '@/hooks/use-error-handler';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  Clock,
  Target,
  AlertTriangle,
  TrendingUp,
  Zap,
  Send,
  CheckCircle2,
  Eye,
  Calendar,
  Pencil,
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DailyReport {
  id: string;
  employee_id: string;
  company_id: string;
  report_date: string;
  check_in_time: string;
  check_out_time: string;
  total_hours: number;
  tasks_summary: string;
  achievements: string;
  challenges: string;
  notes: string;
  employee_name: string;
  employee_role: string;
  created_at: string;
}

interface QuickStats {
  total_reports: number;
  avg_hours: number;
  completion_rate: number;
  active_employees: number;
}

export default function DailyReports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, employeeUser } = useAuth();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [reportForm, setReportForm] = useState({
    tasks_summary: '',
    achievements: '',
    challenges: '',
    notes: '',
  });

  // Enable realtime
  useDailyReportsRealtime();

  // Fetch user's active tasks for the report
  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks-report', employeeUser?.id],
    queryFn: async () => {
      if (!employeeUser?.id) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', employeeUser.id)
        .or('status.eq.in_progress,status.eq.completed')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeUser?.id,
  });

  // Fetch today's stats - Musk principle: Data-driven decisions
  const { data: stats } = useQuery<QuickStats>({
    queryKey: ['daily-report-stats', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('daily_work_reports')
        .select('total_hours')
        .eq('report_date', dateStr);

      if (error) throw error;

      const total_reports = data.length;
      const avg_hours = total_reports > 0 
        ? data.reduce((sum, r) => sum + (r.total_hours || 0), 0) / total_reports 
        : 0;
      
      return {
        total_reports,
        avg_hours: Math.round(avg_hours * 10) / 10,
        completion_rate: 85, // Calculate from tasks
        active_employees: total_reports,
      };
    },
    staleTime: 30000,
  });

  // Fetch reports for selected date
  const { data: reports = [], isLoading } = useQuery<DailyReport[]>({
    queryKey: ['daily-reports', format(selectedDate, 'yyyy-MM-dd'), user?.id, employeeUser?.id],
    queryFn: async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // If user is logged in via Employee Login (Staff/Manager), use RPC to bypass RLS
      if (employeeUser) {
        const { data, error } = await supabase.rpc('get_daily_reports', {
          p_date: dateStr,
          p_employee_id: employeeUser.id,
          p_company_id: employeeUser.company_id,
          p_branch_id: employeeUser.branch_id,
          p_role: employeeUser.role
        });
        
        if (error) throw error;
        return data || [];
      }

      // If user is logged in via Supabase Auth (CEO/Manager), use standard query with manual join
      // First fetch reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('daily_work_reports')
        .select('*')
        .eq('report_date', dateStr)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;
      if (!reportsData || reportsData.length === 0) return [];

      // Then fetch employee details for these reports
      const employeeIds = [...new Set(reportsData.map(r => r.employee_id))];
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name, role')
        .in('id', employeeIds);

      if (employeesError) {
        console.error('Error fetching employee details:', employeesError);
        // Return reports without names if employee fetch fails
        return reportsData.map(report => ({
          ...report,
          employee_name: 'Unknown',
          employee_role: 'Unknown'
        }));
      }

      // Map employee details to reports
      const employeeMap = new Map(employeesData?.map(e => [e.id, e]));
      
      return reportsData.map(report => {
        const employee = employeeMap.get(report.employee_id);
        return {
          ...report,
          employee_name: employee?.full_name || 'Unknown',
          employee_role: employee?.role || 'Unknown'
        };
      });
    },
    staleTime: 10000,
  });

  // Check if user already submitted today
  const { data: userReport } = useQuery({
    queryKey: ['user-daily-report', format(new Date(), 'yyyy-MM-dd'), user?.id, employeeUser?.id],
    queryFn: async () => {
      const currentUserId = user?.id || employeeUser?.id;
      if (!currentUserId) return null;
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('daily_work_reports')
        .select('id')
        .eq('employee_id', user.id)
        .eq('report_date', today)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: async (formData: typeof reportForm) => {
      const currentUser = user || employeeUser;
      if (!currentUser?.id) throw new Error('Not authenticated');

      const employeeId = currentUser.id;
      const companyId = employeeUser?.company_id || user?.user_metadata?.company_id;
      const branchId = employeeUser?.branch_id;

      // Get today's attendance for check-in/out times
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      
      const { data: attendance } = await supabase
        .from('attendance')
        .select('check_in_time, check_out_time')
        .eq('employee_id', employeeId)
        .gte('check_in_time', startOfDay.toISOString())
        .maybeSingle();

      const checkIn = attendance?.check_in_time || new Date().toISOString();
      const checkOut = attendance?.check_out_time || new Date().toISOString();
      
      // Calculate hours
      const hours = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60);

      const reportData = {
          employee_id: employeeId,
          company_id: companyId,
          branch_id: branchId,
          report_date: today,
          check_in_time: checkIn,
          check_out_time: checkOut,
          total_hours: Math.max(0, hours),
          ...formData,
      };

      const { error } = await supabase
        .from('daily_work_reports')
        .insert(reportData);

      if (error) {
        console.log('Standard insert failed, trying RPC fallback...', error);
        // Fallback to RPC for staff with custom auth
        const { data: rpcData, error: rpcError } = await supabase.rpc('submit_daily_report', {
          p_employee_id: reportData.employee_id,
          p_company_id: reportData.company_id,
          p_branch_id: reportData.branch_id,
          p_report_date: reportData.report_date,
          p_check_in_time: reportData.check_in_time,
          p_check_out_time: reportData.check_out_time,
          p_total_hours: reportData.total_hours,
          p_tasks_summary: reportData.tasks_summary,
          p_achievements: reportData.achievements,
          p_challenges: reportData.challenges,
          p_notes: reportData.notes
        });

        if (rpcError) throw error; // Throw original error if RPC also fails or doesn't exist
        if (rpcData && !rpcData.success) throw new Error(rpcData.error || 'Submission failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['user-daily-report'] });
      queryClient.invalidateQueries({ queryKey: ['daily-report-stats'] });
      setIsCreateDialogOpen(false);
      setReportForm({
        tasks_summary: '',
        achievements: '',
        challenges: '',
        notes: '',
      });
      toast({
        title: '✅ Đã gửi báo cáo',
        description: 'Báo cáo hôm nay đã được lưu thành công',
      });
    },
  });

  // Update report mutation
  const updateReportMutation = useMutation({
    mutationFn: async (formData: typeof reportForm) => {
      if (!editingReportId) throw new Error('No report selected for update');
      const currentUser = user || employeeUser;
      if (!currentUser?.id) throw new Error('Not authenticated');

      // If using Supabase Auth (CEO/Manager), use standard update
      if (user) {
        const { error } = await supabase
          .from('daily_work_reports')
          .update({
            tasks_summary: formData.tasks_summary,
            achievements: formData.achievements,
            challenges: formData.challenges,
            notes: formData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingReportId)
          .eq('employee_id', user.id); // RLS will also enforce this

        if (error) throw error;
      } 
      // If using Employee Auth (Staff), use RPC
      else if (employeeUser) {
        const { data, error } = await supabase.rpc('update_daily_report', {
          p_report_id: editingReportId,
          p_employee_id: employeeUser.id,
          p_tasks_summary: formData.tasks_summary,
          p_achievements: formData.achievements,
          p_challenges: formData.challenges,
          p_notes: formData.notes
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.error || 'Update failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['user-daily-report'] });
      setIsCreateDialogOpen(false);
      setIsEditing(false);
      setEditingReportId(null);
      setReportForm({
        tasks_summary: '',
        achievements: '',
        challenges: '',
        notes: '',
      });
      toast({
        title: '✅ Đã cập nhật',
        description: 'Báo cáo đã được cập nhật thành công',
      });
    },
    onError: (error: Error) => {
      handleError(error, {
        category: ErrorCategory.DATABASE,
        context: 'Failed to update daily report',
        operation: 'updateDailyReport',
        userId: employeeUser?.id || user?.id,
      });
    },
  });

  const handleSubmitReport = () => {
    if (!reportForm.tasks_summary.trim()) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng nhập tóm tắt công việc',
        variant: 'destructive',
      });
      return;
    }
    
    if (isEditing) {
      updateReportMutation.mutate(reportForm);
    } else {
      createReportMutation.mutate(reportForm);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Musk Style: Clear, Action-Oriented */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Báo cáo hàng ngày</h1>
          <p className="text-muted-foreground">
            {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: vi })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setSelectedDate(new Date())}
            variant={isToday(selectedDate) ? 'secondary' : 'outline'}
          >
            Hôm nay
          </Button>
          {isToday(selectedDate) && !userReport && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 relative"
            >
              <Send className="h-4 w-4 mr-2" />
              Nộp báo cáo
              {myTasks && myTasks.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {myTasks.length}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats - Data-Driven Decision Making */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng báo cáo</p>
                <p className="text-2xl font-bold">{stats?.total_reports || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Giờ TB/người</p>
                <p className="text-2xl font-bold">{stats?.avg_hours || 0}h</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hoàn thành</p>
                <p className="text-2xl font-bold">{stats?.completion_rate || 0}%</p>
              </div>
              <Target className="h-8 w-8 text-green-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nhân viên</p>
                <p className="text-2xl font-bold">{stats?.active_employees || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List - Minimal, Scannable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Báo cáo chi tiết
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Chưa có báo cáo nào cho ngày này</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(report.employee_name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{report.employee_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {report.employee_role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {report.total_hours}h
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {report.tasks_summary || 'Không có mô tả'}
                    </p>
                    {report.achievements && (
                      <div className="flex items-center gap-1 mt-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600 font-medium">
                          {report.achievements.length > 50 
                            ? report.achievements.substring(0, 50) + '...' 
                            : report.achievements}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReport(report);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Report Dialog - Fast Input */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              {isEditing ? 'Cập nhật báo cáo' : 'Báo cáo hôm nay'}
            </DialogTitle>
            <DialogDescription>
              {format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Task Selection */}
            {myTasks && myTasks.length > 0 && (
              <div className="space-y-3 border rounded-md p-3 bg-muted/20">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Chọn công việc liên quan
                </Label>
                <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto">
                  {myTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`task-${task.id}`} 
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTasks([...selectedTasks, task.id]);
                          } else {
                            setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={`task-${task.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {task.title} <span className="text-xs text-muted-foreground">({task.status === 'completed' ? 'Đã xong' : `${task.progress || 0}%`})</span>
                      </label>
                    </div>
                  ))}
                </div>
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => {
                    const selectedTaskObjects = myTasks.filter((t: any) => selectedTasks.includes(t.id));
                    const summary = selectedTaskObjects.map((t: any) => {
                      const statusText = t.status === 'completed' ? 'Đã hoàn thành' : `Đang thực hiện (${t.progress || 0}%)`;
                      return `- ${t.title}: ${statusText}`;
                    }).join('\n');
                    
                    setReportForm(prev => ({
                      ...prev,
                      tasks_summary: prev.tasks_summary ? `${prev.tasks_summary}\n${summary}` : summary
                    }));
                  }}
                  disabled={selectedTasks.length === 0}
                >
                  <Zap className="h-3 w-3 mr-2" />
                  Tự động điền báo cáo từ công việc đã chọn
                </Button>
              </div>
            )}

            {/* Tasks Summary - Required */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                Công việc đã làm *
              </Label>
              <Textarea
                placeholder="Tóm tắt các công việc bạn đã thực hiện hôm nay..."
                value={reportForm.tasks_summary}
                onChange={(e) => setReportForm({ ...reportForm, tasks_summary: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            <Separator />

            {/* Achievements */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Thành tựu
              </Label>
              <Textarea
                placeholder="Những điểm nổi bật, kết quả đạt được..."
                value={reportForm.achievements}
                onChange={(e) => setReportForm({ ...reportForm, achievements: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            {/* Challenges */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Khó khăn
              </Label>
              <Textarea
                placeholder="Những vấn đề gặp phải, cần hỗ trợ..."
                value={reportForm.challenges}
                onChange={(e) => setReportForm({ ...reportForm, challenges: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            {/* Notes */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                Ghi chú thêm
              </Label>
              <Textarea
                placeholder="Ghi chú bổ sung (tùy chọn)..."
                value={reportForm.notes}
                onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })}
                className="min-h-[60px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditing(false);
                setEditingReportId(null);
                setReportForm({
                  tasks_summary: '',
                  achievements: '',
                  challenges: '',
                  notes: '',
                });
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmitReport}
              disabled={createReportMutation.isPending || updateReportMutation.isPending || !reportForm.tasks_summary.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {createReportMutation.isPending || updateReportMutation.isPending ? 'Đang xử lý...' : (isEditing ? 'Cập nhật' : 'Gửi báo cáo')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Report Dialog - Clean Read Mode */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {getInitials(selectedReport.employee_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle>{selectedReport.employee_name}</DialogTitle>
                      <DialogDescription>
                        {format(parseISO(selectedReport.report_date), 'dd/MM/yyyy', { locale: vi })} • 
                        {selectedReport.total_hours}h
                      </DialogDescription>
                    </div>
                  </div>

                  {(user?.id === selectedReport.employee_id || employeeUser?.id === selectedReport.employee_id) && 
                   isToday(parseISO(selectedReport.report_date)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReportForm({
                          tasks_summary: selectedReport.tasks_summary,
                          achievements: selectedReport.achievements,
                          challenges: selectedReport.challenges,
                          notes: selectedReport.notes,
                        });
                        setEditingReportId(selectedReport.id);
                        setIsEditing(true);
                        setSelectedReport(null);
                        setIsCreateDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Sửa
                    </Button>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Tasks Summary */}
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4" />
                    Công việc đã làm
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedReport.tasks_summary || 'Không có'}
                  </p>
                </div>

                {selectedReport.achievements && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Thành tựu
                      </h4>
                      <p className="text-sm whitespace-pre-wrap bg-green-50 p-3 rounded-lg">
                        {selectedReport.achievements}
                      </p>
                    </div>
                  </>
                )}

                {selectedReport.challenges && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        Khó khăn
                      </h4>
                      <p className="text-sm whitespace-pre-wrap bg-orange-50 p-3 rounded-lg">
                        {selectedReport.challenges}
                      </p>
                    </div>
                  </>
                )}

                {selectedReport.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        Ghi chú
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedReport.notes}
                      </p>
                    </div>
                  </>
                )}

                <Separator />
                <div className="text-xs text-muted-foreground">
                  <p>Gửi lúc: {format(parseISO(selectedReport.created_at), 'HH:mm dd/MM/yyyy', { locale: vi })}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
