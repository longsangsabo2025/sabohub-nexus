import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, DollarSign, CheckSquare } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Reports() {
  const { data: taskStats, isLoading: tasksLoading } = useQuery({
    queryKey: ['task-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('status, priority, created_at');

      if (error) throw error;

      const statusCounts = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      };

      const priorityCounts = {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      };

      const monthlyData: Record<string, { month: string; tasks: number }> = {};

      data?.forEach((task) => {
        statusCounts[task.status as keyof typeof statusCounts]++;
        priorityCounts[task.priority as keyof typeof priorityCounts]++;

        const month = new Date(task.created_at).toLocaleDateString('vi-VN', {
          month: 'short',
          year: 'numeric',
        });
        if (!monthlyData[month]) {
          monthlyData[month] = { month, tasks: 0 };
        }
        monthlyData[month].tasks++;
      });

      return {
        statusCounts,
        priorityCounts,
        monthlyData: Object.values(monthlyData),
      };
    },
  });

  const { data: employeeStats, isLoading: employeesLoading } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('role');

      if (error) throw error;

      const roleCounts = {
        ceo: 0,
        manager: 0,
        shift_leader: 0,
        staff: 0,
      };

      data?.forEach((emp) => {
        roleCounts[emp.role as keyof typeof roleCounts]++;
      });

      return { roleCounts, total: data?.length || 0 };
    },
  });

  const statusChartData = taskStats
    ? [
        { name: 'Chờ xử lý', value: taskStats.statusCounts.pending },
        { name: 'Đang làm', value: taskStats.statusCounts.in_progress },
        { name: 'Hoàn thành', value: taskStats.statusCounts.completed },
        { name: 'Đã hủy', value: taskStats.statusCounts.cancelled },
      ]
    : [];

  const priorityChartData = taskStats
    ? [
        { name: 'Thấp', value: taskStats.priorityCounts.low },
        { name: 'Trung bình', value: taskStats.priorityCounts.medium },
        { name: 'Cao', value: taskStats.priorityCounts.high },
        { name: 'Khẩn cấp', value: taskStats.priorityCounts.urgent },
      ]
    : [];

  const roleChartData = employeeStats
    ? [
        { name: 'CEO', value: employeeStats.roleCounts.ceo },
        { name: 'Quản lý', value: employeeStats.roleCounts.manager },
        { name: 'Tổ trưởng', value: employeeStats.roleCounts.shift_leader },
        { name: 'Nhân viên', value: employeeStats.roleCounts.staff },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Báo cáo & Phân tích</h2>
        <p className="text-muted-foreground">Xem các báo cáo chi tiết về hoạt động</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng nhân viên</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {employeesLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{employeeStats?.total || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Tất cả nhân viên trong hệ thống</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng công việc</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {taskStats
                  ? Object.values(taskStats.statusCounts).reduce((a, b) => a + b, 0)
                  : 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Tất cả công việc</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoàn thành</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {taskStats?.statusCounts.completed || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Công việc đã hoàn thành</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Đang phát triển</div>
            <p className="text-xs text-muted-foreground">Chức năng sắp ra mắt</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Công việc</TabsTrigger>
          <TabsTrigger value="employees">Nhân viên</TabsTrigger>
          <TabsTrigger value="trends">Xu hướng</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Trạng thái công việc</CardTitle>
                <CardDescription>Phân bổ theo trạng thái</CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Độ ưu tiên</CardTitle>
                <CardDescription>Phân bổ theo độ ưu tiên</CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={priorityChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Phân bổ nhân viên</CardTitle>
              <CardDescription>Theo vai trò</CardDescription>
            </CardHeader>
            <CardContent>
              {employeesLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={roleChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng công việc</CardTitle>
              <CardDescription>Theo tháng</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : taskStats?.monthlyData && taskStats.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={taskStats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="tasks" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Chưa có dữ liệu để hiển thị
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
