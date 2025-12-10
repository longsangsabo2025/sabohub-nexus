import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckSquare, 
  Calendar, 
  FileText, 
  MapPin,
  Play,
  Square,
  TrendingUp
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { employeeUser, isAuthenticated, currentRole } = useAuth();

  // Redirect if not staff/shift_leader
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/staff-login');
      return;
    }
    if (currentRole === 'ceo' || currentRole === 'manager') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, currentRole, navigate]);

  // Fetch today's attendance
  const { data: todayAttendance, isLoading: loadingAttendance } = useQuery({
    queryKey: ['staff-today-attendance', employeeUser?.id],
    queryFn: async () => {
      if (!employeeUser) return null;
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeUser.id)
        .eq('date', today)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!employeeUser,
  });

  // Fetch my tasks
  const { data: myTasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['staff-my-tasks', employeeUser?.id],
    queryFn: async () => {
      if (!employeeUser) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', employeeUser.id)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeUser,
  });

  // Fetch today's schedule
  const { data: todaySchedule, isLoading: loadingSchedule } = useQuery({
    queryKey: ['staff-today-schedule', employeeUser?.id],
    queryFn: async () => {
      if (!employeeUser) return null;
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('employee_id', employeeUser.id)
        .eq('date', today)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!employeeUser,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const getShiftLabel = (shift: string) => {
    const shifts: Record<string, string> = {
      morning: 'Ca sáng (6:00 - 14:00)',
      afternoon: 'Ca chiều (14:00 - 22:00)',
      night: 'Ca đêm (22:00 - 6:00)',
      full: 'Cả ngày',
    };
    return shifts[shift] || shift;
  };

  if (!employeeUser) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Skeleton className="h-32 w-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">{greeting()}, {employeeUser.full_name}!</h1>
        <p className="text-blue-100 mt-1">
          {format(new Date(), "EEEE, dd MMMM yyyy", { locale: vi })}
        </p>
        <div className="mt-3">
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            {employeeUser.role === 'SHIFT_LEADER' ? 'Ca trưởng' : 'Nhân viên'}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate('/attendance')}
        >
          <Clock className="h-6 w-6 text-blue-600" />
          <span className="text-sm font-medium">Chấm công</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate('/tasks')}
        >
          <CheckSquare className="h-6 w-6 text-green-600" />
          <span className="text-sm font-medium">Công việc</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate('/schedules')}
        >
          <Calendar className="h-6 w-6 text-purple-600" />
          <span className="text-sm font-medium">Lịch làm việc</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate('/daily-reports')}
        >
          <FileText className="h-6 w-6 text-orange-600" />
          <span className="text-sm font-medium">Báo cáo ngày</span>
        </Button>
      </div>

      {/* Today's Status */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Attendance Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Chấm công hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAttendance ? (
              <Skeleton className="h-20 w-full" />
            ) : todayAttendance ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Giờ vào:</span>
                  <Badge variant="default" className="bg-green-500">
                    {format(new Date(todayAttendance.check_in_time), 'HH:mm')}
                  </Badge>
                </div>
                {todayAttendance.check_out_time && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Giờ ra:</span>
                    <Badge variant="default" className="bg-blue-500">
                      {format(new Date(todayAttendance.check_out_time), 'HH:mm')}
                    </Badge>
                  </div>
                )}
                {!todayAttendance.check_out_time && (
                  <Button 
                    className="w-full mt-2" 
                    variant="outline"
                    onClick={() => navigate('/attendance')}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Check-out
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">Chưa chấm công hôm nay</p>
                <Button onClick={() => navigate('/attendance')}>
                  <Play className="mr-2 h-4 w-4" />
                  Check-in ngay
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Lịch làm việc hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSchedule ? (
              <Skeleton className="h-20 w-full" />
            ) : todaySchedule ? (
              <div className="space-y-2">
                <Badge variant="secondary" className="text-base py-1 px-3">
                  {getShiftLabel(todaySchedule.shift_type)}
                </Badge>
                {todaySchedule.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {todaySchedule.notes}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Không có lịch làm việc hôm nay</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Công việc của tôi
          </CardTitle>
          <CardDescription>Các công việc đang chờ xử lý</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTasks ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : myTasks && myTasks.length > 0 ? (
            <div className="space-y-3">
              {myTasks.map((task: { id: string; title: string; due_date: string | null; status: string; priority: string }) => (
                <div 
                  key={task.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => navigate('/tasks')}
                >
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : 'Không có deadline'}
                    </p>
                  </div>
                  <Badge variant={task.status === 'in_progress' ? 'default' : 'secondary'}>
                    {task.status === 'in_progress' ? 'Đang làm' : 'Chờ xử lý'}
                  </Badge>
                </div>
              ))}
              <Button 
                variant="ghost" 
                className="w-full mt-2"
                onClick={() => navigate('/tasks')}
              >
                Xem tất cả công việc →
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Không có công việc nào đang chờ xử lý</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
