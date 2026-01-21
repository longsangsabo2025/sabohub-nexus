import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye, Edit, Store, TrendingUp, Gift, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { distributorPortalService } from '@/services/distributorPortalService';
import type { DistributorPortal } from '@/types/distributorPortal';

const statusLabels: Record<string, string> = {
  active: 'Hoạt động',
  inactive: 'Tạm ngừng',
  suspended: 'Đình chỉ',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-yellow-500',
  suspended: 'bg-red-500',
};

export default function DistributorPortal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<DistributorPortal | null>(null);
  const { toast } = useToast();

  // Fetch portals
  const { data: portals, isLoading, refetch } = useQuery({
    queryKey: ['distributor-portals', searchQuery, statusFilter],
    queryFn: async () => {
      const filters: any = {};
      if (searchQuery) filters.search = searchQuery;
      if (statusFilter !== 'all') filters.status = statusFilter;
      return distributorPortalService.getAllPortals(filters);
    },
  });

  // Stats
  const stats = {
    total: portals?.length || 0,
    active: portals?.filter(p => p.status === 'active').length || 0,
    totalRevenue: portals?.reduce((sum, p) => sum + (p.total_orders_value || 0), 0) || 0,
    totalOrders: portals?.reduce((sum, p) => sum + (p.total_orders || 0), 0) || 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleViewDetails = (portal: DistributorPortal) => {
    setSelectedPortal(portal);
    setDetailDialogOpen(true);
  };

  const handleActivate = async (portalId: string) => {
    try {
      await distributorPortalService.updatePortal(portalId, { status: 'active' });
      toast({ title: 'Thành công', description: 'Đã kích hoạt portal' });
      refetch();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cổng thông tin NPP</h2>
          <p className="text-muted-foreground">Quản lý self-service portal cho nhà phân phối</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo Portal mới
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng NPP Portal</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} đang hoạt động
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng đơn hàng</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Qua portal
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu Portal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Tổng giá trị đơn hàng
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khuyến mãi</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Đang áp dụng
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Portal NPP</CardTitle>
          <CardDescription>Quản lý các portal self-service cho nhà phân phối</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm NPP theo mã hoặc tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Tạm ngừng</SelectItem>
                <SelectItem value="suspended">Đình chỉ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã Portal</TableHead>
                  <TableHead>NPP</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Điểm tích lũy</TableHead>
                  <TableHead className="text-right">Tổng đơn</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portals?.map((portal) => (
                  <TableRow key={portal.id}>
                    <TableCell className="font-medium">{portal.portal_code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{portal.distributor_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Mã: {portal.distributor_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[portal.status]}>
                        {statusLabels[portal.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {portal.loyalty_points_balance || 0} điểm
                    </TableCell>
                    <TableCell className="text-right">
                      {portal.total_orders || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(portal.total_orders_value || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(portal)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {portal.status !== 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivate(portal.id)}
                          >
                            Kích hoạt
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết Portal NPP</DialogTitle>
          </DialogHeader>
          {selectedPortal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Mã Portal</Label>
                  <p className="font-medium">{selectedPortal.portal_code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">NPP</Label>
                  <p className="font-medium">{selectedPortal.distributor_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Trạng thái</Label>
                  <Badge className={statusColors[selectedPortal.status]}>
                    {statusLabels[selectedPortal.status]}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Điểm tích lũy</Label>
                  <p className="font-medium">{selectedPortal.loyalty_points_balance || 0} điểm</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tổng đơn hàng</Label>
                  <p className="font-medium">{selectedPortal.total_orders || 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tổng giá trị</Label>
                  <p className="font-medium">{formatCurrency(selectedPortal.total_orders_value || 0)}</p>
                </div>
              </div>
              {selectedPortal.portal_url && (
                <div>
                  <Label className="text-muted-foreground">Portal URL</Label>
                  <p className="font-medium break-all">{selectedPortal.portal_url}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
