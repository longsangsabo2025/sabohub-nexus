import { useState } from 'react';
import { useReceivables, usePayments } from '@/hooks/useModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, DollarSign, AlertTriangle, Clock, CheckCircle, Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const statusLabels: Record<string, string> = {
  pending: 'Chưa thanh toán',
  partial: 'Thanh toán một phần',
  paid: 'Đã thanh toán',
  overdue: 'Quá hạn',
  written_off: 'Xóa nợ',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  partial: 'bg-orange-500',
  paid: 'bg-green-500',
  overdue: 'bg-red-500',
  written_off: 'bg-gray-500',
};

const paymentMethodLabels: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  check: 'Séc',
  card: 'Thẻ',
  ewallet: 'Ví điện tử',
  other: 'Khác',
};

export default function Receivables() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: receivables, isLoading: loadingReceivables } = useReceivables({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const { data: payments, isLoading: loadingPayments } = usePayments();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Calculate stats
  const stats = {
    totalReceivables: receivables?.reduce((sum, r) => sum + r.balance, 0) || 0,
    overdue: receivables?.filter(r => r.status === 'overdue' || r.days_overdue > 0).reduce((sum, r) => sum + r.balance, 0) || 0,
    overdueCount: receivables?.filter(r => r.status === 'overdue' || r.days_overdue > 0).length || 0,
    collectedToday: payments?.filter(p => {
      const today = new Date().toISOString().split('T')[0];
      return p.payment_date === today && p.status === 'confirmed';
    }).reduce((sum, p) => sum + p.amount, 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Công nợ & Thu tiền</h2>
          <p className="text-muted-foreground">Quản lý công nợ khách hàng và thanh toán</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Ghi nhận thu tiền
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng công nợ</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalReceivables)}</div>
            <p className="text-xs text-muted-foreground">{receivables?.length || 0} khoản phải thu</p>
          </CardContent>
        </Card>
        <Card className={stats.overdueCount > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nợ quá hạn</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdue)}</div>
            <p className="text-xs text-muted-foreground">{stats.overdueCount} khoản quá hạn</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Thu hôm nay</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.collectedToday)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng thanh toán</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments?.filter(p => p.status === 'confirmed').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">phiếu thu đã xác nhận</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receivables" className="space-y-4">
        <TabsList>
          <TabsTrigger value="receivables">Công nợ</TabsTrigger>
          <TabsTrigger value="payments">Thanh toán</TabsTrigger>
          <TabsTrigger value="aging">Phân tích tuổi nợ</TabsTrigger>
        </TabsList>

        {/* Receivables Tab */}
        <TabsContent value="receivables">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Danh sách công nợ</CardTitle>
                  <CardDescription>Các khoản phải thu từ khách hàng</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="pending">Chưa thanh toán</SelectItem>
                      <SelectItem value="partial">Thanh toán một phần</SelectItem>
                      <SelectItem value="overdue">Quá hạn</SelectItem>
                      <SelectItem value="paid">Đã thanh toán</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm..."
                      className="pl-8 w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingReceivables ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : receivables && receivables.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Số hóa đơn</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Ngày HĐ</TableHead>
                      <TableHead>Hạn thanh toán</TableHead>
                      <TableHead className="text-right">Gốc</TableHead>
                      <TableHead className="text-right">Đã thu</TableHead>
                      <TableHead className="text-right">Còn lại</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivables
                      .filter(r => {
                        if (!searchQuery) return true;
                        const search = searchQuery.toLowerCase();
                        return (
                          r.invoice_number?.toLowerCase().includes(search) ||
                          r.customers?.name?.toLowerCase().includes(search)
                        );
                      })
                      .map((receivable) => {
                        const paidPercent = (receivable.paid_amount / receivable.original_amount) * 100;
                        
                        return (
                          <TableRow key={receivable.id} className={receivable.days_overdue > 0 ? 'bg-red-50' : ''}>
                            <TableCell className="font-mono text-sm">{receivable.invoice_number || '-'}</TableCell>
                            <TableCell>
                              <div className="font-medium">{receivable.customers?.name}</div>
                              <div className="text-xs text-muted-foreground">{receivable.customers?.code}</div>
                            </TableCell>
                            <TableCell>
                              {new Date(receivable.invoice_date).toLocaleDateString('vi-VN')}
                            </TableCell>
                            <TableCell>
                              <div>{new Date(receivable.due_date).toLocaleDateString('vi-VN')}</div>
                              {receivable.days_overdue > 0 && (
                                <div className="text-xs text-red-600 font-medium">
                                  Quá hạn {receivable.days_overdue} ngày
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(receivable.original_amount)}</TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatCurrency(receivable.paid_amount)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-orange-600">
                              {formatCurrency(receivable.balance)}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusColors[receivable.status]} text-white`}>
                                {statusLabels[receivable.status]}
                              </Badge>
                              <Progress value={paidPercent} className="mt-1 h-1" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Chưa có dữ liệu công nợ
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử thanh toán</CardTitle>
              <CardDescription>Các khoản đã thu từ khách hàng</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : payments && payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Số phiếu thu</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Ngày thu</TableHead>
                      <TableHead>Phương thức</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">{payment.payment_number}</TableCell>
                        <TableCell>
                          <div className="font-medium">{payment.customers?.name}</div>
                          <div className="text-xs text-muted-foreground">{payment.customers?.code}</div>
                        </TableCell>
                        <TableCell>
                          {new Date(payment.payment_date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{paymentMethodLabels[payment.payment_method]}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            payment.status === 'confirmed' ? 'bg-green-500' :
                            payment.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                          }>
                            {payment.status === 'confirmed' ? 'Đã xác nhận' :
                             payment.status === 'pending' ? 'Chờ xác nhận' : 'Từ chối'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Chưa có dữ liệu thanh toán
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aging Analysis Tab */}
        <TabsContent value="aging">
          <Card>
            <CardHeader>
              <CardTitle>Phân tích tuổi nợ</CardTitle>
              <CardDescription>Phân loại công nợ theo thời gian quá hạn</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <AgingCard
                  title="Chưa đến hạn"
                  amount={receivables?.filter(r => r.days_overdue <= 0).reduce((sum, r) => sum + r.balance, 0) || 0}
                  count={receivables?.filter(r => r.days_overdue <= 0).length || 0}
                  color="green"
                />
                <AgingCard
                  title="1-30 ngày"
                  amount={receivables?.filter(r => r.days_overdue > 0 && r.days_overdue <= 30).reduce((sum, r) => sum + r.balance, 0) || 0}
                  count={receivables?.filter(r => r.days_overdue > 0 && r.days_overdue <= 30).length || 0}
                  color="yellow"
                />
                <AgingCard
                  title="31-60 ngày"
                  amount={receivables?.filter(r => r.days_overdue > 30 && r.days_overdue <= 60).reduce((sum, r) => sum + r.balance, 0) || 0}
                  count={receivables?.filter(r => r.days_overdue > 30 && r.days_overdue <= 60).length || 0}
                  color="orange"
                />
                <AgingCard
                  title="61-90 ngày"
                  amount={receivables?.filter(r => r.days_overdue > 60 && r.days_overdue <= 90).reduce((sum, r) => sum + r.balance, 0) || 0}
                  count={receivables?.filter(r => r.days_overdue > 60 && r.days_overdue <= 90).length || 0}
                  color="red"
                />
                <AgingCard
                  title="> 90 ngày"
                  amount={receivables?.filter(r => r.days_overdue > 90).reduce((sum, r) => sum + r.balance, 0) || 0}
                  count={receivables?.filter(r => r.days_overdue > 90).length || 0}
                  color="purple"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Aging Card Component
function AgingCard({
  title,
  amount,
  count,
  color,
}: {
  title: string;
  amount: number;
  count: number;
  color: 'green' | 'yellow' | 'orange' | 'red' | 'purple';
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const colorClasses = {
    green: 'border-green-200 bg-green-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    orange: 'border-orange-200 bg-orange-50',
    red: 'border-red-200 bg-red-50',
    purple: 'border-purple-200 bg-purple-50',
  };

  const textColors = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
  };

  return (
    <Card className={colorClasses[color]}>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className={`text-xl font-bold ${textColors[color]}`}>{formatCurrency(amount)}</div>
        <div className="text-xs text-muted-foreground">{count} khoản</div>
      </CardContent>
    </Card>
  );
}
