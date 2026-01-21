import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productionOrderService } from '@/services/productionOrderService';
import { Button } from '@/components/ui/button';
import { Plus, Search, Play, CheckCircle, XCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

export function ProductionOrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['production-orders', statusFilter, priorityFilter],
    queryFn: () => productionOrderService.getProductionOrders({
      status: statusFilter === 'all' ? undefined : statusFilter,
      priority: priorityFilter === 'all' ? undefined : priorityFilter
    })
  });

  const { data: stats } = useQuery({
    queryKey: ['production-stats'],
    queryFn: () => productionOrderService.getProductionStats()
  });

  const statusBadgeVariant = (status: string) => {
    const variants: Record<string, any> = {
      draft: 'secondary',
      planned: 'outline',
      confirmed: 'default',
      in_progress: 'default',
      completed: 'default',
      cancelled: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  const priorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'text-red-600',
      high: 'text-orange-600',
      normal: 'text-blue-600',
      low: 'text-gray-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lệnh sản xuất</h1>
          <p className="text-muted-foreground">Quản lý kế hoạch và tiến độ sản xuất</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tạo lệnh mới
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Tổng lệnh</p>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Đang sản xuất</p>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Đã hoàn thành</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Khẩn cấp</p>
            <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Tỷ lệ hoàn thành</p>
            <p className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã lệnh, sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="draft">Nháp</SelectItem>
            <SelectItem value="planned">Kế hoạch</SelectItem>
            <SelectItem value="confirmed">Đã xác nhận</SelectItem>
            <SelectItem value="in_progress">Đang SX</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Độ ưu tiên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="urgent">Khẩn cấp</SelectItem>
            <SelectItem value="high">Cao</SelectItem>
            <SelectItem value="normal">Thường</SelectItem>
            <SelectItem value="low">Thấp</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã lệnh</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Số lượng</TableHead>
              <TableHead>Tiến độ</TableHead>
              <TableHead>Ngày KH</TableHead>
              <TableHead>Độ ưu tiên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order: any) => {
                const progress = order.planned_quantity > 0
                  ? ((order.actual_quantity || 0) / order.planned_quantity) * 100
                  : 0;

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono">{order.production_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.product?.name}</p>
                        <p className="text-sm text-muted-foreground">{order.product?.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {order.actual_quantity || 0} / {order.planned_quantity}
                        </p>
                        {order.rejected_quantity > 0 && (
                          <p className="text-sm text-red-600">Lỗi: {order.rejected_quantity}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">{progress.toFixed(0)}%</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.planned_start_date && (
                        <div className="text-sm">
                          <p>
                            {new Date(order.planned_start_date).toLocaleDateString('vi-VN')}
                          </p>
                          {order.planned_end_date && (
                            <p className="text-muted-foreground">
                              → {new Date(order.planned_end_date).toLocaleDateString('vi-VN')}
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={priorityColor(order.priority || 'normal')}>
                        {order.priority === 'urgent' && '🔴 Khẩn'}
                        {order.priority === 'high' && '🟠 Cao'}
                        {order.priority === 'normal' && 'Thường'}
                        {order.priority === 'low' && 'Thấp'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {order.status === 'confirmed' && (
                          <Button variant="ghost" size="sm" title="Bắt đầu">
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {order.status === 'in_progress' && (
                          <Button variant="ghost" size="sm" title="Hoàn thành">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">Chi tiết</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
export default ProductionOrdersPage;