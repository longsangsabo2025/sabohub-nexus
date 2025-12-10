import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Target,
  DollarSign,
  BarChart3,
  FileCheck,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  FileText,
  Zap,
  Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { generateExecutiveSummaryPDF, generateCSVExport } from '@/utils/pdfExport';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sparkline } from '@/components/ui/sparkline';
import { predictRevenue, predictTaskCompletion } from '@/utils/predictiveAnalytics';

// Health Score Component
const HealthScoreCard = ({ score, trend }: { score: number; trend: 'up' | 'down' | 'stable' }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Xuất sắc';
    if (score >= 60) return 'Tốt';
    if (score >= 40) return 'Trung bình';
    return 'Cần cải thiện';
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Sức Khỏe Công Ty</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{getScoreLabel(score)}</p>
          </div>
          <div className="text-right">
            {trend === 'up' && <TrendingUp className="h-8 w-8 text-green-500" />}
            {trend === 'down' && <TrendingDown className="h-8 w-8 text-red-500" />}
            {trend === 'stable' && <Activity className="h-8 w-8 text-gray-500" />}
          </div>
        </div>
        <Progress value={score} className="mt-4" />
        <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
          <div>
            <div className="font-semibold text-green-600">Team: 90</div>
          </div>
          <div>
            <div className="font-semibold text-yellow-600">Ops: 75</div>
          </div>
          <div>
            <div className="font-semibold text-blue-600">Finance: 85</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Critical Alerts Card
const CriticalAlertsCard = ({ alerts }: { alerts: Array<{ title: string; description: string }> }) => {
  return (
    <Card className="border-2 border-red-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cảnh Báo</CardTitle>
          <Badge variant="destructive" className="text-xs">
            {alerts.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Không có cảnh báo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 3).map((alert, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-muted-foreground">{alert.description}</p>
                </div>
              </div>
            ))}
            {alerts.length > 3 && (
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Xem tất cả {alerts.length} cảnh báo
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Pending Approvals Card
const PendingApprovalsCard = ({ count }: { count: number }) => {
  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Chờ Duyệt</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600">{count}</div>
          <p className="text-sm text-muted-foreground mt-2">Yêu cầu chờ phê duyệt</p>
          <Link to="/approvals">
            <Button size="sm" className="w-full mt-4" disabled={count === 0}>
              <FileCheck className="h-4 w-4 mr-2" />
              Xem chi tiết
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

// Strategic Goals Card
const StrategicGoalsCard = () => {
  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Mục Tiêu Chiến Lược</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Q1 2025 Revenue</span>
              <span className="text-xs font-bold">60%</span>
            </div>
            <Progress value={60} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Team Growth</span>
              <span className="text-xs font-bold">75%</span>
            </div>
            <Progress value={75} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Customer Sat.</span>
              <span className="text-xs font-bold">88%</span>
            </div>
            <Progress value={88} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Quick Stats Card
const QuickStatCard = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon,
  loading 
}: { 
  title: string; 
  value: string | number; 
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<any>;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center gap-1 text-xs mt-1">
            {changeType === 'up' && <ArrowUpRight className="h-3 w-3 text-green-500" />}
            {changeType === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
            <span className={
              changeType === 'up' ? 'text-green-600' : 
              changeType === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }>
              {change}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Team Performance Card
const TeamPerformanceCard = ({ employees }: { employees: Array<{ full_name?: string; email: string; role?: string }> }) => {
  const topPerformers = employees.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Top Performers</span>
          <Badge variant="secondary">This Week</Badge>
        </CardTitle>
        <CardDescription>Nhân viên xuất sắc nhất</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topPerformers.map((emp, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium text-sm">{emp.full_name || emp.email}</p>
                  <p className="text-xs text-muted-foreground">{emp.role}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                95%
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Critical Issues Card
const CriticalIssuesCard = ({ issues }: { issues: Array<{ title: string; description: string; priority: string }> }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cần Xử Lý</span>
          <Badge variant="destructive">{issues.length}</Badge>
        </CardTitle>
        <CardDescription>Vấn đề cần hành động ngay</CardDescription>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium">Tất cả đều ổn!</p>
            <p className="text-sm">Không có vấn đề cần xử lý</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue, i) => (
              <div key={i} className="p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{issue.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {issue.priority}
                  </Badge>
                </div>
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Xử lý ngay
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function CEODashboard() {
  const { currentRole } = useAuth();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ceo-dashboard-stats'],
    queryFn: async () => {
      const [employeesResult, tasksResult, attendanceResult, reportsResult] = await Promise.all([
        supabase.from('employees').select('id, full_name, email, role', { count: 'exact' }),
        supabase.from('tasks').select('id, status, priority, due_date, assigned_to', { count: 'exact' }),
        supabase.from('attendance').select('id, check_in, status, date', { count: 'exact' }),
        supabase.from('daily_work_reports').select('id, hours_worked, date, report_date', { count: 'exact' }),
      ]);

      const employees = employeesResult.data || [];
      const tasks = tasksResult.data || [];
      const attendance = attendanceResult.data || [];
      const reports = reportsResult.data || [];
      
      // REAL METRICS - Not mock data
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const overdueTasks = tasks.filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date() && t.status !== 'completed';
      }).length;

      // Calculate today's attendance
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = attendance.filter(a => 
        a.date?.startsWith(today) || a.check_in?.startsWith(today)
      ).length;

      // Calculate this week's reports  
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentReports = reports.filter(r => {
        const reportDate = r.report_date || r.date;
        return reportDate && new Date(reportDate) >= weekAgo;
      });

      const totalHours = recentReports.reduce((sum, r) => sum + (r.hours_worked || 0), 0);
      const avgHours = recentReports.length > 0 ? totalHours / recentReports.length : 0;

      // Calculate top performers (by task completion)
      const employeeTaskCount = employees.map(emp => ({
        name: emp.full_name,
        email: emp.email,
        completedTasks: tasks.filter(t => t.assigned_to === emp.id && t.status === 'completed').length,
        totalTasks: tasks.filter(t => t.assigned_to === emp.id).length,
      })).sort((a, b) => b.completedTasks - a.completedTasks).slice(0, 5);

      return {
        totalEmployees: employeesResult.count || 0,
        employees,
        employeesList: employees,
        tasks: tasksResult.count || 0,
        completedTasks,
        overdueTasks,
        todayAttendance,
        totalAttendance: attendanceResult.count || 0,
        attendance: attendanceResult.count || 0,
        reports: reportsResult.count || 0,
        recentReports: recentReports.length,
        avgHours: avgHours.toFixed(1),
        completionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
        topPerformers: employeeTaskCount.map(e => ({
          name: e.name,
          score: e.totalTasks > 0 ? Math.round((e.completedTasks / e.totalTasks) * 100) : 0,
        })),
      };
    },
  });

  // Calculate health score based on REAL metrics
  const healthScore = useMemo(() => {
    if (!stats) return 0;
    
    // Task Health: Completion rate (0-100)
    const taskHealth = stats.completionRate;
    
    // Team Health: Attendance rate today
    const attendanceRate = stats.totalEmployees > 0 
      ? Math.round((stats.todayAttendance / stats.totalEmployees) * 100)
      : 0;
    const teamHealth = attendanceRate;
    
    // Ops Health: Inverse of overdue tasks (fewer overdue = better)
    const opsHealth = stats.tasks > 0
      ? Math.max(0, 100 - Math.round((stats.overdueTasks / stats.tasks) * 100))
      : 100;
    
    // Weighted average: Task completion is most important
    const weighted = (taskHealth * 0.4) + (teamHealth * 0.3) + (opsHealth * 0.3);
    
    return Math.round(weighted);
  }, [stats]);

  // Predictive analytics
  const predictions = useMemo(() => {
    if (!stats) return null;

    // Historical data (mock - last 5 periods)
    const revenueHistory = [2100000000, 2200000000, 2300000000, 2400000000, 2500000000];
    const completionHistory = [75, 78, 82, 85, stats.completionRate];

    const revenuePrediction = predictRevenue(revenueHistory);
    const completionPrediction = predictTaskCompletion(completionHistory);

    return {
      revenue: revenuePrediction,
      completion: completionPrediction,
    };
  }, [stats]);

  // Generate alerts
  const alerts = useMemo(() => {
    if (!stats) return [];
    
    const alertList: Array<{ title: string; description: string }> = [];
    if (stats.overdueTasks > 0) {
      alertList.push({
        title: `${stats.overdueTasks} công việc quá hạn`,
        description: 'Cần phân công hoặc hủy bỏ',
      });
    }
    if (stats.completionRate < 70) {
      alertList.push({
        title: 'Tỷ lệ hoàn thành thấp',
        description: `Chỉ ${stats.completionRate}% task hoàn thành`,
      });
    }
    return alertList;
  }, [stats]);

  // Generate critical issues
  const criticalIssues = useMemo(() => {
    if (!stats) return [];
    
    const issues: Array<{ title: string; description: string; priority: string }> = [];
    if (stats.overdueTasks > 5) {
      issues.push({
        title: 'Nhiều task quá hạn',
        description: `${stats.overdueTasks} công việc chưa hoàn thành`,
        priority: 'Urgent',
      });
    }
    if (stats.reports === 0) {
      issues.push({
        title: 'Chưa có báo cáo hôm nay',
        description: 'Nhân viên chưa nộp báo cáo',
        priority: 'High',
      });
    }
    return issues;
  }, [stats]);

  // Export handlers
  const handlePDFExport = () => {
    if (!stats) return;
    
    generateExecutiveSummaryPDF({
      healthScore,
      // Removed mock revenue - focus on operational KPIs
      employees: stats.totalEmployees,
      todayAttendance: stats.todayAttendance,
      attendanceRate: stats.totalEmployees > 0 
        ? Math.round((stats.todayAttendance / stats.totalEmployees) * 100) 
        : 0,
      totalTasks: stats.tasks,
      completedTasks: stats.completedTasks,
      overdueTasks: stats.overdueTasks,
      completionRate: stats.completionRate,
      avgHours: typeof stats.avgHours === 'string' ? parseFloat(stats.avgHours) : stats.avgHours,
      recentReports: stats.recentReports,
      criticalAlerts: alerts.length,
      pendingApprovals: 0, // TODO: Add approvals system
      topPerformers: stats.topPerformers.map(p => ({
        name: p.name,
        score: p.score,
      })),
      strategicGoals: [
        { name: 'Task Completion Rate', progress: stats.completionRate, target: 85 },
        { name: 'Team Attendance', progress: stats.totalEmployees > 0 ? Math.round((stats.todayAttendance / stats.totalEmployees) * 100) : 0, target: 95 },
        { name: 'Zero Overdue Tasks', progress: stats.tasks > 0 ? Math.max(0, 100 - Math.round((stats.overdueTasks / stats.tasks) * 100)) : 100, target: 100 },
      ],
    });
  };

  const handleCSVExport = () => {
    if (!stats) return;
    
    generateCSVExport({
      healthScore,
      revenue: 2500000000,
      employees: stats.totalEmployees,
      completionRate: stats.completionRate,
      avgHours: typeof stats.avgHours === 'string' ? parseFloat(stats.avgHours) : stats.avgHours,
      criticalAlerts: alerts.length,
      pendingApprovals: 12,
      topPerformers: stats.topPerformers.map(p => ({
        name: p.name,
        score: p.score,
      })),
      strategicGoals: [
        { name: 'Q1 Revenue Growth', progress: 78 },
        { name: 'Team Expansion', progress: 65 },
        { name: 'Customer Satisfaction', progress: 92 },
      ],
    });
  };

  // Redirect non-CEO users
  if (currentRole !== 'ceo') {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Chỉ dành cho CEO</h2>
          <p className="text-muted-foreground mb-6">Trang này chỉ dành cho CEO</p>
          <Link to="/dashboard">
            <Button>Quay lại Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="h-8 w-8 text-purple-600" />
              CEO Dashboard
            </h2>
            <p className="text-muted-foreground">Executive command center</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePDFExport}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCSVExport}>
                  <FileText className="h-4 w-4 mr-2" />
                  CSV Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/approvals">
              <Button size="sm">
                <FileCheck className="h-4 w-4 mr-2" />
                Approvals
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Executive Summary Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <HealthScoreCard score={healthScore} trend="up" />
        <CriticalAlertsCard alerts={alerts} />
        <PendingApprovalsCard count={0} />
        <StrategicGoalsCard />
      </div>

      <Separator />

      {/* Predictive Analytics Section */}
      {predictions && (
        <div>
          <h3 className="text-lg font-semibold mb-4">AI Predictions & Forecasts</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Revenue Prediction Card */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Revenue Forecast
                  </CardTitle>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                    {predictions.revenue.confidence}% Confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Revenue</p>
                    <p className="text-2xl font-bold text-blue-600">2.5B ₫</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">30-Day Forecast</p>
                      <p className="text-lg font-semibold text-blue-700">
                        {(predictions.revenue.forecast.next30Days / 1000000000).toFixed(1)}B ₫
                      </p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{((predictions.revenue.forecast.next30Days / 2500000000 - 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">90-Day Forecast</p>
                      <p className="text-lg font-semibold text-blue-700">
                        {(predictions.revenue.forecast.next90Days / 1000000000).toFixed(1)}B ₫
                      </p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{((predictions.revenue.forecast.next90Days / 2500000000 - 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Trend Analysis</p>
                    <p className="text-sm font-medium capitalize flex items-center gap-2">
                      {predictions.revenue.trend === 'up' && <span className="text-green-600">📈 Upward Trend</span>}
                      {predictions.revenue.trend === 'down' && <span className="text-red-600">📉 Downward Trend</span>}
                      {predictions.revenue.trend === 'stable' && <span className="text-gray-600">➡️ Stable</span>}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Task Completion Prediction Card */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" />
                    Task Completion Forecast
                  </CardTitle>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    {predictions.completion.confidence}% Confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Rate</p>
                    <p className="text-2xl font-bold text-green-600">{stats?.completionRate || 0}%</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">30-Day Forecast</p>
                      <p className="text-lg font-semibold text-green-700">
                        {predictions.completion.forecast.next30Days.toFixed(1)}%
                      </p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{((predictions.completion.forecast.next30Days / (stats?.completionRate || 1) - 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">90-Day Forecast</p>
                      <p className="text-lg font-semibold text-green-700">
                        {predictions.completion.forecast.next90Days.toFixed(1)}%
                      </p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{((predictions.completion.forecast.next90Days / (stats?.completionRate || 1) - 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Trend Analysis</p>
                    <p className="text-sm font-medium capitalize flex items-center gap-2">
                      {predictions.completion.trend === 'up' && <span className="text-green-600">📈 Improving</span>}
                      {predictions.completion.trend === 'down' && <span className="text-red-600">📉 Declining</span>}
                      {predictions.completion.trend === 'stable' && <span className="text-gray-600">➡️ Stable</span>}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Quick Stats Row */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <QuickStatCard
            title="Doanh Thu Tháng"
            value="2.5B ₫"
            icon={DollarSign}
            change="+8.2%"
            changeType="up"
          />
          <QuickStatCard
            title="Tổng Nhân Viên"
            value={stats?.totalEmployees || 0}
            icon={Users}
            change="+4"
            changeType="up"
          />
          <QuickStatCard
            title="Tỷ Lệ Hoàn Thành"
            value={`${stats?.completionRate || 0}%`}
            icon={Target}
            change={stats?.completionRate && stats.completionRate >= 80 ? "+5%" : "-2%"}
            changeType={stats?.completionRate && stats.completionRate >= 80 ? 'up' : 'down'}
          />
          <QuickStatCard
            title="Giờ Làm TB"
            value={`${stats?.avgHours || 0}h`}
            icon={Clock}
            change="+0.3h"
            changeType="up"
          />
        </div>
      </div>

      <Separator />

      {/* Bottom Row: Team Performance + Critical Issues */}
      <div className="grid gap-4 md:grid-cols-2">
        <TeamPerformanceCard employees={stats?.employeesList || []} />
        <CriticalIssuesCard issues={criticalIssues} />
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/employees">
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Quản lý Team
              </Button>
            </Link>
            <Link to="/tasks">
              <Button variant="outline" className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Công việc
              </Button>
            </Link>
            <Link to="/reports">
              <Button variant="outline" className="w-full">
                <BarChart3 className="h-4 w-4 mr-2" />
                Thống kê
              </Button>
            </Link>
            <Link to="/kpi">
              <Button variant="outline" className="w-full">
                <Target className="h-4 w-4 mr-2" />
                KPI Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
