import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye, Navigation, MapPin, Users, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { salesRouteService } from '@/services/salesRouteService';
import type { SalesRoute, CreateRouteInput } from '@/types/salesRoute';

export default function SalesRoutes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<SalesRoute | null>(null);
  const [formData, setFormData] = useState<Partial<CreateRouteInput>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch routes
  const { data: routes, isLoading } = useQuery({
    queryKey: ['sales-routes', searchQuery],
    queryFn: async () => {
      const filters: any = {};
      if (searchQuery) filters.search = searchQuery;
      return salesRouteService.getAllRoutes(filters);
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateRouteInput) => salesRouteService.createRoute(data),
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã tạo tuyến mới' });
      queryClient.invalidateQueries({ queryKey: ['sales-routes'] });
      setCreateDialogOpen(false);
      setFormData({});
    },
    onError: (error: any) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const handleViewDetails = async (route: SalesRoute) => {
    try {
      const customers = await salesRouteService.getRouteCustomers(route.id);
      setSelectedRoute({ ...route, customers } as any);
      setDetailDialogOpen(true);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  const handleOptimize = async (routeId: string) => {
    try {
      const optimized = await salesRouteService.optimizeRoute(routeId);
      toast({
        title: 'Tối ưu thành công',
        description: `Khoảng cách giảm từ ${optimized.original_distance.toFixed(2)}km xuống ${optimized.optimized_distance.toFixed(2)}km`,
      });
      queryClient.invalidateQueries({ queryKey: ['sales-routes'] });
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreate = () => {
    if (!formData.route_name || !formData.sales_rep_id) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập đầy đủ thông tin', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData as CreateRouteInput);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tuyến bán hàng</h2>
          <p className="text-muted-foreground">Quản lý tuyến và kế hoạch viếng thăm</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo tuyến mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng tuyến</CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routes?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {routes?.filter((r) => r.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng điểm bán</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {routes?.reduce((sum, r) => sum + (r.total_customers || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng km</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {routes?.reduce((sum, r) => sum + (r.estimated_distance || 0), 0).toFixed(0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách tuyến</CardTitle>
          <CardDescription>Quản lý tuyến bán hàng và kế hoạch viếng thăm</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm tuyến..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

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
                  <TableHead>Mã tuyến</TableHead>
                  <TableHead>Tên tuyến</TableHead>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Điểm bán</TableHead>
                  <TableHead>Khoảng cách</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes?.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.route_code}</TableCell>
                    <TableCell>{route.route_name}</TableCell>
                    <TableCell>{(route as any).sales_rep?.display_name || 'N/A'}</TableCell>
                    <TableCell>{route.total_customers || 0}</TableCell>
                    <TableCell>{route.estimated_distance?.toFixed(1) || 0} km</TableCell>
                    <TableCell>
                      <Badge className={route.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                        {route.is_active ? 'Hoạt động' : 'Không hoạt động'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(route)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOptimize(route.id)}
                        >
                          Tối ưu
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo tuyến mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên tuyến *</Label>
              <Input
                value={formData.route_name || ''}
                onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                placeholder="VD: Tuyến Q1 - TPHCM"
              />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả tuyến..."
              />
            </div>
            <div>
              <Label>ID Nhân viên *</Label>
              <Input
                value={formData.sales_rep_id || ''}
                onChange={(e) => setFormData({ ...formData, sales_rep_id: e.target.value })}
                placeholder="UUID của nhân viên"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo tuyến'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Chi tiết tuyến</DialogTitle>
          </DialogHeader>
          {selectedRoute && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Mã tuyến</Label>
                  <p className="font-medium">{selectedRoute.route_code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tên tuyến</Label>
                  <p className="font-medium">{selectedRoute.route_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Khoảng cách ước tính</Label>
                  <p className="font-medium">
                    {selectedRoute.estimated_distance?.toFixed(1) || 0} km
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Số điểm bán</Label>
                  <p className="font-medium">{selectedRoute.total_customers || 0}</p>
                </div>
              </div>
              {(selectedRoute as any).customers && (
                <div>
                  <Label className="mb-2">Danh sách điểm bán</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>STT</TableHead>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead>Tần suất</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedRoute as any).customers.map((customer: any) => (
                        <TableRow key={customer.id}>
                          <TableCell>{customer.sequence_number}</TableCell>
                          <TableCell>{customer.customer?.customer_name || 'N/A'}</TableCell>
                          <TableCell>{customer.visit_frequency}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
