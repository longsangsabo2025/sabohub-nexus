import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { materialService } from '@/services/materialService';
import { Button } from '@/components/ui/button';
import { Plus, Search, AlertCircle } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function MaterialsPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials', search, activeTab],
    queryFn: () => materialService.getMaterials({
      search,
      is_active: true,
      low_stock: activeTab === 'low_stock'
    })
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['material-categories'],
    queryFn: () => materialService.getCategories()
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Nguyên vật liệu</h1>
          <p className="text-muted-foreground">Quản lý nguyên vật liệu sản xuất</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Thêm danh mục
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Thêm NVL
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="low_stock">
            <AlertCircle className="mr-2 h-4 w-4" />
            Sắp hết
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, mã NVL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã NVL</TableHead>
                  <TableHead>Tên nguyên vật liệu</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Đơn vị</TableHead>
                  <TableHead>Đơn giá</TableHead>
                  <TableHead>Tồn kho tối thiểu</TableHead>
                  <TableHead>NCC mặc định</TableHead>
                  <TableHead>Vị trí</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : materials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      {activeTab === 'low_stock' ? 'Không có NVL sắp hết' : 'Không có dữ liệu'}
                    </TableCell>
                  </TableRow>
                ) : (
                  materials.map((material: any) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-mono">{material.material_code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{material.name}</p>
                          {material.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {material.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {material.category?.name && (
                          <Badge variant="outline">{material.category.name}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{material.unit}</TableCell>
                      <TableCell>
                        {material.unit_cost?.toLocaleString('vi-VN')} đ
                      </TableCell>
                      <TableCell>
                        {material.min_stock?.toLocaleString('vi-VN') || '—'}
                      </TableCell>
                      <TableCell>
                        {material.supplier?.name && (
                          <p className="text-sm">{material.supplier.name}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {material.storage_location || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">Chi tiết</Button>
                          <Button variant="ghost" size="sm">Tồn kho</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MaterialsPage;
