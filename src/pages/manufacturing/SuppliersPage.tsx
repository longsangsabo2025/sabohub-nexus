import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supplierService, type Supplier } from '@/services/supplierService';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', search, categoryFilter, activeFilter],
    queryFn: () => supplierService.getSuppliers({
      search,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      is_active: activeFilter
    })
  });

  const { data: stats } = useQuery({
    queryKey: ['supplier-stats'],
    queryFn: () => supplierService.getSupplierStats()
  });

  const categoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      raw_material: 'bg-blue-500',
      packaging: 'bg-green-500',
      equipment: 'bg-purple-500',
      service: 'bg-yellow-500',
      other: 'bg-gray-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Nhà cung cấp</h1>
          <p className="text-muted-foreground">Quản lý nhà cung cấp nguyên vật liệu</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Thêm nhà cung cấp
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Tổng số</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Đang hoạt động</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Ngừng hoạt động</p>
            <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Nguyên vật liệu</p>
            <p className="text-2xl font-bold">{stats.byCategory.raw_material || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, mã, mã số thuế..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Loại NCC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="raw_material">Nguyên vật liệu</SelectItem>
            <SelectItem value="packaging">Bao bì</SelectItem>
            <SelectItem value="equipment">Thiết bị</SelectItem>
            <SelectItem value="service">Dịch vụ</SelectItem>
            <SelectItem value="other">Khác</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={activeFilter === undefined ? 'all' : String(activeFilter)}
          onValueChange={(v) => setActiveFilter(v === 'all' ? undefined : v === 'true')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="true">Hoạt động</SelectItem>
            <SelectItem value="false">Ngừng</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã NCC</TableHead>
              <TableHead>Tên nhà cung cấp</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Liên hệ</TableHead>
              <TableHead>Điều kiện TT</TableHead>
              <TableHead>Hạn mức</TableHead>
              <TableHead>Đánh giá</TableHead>
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
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-mono">{supplier.supplier_code}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                      {supplier.tax_code && (
                        <p className="text-sm text-muted-foreground">MST: {supplier.tax_code}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.category && (
                      <Badge className={categoryBadgeColor(supplier.category)}>
                        {supplier.category}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {supplier.phone && <p>{supplier.phone}</p>}
                      {supplier.contact_person && (
                        <p className="text-muted-foreground">{supplier.contact_person}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{supplier.payment_terms} ngày</TableCell>
                  <TableCell>
                    {supplier.credit_limit?.toLocaleString('vi-VN')} {supplier.currency}
                  </TableCell>
                  <TableCell>
                    {supplier.rating && (
                      <div className="flex items-center">
                        {'⭐'.repeat(supplier.rating)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                      {supplier.is_active ? 'Hoạt động' : 'Ngừng'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">Chi tiết</Button>
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

export default SuppliersPage;
