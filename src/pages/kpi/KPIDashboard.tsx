import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useKPIRealtime } from '@/hooks/useRealtime';
import type { KPITarget, KPIMetricType, KPIPeriod, Employee } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  Plus,
  BarChart3,
  Award,
  AlertTriangle,
  Pencil,
  Trash2,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';

const METRIC_TYPES: Record<KPIMetricType, { label: string; icon: React.ReactNode; unit: string }> = {
  completion_rate: { label: 'Tỷ lệ hoàn thành', icon: <CheckCircle2 className="h-4 w-4" />, unit: '%' },
  quality_score: { label: 'Điểm chất lượng', icon: <Award className="h-4 w-4" />, unit: 'điểm' },
  timeliness: { label: 'Đúng hạn', icon: <Clock className="h-4 w-4" />, unit: '%' },
  attendance_rate: { label: 'Tỷ lệ chuyên cần', icon: <Users className="h-4 w-4" />, unit: '%' },
  custom: { label: 'Tùy chỉnh', icon: <Target className="h-4 w-4" />, unit: '' },
};

const PERIODS: Record<KPIPeriod, string> = {
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
};

interface KPIPerformance {
  userId: string;
  userName: string;
  userRole: string;
  metrics: {
    type: KPIMetricType;
    target: number;
    actual: number;
    achievement: number;
  }[];
  overallScore: number;
}

export default function KPIDashboard() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<KPIPeriod>('weekly');
  const [editingTarget, setEditingTarget] = useState<KPITarget | null>(null);
  const [newTarget, setNewTarget] = useState({
    metric_name: '',
    metric_type: 'completion_rate' as KPIMetricType,
    target_value: 80,
    period: 'weekly' as KPIPeriod,
    role: '',
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch KPI targets
  const { data: targets, isLoading: loadingTargets } = useQuery({
    queryKey: ['kpi-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_targets')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate performance data
  const { data: performance, isLoading: loadingPerformance } = useQuery({
    queryKey: ['kpi-performance', selectedPeriod],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (selectedPeriod) {
        case 'daily':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'weekly':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'monthly':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
      }

      // Fetch tasks for completion rate
      const { data: tasks } = await supabase
        .from('tasks')
        .select('assignee_id, assigned_to, status, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Fetch attendance for attendance rate
      const { data: attendance } = await supabase
        .from('attendance')
        .select('employee_id, check_in_time, check_out_time, status')
        .gte('check_in_time', startDate.toISOString())
        .lte('check_in_time', endDate.toISOString());

      // Calculate metrics for each employee
      const performanceData: KPIPerformance[] = (employees || []).map((emp: Employee) => {
        const empTasks = tasks?.filter(t => t.assignee_id === emp.id || t.assigned_to === emp.id) || [];
        const empAttendance = attendance?.filter(a => a.employee_id === emp.id) || [];

        const totalTasks = empTasks.length;
        const completedTasks = empTasks.filter(t => t.status === 'completed').length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const totalDays = selectedPeriod === 'daily' ? 1 : selectedPeriod === 'weekly' ? 7 : 30;
        const attendedDays = empAttendance.length;
        const attendanceRate = Math.round((attendedDays / totalDays) * 100);

        const metrics = [
          { type: 'completion_rate' as KPIMetricType, target: 80, actual: completionRate, achievement: Math.min(100, Math.round((completionRate / 80) * 100)) },
          { type: 'attendance_rate' as KPIMetricType, target: 90, actual: attendanceRate, achievement: Math.min(100, Math.round((attendanceRate / 90) * 100)) },
        ];

        const overallScore = Math.round(metrics.reduce((sum, m) => sum + m.achievement, 0) / metrics.length);

        return {
          userId: emp.id,
          userName: emp.full_name || emp.email,
          userRole: emp.role,
          metrics,
          overallScore,
        };
      });

      return performanceData;
    },
    enabled: !!employees,
  });

  // Create target mutation
  const createTarget = useMutation({
    mutationFn: async (target: Partial<KPITarget>) => {
      const { data, error } = await supabase
        .from('kpi_targets')
        .insert({
          ...target,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets'] });
      setIsCreateDialogOpen(false);
      setNewTarget({
        metric_name: '',
        metric_type: 'completion_rate',
        target_value: 80,
        period: 'weekly',
        role: '',
      });
      toast({
        title: 'Thành công',
        description: 'Đã tạo mục tiêu KPI',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: `Không thể tạo KPI: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update KPI target mutation
  const updateTarget = useMutation({
    mutationFn: async (target: {
      id: string;
      metric_name: string;
      metric_type: KPIMetricType;
      target_value: number;
      period: KPIPeriod;
      role?: string;
    }) => {
      const { data, error } = await supabase
        .from('kpi_targets')
        .update({
          metric_name: target.metric_name,
          metric_type: target.metric_type,
          target_value: target.target_value,
          period: target.period,
          role: target.role || null,
        })
        .eq('id', target.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets'] });
      setIsEditDialogOpen(false);
      setEditingTarget(null);
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật mục tiêu KPI',
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

  // Delete KPI target mutation
  const deleteTarget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kpi_targets')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets'] });
      setDeleteTargetId(null);
      toast({
        title: 'Thành công',
        description: 'Đã xóa mục tiêu KPI',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: `Không thể xóa: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleCreateTarget = () => {
    createTarget.mutate({
      metric_name: newTarget.metric_name || METRIC_TYPES[newTarget.metric_type].label,
      metric_type: newTarget.metric_type,
      target_value: newTarget.target_value,
      period: newTarget.period,
      role: newTarget.role || undefined,
    });
  };

  const handleEditTarget = () => {
    if (!editingTarget) return;
    updateTarget.mutate({
      id: editingTarget.id,
      metric_name: editingTarget.metric_name,
      metric_type: editingTarget.metric_type,
      target_value: editingTarget.target_value,
      period: editingTarget.period,
      role: editingTarget.role || undefined,
    });
  };

  const openEditDialog = (target: KPITarget) => {
    setEditingTarget({ ...target });
    setIsEditDialogOpen(true);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Xuất sắc</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-500">Đạt</Badge>;
    return <Badge className="bg-red-500">Cần cải thiện</Badge>;
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
    const roleConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      ceo: { label: 'CEO', variant: 'default' },
      manager: { label: 'Quản lý', variant: 'secondary' },
      shift_leader: { label: 'Trưởng ca', variant: 'outline' },
      staff: { label: 'Nhân viên', variant: 'outline' },
    };
    const config = roleConfig[role] || roleConfig.staff;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Calculate summary stats
  const avgScore = performance?.length 
    ? Math.round(performance.reduce((sum, p) => sum + p.overallScore, 0) / performance.length)
    : 0;
  const topPerformers = performance?.filter(p => p.overallScore >= 90).length || 0;
  const needsImprovement = performance?.filter(p => p.overallScore < 70).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">KPI Dashboard</h2>
          <p className="text-muted-foreground">Theo dõi hiệu suất làm việc của nhân viên</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as KPIPeriod)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERIODS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tạo KPI
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo mục tiêu KPI mới</DialogTitle>
                <DialogDescription>Thiết lập chỉ tiêu đánh giá hiệu suất</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Loại KPI</Label>
                  <Select
                    value={newTarget.metric_type}
                    onValueChange={(value) => setNewTarget({ ...newTarget, metric_type: value as KPIMetricType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(METRIC_TYPES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            {config.icon}
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tên chỉ tiêu (tùy chọn)</Label>
                  <Input
                    value={newTarget.metric_name}
                    onChange={(e) => setNewTarget({ ...newTarget, metric_name: e.target.value })}
                    placeholder={METRIC_TYPES[newTarget.metric_type].label}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mục tiêu ({METRIC_TYPES[newTarget.metric_type].unit || 'giá trị'})</Label>
                  <Input
                    type="number"
                    value={newTarget.target_value}
                    onChange={(e) => setNewTarget({ ...newTarget, target_value: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chu kỳ đánh giá</Label>
                  <Select
                    value={newTarget.period}
                    onValueChange={(value) => setNewTarget({ ...newTarget, period: value as KPIPeriod })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PERIODS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Áp dụng cho vai trò (tùy chọn)</Label>
                  <Select
                    value={newTarget.role}
                    onValueChange={(value) => setNewTarget({ ...newTarget, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả nhân viên" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="manager">Quản lý</SelectItem>
                      <SelectItem value="shift_leader">Trưởng ca</SelectItem>
                      <SelectItem value="staff">Nhân viên</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreateTarget} disabled={createTarget.isPending}>
                  {createTarget.isPending ? 'Đang tạo...' : 'Tạo KPI'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Điểm trung bình</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}%</div>
            <p className="text-xs text-muted-foreground">Toàn công ty</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Xuất sắc</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{topPerformers}</div>
            <p className="text-xs text-muted-foreground">nhân viên ≥90%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cần cải thiện</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{needsImprovement}</div>
            <p className="text-xs text-muted-foreground">nhân viên &lt;70%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mục tiêu KPI</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{targets?.length || 0}</div>
            <p className="text-xs text-muted-foreground">đang hoạt động</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Hiệu suất nhân viên - {PERIODS[selectedPeriod]}
          </CardTitle>
          <CardDescription>
            {selectedPeriod === 'weekly' && `Tuần ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM')} - ${format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yyyy', { locale: vi })}`}
            {selectedPeriod === 'monthly' && format(new Date(), 'MMMM yyyy', { locale: vi })}
            {selectedPeriod === 'daily' && format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPerformance ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : performance && performance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Hoàn thành CV</TableHead>
                  <TableHead>Chuyên cần</TableHead>
                  <TableHead>Điểm tổng</TableHead>
                  <TableHead>Đánh giá</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance
                  .sort((a, b) => b.overallScore - a.overallScore)
                  .map((perf) => (
                    <TableRow key={perf.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{getInitials(perf.userName)}</AvatarFallback>
                          </Avatar>
                          <span>{perf.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(perf.userRole)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={perf.metrics.find(m => m.type === 'completion_rate')?.actual || 0} 
                            className="w-[60px]" 
                          />
                          <span className="text-sm">
                            {perf.metrics.find(m => m.type === 'completion_rate')?.actual || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={perf.metrics.find(m => m.type === 'attendance_rate')?.actual || 0} 
                            className="w-[60px]" 
                          />
                          <span className="text-sm">
                            {perf.metrics.find(m => m.type === 'attendance_rate')?.actual || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-lg font-bold ${getScoreColor(perf.overallScore)}`}>
                          {perf.overallScore}%
                        </span>
                      </TableCell>
                      <TableCell>{getScoreBadge(perf.overallScore)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Chưa có dữ liệu hiệu suất
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active KPI Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Mục tiêu KPI đang hoạt động
          </CardTitle>
          <CardDescription>Các chỉ tiêu đang được áp dụng</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTargets ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : targets && targets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên KPI</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Mục tiêu</TableHead>
                  <TableHead>Chu kỳ</TableHead>
                  <TableHead>Áp dụng cho</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((target: KPITarget) => (
                  <TableRow key={target.id}>
                    <TableCell className="font-medium">{target.metric_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {METRIC_TYPES[target.metric_type]?.icon}
                        {METRIC_TYPES[target.metric_type]?.label}
                      </div>
                    </TableCell>
                    <TableCell>
                      {target.target_value}{METRIC_TYPES[target.metric_type]?.unit}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{PERIODS[target.period]}</Badge>
                    </TableCell>
                    <TableCell>
                      {target.role ? getRoleBadge(target.role) : 'Tất cả'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(target)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTargetId(target.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Chưa có mục tiêu KPI nào. Hãy tạo mục tiêu đầu tiên!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit KPI Target Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa mục tiêu KPI</DialogTitle>
            <DialogDescription>Cập nhật thông tin mục tiêu</DialogDescription>
          </DialogHeader>
          {editingTarget && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Tên KPI</Label>
                <Input
                  value={editingTarget.metric_name}
                  onChange={(e) => setEditingTarget({ ...editingTarget, metric_name: e.target.value })}
                  placeholder="Nhập tên KPI"
                />
              </div>
              <div className="space-y-2">
                <Label>Loại chỉ số</Label>
                <Select
                  value={editingTarget.metric_type}
                  onValueChange={(value) => setEditingTarget({ ...editingTarget, metric_type: value as KPIMetricType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(METRIC_TYPES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          {config.icon}
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Giá trị mục tiêu</Label>
                <Input
                  type="number"
                  value={editingTarget.target_value}
                  onChange={(e) => setEditingTarget({ ...editingTarget, target_value: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Chu kỳ đánh giá</Label>
                <Select
                  value={editingTarget.period}
                  onValueChange={(value) => setEditingTarget({ ...editingTarget, period: value as KPIPeriod })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERIODS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Áp dụng cho vai trò</Label>
                <Select
                  value={editingTarget.role || 'all'}
                  onValueChange={(value) => setEditingTarget({ ...editingTarget, role: value === 'all' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="manager">Quản lý</SelectItem>
                    <SelectItem value="shift_leader">Trưởng ca</SelectItem>
                    <SelectItem value="staff">Nhân viên</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditTarget} disabled={updateTarget.isPending}>
              {updateTarget.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa mục tiêu KPI này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTargetId && deleteTarget.mutate(deleteTargetId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTarget.isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
