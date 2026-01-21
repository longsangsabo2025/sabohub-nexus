import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { SaboRole } from '@/constants/roles';
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
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ShiftLeaderDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { employeeUser, isAuthenticated, currentRole } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Redirect if not shift_leader
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/staff-login');
      return;
    }
    if (currentRole === SaboRole.ceo) {
      navigate('/ceo/dashboard');
    } else if (currentRole === SaboRole.manager) {
      navigate('/dashboard');
    } else if (currentRole === SaboRole.staff) {
      navigate('/staff/dashboard');
    }
  }, [isAuthenticated, currentRole, navigate]);

  // Fetch today's attendance for the shift
  const { data: shiftAttendance, isLoading: loadingAttendance } = useQuery({
    queryKey: ['shift-attendance', employeeUser?.company_id],
    queryFn: async () => {
      if (!employeeUser?.company_id) return [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('attendance')
        .select('*, employees(full_name, role)')
        .eq('company_id', employeeUser.company_id)
        .eq('date', today)
        .order('check_in', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeUser?.company_id,
  });

  // Fetch team members
  const { data: teamMembers, isLoading: _loadingTeam } = useQuery({
    queryKey: ['shift-team', employeeUser?.company_id],
    queryFn: async () => {
      if (!employeeUser?.company_id) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', employeeUser.company_id)
        .in('role', ['staff', 'shift_leader'])
        .is('deleted_at', null)
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeUser?.company_id,
  });

  // Fetch pending tasks for the team
  const { data: teamTasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['shift-tasks', employeeUser?.company_id],
    queryFn: async () => {
      if (!employeeUser?.company_id) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, employees(full_name)')
        .eq('company_id', employeeUser.company_id)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeUser?.company_id,
  });

  // My attendance
  const { data: myAttendance } = useQuery({
    queryKey: ['my-attendance', employeeUser?.id],
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

  // Check-in mutation with GPS
  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!employeeUser) throw new Error('Not authenticated');
      
      // Get GPS location
      let latitude: number | null = null;
      let longitude: number | null = null;
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (e) {
          console.warn('GPS not available:', e);
        }
      }

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          employee_id: employeeUser.id,
          company_id: employeeUser.company_id,
          date: format(new Date(), 'yyyy-MM-dd'),
          check_in: new Date().toISOString(),
          check_in_latitude: latitude,
          check_in_longitude: longitude,
          status: 'present'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Chấm công vào thành công!');
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['shift-attendance'] });
    },
    onError: (error) => {
      toast.error('Lỗi chấm công: ' + error.message);
    }
  });

  // Check-out mutation with GPS
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!employeeUser || !myAttendance) throw new Error('No attendance record');
      
      // Get GPS location
      let latitude: number | null = null;
      let longitude: number | null = null;
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (e) {
          console.warn('GPS not available:', e);
        }
      }

      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out: new Date().toISOString(),
          check_out_latitude: latitude,
          check_out_longitude: longitude,
        })
        .eq('id', myAttendance.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Chấm công ra thành công!');
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['shift-attendance'] });
    },
    onError: (error) => {
      toast.error('Lỗi chấm công: ' + error.message);
    }
  });

  const checkedInCount = shiftAttendance?.filter(a => a.check_in && !a.check_out).length || 0;
  const checkedOutCount = shiftAttendance?.filter(a => a.check_out).length || 0;
  const notCheckedInCount = (teamMembers?.length || 0) - (shiftAttendance?.length || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Xin chào, {employeeUser?.full_name || 'Tổ trưởng'} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {format(currentTime, "EEEE, dd MMMM yyyy - HH:mm:ss", { locale: vi })}
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2 bg-purple-100 text-purple-700">
          <Users className="w-5 h-5 mr-2" />
          Tổ trưởng
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Đang làm việc</p>
                <p className="text-3xl font-bold text-green-700">{checkedInCount}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Đã tan ca</p>
                <p className="text-3xl font-bold text-blue-700">{checkedOutCount}</p>
              </div>
              <Square className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Chưa vào ca</p>
                <p className="text-3xl font-bold text-orange-700">{notCheckedInCount}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Tổng nhân viên</p>
                <p className="text-3xl font-bold text-purple-700">{teamMembers?.length || 0}</p>
              </div>
              <Users className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Check-in Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Chấm công của tôi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {myAttendance ? (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">
                    Vào ca: <span className="font-medium text-green-600">
                      {format(new Date(myAttendance.check_in), 'HH:mm:ss')}
                    </span>
                    {myAttendance.check_in_latitude && (
                      <MapPin className="inline h-4 w-4 ml-1 text-green-500" />
                    )}
                  </p>
                  {myAttendance.check_out && (
                    <p className="text-sm text-gray-500">
                      Ra ca: <span className="font-medium text-blue-600">
                        {format(new Date(myAttendance.check_out), 'HH:mm:ss')}
                      </span>
                      {myAttendance.check_out_latitude && (
                        <MapPin className="inline h-4 w-4 ml-1 text-blue-500" />
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Chưa chấm công hôm nay</p>
              )}
            </div>
            <div className="flex gap-2">
              {!myAttendance ? (
                <Button 
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {checkInMutation.isPending ? 'Đang xử lý...' : 'Vào ca'}
                </Button>
              ) : !myAttendance.check_out ? (
                <Button 
                  onClick={() => checkOutMutation.mutate()}
                  disabled={checkOutMutation.isPending}
                  variant="destructive"
                >
                  <Square className="h-4 w-4 mr-2" />
                  {checkOutMutation.isPending ? 'Đang xử lý...' : 'Ra ca'}
                </Button>
              ) : (
                <Badge variant="secondary" className="text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Đã hoàn thành
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Chấm công nhân viên hôm nay
            </CardTitle>
            <CardDescription>
              Theo dõi chấm công của nhân viên trong ca
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAttendance ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : shiftAttendance && shiftAttendance.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead>Vào</TableHead>
                    <TableHead>Ra</TableHead>
                    <TableHead>GPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftAttendance.map((attendance: { id: string; check_in?: string; check_out?: string; check_in_latitude?: number; employees?: { full_name?: string } }) => (
                    <TableRow key={attendance.id}>
                      <TableCell className="font-medium">
                        {attendance.employees?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {attendance.check_in ? format(new Date(attendance.check_in), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="text-blue-600">
                        {attendance.check_out ? format(new Date(attendance.check_out), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {attendance.check_in_latitude ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-gray-500 py-4">
                Chưa có ai chấm công hôm nay
              </p>
            )}
          </CardContent>
        </Card>

        {/* Team Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Công việc của nhóm
            </CardTitle>
            <CardDescription>
              Các công việc đang thực hiện
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTasks ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : teamTasks && teamTasks.length > 0 ? (
              <div className="space-y-3">
                {teamTasks.map((task: { id: string; title: string; priority?: string; status?: string; employees?: { full_name?: string } }) => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-gray-500">
                        {task.employees?.full_name || 'Chưa giao'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        task.priority === 'urgent' ? 'destructive' :
                        task.priority === 'high' ? 'default' :
                        'secondary'
                      }>
                        {task.priority === 'urgent' ? 'Gấp' :
                         task.priority === 'high' ? 'Cao' :
                         task.priority === 'medium' ? 'TB' : 'Thấp'}
                      </Badge>
                      <Badge variant={
                        task.status === 'in_progress' ? 'default' : 'outline'
                      }>
                        {task.status === 'in_progress' ? 'Đang làm' : 'Chờ'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                Không có công việc nào
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Thao tác nhanh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/tasks')}
            >
              <CheckSquare className="h-6 w-6" />
              <span>Công việc</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/schedules')}
            >
              <Calendar className="h-6 w-6" />
              <span>Lịch làm việc</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/daily-reports')}
            >
              <FileText className="h-6 w-6" />
              <span>Báo cáo</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate('/attendance')}
            >
              <Clock className="h-6 w-6" />
              <span>Chấm công</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
