import { useState } from 'react';
import { useDeliveries, useDelivery } from '@/hooks/useModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Truck, MapPin, CheckCircle, XCircle, Clock, Navigation, Plus, Eye, Route } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { DeliveryTracker } from '@/components/modules/DeliveryTracker';

const statusLabels: Record<string, string> = {
  planned: 'Đã lên kế hoạch',
  loading: 'Đang lấy hàng',
  in_progress: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const statusColors: Record<string, string> = {
  planned: 'bg-gray-500',
  loading: 'bg-yellow-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

const itemStatusLabels: Record<string, string> = {
  pending: 'Chờ giao',
  in_transit: 'Đang giao',
  delivered: 'Đã giao',
  partial: 'Giao một phần',
  failed: 'Thất bại',
  returned: 'Hoàn trả',
  rescheduled: 'Dời lịch',
};

const itemStatusColors: Record<string, string> = {
  pending: 'bg-gray-500',
  in_transit: 'bg-blue-500',
  delivered: 'bg-green-500',
  partial: 'bg-yellow-500',
  failed: 'bg-red-500',
  returned: 'bg-orange-500',
  rescheduled: 'bg-purple-500',
};

export default function Deliveries() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [trackingDeliveryId, setTrackingDeliveryId] = useState<string | null>(null);

  const { data: deliveries, isLoading } = useDeliveries({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    date: dateFilter,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Calculate stats
  const stats = {
    totalTrips: deliveries?.length || 0,
    inProgress: deliveries?.filter(d => d.status === 'in_progress').length || 0,
    completed: deliveries?.filter(d => d.status === 'completed').length || 0,
    totalDelivered: deliveries?.reduce((sum, d) => sum + d.completed_stops, 0) || 0,
    totalFailed: deliveries?.reduce((sum, d) => sum + d.failed_stops, 0) || 0,
    totalCollected: deliveries?.reduce((sum, d) => sum + d.collected_amount, 0) || 0,
  };

  const successRate = stats.totalDelivered + stats.totalFailed > 0
    ? (stats.totalDelivered / (stats.totalDelivered + stats.totalFailed) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quản lý giao hàng</h2>
          <p className="text-muted-foreground">Theo dõi và quản lý các chuyến giao hàng</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tạo chuyến giao
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng chuyến</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrips}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang giao</CardTitle>
            <Navigation className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã giao</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalDelivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ thành công</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <Progress value={Number(successRate)} className="mt-1 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã thu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalCollected)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trips" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trips">Chuyến giao</TabsTrigger>
          <TabsTrigger value="live">Theo dõi trực tiếp</TabsTrigger>
          <TabsTrigger value="drivers">Tài xế</TabsTrigger>
        </TabsList>

        {/* Delivery Trips Tab */}
        <TabsContent value="trips">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Danh sách chuyến giao</CardTitle>
                  <CardDescription>Quản lý các chuyến giao hàng</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-40"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="planned">Đã lên kế hoạch</SelectItem>
                      <SelectItem value="in_progress">Đang giao</SelectItem>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm..."
                      className="pl-8 w-48"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : deliveries && deliveries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã chuyến</TableHead>
                      <TableHead>Tài xế</TableHead>
                      <TableHead>Phương tiện</TableHead>
                      <TableHead className="text-center">Điểm giao</TableHead>
                      <TableHead className="text-right">Giá trị</TableHead>
                      <TableHead className="text-right">Đã thu</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries
                      .filter(d => {
                        if (!searchQuery) return true;
                        const search = searchQuery.toLowerCase();
                        return (
                          d.delivery_number.toLowerCase().includes(search) ||
                          d.employees?.full_name?.toLowerCase().includes(search)
                        );
                      })
                      .map((delivery) => {
                        const progress = delivery.planned_stops > 0
                          ? ((delivery.completed_stops + delivery.failed_stops) / delivery.planned_stops * 100)
                          : 0;

                        return (
                          <TableRow key={delivery.id}>
                            <TableCell className="font-mono text-sm font-medium">
                              {delivery.delivery_number}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{delivery.employees?.full_name || '-'}</div>
                              {delivery.vehicle_plate && (
                                <div className="text-xs text-muted-foreground">{delivery.vehicle_plate}</div>
                              )}
                            </TableCell>
                            <TableCell>{delivery.vehicle || '-'}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-green-600 font-medium">{delivery.completed_stops}</span>
                                <span>/</span>
                                <span>{delivery.planned_stops}</span>
                                {delivery.failed_stops > 0 && (
                                  <Badge variant="destructive" className="ml-1 text-xs">
                                    {delivery.failed_stops} lỗi
                                  </Badge>
                                )}
                              </div>
                              <Progress value={progress} className="mt-1 h-1" />
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(delivery.total_amount)}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {formatCurrency(delivery.collected_amount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusColors[delivery.status]} text-white`}>
                                {statusLabels[delivery.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDeliveryId(delivery.id);
                                    setDetailDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600"
                                  onClick={() => {
                                    setTrackingDeliveryId(delivery.id);
                                    setTrackingDialogOpen(true);
                                  }}
                                  title="Theo dõi GPS"
                                >
                                  <Route className="h-4 w-4" />
                                </Button>
                                {delivery.status === 'in_progress' && (
                                  <Button variant="ghost" size="sm" className="text-green-600">
                                    <MapPin className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Chưa có chuyến giao nào
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Tracking Tab */}
        <TabsContent value="live">
          <Card>
            <CardHeader>
              <CardTitle>Theo dõi trực tiếp</CardTitle>
              <CardDescription>Vị trí các tài xế đang giao hàng</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Bản đồ theo dõi GPS</p>
                  <p className="text-sm">Tích hợp Google Maps / Mapbox</p>
                </div>
              </div>
              {/* Active drivers list */}
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {deliveries?.filter(d => d.status === 'in_progress').map(d => (
                  <Card key={d.id} className="border-blue-200 bg-blue-50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <div>
                          <div className="font-medium">{d.employees?.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.delivery_number} - {d.completed_stops}/{d.planned_stops} điểm
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!deliveries || deliveries.filter(d => d.status === 'in_progress').length === 0) && (
                  <div className="col-span-3 text-center text-muted-foreground py-4">
                    Không có tài xế nào đang giao hàng
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers">
          <Card>
            <CardHeader>
              <CardTitle>Hiệu suất tài xế</CardTitle>
              <CardDescription>Thống kê giao hàng theo tài xế</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground">
                Chức năng đang phát triển
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delivery Detail Dialog */}
      <DeliveryDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        deliveryId={selectedDeliveryId}
      />
    </div>
  );
}

// Delivery Detail Dialog
function DeliveryDetailDialog({
  open,
  onOpenChange,
  deliveryId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId: string | null;
}) {
  const { data: delivery, isLoading } = useDelivery(deliveryId || '');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (!deliveryId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết chuyến giao</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : delivery ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-mono font-bold">{delivery.delivery_number}</div>
                <div className="text-muted-foreground">
                  {new Date(delivery.delivery_date).toLocaleDateString('vi-VN')}
                </div>
              </div>
              <Badge className={`${statusColors[delivery.status]} text-white text-lg px-4 py-1`}>
                {statusLabels[delivery.status]}
              </Badge>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-3">
                  <div className="text-sm text-muted-foreground">Tổng điểm</div>
                  <div className="text-xl font-bold">{delivery.planned_stops}</div>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="p-3">
                  <div className="text-sm text-muted-foreground">Đã giao</div>
                  <div className="text-xl font-bold text-green-600">{delivery.completed_stops}</div>
                </CardContent>
              </Card>
              <Card className={delivery.failed_stops > 0 ? 'bg-red-50' : ''}>
                <CardContent className="p-3">
                  <div className="text-sm text-muted-foreground">Thất bại</div>
                  <div className="text-xl font-bold text-red-600">{delivery.failed_stops}</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="p-3">
                  <div className="text-sm text-muted-foreground">Đã thu</div>
                  <div className="text-xl font-bold text-blue-600">{formatCurrency(delivery.collected_amount)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Delivery Items */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Danh sách điểm giao</CardTitle>
              </CardHeader>
              <CardContent>
                {delivery.delivery_items && delivery.delivery_items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead>Địa chỉ</TableHead>
                        <TableHead className="text-right">Giá trị</TableHead>
                        <TableHead className="text-right">Đã thu</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {delivery.delivery_items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.sequence}</TableCell>
                          <TableCell>
                            <div className="font-medium">{item.customer_name}</div>
                            <div className="text-xs text-muted-foreground">{item.customer_phone}</div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{item.customer_address}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.order_amount)}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(item.collected_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${itemStatusColors[item.status]} text-white`}>
                              {itemStatusLabels[item.status]}
                            </Badge>
                            {item.delivered_at && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(item.delivered_at).toLocaleTimeString('vi-VN')}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Không có điểm giao</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Không tìm thấy chuyến giao</p>
        )}
      </DialogContent>
    </Dialog>

    {/* GPS Tracking Dialog */}
    <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Theo dõi giao hàng GPS</DialogTitle>
        </DialogHeader>
        {trackingDeliveryId && (
          <DeliveryTracker deliveryId={trackingDeliveryId} isDriver={false} />
        )}
      </DialogContent>
    </Dialog>
  );
}
