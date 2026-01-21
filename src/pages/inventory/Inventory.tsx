import { useState } from 'react';
import { useInventory, useWarehouses } from '@/hooks/useModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Warehouse, AlertTriangle, Package, ArrowRightLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');

  const { data: warehouses, isLoading: loadingWarehouses } = useWarehouses();
  const { data: inventory, isLoading: loadingInventory } = useInventory(
    selectedWarehouse !== 'all' ? selectedWarehouse : undefined
  );

  // Calculate stats
  const stats = {
    totalProducts: inventory?.length || 0,
    lowStock: inventory?.filter(i => i.quantity <= (i.products?.min_stock || 0)).length || 0,
    outOfStock: inventory?.filter(i => i.available_quantity <= 0).length || 0,
    totalValue: inventory?.reduce((sum, i) => sum + (i.quantity * 100000), 0) || 0, // Placeholder value
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quản lý kho hàng</h2>
          <p className="text-muted-foreground">Theo dõi tồn kho và xuất nhập</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Chuyển kho
          </Button>
          <Button>
            <Package className="mr-2 h-4 w-4" />
            Nhập kho
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng kho</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sản phẩm trong kho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        <Card className={stats.lowStock > 0 ? 'border-yellow-300 bg-yellow-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sắp hết hàng</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
          </CardContent>
        </Card>
        <Card className={stats.outOfStock > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hết hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Tồn kho</TabsTrigger>
          <TabsTrigger value="warehouses">Danh sách kho</TabsTrigger>
          <TabsTrigger value="movements">Lịch sử xuất nhập</TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tồn kho hiện tại</CardTitle>
                  <CardDescription>Số lượng sản phẩm theo kho</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Chọn kho" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả kho</SelectItem>
                      {warehouses?.map(wh => (
                        <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm sản phẩm..."
                      className="pl-8 w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingInventory ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : inventory && inventory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Kho</TableHead>
                      <TableHead className="text-right">Tồn kho</TableHead>
                      <TableHead className="text-right">Đã đặt</TableHead>
                      <TableHead className="text-right">Khả dụng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory
                      .filter(item => {
                        if (!searchQuery) return true;
                        const search = searchQuery.toLowerCase();
                        return (
                          item.products?.name.toLowerCase().includes(search) ||
                          item.products?.sku.toLowerCase().includes(search)
                        );
                      })
                      .map((item) => {
                        const isLowStock = item.quantity <= (item.products?.min_stock || 0);
                        const isOutOfStock = item.available_quantity <= 0;
                        const stockPercent = item.products?.min_stock 
                          ? Math.min(100, (item.quantity / item.products.min_stock) * 50)
                          : 100;

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.products?.sku}</TableCell>
                            <TableCell>
                              <div className="font-medium">{item.products?.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Min: {item.products?.min_stock} {item.products?.unit}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.warehouses?.name}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatNumber(item.quantity)} {item.products?.unit}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatNumber(item.reserved_quantity)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={isOutOfStock ? 'text-red-600 font-bold' : 'font-medium'}>
                                {formatNumber(item.available_quantity)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {isOutOfStock ? (
                                <Badge variant="destructive">Hết hàng</Badge>
                              ) : isLowStock ? (
                                <Badge className="bg-yellow-500">Sắp hết</Badge>
                              ) : (
                                <Badge className="bg-green-500">Đủ hàng</Badge>
                              )}
                              <Progress 
                                value={stockPercent} 
                                className={`mt-1 h-1 ${isOutOfStock ? '[&>div]:bg-red-500' : isLowStock ? '[&>div]:bg-yellow-500' : ''}`}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Chưa có dữ liệu tồn kho
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách kho</CardTitle>
              <CardDescription>Quản lý các kho hàng của công ty</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingWarehouses ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {warehouses?.map(warehouse => (
                    <Card key={warehouse.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-5 w-5 text-blue-500" />
                            <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                          </div>
                          <Badge variant="outline">{warehouse.code}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{warehouse.address || 'Chưa có địa chỉ'}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <Badge className={warehouse.type === 'main' ? 'bg-blue-500' : 'bg-gray-500'}>
                            {warehouse.type === 'main' ? 'Kho chính' : 
                             warehouse.type === 'transit' ? 'Kho trung chuyển' : 
                             warehouse.type === 'return' ? 'Kho trả hàng' : 'Kho hàng lỗi'}
                          </Badge>
                          <span className={`text-sm ${warehouse.is_active ? 'text-green-600' : 'text-red-600'}`}>
                            {warehouse.is_active ? '● Hoạt động' : '○ Tạm ngừng'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử xuất nhập kho</CardTitle>
              <CardDescription>Theo dõi các phiếu xuất nhập kho</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground">
                Chức năng đang phát triển
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
