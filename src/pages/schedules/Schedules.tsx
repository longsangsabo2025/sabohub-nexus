import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useScheduleRealtime } from '@/hooks/useRealtime';
import type { Schedule, ShiftType } from '@/types';
import { SHIFT_CONFIG } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, Users, Pencil, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function Schedules() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [newSchedule, setNewSchedule] = useState({
    employee_id: '',
    shift_type: 'morning' as ShiftType,
    notes: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    selectedDays: [1, 2, 3, 4, 5] as number[],
    startTime: '',
    endTime: '',
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

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

  // Fetch schedules for current week
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      // 1. Fetch schedules without join
      const { data: schedulesData, error } = await supabase
        .from('schedules')
        .select('*')
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('date');
      
      if (error) throw error;
      if (!schedulesData || schedulesData.length === 0) return [];

      // 2. Manual join for employee details
      const employeeIds = [...new Set(schedulesData.map((s: any) => s.employee_id).filter(Boolean))];
      
      if (employeeIds.length > 0) {
        const { data: employeesData } = await supabase
          .from('employees')
          .select('id, full_name, email')
          .in('id', employeeIds);
          
        if (employeesData) {
          const empMap = new Map(employeesData.map((e: any) => [e.id, e]));
          return schedulesData.map((schedule: any) => ({
            ...schedule,
            employees: schedule.employee_id ? empMap.get(schedule.employee_id) : null
          }));
        }
      }

      return schedulesData;
    },
  });

  // Create schedule mutation
  const createSchedule = useMutation({
    mutationFn: async (schedule: {
      employee_id: string;
      date: string;
      shift_type: ShiftType;
      notes?: string;
    }) => {
      // Find employee to get company_id and branch_id
      const employee = employees?.find((e: any) => e.id === schedule.employee_id);

      const { data, error } = await supabase
        .from('schedules')
        .insert({
          ...schedule,
          company_id: employee?.company_id,
          branch_id: employee?.branch_id,
          status: 'scheduled',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setIsAddDialogOpen(false);
      setNewSchedule({ employee_id: '', shift_type: 'morning', notes: '' });
      toast({
        title: 'Thành công',
        description: 'Đã thêm lịch làm việc',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: `Không thể thêm lịch: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Bulk create schedule mutation
  const bulkCreateSchedule = useMutation({
    mutationFn: async (schedules: any[]) => {
      const employee = employees?.find((e: any) => e.id === schedules[0].employee_id);
      
      const { data, error } = await supabase
        .from('schedules')
        .insert(schedules.map(s => ({
          ...s,
          company_id: employee?.company_id,
          branch_id: employee?.branch_id,
          status: 'scheduled',
        })))
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setIsAddDialogOpen(false);
      setNewSchedule({
        employee_id: '',
        shift_type: 'morning',
        notes: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        selectedDays: [1, 2, 3, 4, 5],
        startTime: '',
        endTime: '',
      });
      toast({
        title: 'Thành công',
        description: `Đã thêm ${data.length} lịch làm việc`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: `Không thể thêm lịch: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update schedule mutation
  const updateSchedule = useMutation({
    mutationFn: async (schedule: {
      id: string;
      employee_id: string;
      date: string;
      shift_type: ShiftType;
      start_time?: string;
      end_time?: string;
      status: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('schedules')
        .update({
          employee_id: schedule.employee_id,
          date: schedule.date,
          shift_type: schedule.shift_type,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          status: schedule.status,
          notes: schedule.notes,
        })
        .eq('id', schedule.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setIsEditDialogOpen(false);
      setEditingSchedule(null);
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật lịch làm việc',
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

  // Delete schedule mutation
  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setDeleteScheduleId(null);
      toast({
        title: 'Thành công',
        description: 'Đã xóa lịch làm việc',
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

  const handleAddSchedule = () => {
    if (!newSchedule.employee_id || !newSchedule.startDate || !newSchedule.endDate) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng chọn nhân viên và khoảng thời gian',
        variant: 'destructive',
      });
      return;
    }

    const start = new Date(newSchedule.startDate);
    const end = new Date(newSchedule.endDate);
    
    if (end < start) {
       toast({
        title: 'Lỗi thời gian',
        description: 'Ngày kết thúc phải sau ngày bắt đầu',
        variant: 'destructive',
      });
      return;
    }

    const days = eachDayOfInterval({ start, end });
    const schedulesToCreate = days
      .filter(day => newSchedule.selectedDays.includes(day.getDay()))
      .map(day => ({
        employee_id: newSchedule.employee_id,
        date: format(day, 'yyyy-MM-dd'),
        shift_type: newSchedule.shift_type,
        start_time: newSchedule.startTime || undefined,
        end_time: newSchedule.endTime || undefined,
        notes: newSchedule.notes || undefined,
      }));

    if (schedulesToCreate.length === 0) {
       toast({
        title: 'Không có lịch nào được tạo',
        description: 'Vui lòng kiểm tra lại ngày chọn và khoảng thời gian',
        variant: 'destructive',
      });
      return;
    }

    bulkCreateSchedule.mutate(schedulesToCreate);
  };

  const handleEditSchedule = () => {
    if (!editingSchedule) return;
    
    updateSchedule.mutate({
      id: editingSchedule.id,
      employee_id: editingSchedule.employee_id,
      date: editingSchedule.date,
      shift_type: editingSchedule.shift_type,
      start_time: editingSchedule.start_time || undefined,
      end_time: editingSchedule.end_time || undefined,
      status: editingSchedule.status,
      notes: editingSchedule.notes || undefined,
    });
  };

  const openEditDialog = (schedule: Schedule) => {
    setEditingSchedule({ ...schedule });
    setIsEditDialogOpen(true);
  };

  const getSchedulesForDay = (date: Date) => {
    return schedules?.filter((s: Schedule) => isSameDay(new Date(s.date), date)) || [];
  };

  const getShiftBadge = (shiftType: ShiftType) => {
    const config = SHIFT_CONFIG[shiftType];
    return (
      <Badge
        style={{ backgroundColor: config.color, color: shiftType === 'morning' ? '#000' : '#fff' }}
      >
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      scheduled: { label: 'Đã lên lịch', variant: 'secondary' },
      confirmed: { label: 'Đã xác nhận', variant: 'default' },
      absent: { label: 'Vắng mặt', variant: 'destructive' },
      late: { label: 'Muộn', variant: 'outline' },
      cancelled: { label: 'Đã hủy', variant: 'destructive' },
    };
    const config = statusConfig[status] || statusConfig.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lịch làm việc</h2>
          <p className="text-muted-foreground">Quản lý ca làm việc của nhân viên</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Thêm lịch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm lịch làm việc</DialogTitle>
              <DialogDescription>Tạo lịch làm việc mới cho nhân viên</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nhân viên</Label>
                <Select
                  value={newSchedule.employee_id}
                  onValueChange={(value) => setNewSchedule({ ...newSchedule, employee_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhân viên" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name || emp.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Từ ngày</Label>
                  <Input
                    type="date"
                    value={newSchedule.startDate}
                    onChange={(e) => setNewSchedule({ ...newSchedule, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Đến ngày</Label>
                  <Input
                    type="date"
                    value={newSchedule.endDate}
                    onChange={(e) => setNewSchedule({ ...newSchedule, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Áp dụng cho các ngày</Label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { label: 'T2', value: 1 },
                    { label: 'T3', value: 2 },
                    { label: 'T4', value: 3 },
                    { label: 'T5', value: 4 },
                    { label: 'T6', value: 5 },
                    { label: 'T7', value: 6 },
                    { label: 'CN', value: 0 },
                  ].map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={newSchedule.selectedDays.includes(day.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewSchedule({
                              ...newSchedule,
                              selectedDays: [...newSchedule.selectedDays, day.value],
                            });
                          } else {
                            setNewSchedule({
                              ...newSchedule,
                              selectedDays: newSchedule.selectedDays.filter((d) => d !== day.value),
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={`day-${day.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {day.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ca làm việc</Label>
                <Select
                  value={newSchedule.shift_type}
                  onValueChange={(value) => {
                    const shift = SHIFT_CONFIG[value as ShiftType];
                    setNewSchedule({ 
                      ...newSchedule, 
                      shift_type: value as ShiftType,
                      startTime: shift.startTime,
                      endTime: shift.endTime
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SHIFT_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label} ({config.startTime} - {config.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Giờ bắt đầu</Label>
                  <Input
                    type="time"
                    value={newSchedule.startTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giờ kết thúc</Label>
                  <Input
                    type="time"
                    value={newSchedule.endTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea
                  value={newSchedule.notes}
                  onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                  placeholder="Ghi chú thêm..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleAddSchedule} disabled={bulkCreateSchedule.isPending}>
                {bulkCreateSchedule.isPending ? 'Đang tạo...' : 'Tạo lịch'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>
                Tuần {format(weekStart, 'dd/MM')} - {format(weekEnd, 'dd/MM/yyyy', { locale: vi })}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>
                Tuần này
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const daySchedules = getSchedulesForDay(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[150px] rounded-lg border p-2 ${
                      isToday ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="mb-2 text-center">
                      <div className="text-xs text-muted-foreground">
                        {format(day, 'EEEE', { locale: vi })}
                      </div>
                      <div className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                        {format(day, 'dd')}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {daySchedules.map((schedule: Schedule) => (
                        <div
                          key={schedule.id}
                          className="rounded bg-muted p-1 text-xs"
                        >
                          <div className="font-medium truncate">
                            {schedule.employees?.full_name || 'N/A'}
                          </div>
                          {getShiftBadge(schedule.shift_type)}
                        </div>
                      ))}
                      {daySchedules.length === 0 && (
                        <div className="text-center text-xs text-muted-foreground py-4">
                          Trống
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Chi tiết lịch tuần này
          </CardTitle>
          <CardDescription>Danh sách đầy đủ lịch làm việc</CardDescription>
        </CardHeader>
        <CardContent>
          {schedules && schedules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Ca</TableHead>
                  <TableHead>Giờ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule: Schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(schedule.employees?.full_name || '')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{schedule.employees?.full_name || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(schedule.date), 'EEEE, dd/MM', { locale: vi })}
                    </TableCell>
                    <TableCell>{getShiftBadge(schedule.shift_type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {schedule.start_time && schedule.end_time 
                          ? `${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)}`
                          : `${SHIFT_CONFIG[schedule.shift_type].startTime} - ${SHIFT_CONFIG[schedule.shift_type].endTime}`
                        }
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {schedule.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(schedule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteScheduleId(schedule.id)}>
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
              Chưa có lịch làm việc nào trong tuần này
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa lịch làm việc</DialogTitle>
            <DialogDescription>Cập nhật thông tin ca làm việc</DialogDescription>
          </DialogHeader>
          {editingSchedule && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nhân viên</Label>
                <Select
                  value={editingSchedule.employee_id}
                  onValueChange={(value) => setEditingSchedule({ ...editingSchedule, employee_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhân viên" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name || emp.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ngày</Label>
                <Input
                  type="date"
                  value={editingSchedule.date}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ca làm việc</Label>
                <Select
                  value={editingSchedule.shift_type}
                  onValueChange={(value) => {
                    const shift = SHIFT_CONFIG[value as ShiftType];
                    setEditingSchedule({ 
                      ...editingSchedule, 
                      shift_type: value as ShiftType,
                      start_time: shift.startTime,
                      end_time: shift.endTime
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SHIFT_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label} ({config.startTime} - {config.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Giờ bắt đầu</Label>
                  <Input
                    type="time"
                    value={editingSchedule.start_time || ''}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giờ kết thúc</Label>
                  <Input
                    type="time"
                    value={editingSchedule.end_time || ''}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select
                  value={editingSchedule.status}
                  onValueChange={(value) => setEditingSchedule({ ...editingSchedule, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Đã lên lịch</SelectItem>
                    <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                    <SelectItem value="absent">Vắng mặt</SelectItem>
                    <SelectItem value="late">Muộn</SelectItem>
                    <SelectItem value="cancelled">Đã hủy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea
                  value={editingSchedule.notes || ''}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, notes: e.target.value })}
                  placeholder="Ghi chú thêm..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditSchedule} disabled={updateSchedule.isPending}>
              {updateSchedule.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteScheduleId} onOpenChange={() => setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa lịch làm việc này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteScheduleId && deleteSchedule.mutate(deleteScheduleId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSchedule.isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
