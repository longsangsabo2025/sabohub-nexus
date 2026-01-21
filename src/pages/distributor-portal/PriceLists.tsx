import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye, DollarSign, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { distributorPortalService } from '@/services/distributorPortalService';
import type { PriceList, CreatePriceListInput } from '@/types/distributorPortal';

export default function PriceLists() {
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [formData, setFormData] = useState<Partial<CreatePriceListInput>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch price lists
  const { data: priceLists, isLoading } = useQuery({
    queryKey: ['price-lists', searchQuery],
    queryFn: async () => {
      const filters: any = {};
      if (searchQuery) filters.search = searchQuery;
      return distributorPortalService.getAllPriceLists(filters);
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreatePriceListInput) => distributorPortalService.createPriceList(data),
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã tạo bảng giá mới' });
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
      setCreateDialogOpen(false);
      setFormData({});
    },
    onError: (error: any) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const handleViewDetails = async (priceList: PriceList) => {
    try {
      const items = await distributorPortalService.getPriceListItems(priceList.id);
      setSelectedPriceList({ ...priceList, items } as any);
      setDetailDialogOpen(true);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreate = () => {
    if (!formData.price_list_name || !formData.valid_from) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập đầy đủ thông tin', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData as CreatePriceListInput);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bảng giá NPP</h2>
          <p className="text-muted-foreground">Quản lý bảng giá cho nhà phân phối</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo bảng giá
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng bảng giá</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{priceLists?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang áp dụng</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {priceLists?.filter(p => p.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sắp hết hạn</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {priceLists?.filter(p => {
                if (!p.valid_to) return false;
                const daysLeft = Math.ceil((new Date(p.valid_to).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return daysLeft <= 7 && daysLeft > 0;
              }).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách bảng giá</CardTitle>
          <CardDescription>Quản lý các bảng giá áp dụng cho NPP</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm bảng giá..."
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
                  <TableHead>Mã bảng giá</TableHead>
                  <TableHead>Tên bảng giá</TableHead>
                  <TableHead>Hiệu lực</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceLists?.map((priceList) => (
                  <TableRow key={priceList.id}>
                    <TableCell className="font-medium">{priceList.price_list_code}</TableCell>
                    <TableCell>{priceList.price_list_name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(priceList.valid_from)}</div>
                        {priceList.valid_to && (
                          <div className="text-muted-foreground">
                            đến {formatDate(priceList.valid_to)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={priceList.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                        {priceList.is_active ? 'Đang áp dụng' : 'Không hoạt động'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(priceList)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
            <DialogTitle>Tạo bảng giá mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên bảng giá *</Label>
              <Input
                value={formData.price_list_name || ''}
                onChange={(e) => setFormData({ ...formData, price_list_name: e.target.value })}
                placeholder="VD: Bảng giá Q1/2026"
              />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả bảng giá..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hiệu lực từ *</Label>
                <Input
                  type="date"
                  value={formData.valid_from || ''}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>
              <div>
                <Label>Hiệu lực đến</Label>
                <Input
                  type="date"
                  value={formData.valid_to || ''}
                  onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo bảng giá'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Chi tiết bảng giá</DialogTitle>
          </DialogHeader>
          {selectedPriceList && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Mã bảng giá</Label>
                  <p className="font-medium">{selectedPriceList.price_list_code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tên bảng giá</Label>
                  <p className="font-medium">{selectedPriceList.price_list_name}</p>
                </div>
              </div>
              {(selectedPriceList as any).items && (
                <div>
                  <Label className="mb-2">Danh sách sản phẩm</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead className="text-right">Giá bán</TableHead>
                        <TableHead className="text-right">Chiết khấu (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedPriceList as any).items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product?.product_name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                          <TableCell className="text-right">{item.discount_percentage}%</TableCell>
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
