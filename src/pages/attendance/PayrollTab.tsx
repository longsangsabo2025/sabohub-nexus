import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday } from 'date-fns';
import { DollarSign, Download, Calculator } from 'lucide-react';
import { Employee } from '@/types/database';

export default function PayrollTab() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Fetch employees with payroll info
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-payroll'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data as Employee[];
    }
  });

  // Fetch attendance for selected month
  const { data: attendanceStats = {} } = useQuery({
    queryKey: ['attendance-stats', selectedMonth],
    queryFn: async () => {
      const start = startOfMonth(new Date(selectedMonth));
      const end = endOfMonth(new Date(selectedMonth));
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .gte('check_in_time', start.toISOString())
        .lte('check_in_time', end.toISOString());

      if (error) throw error;

      // Aggregate stats per employee
      const stats: Record<string, { days: number, hours: number }> = {};
      
      data?.forEach((record: any) => {
        if (!stats[record.employee_id]) {
          stats[record.employee_id] = { days: 0, hours: 0 };
        }
        
        stats[record.employee_id].days += 1;
        
        if (record.check_in_time && record.check_out_time) {
          const duration = (new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime()) / (1000 * 60 * 60);
          stats[record.employee_id].hours += duration;
        }
      });
      
      return stats;
    }
  });

  const calculateSalary = (employee: Employee, stats: { days: number, hours: number }) => {
    if (!stats) return 0;
    
    if (employee.salary_type === 'hourly') {
      return (employee.hourly_rate || 0) * stats.hours;
    } else {
      // Fixed salary: assume 26 working days
      const dailyRate = (employee.base_salary || 0) / 26;
      return dailyRate * stats.days;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Bảng Lương Tháng {selectedMonth}</h2>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Chọn tháng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-12">Tháng 12/2025</SelectItem>
              <SelectItem value="2025-11">Tháng 11/2025</SelectItem>
              <SelectItem value="2025-10">Tháng 10/2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Xuất Excel
          </Button>
          <Button>
            <Calculator className="mr-2 h-4 w-4" />
            Chốt Lương
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chi tiết lương nhân viên</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Hình thức</TableHead>
                <TableHead>Công chuẩn</TableHead>
                <TableHead>Thực tế</TableHead>
                <TableHead>Lương cơ bản / Giờ</TableHead>
                <TableHead className="text-right">Tổng lương (Dự kiến)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const stats = attendanceStats[employee.id] || { days: 0, hours: 0 };
                const salary = calculateSalary(employee, stats);
                
                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="font-medium">{employee.full_name}</div>
                      <div className="text-xs text-muted-foreground">{employee.role}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {employee.employment_type === 'full_time' ? 'Full-time' : 'Part-time'}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {employee.salary_type === 'fixed' ? 'Cố định' : 'Theo giờ'}
                      </div>
                    </TableCell>
                    <TableCell>
                      26 ngày
                    </TableCell>
                    <TableCell>
                      <div>{stats.days} ngày</div>
                      <div className="text-xs text-muted-foreground">{stats.hours.toFixed(1)} giờ</div>
                    </TableCell>
                    <TableCell>
                      {employee.salary_type === 'fixed' 
                        ? formatCurrency(employee.base_salary || 0)
                        : formatCurrency(employee.hourly_rate || 0) + '/h'
                      }
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatCurrency(salary)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
