import { useState } from 'react';
import { useSalesOrders, useSalesOrder, useCustomers, useProducts } from '@/hooks/useModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye, FileText, CheckCircle, XCircle, Clock, Truck, Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ReceiptPrinter, InvoicePrinter } from '@/components/modules/ReceiptPrinter';

const statusLabels: Record<string, string> = {
  draft: 'Nháp',
  pending_approval: 'Chờ duyệt',
  approved: 'Đã duyệt',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  ready: 'Sẵn sàng giao',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  pending_approval: 'bg-yellow-500',
  approved: 'bg-blue-500',
  confirmed: 'bg-indigo-500',
  processing: 'bg-purple-500',
  ready: 'bg-cyan-500',
  shipped: 'bg-orange-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
};

const paymentStatusLabels: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  partial: 'Thanh toán một phần',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
};

const paymentStatusColors: Record<string, string> = {
  unpaid: 'text-red-600',
  partial: 'text-orange-600',
  paid: 'text-green-600',
  refunded: 'text-gray-600',
};

export default function SalesOrders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);

  const { data: orders, isLoading } = useSalesOrders({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Calculate stats
  const stats = {
    total: orders?.length || 0,
    pendingApproval: orders?.filter(o => o.status === 'pending_approval').length || 0,
    processing: orders?.filter(o => ['approved', 'confirmed', 'processing', 'ready'].includes(o.status)).length || 0,
    totalValue: orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0,
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quản lý đơn hàng</h2>
          <p className="text-muted-foreground">Tạo và theo dõi đơn hàng B2B</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo đơn hàng
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng đơn hàng</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className={stats.pendingApproval > 0 ? 'border-yellow-300 bg-yellow-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingApproval}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang xử lý</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng giá trị</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="pending_approval">
            Chờ duyệt
            {stats.pendingApproval > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {stats.pendingApproval}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processing">Đang xử lý</TabsTrigger>
          <TabsTrigger value="delivered">Đã giao</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Danh sách đơn hàng</CardTitle>
                  <CardDescription>Tất cả đơn hàng trong hệ thống</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="draft">Nháp</SelectItem>
                      <SelectItem value="pending_approval">Chờ duyệt</SelectItem>
                      <SelectItem value="approved">Đã duyệt</SelectItem>
                      <SelectItem value="delivered">Đã giao</SelectItem>
                      <SelectItem value="cancelled">Đã hủy</SelectItem>
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
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : orders && orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Số đơn</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Ngày đặt</TableHead>
                      <TableHead className="text-right">Giá trị</TableHead>
                      <TableHead>Thanh toán</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Giao hàng</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders
                      .filter(order => {
                        if (!searchQuery) return true;
                        const search = searchQuery.toLowerCase();
                        return (
                          order.order_number.toLowerCase().includes(search) ||
                          order.customers?.name?.toLowerCase().includes(search)
                        );
                      })
                      .map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm font-medium">
                            {order.order_number}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{order.customers?.name}</div>
                            <div className="text-xs text-muted-foreground">{order.customers?.code}</div>
                          </TableCell>
                          <TableCell>
                            {new Date(order.order_date).toLocaleDateString('vi-VN')}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(order.total_amount)}
                          </TableCell>
                          <TableCell>
                            <span className={paymentStatusColors[order.payment_status]}>
                              {paymentStatusLabels[order.payment_status]}
                            </span>
                            {order.paid_amount > 0 && order.payment_status === 'partial' && (
                              <div className="text-xs text-muted-foreground">
                                Đã: {formatCurrency(order.paid_amount)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[order.status]} text-white`}>
                              {statusLabels[order.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {order.delivery_status === 'pending' ? 'Chờ giao' :
                               order.delivery_status === 'in_transit' ? 'Đang giao' :
                               order.delivery_status === 'delivered' ? 'Đã giao' : 'Thất bại'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setDetailDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPrintOrderId(order.id);
                                  setReceiptOpen(true);
                                }}
                                title="In phiếu thu"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              {order.status === 'pending_approval' && (
                                <>
                                  <Button variant="ghost" size="sm" className="text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-600">
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Chưa có đơn hàng nào
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending_approval">
          <Card>
            <CardHeader>
              <CardTitle>Đơn hàng chờ duyệt</CardTitle>
              <CardDescription>Các đơn hàng cần được phê duyệt</CardDescription>
            </CardHeader>
            <CardContent>
              {orders?.filter(o => o.status === 'pending_approval').length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  Không có đơn hàng nào chờ duyệt
                </div>
              ) : (
                <div className="space-y-4">
                  {orders?.filter(o => o.status === 'pending_approval').map(order => (
                    <Card key={order.id} className="border-yellow-200 bg-yellow-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono font-bold">{order.order_number}</div>
                            <div className="text-sm">{order.customers?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(order.order_date).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold">{formatCurrency(order.total_amount)}</div>
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Duyệt
                              </Button>
                              <Button size="sm" variant="destructive">
                                <XCircle className="mr-1 h-4 w-4" />
                                Từ chối
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle>Đơn hàng đang xử lý</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground">
                {orders?.filter(o => ['approved', 'confirmed', 'processing', 'ready', 'shipped'].includes(o.status)).length === 0
                  ? 'Không có đơn hàng đang xử lý'
                  : `${orders?.filter(o => ['approved', 'confirmed', 'processing', 'ready', 'shipped'].includes(o.status)).length} đơn hàng đang xử lý`
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivered">
          <Card>
            <CardHeader>
              <CardTitle>Đơn hàng đã giao</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground">
                {orders?.filter(o => o.status === 'delivered').length === 0
                  ? 'Chưa có đơn hàng nào được giao'
                  : `${orders?.filter(o => o.status === 'delivered').length} đơn hàng đã giao thành công`
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Order Dialog */}
      <CreateOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        orderId={selectedOrderId}
      />
    </div>
  );
}

// Create Order Dialog
function CreateOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [items, setItems] = useState<{ product_id: string; quantity: number; unit_price: number }[]>([]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo đơn hàng mới</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label>Khách hàng *</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn khách hàng" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.code} - {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <Label>Sản phẩm</Label>
            <div className="border rounded-lg p-4">
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground">Chưa có sản phẩm nào</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Số lượng</TableHead>
                      <TableHead>Đơn giá</TableHead>
                      <TableHead>Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => {
                      const product = products?.find(p => p.id === item.product_id);
                      return (
                        <TableRow key={idx}>
                          <TableCell>{product?.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit_price.toLocaleString('vi-VN')}đ</TableCell>
                          <TableCell>{(item.quantity * item.unit_price).toLocaleString('vi-VN')}đ</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  if (products && products.length > 0) {
                    const p = products[0];
                    setItems([...items, { 
                      product_id: p.id, 
                      quantity: 1, 
                      unit_price: p.selling_price 
                    }]);
                  }
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Thêm sản phẩm
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button>Tạo đơn hàng</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Order Detail Dialog
function OrderDetailDialog({
  open,
  onOpenChange,
  orderId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
}) {
  const { data: order, isLoading } = useSalesOrder(orderId || '');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (!orderId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết đơn hàng</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : order ? (
          <div className="space-y-4">
            {/* Order Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-mono font-bold">{order.order_number}</div>
                <div className="text-muted-foreground">
                  Ngày đặt: {new Date(order.order_date).toLocaleDateString('vi-VN')}
                </div>
              </div>
              <Badge className={`${statusColors[order.status]} text-white text-lg px-4 py-1`}>
                {statusLabels[order.status]}
              </Badge>
            </div>

            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Thông tin khách hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Tên</Label>
                    <p className="font-medium">{order.customers?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Mã KH</Label>
                    <p>{order.customers?.code}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Điện thoại</Label>
                    <p>{order.customers?.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Địa chỉ</Label>
                    <p>{order.customers?.address || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sản phẩm đặt hàng</CardTitle>
              </CardHeader>
              <CardContent>
                {order.sales_order_items && order.sales_order_items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead className="text-right">SL đặt</TableHead>
                        <TableHead className="text-right">SL giao</TableHead>
                        <TableHead className="text-right">Đơn giá</TableHead>
                        <TableHead className="text-right">Thành tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.sales_order_items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-xs text-muted-foreground">{item.sku}</div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                          <TableCell className="text-right">{item.delivered_quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.line_total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Không có sản phẩm</p>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <div className="flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Giảm giá:</span>
                    <span>-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                {order.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Thuế VAT:</span>
                    <span>{formatCurrency(order.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Tổng cộng:</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Đã thanh toán:</span>
                  <span>{formatCurrency(order.paid_amount)}</span>
                </div>
                <div className="flex justify-between text-orange-600 font-medium">
                  <span>Còn lại:</span>
                  <span>{formatCurrency(order.total_amount - order.paid_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Không tìm thấy đơn hàng</p>
        )}
      </DialogContent>
    </Dialog>

    {/* Receipt & Invoice Printers */}
    {printOrderId && (
      <>
        <ReceiptPrinter 
          orderId={printOrderId} 
          open={receiptOpen} 
          onClose={() => {
            setReceiptOpen(false);
            setPrintOrderId(null);
          }} 
        />
        <InvoicePrinter 
          orderId={printOrderId} 
          open={invoiceOpen} 
          onClose={() => {
            setInvoiceOpen(false);
            setPrintOrderId(null);
          }} 
        />
      </>
    )}
  </>
  );
}
