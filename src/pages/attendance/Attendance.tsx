import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAttendanceRealtime } from '@/hooks/useRealtime';
import type { Attendance as AttendanceRecord } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PayrollTab from './PayrollTab';
import { 
  Clock, 
  MapPin, 
  LogIn, 
  LogOut, 
  Coffee, 
  Play,
  Users,
  CheckCircle2,
  AlertCircle,
  Timer,
  Calendar,
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
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useErrorHandler, ErrorCategory } from '@/hooks/use-error-handler';

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export default function Attendance() {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'check_in' | 'check_out' | 'break_start' | 'break_end' | null>(null);
  
  // Leave Request State
  const [isLeaveRequestOpen, setIsLeaveRequestOpen] = useState(false);
  const [leaveRequest, setLeaveRequest] = useState({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
    days: 1
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, employeeUser } = useAuth();
  const { handleError } = useErrorHandler();
  
  // Enable realtime updates
  useAttendanceRealtime();

  // Fetch attendance records
  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      // 1. Fetch attendance without join
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('*')
        .order('check_in_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!attendanceData || attendanceData.length === 0) return [];

      // 2. Manual join for employee details
      const employeeIds = [...new Set(attendanceData.map((a: any) => a.employee_id).filter(Boolean))];
      
      if (employeeIds.length > 0) {
        const { data: employeesData } = await supabase
          .from('employees')
          .select('id, full_name, email')
          .in('id', employeeIds);
          
        if (employeesData) {
          const empMap = new Map(employeesData.map((e: any) => [e.id, e]));
          return attendanceData.map((record: any) => ({
            ...record,
            employees: record.employee_id ? empMap.get(record.employee_id) : null
          }));
        }
      }

      return attendanceData;
    },
  });

  // Fetch current user's today attendance
  const { data: myTodayAttendance } = useQuery({
    queryKey: ['my-attendance-today', user?.id, employeeUser?.id],
    queryFn: async () => {
      const userId = employeeUser?.id || user?.id;
      if (!userId) return null;
      
      // Calculate start and end of today in local time, then convert to UTC for query
      // This ensures we catch check-ins that happened early in the morning (which might be previous day in UTC)
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', userId)
        .gte('check_in_time', startOfDay.toISOString())
        .lte('check_in_time', endOfDay.toISOString())
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!(user?.id || employeeUser?.id),
  });

  // Check-in mutation
  const checkIn = useMutation({
    mutationFn: async (location: GPSLocation | null) => {
      const userId = employeeUser?.id || user?.id;
      if (!userId) throw new Error('Không tìm thấy thông tin nhân viên');

      let companyId = employeeUser?.company_id;
      let branchId = employeeUser?.branch_id;
      let fullName = employeeUser?.full_name;
      let role = employeeUser?.role;

      // Fallback: Try to find employee info if missing (e.g. logged in as CEO via Supabase Auth)
      if (!companyId && user?.email) {
        const { data: emp } = await supabase
          .from('employees')
          .select('company_id, branch_id, full_name, role')
          .eq('email', user.email)
          .maybeSingle();
          
        if (emp) {
          companyId = emp.company_id;
          branchId = emp.branch_id;
          fullName = emp.full_name;
          role = emp.role;
        }
      }

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          employee_id: userId,
          user_id: userId, // Required by schema
          branch_id: branchId, // Required by schema
          company_id: companyId, // Required by schema
          check_in: new Date().toISOString(), // Legacy column support
          check_in_time: new Date().toISOString(),
          latitude: location?.latitude,
          longitude: location?.longitude,
          location: location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : null,
          status: 'present',
          employee_name: fullName,
          employee_role: role
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
      toast({
        title: 'Chấm công vào thành công',
        description: `Thời gian: ${format(new Date(), 'HH:mm dd/MM/yyyy')}`,
      });
      setShowLocationDialog(false);
    },
    onError: (error) => {
      handleError(error, {
        category: ErrorCategory.DATABASE,
        context: 'Failed to check in',
        operation: 'checkIn',
        userId: employeeUser?.id || user?.id,
      });
    },
  });

  // Check-out mutation
  const checkOut = useMutation({
    mutationFn: async (location: GPSLocation | null) => {
      if (!myTodayAttendance?.id) throw new Error('Không tìm thấy bản ghi chấm công');
      
      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out_time: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', myTodayAttendance.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
      toast({
        title: 'Chấm công ra thành công',
        description: `Thời gian: ${format(new Date(), 'HH:mm dd/MM/yyyy')}`,
      });
      setShowLocationDialog(false);
    },
    onError: (error) => {
      handleError(error, {
        category: ErrorCategory.DATABASE,
        context: 'Failed to check out',
        operation: 'checkOut',
        userId: employeeUser?.id || user?.id,
      });
    },
  });

  // Break start mutation
  const startBreak = useMutation({
    mutationFn: async () => {
      if (!myTodayAttendance?.id) throw new Error('Không tìm thấy bản ghi chấm công');
      
      const { data, error } = await supabase
        .from('attendance')
        .update({
          break_start_time: new Date().toISOString(),
          status: 'on_break',
        })
        .eq('id', myTodayAttendance.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
      toast({
        title: 'Bắt đầu nghỉ giải lao',
        description: `Thời gian: ${format(new Date(), 'HH:mm')}`,
      });
    },
    onError: (error) => {
      handleError(error, {
        category: ErrorCategory.DATABASE,
        context: 'Failed to start break',
        operation: 'startBreak',
        userId: employeeUser?.id || user?.id,
      });
    },
  });

  // Break end mutation
  const endBreak = useMutation({
    mutationFn: async () => {
      if (!myTodayAttendance?.id) throw new Error('Không tìm thấy bản ghi chấm công');
      
      const breakMinutes = myTodayAttendance.break_start_time
        ? differenceInMinutes(new Date(), new Date(myTodayAttendance.break_start_time))
        : 0;
      
      const { data, error } = await supabase
        .from('attendance')
        .update({
          break_end_time: new Date().toISOString(),
          total_break_minutes: (myTodayAttendance.total_break_minutes || 0) + breakMinutes,
          status: 'present',
        })
        .eq('id', myTodayAttendance.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
      toast({
        title: 'Kết thúc nghỉ giải lao',
        description: `Thời gian: ${format(new Date(), 'HH:mm')}`,
      });
    },
    onError: (error) => {
      handleError(error, {
        category: ErrorCategory.DATABASE,
        context: 'Failed to end break',
        operation: 'endBreak',
        userId: employeeUser?.id || user?.id,
      });
    },
  });

  // Leave Request Mutation
  const requestLeaveMutation = useMutation({
    mutationFn: async (data: typeof leaveRequest) => {
      if (!employeeUser?.id) throw new Error("Không tìm thấy thông tin nhân viên");
      
      // Use RPC to bypass RLS for staff
      const { data: rpcData, error } = await supabase.rpc('submit_approval_request', {
        p_requester_id: employeeUser.id,
        p_type: 'time_off',
        p_details: {
          start_date: data.start_date,
          end_date: data.end_date,
          reason: data.reason,
          days: data.days,
          company_id: employeeUser.company_id
        }
      });
      
      if (error) throw error;
      if (rpcData && !rpcData.success) throw new Error(rpcData.error || 'Lỗi không xác định');
    },
    onSuccess: () => {
      setIsLeaveRequestOpen(false);
      setLeaveRequest({
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        reason: '',
        days: 1
      });
      toast({
        title: 'Đã gửi yêu cầu',
        description: 'Yêu cầu nghỉ phép đã được gửi cho quản lý.',
      });
    },
    onError: (error) => {
      handleError(error, {
        category: ErrorCategory.DATABASE,
        context: 'Failed to submit leave request',
        operation: 'requestLeave',
        userId: employeeUser?.id || user?.id,
      });
    }
  });

  // Get current GPS location
  const getCurrentLocation = (): Promise<GPSLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Trình duyệt không hỗ trợ định vị GPS'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Bạn đã từ chối quyền truy cập vị trí'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Không thể xác định vị trí'));
              break;
            case error.TIMEOUT:
              reject(new Error('Hết thời gian chờ định vị'));
              break;
            default:
              reject(new Error('Lỗi không xác định'));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleActionWithLocation = async (action: 'check_in' | 'check_out' | 'break_start' | 'break_end') => {
    setPendingAction(action);
    setLocationError(null);
    setIsCheckingIn(true);

    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
      setShowLocationDialog(true);
    } catch (error) {
      setLocationError((error as Error).message);
      setShowLocationDialog(true);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const confirmAction = () => {
    switch (pendingAction) {
      case 'check_in':
        checkIn.mutate(currentLocation);
        break;
      case 'check_out':
        checkOut.mutate(currentLocation);
        break;
      case 'break_start':
        startBreak.mutate();
        setShowLocationDialog(false);
        break;
      case 'break_end':
        endBreak.mutate();
        setShowLocationDialog(false);
        break;
    }
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return '--:--';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime()) || date.getFullYear() === 1970) return '--:--';
      return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '--/--/----';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime()) || date.getFullYear() === 1970) return '--/--/----';
      return date.toLocaleDateString('vi-VN');
    } catch {
      return '--/--/----';
    }
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

  const getStatusBadge = (record: AttendanceRecord) => {
    let status = record.status;
    
    // Fix display issue: If checked out but status is still 'present', show as completed
    if (record.check_out_time && status === 'present') {
      status = 'completed';
    }
    
    status = status || (record.check_out_time ? 'completed' : 'present');

    const statusConfig: Record<string, { label: string; color: string }> = {
      present: { label: 'Đang làm việc', color: 'bg-green-500' },
      on_break: { label: 'Đang nghỉ', color: 'bg-yellow-500' },
      completed: { label: 'Đã hoàn thành', color: 'bg-blue-500' },
      late: { label: 'Đi muộn', color: 'bg-orange-500' },
      left_early: { label: 'Về sớm', color: 'bg-red-500' },
      absent: { label: 'Vắng mặt', color: 'bg-gray-500' },
    };
    const config = statusConfig[status] || statusConfig.present;
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const getWorkDuration = (record: AttendanceRecord) => {
    if (!record.check_in_time) return '-';
    const endTime = record.check_out_time ? new Date(record.check_out_time) : new Date();
    const startTime = new Date(record.check_in_time);
    const breakMinutes = record.total_break_minutes || 0;
    const totalMinutes = differenceInMinutes(endTime, startTime) - breakMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  // Determine current state
  const isCheckedIn = !!myTodayAttendance && !myTodayAttendance.check_out_time;
  const isOnBreak = myTodayAttendance?.status === 'on_break';
  const isCheckedOut = !!myTodayAttendance?.check_out_time;

  // Count stats
  const todayRecords = attendance?.filter((r: AttendanceRecord) => {
    const recordDate = format(new Date(r.check_in_time), 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    return recordDate === today;
  }) || [];

  const workingNow = todayRecords.filter((r: AttendanceRecord) => !r.check_out_time && r.status !== 'on_break').length;
  const onBreakNow = todayRecords.filter((r: AttendanceRecord) => r.status === 'on_break').length;
  const completedToday = todayRecords.filter((r: AttendanceRecord) => !!r.check_out_time).length;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="attendance" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Chấm công & Lương</h2>
            <p className="text-muted-foreground">Quản lý chấm công và tính lương nhân viên</p>
          </div>
          <TabsList>
            <TabsTrigger value="attendance">Chấm công</TabsTrigger>
            <TabsTrigger value="payroll">Tính lương</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="attendance" className="space-y-6">

      {/* Quick Actions for Current User */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Chấm công của bạn - {format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })}
          </CardTitle>
          <CardDescription>
            {isCheckedOut 
              ? 'Bạn đã hoàn thành chấm công hôm nay'
              : isCheckedIn 
                ? `Check-in lúc ${formatTime(myTodayAttendance?.check_in_time || '')}` 
                : 'Bạn chưa chấm công hôm nay'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {!isCheckedIn && !isCheckedOut && (
              <Button 
                onClick={() => handleActionWithLocation('check_in')}
                disabled={isCheckingIn}
                className="bg-green-600 hover:bg-green-700"
              >
                <LogIn className="mr-2 h-4 w-4" />
                {isCheckingIn ? 'Đang định vị...' : 'Chấm công vào'}
              </Button>
            )}

            {isCheckedIn && !isOnBreak && (
              <>
                <Button 
                  onClick={() => handleActionWithLocation('break_start')}
                  variant="outline"
                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                >
                  <Coffee className="mr-2 h-4 w-4" />
                  Bắt đầu nghỉ
                </Button>
                <Button 
                  onClick={() => handleActionWithLocation('check_out')}
                  disabled={isCheckingIn}
                  variant="destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isCheckingIn ? 'Đang định vị...' : 'Chấm công ra'}
                </Button>
              </>
            )}

            {isOnBreak && (
              <Button 
                onClick={() => handleActionWithLocation('break_end')}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <Play className="mr-2 h-4 w-4" />
                Kết thúc nghỉ
              </Button>
            )}

            {isCheckedOut && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>Đã hoàn thành - Tổng thời gian: {getWorkDuration(myTodayAttendance!)}</span>
              </div>
            )}

            {/* ELON MUSK STRATEGY: Embedded Leave Request */}
            <Button 
              variant="outline" 
              className="ml-auto border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => setIsLeaveRequestOpen(true)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Xin nghỉ phép
            </Button>
          </div>

          {myTodayAttendance?.location && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Vị trí check-in: {myTodayAttendance.location}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang làm việc</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{workingNow}</div>
            <p className="text-xs text-muted-foreground">nhân viên</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang nghỉ</CardTitle>
            <Coffee className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{onBreakNow}</div>
            <p className="text-xs text-muted-foreground">nhân viên</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã hoàn thành</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{completedToday}</div>
            <p className="text-xs text-muted-foreground">nhân viên</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng hôm nay</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayRecords.length}</div>
            <p className="text-xs text-muted-foreground">lượt chấm công</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử chấm công</CardTitle>
          <CardDescription>Danh sách chấm công gần đây</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : attendance && attendance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Giờ vào</TableHead>
                  <TableHead>Giờ ra</TableHead>
                  <TableHead>Thời gian làm</TableHead>
                  <TableHead>Vị trí</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record: AttendanceRecord) => {
                  const employee = record.employees;
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(employee?.full_name || record.employee_name || employee?.email || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {employee?.full_name || record.employee_name || employee?.email || 'Không xác định'}
                            </div>
                            {(employee?.role || record.employee_role) && (
                              <div className="text-xs text-muted-foreground capitalize">
                                {employee?.role || record.employee_role}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(record.check_in_time || record.check_in)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-green-500" />
                          {formatTime(record.check_in_time || record.check_in)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.check_out_time ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-500" />
                            {formatTime(record.check_out_time)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Timer className="h-4 w-4 text-muted-foreground" />
                          {getWorkDuration(record)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.location ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-500" />
                            <span className="text-sm max-w-[150px] truncate" title={record.location}>
                              {record.location}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(record)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Không có dữ liệu chấm công</div>
          )}
        </CardContent>
      </Card>

      {/* Location Confirmation Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === 'check_in' && 'Xác nhận chấm công vào'}
              {pendingAction === 'check_out' && 'Xác nhận chấm công ra'}
              {pendingAction === 'break_start' && 'Xác nhận bắt đầu nghỉ'}
              {pendingAction === 'break_end' && 'Xác nhận kết thúc nghỉ'}
            </DialogTitle>
            <DialogDescription>
              {format(new Date(), 'HH:mm - EEEE, dd/MM/yyyy', { locale: vi })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {locationError ? (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Không thể lấy vị trí</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">{locationError}</p>
                  <p className="text-sm text-muted-foreground mt-1">Bạn vẫn có thể tiếp tục mà không có GPS</p>
                </div>
              </div>
            ) : currentLocation ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <MapPin className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Đã xác định vị trí</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Độ chính xác: ±{Math.round(currentLocation.accuracy)}m
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLocationDialog(false)}>
              Hủy
            </Button>
            <Button 
              onClick={confirmAction}
              disabled={checkIn.isPending || checkOut.isPending}
            >
              {checkIn.isPending || checkOut.isPending ? 'Đang xử lý...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </TabsContent>

      <TabsContent value="payroll">
        <PayrollTab />
      </TabsContent>
      </Tabs>

      {/* Leave Request Dialog */}
      <Dialog open={isLeaveRequestOpen} onOpenChange={setIsLeaveRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xin nghỉ phép</DialogTitle>
            <DialogDescription>
              Gửi yêu cầu nghỉ phép cho quản lý phê duyệt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Từ ngày</Label>
                <Input 
                  id="start_date" 
                  type="date" 
                  value={leaveRequest.start_date}
                  onChange={(e) => setLeaveRequest({...leaveRequest, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Đến ngày</Label>
                <Input 
                  id="end_date" 
                  type="date" 
                  value={leaveRequest.end_date}
                  onChange={(e) => setLeaveRequest({...leaveRequest, end_date: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">Số ngày nghỉ</Label>
              <Input 
                id="days" 
                type="number" 
                min="0.5" 
                step="0.5"
                value={leaveRequest.days}
                onChange={(e) => setLeaveRequest({...leaveRequest, days: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Lý do</Label>
              <Textarea 
                id="reason" 
                placeholder="Ví dụ: Việc gia đình, Ốm..."
                value={leaveRequest.reason}
                onChange={(e) => setLeaveRequest({...leaveRequest, reason: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveRequestOpen(false)}>Hủy</Button>
            <Button onClick={() => requestLeaveMutation.mutate(leaveRequest)}>Gửi yêu cầu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

