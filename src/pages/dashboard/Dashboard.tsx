import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckSquare, Clock, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-1" />
          {description && <Skeleton className="h-4 w-32" />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
};

function RecentTasks() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['recent-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Chưa có công việc nào</p>
        <Link to="/tasks" className="text-primary hover:underline mt-2 inline-block">
          Tạo công việc mới
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-500',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500',
  };

  return (
    <div className="space-y-3">
      {tasks.map((task: Task) => (
        <Link
          key={task.id}
          to="/tasks"
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
        >
          <div className="flex-1">
            <p className="font-medium text-sm">{task.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(task.created_at).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <Badge
            className={`${statusColors[task.status] || 'bg-gray-500'} text-white text-xs`}
          >
            {task.status === 'pending' && 'Chờ xử lý'}
            {task.status === 'in_progress' && 'Đang làm'}
            {task.status === 'completed' && 'Hoàn thành'}
            {task.status === 'cancelled' && 'Đã hủy'}
          </Badge>
        </Link>
      ))}
      <Link
        to="/tasks"
        className="block text-center text-sm text-primary hover:underline pt-2"
      >
        Xem tất cả →
      </Link>
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <p className="text-sm">Chức năng đang được phát triển</p>
      <p className="text-xs mt-2">Sẽ hiển thị các hoạt động gần đây</p>
    </div>
  );
}

function Dashboard() {
  const { currentRole } = useAuth();
  const navigate = useNavigate();

  // Redirect CEO to CEO Dashboard
  useEffect(() => {
    if (currentRole === 'ceo') {
      navigate('/ceo/dashboard', { replace: true });
    }
  }, [currentRole, navigate]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [employeesResult, tasksResult, attendanceResult] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('id', { count: 'exact', head: true }),
      ]);

      return {
        employees: employeesResult.count || 0,
        tasks: tasksResult.count || 0,
        attendance: attendanceResult.count || 0,
        revenue: 0, // Will be calculated from orders/payments
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Tổng quan hệ thống quản lý</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Nhân viên"
          value={stats?.employees || 0}
          description="Tổng số nhân viên"
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          title="Công việc"
          value={stats?.tasks || 0}
          description="Tổng số công việc"
          icon={CheckSquare}
          loading={isLoading}
        />
        <StatCard
          title="Chấm công"
          value={stats?.attendance || 0}
          description="Lượt chấm công hôm nay"
          icon={Clock}
          loading={isLoading}
        />
        <StatCard
          title="Doanh thu"
          value={`${(stats?.revenue || 0).toLocaleString('vi-VN')} đ`}
          description="Doanh thu tháng này"
          icon={TrendingUp}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Công việc gần đây</CardTitle>
            <CardDescription>Danh sách công việc mới nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTasks />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Hoạt động</CardTitle>
            <CardDescription>Hoạt động gần đây của hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
