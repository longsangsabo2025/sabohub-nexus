import { useState } from 'react';
import { useCustomers, useCreateCustomer, useUpdateCustomer } from '@/hooks/useModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye, Edit, Phone, MapPin, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/types/modules';

const typeLabels: Record<string, string> = {
  retail: 'Bán lẻ',
  wholesale: 'Bán sỉ',
  distributor: 'Đại lý',
  horeca: 'HORECA',
  agent: 'Đại lý',
};

const channelLabels: Record<string, string> = {
  gt: 'General Trade',
  mt: 'Modern Trade',
  horeca: 'HORECA',
  online: 'Online',
  other: 'Khác',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  blacklisted: 'bg-red-500',
};

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  const { data: customers, isLoading } = useCustomers({
    search: searchQuery,
    type: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleCreate = async (data: Partial<Customer>) => {
    try {
      await createCustomer.mutateAsync(data);
      toast({ title: 'Thành công', description: 'Đã tạo khách hàng mới' });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdate = async (data: Partial<Customer>) => {
    if (!selectedCustomer) return;
    try {
      await updateCustomer.mutateAsync({ id: selectedCustomer.id, ...data });
      toast({ title: 'Thành công', description: 'Đã cập nhật khách hàng' });
      setEditDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quản lý khách hàng</h2>
          <p className="text-muted-foreground">Danh sách và thông tin khách hàng</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm khách hàng
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng khách hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {customers?.filter(c => c.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng công nợ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(customers?.reduce((sum, c) => sum + c.current_debt, 0) || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(customers?.reduce((sum, c) => sum + c.total_revenue, 0) || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách khách hàng</CardTitle>
              <CardDescription>Quản lý thông tin và giao dịch với khách hàng</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Loại KH" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="retail">Bán lẻ</SelectItem>
                  <SelectItem value="wholesale">Bán sỉ</SelectItem>
                  <SelectItem value="distributor">Đại lý</SelectItem>
                  <SelectItem value="horeca">HORECA</SelectItem>
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
          ) : customers && customers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã KH</TableHead>
                  <TableHead>Tên khách hàng</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Liên hệ</TableHead>
                  <TableHead className="text-right">Công nợ</TableHead>
                  <TableHead className="text-right">Doanh thu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-mono text-sm">{customer.code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {customer.city || 'Chưa có địa chỉ'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabels[customer.type] || customer.type}</Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {channelLabels[customer.channel] || customer.channel}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {customer.phone || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={customer.current_debt > 0 ? 'text-orange-600 font-medium' : ''}>
                        {formatCurrency(customer.current_debt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(customer.total_revenue)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[customer.status]} text-white`}>
                        {customer.status === 'active' ? 'Hoạt động' : 
                         customer.status === 'inactive' ? 'Ngừng' : 'Blacklist'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              Chưa có khách hàng nào
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Customer Dialog */}
      <CustomerFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        title="Thêm khách hàng mới"
      />

      {/* Edit Customer Dialog */}
      <CustomerFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleUpdate}
        title="Chỉnh sửa khách hàng"
        defaultValues={selectedCustomer || undefined}
      />

      {/* Customer Detail Dialog */}
      <CustomerDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        customer={selectedCustomer}
      />
    </div>
  );
}

// Customer Form Dialog Component
function CustomerFormDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Customer>) => void;
  title: string;
  defaultValues?: Partial<Customer>;
}) {
  const [formData, setFormData] = useState<Partial<Customer>>(defaultValues || {
    name: '',
    type: 'retail',
    channel: 'gt',
    phone: '',
    email: '',
    address: '',
    city: '',
    payment_terms: 0,
    credit_limit: 0,
    status: 'active',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên khách hàng *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Loại khách hàng</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Bán lẻ</SelectItem>
                  <SelectItem value="wholesale">Bán sỉ</SelectItem>
                  <SelectItem value="distributor">Đại lý</SelectItem>
                  <SelectItem value="horeca">HORECA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Kênh bán hàng</Label>
              <Select value={formData.channel} onValueChange={(v) => setFormData({ ...formData, channel: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gt">General Trade</SelectItem>
                  <SelectItem value="mt">Modern Trade</SelectItem>
                  <SelectItem value="horeca">HORECA</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Thành phố</Label>
              <Input
                id="city"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Textarea
                id="address"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Kỳ thanh toán (ngày)</Label>
              <Input
                id="payment_terms"
                type="number"
                value={formData.payment_terms || 0}
                onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit_limit">Hạn mức công nợ (VNĐ)</Label>
              <Input
                id="credit_limit"
                type="number"
                value={formData.credit_limit || 0}
                onChange={(e) => setFormData({ ...formData, credit_limit: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit">Lưu</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Customer Detail Dialog Component
function CustomerDetailDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}) {
  if (!customer) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chi tiết khách hàng</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Mã KH</Label>
              <p className="font-mono">{customer.code}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Tên</Label>
              <p className="font-medium">{customer.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Loại</Label>
              <p>{typeLabels[customer.type]}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Kênh</Label>
              <p>{channelLabels[customer.channel]}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Điện thoại</Label>
              <p>{customer.phone || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p>{customer.email || '-'}</p>
            </div>
            <div className="col-span-2">
              <Label className="text-muted-foreground">Địa chỉ</Label>
              <p>{customer.address || '-'}, {customer.city || ''}</p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Thông tin tài chính</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-orange-50 p-3 rounded-lg">
                <Label className="text-muted-foreground text-xs">Công nợ hiện tại</Label>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(customer.current_debt)}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <Label className="text-muted-foreground text-xs">Hạn mức</Label>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(customer.credit_limit)}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <Label className="text-muted-foreground text-xs">Tổng doanh thu</Label>
                <p className="text-lg font-bold text-green-600">{formatCurrency(customer.total_revenue)}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Thống kê đơn hàng</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Tổng số đơn</Label>
                <p className="text-lg font-bold">{customer.total_orders}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Đơn gần nhất</Label>
                <p>{customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString('vi-VN') : 'Chưa có'}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
