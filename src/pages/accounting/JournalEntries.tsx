import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { accountingService } from '@/services/accountingService';
import type { JournalEntry, CreateJournalEntryInput } from '@/types/accounting';

const statusLabels: Record<string, string> = {
  draft: 'Nháp',
  posted: 'Đã hạch toán',
  voided: 'Đã hủy',
  reversed: 'Đã đảo',
};

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-500',
  posted: 'bg-green-500',
  voided: 'bg-red-500',
  reversed: 'bg-gray-500',
};

const entryTypeLabels: Record<string, string> = {
  manual: 'Thủ công',
  automatic: 'Tự động',
  adjustment: 'Điều chỉnh',
  closing: 'Kết chuyển',
  opening: 'Mở đầu kỳ',
};

export default function JournalEntries() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [formData, setFormData] = useState<Partial<CreateJournalEntryInput>>({
    lines: [{ account_id: '', debit: 0, credit: 0 }],
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch accounts for dropdown
  const { data: accounts } = useQuery({
    queryKey: ['chart-of-accounts-all'],
    queryFn: () => accountingService.getAllAccounts({ is_active: true, is_header: false }),
  });

  // Fetch journal entries
  const { data: entries, isLoading } = useQuery({
    queryKey: ['journal-entries', statusFilter, typeFilter],
    queryFn: async () => {
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.entry_type = typeFilter;
      return accountingService.getAllJournalEntries(filters);
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateJournalEntryInput) => accountingService.createJournalEntry(data),
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã tạo bút toán mới' });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      setCreateDialogOpen(false);
      setFormData({ lines: [{ account_id: '', debit: 0, credit: 0 }] });
    },
    onError: (error: any) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  // Post mutation
  const postMutation = useMutation({
    mutationFn: (id: string) => accountingService.postJournalEntry(id),
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã hạch toán bút toán' });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
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

  const handleViewDetails = async (entry: JournalEntry) => {
    try {
      const fullEntry = await accountingService.getJournalEntryById(entry.id);
      setSelectedEntry(fullEntry);
      setDetailDialogOpen(true);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...(formData.lines || []), { account_id: '', debit: 0, credit: 0 }],
    });
  };

  const handleRemoveLine = (index: number) => {
    const lines = [...(formData.lines || [])];
    lines.splice(index, 1);
    setFormData({ ...formData, lines });
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const lines = [...(formData.lines || [])];
    (lines[index] as any)[field] = value;
    setFormData({ ...formData, lines });
  };

  const calculateBalance = () => {
    const totalDebit = formData.lines?.reduce((sum, line) => sum + (line.debit || 0), 0) || 0;
    const totalCredit = formData.lines?.reduce((sum, line) => sum + (line.credit || 0), 0) || 0;
    return { totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  };

  const handleCreate = () => {
    const { totalDebit, totalCredit, balanced } = calculateBalance();
    if (!balanced) {
      toast({
        title: 'Lỗi',
        description: `Bút toán không cân bằng. Nợ: ${formatCurrency(totalDebit)}, Có: ${formatCurrency(totalCredit)}`,
        variant: 'destructive',
      });
      return;
    }
    if (!formData.entry_date || !formData.description) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập đầy đủ thông tin', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      ...formData,
      posting_date: formData.posting_date || formData.entry_date,
    } as CreateJournalEntryInput);
  };

  const { totalDebit, totalCredit, balanced } = calculateBalance();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bút toán kế toán</h2>
          <p className="text-muted-foreground">Quản lý bút toán và hạch toán</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo bút toán
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(statusLabels).map(([status, label]) => (
          <Card key={status}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {entries?.filter((e) => e.status === status).length || 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách bút toán</CardTitle>
          <CardDescription>Quản lý và theo dõi các bút toán kế toán</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm bút toán..."
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
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {Object.entries(entryTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <TableHead>Số bút toán</TableHead>
                  <TableHead>Ngày ghi sổ</TableHead>
                  <TableHead>Diễn giải</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium font-mono">{entry.entry_number}</TableCell>
                    <TableCell>{formatDate(entry.entry_date)}</TableCell>
                    <TableCell className="max-w-md truncate">{entry.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entryTypeLabels[entry.entry_type]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entry.total_debit)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[entry.status]}>
                        {statusLabels[entry.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(entry)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {entry.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => postMutation.mutate(entry.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
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

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo bút toán mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ngày ghi sổ *</Label>
                <Input
                  type="date"
                  value={formData.entry_date || ''}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Ngày hạch toán</Label>
                <Input
                  type="date"
                  value={formData.posting_date || ''}
                  onChange={(e) => setFormData({ ...formData, posting_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Diễn giải *</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Diễn giải bút toán..."
              />
            </div>
            <div>
              <Label>Loại bút toán</Label>
              <Select
                value={formData.entry_type || 'manual'}
                onValueChange={(value: any) => setFormData({ ...formData, entry_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(entryTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Journal Entry Lines */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg">Định khoản</Label>
                <Button type="button" size="sm" onClick={handleAddLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm dòng
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Tài khoản</TableHead>
                    <TableHead>Diễn giải</TableHead>
                    <TableHead className="w-[150px]">Nợ</TableHead>
                    <TableHead className="w-[150px]">Có</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.lines?.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={line.account_id}
                          onValueChange={(value) => handleLineChange(index, 'account_id', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Chọn TK" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts?.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_code} - {account.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description || ''}
                          onChange={(e) =>
                            handleLineChange(index, 'description', e.target.value)
                          }
                          placeholder="Diễn giải..."
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.debit || 0}
                          onChange={(e) =>
                            handleLineChange(index, 'debit', parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.credit || 0}
                          onChange={(e) =>
                            handleLineChange(index, 'credit', parseFloat(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveLine(index)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-8 pr-16 font-medium">
                <div>Tổng Nợ: {formatCurrency(totalDebit)}</div>
                <div>Tổng Có: {formatCurrency(totalCredit)}</div>
                <div className={balanced ? 'text-green-600' : 'text-red-600'}>
                  {balanced ? '✓ Cân bằng' : '✗ Không cân bằng'}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !balanced}>
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo bút toán'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Chi tiết bút toán</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Số bút toán</Label>
                  <p className="font-medium font-mono">{selectedEntry.entry_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Trạng thái</Label>
                  <Badge className={statusColors[selectedEntry.status]}>
                    {statusLabels[selectedEntry.status]}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ngày ghi sổ</Label>
                  <p className="font-medium">{formatDate(selectedEntry.entry_date)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ngày hạch toán</Label>
                  <p className="font-medium">{formatDate(selectedEntry.posting_date)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Diễn giải</Label>
                <p>{selectedEntry.description}</p>
              </div>
              {(selectedEntry as any).lines && (
                <div>
                  <Label className="mb-2">Định khoản</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tài khoản</TableHead>
                        <TableHead>Diễn giải</TableHead>
                        <TableHead className="text-right">Nợ</TableHead>
                        <TableHead className="text-right">Có</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedEntry as any).lines.map((line: any) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            {line.account?.account_code} - {line.account?.account_name}
                          </TableCell>
                          <TableCell>{line.description}</TableCell>
                          <TableCell className="text-right">
                            {line.debit > 0 && formatCurrency(line.debit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {line.credit > 0 && formatCurrency(line.credit)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell colSpan={2}>Tổng cộng</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(selectedEntry.total_debit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(selectedEntry.total_credit)}
                        </TableCell>
                      </TableRow>
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
