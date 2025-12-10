import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useDailyReportsRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [reportForm, setReportForm] = useState({
    tasks_summary: '',
    achievements: '',
    challenges: '',
    notes: '',
  });

  // Enable realtime
  useDailyReportsRealtime();

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
    queryKey: ['daily-reports', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('daily_work_reports')
        .select('*')
        .eq('report_date', dateStr)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 10000,
  });

  // Check if user already submitted today
  const { data: userReport } = useQuery({
    queryKey: ['user-daily-report', format(new Date(), 'yyyy-MM-dd'), user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
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
      if (!user?.id) throw new Error('Not authenticated');

      // Get today's attendance for check-in/out times
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: attendance } = await supabase
        .from('attendance')
        .select('check_in_time, check_out_time')
        .eq('employee_id', user.id)
        .gte('check_in_time', today)
        .maybeSingle();

      const checkIn = attendance?.check_in_time || new Date().toISOString();
      const checkOut = attendance?.check_out_time || new Date().toISOString();
      
      // Calculate hours
      const hours = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60);

      const { error } = await supabase
        .from('daily_work_reports')
        .insert({
          employee_id: user.id,
          company_id: user.user_metadata?.company_id,
          report_date: today,
          check_in_time: checkIn,
          check_out_time: checkOut,
          total_hours: Math.max(0, hours),
          ...formData,
        });

      if (error) throw error;
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
    onError: (error: Error) => {
      toast({
        title: '❌ Lỗi',
        description: error.message,
        variant: 'destructive',
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
    createReportMutation.mutate(reportForm);
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
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Nộp báo cáo
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
              Báo cáo hôm nay
            </DialogTitle>
            <DialogDescription>
              {format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tasks Summary - Required */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4" />
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
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmitReport}
              disabled={createReportMutation.isPending || !reportForm.tasks_summary.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {createReportMutation.isPending ? 'Đang gửi...' : 'Gửi báo cáo'}
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
