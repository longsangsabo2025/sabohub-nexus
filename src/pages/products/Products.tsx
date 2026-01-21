import { useState } from 'react';
import { useProducts, useProductCategories, useCreateProduct } from '@/hooks/useModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye, Edit, Package, BarChart3 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types/modules';

const statusLabels: Record<string, string> = {
  active: 'Đang bán',
  inactive: 'Tạm ngừng',
  discontinued: 'Ngừng kinh doanh',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-yellow-500',
  discontinued: 'bg-red-500',
};

export default function Products() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const { data: products, isLoading } = useProducts({
    search: searchQuery,
    category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
  });

  const { data: categories } = useProductCategories();
  const createProduct = useCreateProduct();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleCreate = async (data: Partial<Product>) => {
    try {
      await createProduct.mutateAsync(data);
      toast({ title: 'Thành công', description: 'Đã tạo sản phẩm mới' });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quản lý sản phẩm</h2>
          <p className="text-muted-foreground">Danh mục và thông tin sản phẩm</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm sản phẩm
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng sản phẩm</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang bán</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {products?.filter(p => p.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Danh mục</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tạm ngừng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {products?.filter(p => p.status === 'inactive').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách sản phẩm</CardTitle>
              <CardDescription>Quản lý thông tin sản phẩm và giá bán</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                  {categories?.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
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
          ) : products && products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Đơn vị</TableHead>
                  <TableHead className="text-right">Giá vốn</TableHead>
                  <TableHead className="text-right">Giá bán lẻ</TableHead>
                  <TableHead className="text-right">Giá sỉ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                      {product.barcode && (
                        <div className="text-xs text-muted-foreground">
                          Barcode: {product.barcode}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {product.product_categories?.name || 'Chưa phân loại'}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(product.cost_price)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(product.selling_price)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {product.wholesale_price ? formatCurrency(product.wholesale_price) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[product.status]} text-white`}>
                        {statusLabels[product.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
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
              Chưa có sản phẩm nào
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Product Dialog */}
      <ProductFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        categories={categories || []}
      />

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        product={selectedProduct}
      />
    </div>
  );
}

// Product Form Dialog
function ProductFormDialog({
  open,
  onOpenChange,
  onSubmit,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Product>) => void;
  categories: { id: string; name: string }[];
}) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    unit: 'thùng',
    cost_price: 0,
    selling_price: 0,
    wholesale_price: 0,
    min_stock: 0,
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
          <DialogTitle>Thêm sản phẩm mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên sản phẩm *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">Mã SKU *</Label>
              <Input
                id="sku"
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Danh mục</Label>
              <Select 
                value={formData.category_id || ''} 
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Đơn vị tính</Label>
              <Select 
                value={formData.unit || 'thùng'} 
                onValueChange={(v) => setFormData({ ...formData, unit: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thùng">Thùng</SelectItem>
                  <SelectItem value="hộp">Hộp</SelectItem>
                  <SelectItem value="chai">Chai</SelectItem>
                  <SelectItem value="lon">Lon</SelectItem>
                  <SelectItem value="gói">Gói</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="cái">Cái</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode || ''}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_stock">Tồn kho tối thiểu</Label>
              <Input
                id="min_stock"
                type="number"
                value={formData.min_stock || 0}
                onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_price">Giá vốn (VNĐ)</Label>
              <Input
                id="cost_price"
                type="number"
                value={formData.cost_price || 0}
                onChange={(e) => setFormData({ ...formData, cost_price: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling_price">Giá bán lẻ (VNĐ) *</Label>
              <Input
                id="selling_price"
                type="number"
                value={formData.selling_price || 0}
                onChange={(e) => setFormData({ ...formData, selling_price: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wholesale_price">Giá bán sỉ (VNĐ)</Label>
              <Input
                id="wholesale_price"
                type="number"
                value={formData.wholesale_price || 0}
                onChange={(e) => setFormData({ ...formData, wholesale_price: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Trạng thái</Label>
              <Select 
                value={formData.status || 'active'} 
                onValueChange={(v) => setFormData({ ...formData, status: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Đang bán</SelectItem>
                  <SelectItem value="inactive">Tạm ngừng</SelectItem>
                  <SelectItem value="discontinued">Ngừng kinh doanh</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

// Product Detail Dialog
function ProductDetailDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}) {
  if (!product) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const margin = product.selling_price - product.cost_price;
  const marginPercent = (margin / product.cost_price * 100).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chi tiết sản phẩm</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="h-10 w-10 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{product.name}</h3>
              <p className="text-muted-foreground">SKU: {product.sku}</p>
              {product.barcode && <p className="text-sm text-muted-foreground">Barcode: {product.barcode}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <Label className="text-muted-foreground text-xs">Giá vốn</Label>
              <p className="text-lg font-bold">{formatCurrency(product.cost_price)}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Label className="text-muted-foreground text-xs">Giá bán lẻ</Label>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(product.selling_price)}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <Label className="text-muted-foreground text-xs">Biên lợi nhuận</Label>
              <p className="text-lg font-bold text-green-600">{marginPercent}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Đơn vị tính</Label>
              <p>{product.unit}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Quy cách đóng gói</Label>
              <p>{product.pack_size} sản phẩm/{product.unit}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Tồn kho tối thiểu</Label>
              <p>{product.min_stock} {product.unit}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Thuế VAT</Label>
              <p>{product.tax_percent}%</p>
            </div>
          </div>

          {product.description && (
            <div>
              <Label className="text-muted-foreground">Mô tả</Label>
              <p className="text-sm">{product.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
