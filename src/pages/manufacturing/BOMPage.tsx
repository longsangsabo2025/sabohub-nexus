import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bomService } from '@/services/bomService';
import { Button } from '@/components/ui/button';
import { Plus, Search, FileText, CheckCircle } from 'lucide-react';
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

export function BOMPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: boms = [], isLoading } = useQuery({
    queryKey: ['boms', statusFilter],
    queryFn: () => bomService.getBOMs({
      status: statusFilter === 'all' ? undefined : statusFilter
    })
  });

  const statusBadgeVariant = (status: string) => {
    const variants: Record<string, any> = {
      draft: 'secondary',
      active: 'default',
      obsolete: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Định mức sản phẩm (BOM)</h1>
          <p className="text-muted-foreground">Quản lý công thức sản xuất</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tạo BOM mới
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã BOM, tên sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="draft">Nháp</SelectItem>
            <SelectItem value="active">Đang dùng</SelectItem>
            <SelectItem value="obsolete">Đã lỗi thời</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã BOM</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Phiên bản</TableHead>
              <TableHead>Số lượng đầu ra</TableHead>
              <TableHead>Số NVL</TableHead>
              <TableHead>Chi phí NVL</TableHead>
              <TableHead>Thời gian SX</TableHead>
              <TableHead>Trạng thái</TableHead>
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
            ) : boms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              boms.map((bom: any) => (
                <TableRow key={bom.id}>
                  <TableCell className="font-mono">
                    <div className="flex items-center gap-2">
                      {bom.bom_code}
                      {bom.is_default && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Mặc định
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{bom.product_name}</p>
                      <p className="text-sm text-muted-foreground">{bom.product_sku}</p>
                    </div>
                  </TableCell>
                  <TableCell>{bom.version}</TableCell>
                  <TableCell>
                    {bom.output_quantity} {bom.output_unit}
                  </TableCell>
                  <TableCell>{bom.item_count} NVL</TableCell>
                  <TableCell className="font-medium">
                    {bom.material_cost?.toLocaleString('vi-VN')} đ
                  </TableCell>
                  <TableCell>
                    {bom.production_time_minutes ? `${bom.production_time_minutes} phút` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(bom.status)}>
                      {bom.status === 'draft' && 'Nháp'}
                      {bom.status === 'active' && 'Đang dùng'}
                      {bom.status === 'obsolete' && 'Lỗi thời'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">Chi tiết</Button>
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

export default BOMPage;
