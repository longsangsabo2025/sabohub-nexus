import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { purchaseOrderService } from '@/services/purchaseOrderService';
import { Button } from '@/components/ui/button';
import { Plus, Search, FileCheck, Package } from 'lucide-react';
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

export function PurchaseOrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: () => purchaseOrderService.getPurchaseOrders({
      status: statusFilter === 'all' ? undefined : statusFilter
    })
  });

  const { data: stats } = useQuery({
    queryKey: ['po-stats'],
    queryFn: () => purchaseOrderService.getPOStats()
  });

  const statusBadgeVariant = (status: string) => {
    const variants: Record<string, any> = {
      draft: 'secondary',
      pending: 'outline',
      approved: 'default',
      ordered: 'default',
      partial: 'outline',
      received: 'default',
      cancelled: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Đơn đặt hàng NVL</h1>
          <p className="text-muted-foreground">Quản lý đơn đặt hàng từ nhà cung cấp</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tạo đơn mới
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Tổng đơn</p>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Chờ duyệt</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Đang giao</p>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Đã nhận</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Chưa thanh toán</p>
            <p className="text-2xl font-bold text-red-600">
              {(stats.unpaidValue / 1000000).toFixed(1)}M
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã PO, nhà cung cấp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="draft">Nháp</SelectItem>
            <SelectItem value="pending">Chờ duyệt</SelectItem>
            <SelectItem value="approved">Đã duyệt</SelectItem>
            <SelectItem value="ordered">Đã đặt</SelectItem>
            <SelectItem value="partial">Nhận 1 phần</SelectItem>
            <SelectItem value="received">Đã nhận</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã PO</TableHead>
              <TableHead>Nhà cung cấp</TableHead>
              <TableHead>Ngày đặt</TableHead>
              <TableHead>Ngày dự kiến</TableHead>
              <TableHead>Tổng tiền</TableHead>
              <TableHead>Thanh toán</TableHead>
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
              orders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono">{order.po_number}</TableCell>
                  <TableCell>
                    <p className="font-medium">{order.supplier?.name}</p>
                  </TableCell>
                  <TableCell>
                    {new Date(order.order_date).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    {order.expected_date
                      ? new Date(order.expected_date).toLocaleDateString('vi-VN')
                      : '—'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {order.total_amount?.toLocaleString('vi-VN')} đ
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.payment_status === 'paid'
                          ? 'default'
                          : order.payment_status === 'partial'
                          ? 'outline'
                          : 'secondary'
                      }
                    >
                      {order.payment_status === 'paid' && 'Đã TT'}
                      {order.payment_status === 'partial' && '1 phần'}
                      {order.payment_status === 'unpaid' && 'Chưa TT'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <FileCheck className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Package className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default PurchaseOrdersPage;
