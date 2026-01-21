import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, TrendingDown, Package, DollarSign, BarChart3 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sellInOutService } from '@/services/sellInOutService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function SellThroughAnalytics() {
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('30');
  const [distributorFilter, setDistributorFilter] = useState<string>('all');

  // Calculate date range
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - parseInt(periodFilter) * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Fetch sell-in transactions
  const { data: sellInData, isLoading: sellInLoading } = useQuery({
    queryKey: ['sell-in', startDate, endDate, distributorFilter],
    queryFn: () =>
      sellInOutService.getAllSellIn({
        from_date: startDate,
        to_date: endDate,
        distributor_id: distributorFilter !== 'all' ? distributorFilter : undefined,
      }),
  });

  // Fetch sell-out transactions
  const { data: sellOutData, isLoading: sellOutLoading } = useQuery({
    queryKey: ['sell-out', startDate, endDate, distributorFilter],
    queryFn: () =>
      sellInOutService.getAllSellOut({
        from_date: startDate,
        to_date: endDate,
        distributor_id: distributorFilter !== 'all' ? distributorFilter : undefined,
      }),
  });

  // Fetch sell-through metrics
  const { data: metricsData } = useQuery({
    queryKey: ['sell-through-metrics', distributorFilter],
    queryFn: () =>
      sellInOutService.calculateSellThroughMetrics(
        distributorFilter !== 'all' ? distributorFilter : undefined
      ),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Calculate stats
  const stats = {
    totalSellIn: sellInData?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0,
    totalSellOut: sellOutData?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0,
    sellThroughRate: metricsData?.sell_through_rate || 0,
    inventoryTurnover: metricsData?.inventory_turnover || 0,
  };

  // Prepare chart data (group by date)
  const chartData = (() => {
    const dataMap = new Map<string, { date: string; sellIn: number; sellOut: number }>();

    sellInData?.forEach((t) => {
      const date = t.transaction_date.split('T')[0];
      if (!dataMap.has(date)) {
        dataMap.set(date, { date, sellIn: 0, sellOut: 0 });
      }
      dataMap.get(date)!.sellIn += t.total_amount || 0;
    });

    sellOutData?.forEach((t) => {
      const date = t.transaction_date.split('T')[0];
      if (!dataMap.has(date)) {
        dataMap.set(date, { date, sellIn: 0, sellOut: 0 });
      }
      dataMap.get(date)!.sellOut += t.total_amount || 0;
    });

    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Phân tích Sell-Through</h2>
          <p className="text-muted-foreground">Theo dõi sell-in, sell-out và tỷ lệ bán qua</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sell-In</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalSellIn)}</div>
            <p className="text-xs text-muted-foreground">Nhập hàng từ công ty</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sell-Out</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalSellOut)}</div>
            <p className="text-xs text-muted-foreground">Bán ra thị trường</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ Sell-Through</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sellThroughRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Sell-Out / Sell-In</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vòng quay tồn kho</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inventoryTurnover.toFixed(1)}x</div>
            <p className="text-xs text-muted-foreground">Số lần quay vòng</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ Sell-In vs Sell-Out</CardTitle>
          <div className="flex gap-4 mt-4">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn khoảng thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày qua</SelectItem>
                <SelectItem value="30">30 ngày qua</SelectItem>
                <SelectItem value="90">90 ngày qua</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Ngày: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sellIn"
                stroke="#3b82f6"
                name="Sell-In"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="sellOut"
                stroke="#10b981"
                name="Sell-Out"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Tables */}
      <Tabs defaultValue="sell-in" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sell-in">Giao dịch Sell-In</TabsTrigger>
          <TabsTrigger value="sell-out">Giao dịch Sell-Out</TabsTrigger>
          <TabsTrigger value="inventory">Tồn kho NPP</TabsTrigger>
        </TabsList>

        <TabsContent value="sell-in">
          <Card>
            <CardHeader>
              <CardTitle>Giao dịch Sell-In</CardTitle>
              <CardDescription>Danh sách giao dịch nhập hàng từ công ty</CardDescription>
            </CardHeader>
            <CardContent>
              {sellInLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã giao dịch</TableHead>
                      <TableHead>NPP</TableHead>
                      <TableHead>Ngày giao dịch</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                      <TableHead className="text-right">Giá trị</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellInData?.slice(0, 10).map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {transaction.transaction_code}
                        </TableCell>
                        <TableCell>{(transaction as any).distributor?.distributor_name}</TableCell>
                        <TableCell>
                          {new Date(transaction.transaction_date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-right">{transaction.total_quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(transaction.total_amount || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sell-out">
          <Card>
            <CardHeader>
              <CardTitle>Giao dịch Sell-Out</CardTitle>
              <CardDescription>Danh sách giao dịch bán ra từ NPP</CardDescription>
            </CardHeader>
            <CardContent>
              {sellOutLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã giao dịch</TableHead>
                      <TableHead>NPP</TableHead>
                      <TableHead>Ngày giao dịch</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                      <TableHead className="text-right">Giá trị</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellOutData?.slice(0, 10).map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {transaction.transaction_code}
                        </TableCell>
                        <TableCell>{(transaction as any).distributor?.distributor_name}</TableCell>
                        <TableCell>
                          {new Date(transaction.transaction_date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-right">{transaction.total_quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(transaction.total_amount || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Tồn kho tại NPP</CardTitle>
              <CardDescription>Theo dõi tồn kho hiện tại của NPP</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Đang phát triển tính năng...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
