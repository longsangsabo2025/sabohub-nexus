/**
 * Team Health Monitoring
 * Purpose: Monitor team wellness, engagement, and performance
 * Philosophy: People-first, proactive care
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Heart,
  TrendingUp,
  TrendingDown,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Smile,
  Frown,
  Meh,
  Zap,
  Target,
  Coffee,
} from 'lucide-react';
import { Sparkline } from '@/components/ui/sparkline';
import { predictChurnRisk } from '@/utils/predictiveAnalytics';
import { useMemo } from 'react';

interface EmployeeHealth {
  id: string;
  name: string;
  attendanceRate: number;
  taskCompletionRate: number;
  avgHoursWorked: number;
  lastCheckIn: string;
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  trends: number[];
}

export default function TeamHealthMonitoring() {
  // Fetch employee data
  const { data: employees } = useQuery({
    queryKey: ['employees-health'],
    queryFn: async () => {
      const { data } = await supabase
        .from('employees')
        .select('id, name, role')
        .eq('deleted_at', null);
      return data || [];
    },
  });

  // Fetch attendance data
  const { data: attendanceData } = useQuery({
    queryKey: ['attendance-health'],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('employee_id, hours_worked, created_at')
        .eq('deleted_at', null)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      return data || [];
    },
  });

  // Fetch tasks data
  const { data: tasksData } = useQuery({
    queryKey: ['tasks-health'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('assigned_to, status')
        .eq('deleted_at', null);
      return data || [];
    },
  });

  // Calculate employee health metrics
  const employeeHealthMetrics: EmployeeHealth[] = useMemo(() => {
    if (!employees || !attendanceData || !tasksData) return [];

    return employees.map(emp => {
      // Attendance rate (last 30 days)
      const empAttendance = attendanceData.filter(a => a.employee_id === emp.id);
      const attendanceRate = Math.min(100, (empAttendance.length / 30) * 100);

      // Task completion rate
      const empTasks = tasksData.filter(t => t.assigned_to === emp.id);
      const completedTasks = empTasks.filter(t => t.status === 'completed').length;
      const taskCompletionRate = empTasks.length > 0 
        ? (completedTasks / empTasks.length) * 100 
        : 0;

      // Average hours worked
      const avgHoursWorked = empAttendance.length > 0
        ? empAttendance.reduce((sum, a) => sum + (a.hours_worked || 0), 0) / empAttendance.length
        : 0;

      // Health score (weighted average)
      const healthScore = Math.round(
        attendanceRate * 0.3 + 
        taskCompletionRate * 0.4 + 
        (avgHoursWorked / 8 * 100) * 0.3
      );

      // Risk level
      const riskLevel = predictChurnRisk(
        attendanceRate,
        taskCompletionRate,
        avgHoursWorked,
        8
      );

      // Trends (mock for now - last 7 days)
      const trends = Array.from({ length: 7 }, () => 
        Math.max(0, healthScore + Math.random() * 20 - 10)
      );

      return {
        id: emp.id,
        name: emp.name,
        attendanceRate: Math.round(attendanceRate),
        taskCompletionRate: Math.round(taskCompletionRate),
        avgHoursWorked: Math.round(avgHoursWorked * 10) / 10,
        lastCheckIn: empAttendance[0]?.created_at || 'N/A',
        healthScore,
        riskLevel,
        trends,
      };
    });
  }, [employees, attendanceData, tasksData]);

  // Team summary
  const teamSummary = useMemo(() => {
    if (employeeHealthMetrics.length === 0) {
      return {
        avgHealthScore: 0,
        atRiskCount: 0,
        healthyCount: 0,
        criticalCount: 0,
      };
    }

    const avgHealthScore = Math.round(
      employeeHealthMetrics.reduce((sum, e) => sum + e.healthScore, 0) / 
      employeeHealthMetrics.length
    );

    const atRiskCount = employeeHealthMetrics.filter(
      e => e.riskLevel === 'medium' || e.riskLevel === 'high'
    ).length;

    const healthyCount = employeeHealthMetrics.filter(
      e => e.riskLevel === 'low'
    ).length;

    const criticalCount = employeeHealthMetrics.filter(
      e => e.riskLevel === 'critical'
    ).length;

    return { avgHealthScore, atRiskCount, healthyCount, criticalCount };
  }, [employeeHealthMetrics]);

  const getRiskColor = (riskLevel: EmployeeHealth['riskLevel']) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getRiskLabel = (riskLevel: EmployeeHealth['riskLevel']) => {
    switch (riskLevel) {
      case 'low': return 'Khỏe mạnh';
      case 'medium': return 'Cần chú ý';
      case 'high': return 'Rủi ro cao';
      case 'critical': return 'Nghiêm trọng';
    }
  };

  const getHealthIcon = (healthScore: number) => {
    if (healthScore >= 80) return <Smile className="h-6 w-6 text-green-500" />;
    if (healthScore >= 60) return <Meh className="h-6 w-6 text-yellow-500" />;
    return <Frown className="h-6 w-6 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Heart className="h-8 w-8 text-red-500" />
              Team Health
            </h2>
            <p className="text-muted-foreground">Theo dõi sức khỏe và động lực của team</p>
          </div>
          <Button variant="outline">
            <Coffee className="h-4 w-4 mr-2" />
            Team Building
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Health Score TB</p>
                <p className="text-3xl font-bold mt-1">{teamSummary.avgHealthScore}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Khỏe mạnh</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{teamSummary.healthyCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cần chú ý</p>
                <p className="text-3xl font-bold mt-1 text-yellow-600">{teamSummary.atRiskCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nghiêm trọng</p>
                <p className="text-3xl font-bold mt-1 text-red-600">{teamSummary.criticalCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {teamSummary.criticalCount > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>⚠️ Cảnh báo:</strong> Có {teamSummary.criticalCount} nhân viên cần được chăm sóc ngay lập tức.
            Hãy liên hệ với HR để tìm hiểu và hỗ trợ.
          </AlertDescription>
        </Alert>
      )}

      {/* Employee Health List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Chi tiết sức khỏe nhân viên
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {employeeHealthMetrics
              .sort((a, b) => a.healthScore - b.healthScore) // Show at-risk first
              .map((emp) => (
                <div 
                  key={emp.id}
                  className={`p-4 border-2 rounded-lg ${getRiskColor(emp.riskLevel)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div>{getHealthIcon(emp.healthScore)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{emp.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {getRiskLabel(emp.riskLevel)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <span>Chấm công: {emp.attendanceRate}%</span>
                          <span>Hoàn thành: {emp.taskCompletionRate}%</span>
                          <span>Giờ làm: {emp.avgHoursWorked}h/ngày</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Sparkline 
                        data={emp.trends} 
                        width={80} 
                        height={30}
                        color={emp.healthScore >= 70 ? '#10b981' : '#ef4444'}
                      />
                      <div className="text-right">
                        <div className="text-2xl font-bold">{emp.healthScore}</div>
                        <p className="text-xs text-muted-foreground">Health Score</p>
                      </div>
                    </div>
                  </div>

                  {/* Health Score Progress */}
                  <div>
                    <Progress value={emp.healthScore} className="h-2" />
                  </div>

                  {/* Action buttons for at-risk employees */}
                  {(emp.riskLevel === 'high' || emp.riskLevel === 'critical') && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        1-on-1
                      </Button>
                      <Button size="sm" variant="outline">
                        <Heart className="h-3 w-3 mr-1" />
                        Hỗ trợ
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Health Tips */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5 text-yellow-500" />
            Cải thiện Team Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>Weekly 1-on-1:</strong> Gặp gỡ nhân viên at-risk để hiểu vấn đề</li>
            <li>• <strong>Work-life balance:</strong> Khuyến khích nghỉ ngơi, tránh burnout</li>
            <li>• <strong>Recognition:</strong> Khen ngợi và ghi nhận thành tích kịp thời</li>
            <li>• <strong>Growth opportunities:</strong> Tạo cơ hội phát triển và học hỏi</li>
            <li>• <strong>Team activities:</strong> Tổ chức team building định kỳ</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
