// Sales Analytics Dashboard for Odori Module
// Provides comprehensive sales reports and KPIs

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Truck, 
  Users, 
  ShoppingCart,
  Calendar,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';

// Types
interface SalesStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  avgOrderValue: number;
  pendingDeliveries: number;
  outstandingReceivables: number;
  lowStockItems: number;
}

interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface TopCustomer {
  id: string;
  name: string;
  totalOrders: number;
  totalRevenue: number;
}

interface OrderStatusDistribution {
  status: string;
  count: number;
  label: string;
}

// Helper functions
const getCompanyId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.company_id || null;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('vi-VN').format(value);
};

// Dashboard Component
export default function SalesAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'thisMonth' | 'lastMonth'>('30d');

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d':
        return { start: subDays(now, 7), end: now };
      case '30d':
        return { start: subDays(now, 30), end: now };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(now), 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
  };

  const { start, end } = getDateRange();

  // Fetch overall stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['sales-stats', dateRange],
    queryFn: async (): Promise<SalesStats> => {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error('Company not found');

      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      // Fetch orders with revenue
      const { data: orders, error: ordersError } = await supabase
        .from('odori_sales_orders')
        .select('id, total_amount, status')
        .eq('company_id', companyId)
        .gte('order_date', startStr)
        .lte('order_date', endStr)
        .is('deleted_at', null);

      if (ordersError) throw ordersError;

      // Fetch customers count
      const { count: customersCount } = await supabase
        .from('odori_customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true)
        .is('deleted_at', null);

      // Fetch products count
      const { count: productsCount } = await supabase
        .from('odori_products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true)
        .is('deleted_at', null);

      // Fetch pending deliveries
      const { count: pendingDeliveries } = await supabase
        .from('odori_deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('status', ['pending', 'in_transit'])
        .is('deleted_at', null);

      // Fetch outstanding receivables
      const { data: receivables } = await supabase
        .from('odori_receivables')
        .select('outstanding_amount')
        .eq('company_id', companyId)
        .eq('status', 'outstanding')
        .is('deleted_at', null);

      // Fetch low stock items
      const { count: lowStockCount } = await supabase
        .from('odori_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .lt('quantity', 10); // Threshold

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const outstandingReceivables = receivables?.reduce((sum, r) => sum + (r.outstanding_amount || 0), 0) || 0;

      return {
        totalRevenue,
        totalOrders,
        totalCustomers: customersCount || 0,
        totalProducts: productsCount || 0,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        pendingDeliveries: pendingDeliveries || 0,
        outstandingReceivables,
        lowStockItems: lowStockCount || 0,
      };
    },
  });

  // Fetch daily sales data
  const { data: dailySales } = useQuery({
    queryKey: ['daily-sales', dateRange],
    queryFn: async (): Promise<DailySales[]> => {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error('Company not found');

      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('odori_sales_orders')
        .select('order_date, total_amount')
        .eq('company_id', companyId)
        .gte('order_date', startStr)
        .lte('order_date', endStr)
        .is('deleted_at', null);

      if (error) throw error;

      // Group by date
      const grouped = (data || []).reduce((acc, order) => {
        const date = order.order_date;
        if (!acc[date]) {
          acc[date] = { date, revenue: 0, orders: 0 };
        }
        acc[date].revenue += order.total_amount || 0;
        acc[date].orders += 1;
        return acc;
      }, {} as Record<string, DailySales>);

      return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  // Fetch top products
  const { data: topProducts } = useQuery({
    queryKey: ['top-products', dateRange],
    queryFn: async (): Promise<TopProduct[]> => {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error('Company not found');

      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const { data: orders } = await supabase
        .from('odori_sales_orders')
        .select('id')
        .eq('company_id', companyId)
        .gte('order_date', startStr)
        .lte('order_date', endStr)
        .is('deleted_at', null);

      if (!orders?.length) return [];

      const orderIds = orders.map(o => o.id);

      const { data: items } = await supabase
        .from('odori_order_items')
        .select(`
          quantity,
          total,
          product:odori_products(id, name)
        `)
        .in('order_id', orderIds);

      // Group by product
      const grouped = (items || []).reduce((acc, item) => {
        const product = item.product as { id: string; name: string } | null;
        if (!product) return acc;
        
        if (!acc[product.id]) {
          acc[product.id] = {
            id: product.id,
            name: product.name,
            quantity: 0,
            revenue: 0,
          };
        }
        acc[product.id].quantity += item.quantity || 0;
        acc[product.id].revenue += item.total || 0;
        return acc;
      }, {} as Record<string, TopProduct>);

      return Object.values(grouped)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    },
  });

  // Fetch top customers
  const { data: topCustomers } = useQuery({
    queryKey: ['top-customers', dateRange],
    queryFn: async (): Promise<TopCustomer[]> => {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error('Company not found');

      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const { data } = await supabase
        .from('odori_sales_orders')
        .select(`
          total_amount,
          customer:odori_customers(id, name)
        `)
        .eq('company_id', companyId)
        .gte('order_date', startStr)
        .lte('order_date', endStr)
        .is('deleted_at', null);

      // Group by customer
      const grouped = (data || []).reduce((acc, order) => {
        const customer = order.customer as { id: string; name: string } | null;
        if (!customer) return acc;
        
        if (!acc[customer.id]) {
          acc[customer.id] = {
            id: customer.id,
            name: customer.name,
            totalOrders: 0,
            totalRevenue: 0,
          };
        }
        acc[customer.id].totalOrders += 1;
        acc[customer.id].totalRevenue += order.total_amount || 0;
        return acc;
      }, {} as Record<string, TopCustomer>);

      return Object.values(grouped)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);
    },
  });

  // Fetch order status distribution
  const { data: statusDistribution } = useQuery({
    queryKey: ['order-status-distribution', dateRange],
    queryFn: async (): Promise<OrderStatusDistribution[]> => {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error('Company not found');

      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const { data } = await supabase
        .from('odori_sales_orders')
        .select('status')
        .eq('company_id', companyId)
        .gte('order_date', startStr)
        .lte('order_date', endStr)
        .is('deleted_at', null);

      const statusLabels: Record<string, string> = {
        draft: 'Nháp',
        pending: 'Chờ duyệt',
        approved: 'Đã duyệt',
        processing: 'Đang xử lý',
        completed: 'Hoàn thành',
        cancelled: 'Đã hủy',
      };

      const grouped = (data || []).reduce((acc, order) => {
        const status = order.status || 'draft';
        if (!acc[status]) {
          acc[status] = { status, count: 0, label: statusLabels[status] || status };
        }
        acc[status].count += 1;
        return acc;
      }, {} as Record<string, OrderStatusDistribution>);

      return Object.values(grouped);
    },
  });

  // Fetch aging report
  const { data: agingReport } = useQuery({
    queryKey: ['aging-report'],
    queryFn: async () => {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error('Company not found');

      const { data } = await supabase
        .from('odori_receivables')
        .select('outstanding_amount, due_date')
        .eq('company_id', companyId)
        .eq('status', 'outstanding')
        .is('deleted_at', null);

      const today = new Date();
      const buckets = {
        current: 0,
        '1-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
      };

      (data || []).forEach((r) => {
        const dueDate = new Date(r.due_date);
        const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const amount = r.outstanding_amount || 0;

        if (diffDays <= 0) buckets.current += amount;
        else if (diffDays <= 30) buckets['1-30'] += amount;
        else if (diffDays <= 60) buckets['31-60'] += amount;
        else if (diffDays <= 90) buckets['61-90'] += amount;
        else buckets['90+'] += amount;
      });

      return [
        { name: 'Chưa đến hạn', value: buckets.current, color: '#22c55e' },
        { name: '1-30 ngày', value: buckets['1-30'], color: '#eab308' },
        { name: '31-60 ngày', value: buckets['31-60'], color: '#f97316' },
        { name: '61-90 ngày', value: buckets['61-90'], color: '#ef4444' },
        { name: '90+ ngày', value: buckets['90+'], color: '#7f1d1d' },
      ];
    },
  });

  const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Báo cáo & Phân tích</h1>
          <p className="text-muted-foreground">Theo dõi hiệu quả kinh doanh Odori</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Chọn khoảng thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 ngày qua</SelectItem>
              <SelectItem value="30d">30 ngày qua</SelectItem>
              <SelectItem value="thisMonth">Tháng này</SelectItem>
              <SelectItem value="lastMonth">Tháng trước</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetchStats()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
            </div>
            <div className="flex items-center pt-1">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">+12.5%</span>
              <span className="text-xs text-muted-foreground ml-1">so với kỳ trước</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đơn hàng</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : formatNumber(stats?.totalOrders || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Giá trị TB: {formatCurrency(stats?.avgOrderValue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khách hàng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : formatNumber(stats?.totalCustomers || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalProducts || 0} sản phẩm đang bán
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cần xử lý</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Chờ giao hàng:</span>
                <Badge variant="secondary">{stats?.pendingDeliveries || 0}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Hàng tồn thấp:</span>
                <Badge variant="destructive">{stats?.lowStockItems || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Doanh thu</TabsTrigger>
          <TabsTrigger value="products">Top Sản phẩm</TabsTrigger>
          <TabsTrigger value="customers">Top Khách hàng</TabsTrigger>
          <TabsTrigger value="receivables">Công nợ</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Revenue Trend */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Xu hướng doanh thu</CardTitle>
                <CardDescription>Doanh thu và số đơn hàng theo ngày</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySales || []}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: vi })}
                    />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'revenue' ? formatCurrency(value) : value,
                        name === 'revenue' ? 'Doanh thu' : 'Đơn hàng'
                      ]}
                      labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy', { locale: vi })}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      name="Doanh thu"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                      name="Đơn hàng"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Order Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Phân bổ trạng thái đơn</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {(statusDistribution || []).map((entry, index) => (
                        <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Outstanding Receivables Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Công nợ phải thu</CardTitle>
                <CardDescription>Tổng: {formatCurrency(stats?.outstandingReceivables || 0)}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingReport || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {(agingReport || []).map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 sản phẩm bán chạy</CardTitle>
              <CardDescription>Theo doanh thu trong kỳ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts?.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Số lượng: {formatNumber(product.quantity)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(product.revenue)}</div>
                    </div>
                    <div className="w-32">
                      <Progress 
                        value={(product.revenue / (topProducts[0]?.revenue || 1)) * 100} 
                      />
                    </div>
                  </div>
                ))}
                {!topProducts?.length && (
                  <div className="text-center text-muted-foreground py-8">
                    Chưa có dữ liệu sản phẩm
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 khách hàng</CardTitle>
              <CardDescription>Theo doanh thu trong kỳ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCustomers?.map((customer, index) => (
                  <div key={customer.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {customer.totalOrders} đơn hàng
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(customer.totalRevenue)}</div>
                    </div>
                    <div className="w-32">
                      <Progress 
                        value={(customer.totalRevenue / (topCustomers[0]?.totalRevenue || 1)) * 100} 
                      />
                    </div>
                  </div>
                ))}
                {!topCustomers?.length && (
                  <div className="text-center text-muted-foreground py-8">
                    Chưa có dữ liệu khách hàng
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivables">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Phân tích tuổi nợ</CardTitle>
                <CardDescription>Aging Report</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={agingReport || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {(agingReport || []).map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Chi tiết tuổi nợ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agingReport?.map((bucket) => (
                    <div key={bucket.name} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: bucket.color }}
                        />
                        <span>{bucket.name}</span>
                      </div>
                      <div className="font-semibold">{formatCurrency(bucket.value)}</div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted font-semibold">
                    <span>Tổng cộng</span>
                    <span>{formatCurrency(stats?.outstandingReceivables || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
