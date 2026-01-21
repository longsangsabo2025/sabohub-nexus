import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  CheckSquare,
  AlertCircle,
  Calendar,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler, ErrorCategory } from '@/hooks/use-error-handler';

interface ExecutiveReport {
  id: string;
  report_date: string;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  total_tasks_completed: number;
  total_tasks_overdue: number;
  active_projects: number;
  staff_present: number;
  staff_late: number;
  staff_on_leave: number;
  created_at: string;
}

export default function ExecutiveReport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const [selectedReport, setSelectedReport] = useState<ExecutiveReport | null>(null);

  // Fetch reports list
  const { data: reports, isLoading } = useQuery({
    queryKey: ['executive-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('executive_reports')
        .select('*')
        .order('report_date', { ascending: false });
      
      if (error) throw error;
      return data as ExecutiveReport[];
    },
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      // Generate for yesterday by default, or today if needed. 
      // The SQL function takes a date. Let's generate for TODAY for testing.
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.rpc('generate_daily_executive_report', {
        target_date: today
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executive-reports'] });
      toast({
        title: 'Thành công',
        description: 'Đã tạo báo cáo tổng hợp mới nhất.',
      });
    },
    onError: (error) => {
      handleError(error, {
        category: ErrorCategory.DATABASE,
        context: 'Failed to generate executive report',
        operation: 'generateExecutiveReport',
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const latestReport = reports?.[0];
  const displayReport = selectedReport || latestReport;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Báo cáo Tổng hợp Doanh nghiệp</h1>
          <p className="text-muted-foreground">
            Tổng hợp tự động các chỉ số quan trọng hàng ngày (Tài chính, Vận hành, Nhân sự)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => generateReportMutation.mutate()}
            disabled={generateReportMutation.isPending}
          >
            {generateReportMutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Cập nhật ngay
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div>Đang tải dữ liệu...</div>
      ) : !displayReport ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Chưa có báo cáo nào</p>
            <p className="text-muted-foreground mb-4">Hãy nhấn "Cập nhật ngay" để tạo báo cáo đầu tiên.</p>
            <Button onClick={() => generateReportMutation.mutate()}>Tạo báo cáo ngay</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar: Report List */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle>Lịch sử báo cáo</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead className="text-right">Lợi nhuận</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports?.map((report) => (
                      <TableRow 
                        key={report.id} 
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          displayReport.id === report.id && "bg-muted"
                        )}
                        onClick={() => setSelectedReport(report)}
                      >
                        <TableCell className="font-medium">
                          {format(new Date(report.report_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-bold",
                          report.net_profit >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {formatCurrency(report.net_profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Main Content: Report Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Chi tiết báo cáo ngày {format(new Date(displayReport.report_date), 'dd/MM/yyyy')}</CardTitle>
                    <CardDescription>Được tạo lúc {format(new Date(displayReport.created_at), 'HH:mm dd/MM/yyyy')}</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-1">
                    {format(new Date(displayReport.report_date), 'EEEE', { locale: vi })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                    <TabsTrigger value="financial">Tài chính</TabsTrigger>
                    <TabsTrigger value="operations">Vận hành & Nhân sự</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium">Lợi nhuận ròng</p>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className={cn(
                            "text-2xl font-bold",
                            displayReport.net_profit >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatCurrency(displayReport.net_profit)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium">Công việc hoàn thành</p>
                            <CheckSquare className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="text-2xl font-bold">{displayReport.total_tasks_completed}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium">Nhân sự đi làm</p>
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="text-2xl font-bold">{displayReport.staff_present}</div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="financial" className="space-y-4 mt-4">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng thu</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(displayReport.total_revenue)}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng chi</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                              {formatCurrency(displayReport.total_expenses)}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="operations" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center"><CheckSquare className="mr-2 h-4 w-4" /> Công việc</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 border rounded-lg bg-muted/20">
                            <div className="text-sm text-muted-foreground">Hoàn thành</div>
                            <div className="text-2xl font-bold text-green-600">{displayReport.total_tasks_completed}</div>
                          </div>
                          <div className="p-4 border rounded-lg bg-muted/20">
                            <div className="text-sm text-muted-foreground">Quá hạn</div>
                            <div className="text-2xl font-bold text-red-600">{displayReport.total_tasks_overdue}</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center"><Users className="mr-2 h-4 w-4" /> Nhân sự</h3>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-3 border rounded-lg bg-muted/20 text-center">
                            <div className="text-xs text-muted-foreground">Đi làm</div>
                            <div className="text-xl font-bold text-blue-600">{displayReport.staff_present}</div>
                          </div>
                          <div className="p-3 border rounded-lg bg-muted/20 text-center">
                            <div className="text-xs text-muted-foreground">Đi muộn</div>
                            <div className="text-xl font-bold text-orange-600">{displayReport.staff_late}</div>
                          </div>
                          <div className="p-3 border rounded-lg bg-muted/20 text-center">
                            <div className="text-xs text-muted-foreground">Nghỉ phép</div>
                            <div className="text-xl font-bold text-gray-600">{displayReport.staff_on_leave}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper for class names
function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}
