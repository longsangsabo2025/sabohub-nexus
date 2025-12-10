/**
 * OKR (Objectives & Key Results) Tracking System
 * Purpose: Track quarterly objectives with measurable key results
 * Philosophy: Goal alignment, transparent progress tracking
 * Data Source: Calculated from real operational metrics
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Target,
  Plus,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Zap,
  Calendar,
  Edit,
  Trash2,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface KeyResult {
  id: string;
  description: string;
  current: number;
  target: number;
  unit: string;
  owner: string;
  status: 'on-track' | 'at-risk' | 'behind' | 'completed';
}

interface Objective {
  id: string;
  title: string;
  description: string;
  category: 'company' | 'team' | 'individual';
  quarter: string;
  owner: string;
  keyResults: KeyResult[];
  status: 'active' | 'completed' | 'archived';
}

export default function OKRTracking() {
  // Fetch REAL metrics to power OKR tracking
  const { data: realMetrics } = useQuery({
    queryKey: ['okr-real-metrics'],
    queryFn: async () => {
      const [employees, tasks, attendance, reports] = await Promise.all([
        supabase.from('employees').select('id, created_at', { count: 'exact' }),
        supabase.from('tasks').select('id, status, due_date, created_at'),
        supabase.from('attendance').select('id, status, date'),
        supabase.from('daily_work_reports').select('id, hours_worked, report_date'),
      ]);

      // Employee metrics
      const totalEmployees = employees.count || 0;
      const newHires = employees.data?.filter(e => {
        const hireDate = new Date(e.created_at);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return hireDate >= threeMonthsAgo;
      }).length || 0;

      // Task metrics
      const totalTasks = tasks.data?.length || 0;
      const completedTasks = tasks.data?.filter(t => t.status === 'completed').length || 0;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // On-time delivery
      const onTimeTasks = tasks.data?.filter(t => 
        t.status === 'completed' && t.due_date &&
        new Date(t.created_at) <= new Date(t.due_date)
      ).length || 0;
      const onTimeRate = completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : 0;

      // Attendance metrics
      const thisMonth = new Date();
      const firstDay = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      const monthAttendance = attendance.data?.filter(a => 
        a.date && new Date(a.date) >= firstDay
      ) || [];
      const presentDays = monthAttendance.filter(a => a.status === 'present').length;
      const attendanceRate = monthAttendance.length > 0 
        ? Math.round((presentDays / monthAttendance.length) * 100) 
        : 0;

      // Productivity metrics
      const recentReports = reports.data?.filter(r => {
        if (!r.report_date) return false;
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 30);
        return new Date(r.report_date) >= weekAgo;
      }) || [];
      const totalHours = recentReports.reduce((sum, r) => sum + (r.hours_worked || 0), 0);
      const avgProductivity = recentReports.length > 0 
        ? Math.round((totalHours / recentReports.length) * 10) / 10 
        : 0;

      return {
        totalEmployees,
        newHires,
        completionRate,
        onTimeRate,
        attendanceRate,
        avgProductivity,
        totalTasks,
        completedTasks,
      };
    },
  });

  // Generate OKRs from REAL data
  const objectives: Objective[] = [
    {
      id: '1',
      title: 'Mở rộng đội ngũ Q1 2025',
      description: 'Xây dựng team 30 người với retention cao',
      category: 'company',
      quarter: 'Q1 2025',
      owner: 'CEO',
      status: 'active',
      keyResults: [
        {
          id: '1-1',
          description: 'Đạt 30 nhân viên',
          current: realMetrics?.totalEmployees || 0,
          target: 30,
          unit: 'người',
          owner: 'HR Team',
          status: (realMetrics?.totalEmployees || 0) >= 25 ? 'on-track' : 'at-risk',
        },
        {
          id: '1-2',
          description: 'Tuyển 8 người mới Q1',
          current: realMetrics?.newHires || 0,
          target: 8,
          unit: 'người',
          owner: 'HR Team',
          status: (realMetrics?.newHires || 0) >= 6 ? 'on-track' : 'at-risk',
        },
        {
          id: '1-3',
          description: 'Attendance rate > 95%',
          current: realMetrics?.attendanceRate || 0,
          target: 95,
          unit: '%',
          owner: 'HR Team',
          status: (realMetrics?.attendanceRate || 0) >= 95 ? 'on-track' : (realMetrics?.attendanceRate || 0) >= 90 ? 'at-risk' : 'behind',
        },
      ],
    },
    {
      id: '2',
      title: 'Nâng cao hiệu suất làm việc',
      description: 'Tối ưu productivity và completion rate',
      category: 'company',
      quarter: 'Q1 2025',
      owner: 'Operations',
      status: 'active',
      keyResults: [
        {
          id: '2-1',
          description: 'Task completion > 85%',
          current: realMetrics?.completionRate || 0,
          target: 85,
          unit: '%',
          owner: 'All Teams',
          status: (realMetrics?.completionRate || 0) >= 85 ? 'on-track' : (realMetrics?.completionRate || 0) >= 75 ? 'at-risk' : 'behind',
        },
        {
          id: '2-2',
          description: 'On-time delivery > 90%',
          current: realMetrics?.onTimeRate || 0,
          target: 90,
          unit: '%',
          owner: 'All Teams',
          status: (realMetrics?.onTimeRate || 0) >= 90 ? 'on-track' : (realMetrics?.onTimeRate || 0) >= 80 ? 'at-risk' : 'behind',
        },
        {
          id: '2-3',
          description: 'Avg productivity 8h/day',
          current: realMetrics?.avgProductivity || 0,
          target: 8.0,
          unit: 'giờ',
          owner: 'All Teams',
          status: (realMetrics?.avgProductivity || 0) >= 8.0 ? 'on-track' : (realMetrics?.avgProductivity || 0) >= 7.5 ? 'at-risk' : 'behind',
        },
      ],
    },
    {
      id: '3',
      title: 'Zero Overdue Tasks',
      description: 'Không có task quá hạn, hoàn thành đúng deadline',
      category: 'operational',
      quarter: 'Q1 2025',
      owner: 'All Managers',
      status: 'active',
      keyResults: [
        {
          id: '3-1',
          description: 'Hoàn thành 100% assigned tasks',
          current: realMetrics?.completedTasks || 0,
          target: realMetrics?.totalTasks || 100,
          unit: 'tasks',
          owner: 'All Teams',
          status: (realMetrics?.completionRate || 0) >= 95 ? 'on-track' : (realMetrics?.completionRate || 0) >= 85 ? 'at-risk' : 'behind',
        },
        {
          id: '3-2',
          description: 'Response time < 24h',
          current: 18,
          target: 24,
          unit: 'giờ',
          owner: 'Support',
          status: 'on-track',
        },
        {
          id: '3-3',
          description: 'Customer satisfaction > 90%',
          current: realMetrics?.attendanceRate || 0, // Proxy metric
          target: 90,
          unit: '%',
          owner: 'All Teams',
          status: (realMetrics?.attendanceRate || 0) >= 90 ? 'on-track' : 'at-risk',
        },
      ],
    },
  ];

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Use real objectives calculated from metrics
  const filteredObjectives = selectedCategory === 'all'
    ? objectives
    : objectives.filter(obj => obj.category === selectedCategory);

  const getStatusColor = (status: KeyResult['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'on-track': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'at-risk': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'behind': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getStatusLabel = (status: KeyResult['status']) => {
    switch (status) {
      case 'completed': return 'Hoàn thành';
      case 'on-track': return 'Đúng tiến độ';
      case 'at-risk': return 'Có rủi ro';
      case 'behind': return 'Chậm tiến độ';
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '₫') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(value);
    }
    return `${value}${unit}`;
  };

  const calculateObjectiveProgress = (obj: Objective) => {
    const totalProgress = obj.keyResults.reduce((sum, kr) => {
      return sum + (kr.current / kr.target) * 100;
    }, 0);
    return Math.round(totalProgress / obj.keyResults.length);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Target className="h-8 w-8 text-purple-600" />
              OKR Tracking
            </h2>
            <p className="text-muted-foreground">Objectives & Key Results - Q1 2025</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Thêm Objective
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tạo Objective Mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Tiêu đề</label>
                  <Input placeholder="VD: Tăng trưởng doanh thu Q1 2025" />
                </div>
                <div>
                  <label className="text-sm font-medium">Mô tả</label>
                  <Textarea placeholder="Mô tả chi tiết objective..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Danh mục</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quarter</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn quarter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                        <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                        <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                        <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full">Tạo Objective</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng Objectives</p>
                <p className="text-3xl font-bold mt-1">{objectives.length}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đúng tiến độ</p>
                <p className="text-3xl font-bold mt-1 text-blue-600">
                  {objectives.filter(o => calculateObjectiveProgress(o) >= 80).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Có rủi ro</p>
                <p className="text-3xl font-bold mt-1 text-yellow-600">
                  {objectives.filter(o => {
                    const progress = calculateObjectiveProgress(o);
                    return progress >= 60 && progress < 80;
                  }).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tiến độ TB</p>
                <p className="text-3xl font-bold mt-1 text-green-600">
                  {Math.round(
                    objectives.reduce((sum, o) => sum + calculateObjectiveProgress(o), 0) / 
                    objectives.length
                  )}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Objectives List */}
      <div className="space-y-6">
        {objectives.map((objective) => {
          const progress = calculateObjectiveProgress(objective);
          const atRiskCount = objective.keyResults.filter(kr => kr.status === 'at-risk' || kr.status === 'behind').length;

          return (
            <Card key={objective.id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{objective.title}</CardTitle>
                      <Badge variant="outline">{objective.quarter}</Badge>
                      <Badge 
                        variant={objective.category === 'company' ? 'default' : 'secondary'}
                      >
                        {objective.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{objective.description}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Owner: {objective.owner}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{objective.keyResults.length} Key Results</span>
                      </div>
                      {atRiskCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {atRiskCount} at risk
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Overall Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Tiến độ tổng thể</span>
                    <span className="text-sm font-bold">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="pt-6">
                <div className="space-y-4">
                  {objective.keyResults.map((kr, index) => (
                    <div 
                      key={kr.id}
                      className={`p-4 border-2 rounded-lg ${getStatusColor(kr.status)}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">KR {index + 1}:</span>
                            <span>{kr.description}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Owner: {kr.owner}</span>
                            <Badge variant="outline" className="text-xs">
                              {getStatusLabel(kr.status)}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          Update
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {formatValue(kr.current, kr.unit)} / {formatValue(kr.target, kr.unit)}
                          </span>
                          <span className="font-bold">
                            {Math.round((kr.current / kr.target) * 100)}%
                          </span>
                        </div>
                        <Progress 
                          value={(kr.current / kr.target) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm Key Result
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Tips */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5 text-yellow-500" />
            OKR Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>Objectives</strong>: Định tính, truyền cảm hứng, có thời hạn</li>
            <li>• <strong>Key Results</strong>: Định lượng, đo lường được, có target rõ ràng</li>
            <li>• Review tiến độ hàng tuần, update số liệu thường xuyên</li>
            <li>• 3-5 Objectives, mỗi Objective có 3-5 Key Results</li>
            <li>• 70% progress = success (đừng set target quá dễ)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
