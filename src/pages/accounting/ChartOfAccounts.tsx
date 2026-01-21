import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye, FolderTree, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_account_id: string | null;
  normal_balance: 'debit' | 'credit';
  level: number;
  is_active: boolean;
  created_at: string;
}

export default function ChartOfAccounts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    account_type: 'asset' as const,
    parent_account_id: null as string | null,
    normal_balance: 'debit' as const,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-of-accounts', selectedType],
    queryFn: async () => {
      let query = supabase
        .from('dms_chart_of_accounts')
        .select('*')
        .order('code', { ascending: true });

      if (selectedType !== 'all') {
        query = query.eq('account_type', selectedType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Account[];
    },
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (accountData: typeof newAccount) => {
      const { data, error } = await supabase
        .from('dms_chart_of_accounts')
        .insert([accountData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast({
        title: 'Thành công',
        description: 'Đã tạo tài khoản mới',
      });
      setIsCreateOpen(false);
      setNewAccount({
        code: '',
        name: '',
        account_type: 'asset',
        parent_account_id: null,
        normal_balance: 'debit',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tạo tài khoản',
        variant: 'destructive',
      });
    },
  });

  // Seed standard COA
  const seedCOAMutation = useMutation({
    mutationFn: async () => {
      const standardAccounts = [
        // Assets
        { code: '1000', name: 'ASSETS', account_type: 'asset', level: 0, normal_balance: 'debit' },
        { code: '1100', name: 'Current Assets', account_type: 'asset', level: 1, normal_balance: 'debit' },
        { code: '1110', name: 'Cash and Cash Equivalents', account_type: 'asset', level: 2, normal_balance: 'debit' },
        { code: '1120', name: 'Accounts Receivable', account_type: 'asset', level: 2, normal_balance: 'debit' },
        { code: '1130', name: 'Inventory', account_type: 'asset', level: 2, normal_balance: 'debit' },
        
        // Liabilities
        { code: '2000', name: 'LIABILITIES', account_type: 'liability', level: 0, normal_balance: 'credit' },
        { code: '2100', name: 'Current Liabilities', account_type: 'liability', level: 1, normal_balance: 'credit' },
        { code: '2110', name: 'Accounts Payable', account_type: 'liability', level: 2, normal_balance: 'credit' },
        { code: '2120', name: 'Accrued Expenses', account_type: 'liability', level: 2, normal_balance: 'credit' },
        
        // Equity
        { code: '3000', name: 'EQUITY', account_type: 'equity', level: 0, normal_balance: 'credit' },
        { code: '3100', name: 'Share Capital', account_type: 'equity', level: 1, normal_balance: 'credit' },
        { code: '3200', name: 'Retained Earnings', account_type: 'equity', level: 1, normal_balance: 'credit' },
        
        // Revenue
        { code: '4000', name: 'REVENUE', account_type: 'revenue', level: 0, normal_balance: 'credit' },
        { code: '4100', name: 'Sales Revenue', account_type: 'revenue', level: 1, normal_balance: 'credit' },
        { code: '4200', name: 'Other Revenue', account_type: 'revenue', level: 1, normal_balance: 'credit' },
        
        // Expenses
        { code: '5000', name: 'EXPENSES', account_type: 'expense', level: 0, normal_balance: 'debit' },
        { code: '5100', name: 'Cost of Goods Sold', account_type: 'expense', level: 1, normal_balance: 'debit' },
        { code: '5200', name: 'Operating Expenses', account_type: 'expense', level: 1, normal_balance: 'debit' },
      ];

      const { error } = await supabase
        .from('dms_chart_of_accounts')
        .insert(standardAccounts.map(acc => ({ ...acc, is_active: true })));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast({
        title: 'Thành công',
        description: 'Đã khởi tạo hệ thống tài khoản chuẩn',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể khởi tạo hệ thống tài khoản',
        variant: 'destructive',
      });
    },
  });

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAccountTypeLabel = (type: string) => {
    const labels = {
      asset: 'Tài sản',
      liability: 'Nợ phải trả',
      equity: 'Vốn chủ sở hữu',
      revenue: 'Doanh thu',
      expense: 'Chi phí',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getAccountTypeColor = (type: string) => {
    const colors = {
      asset: 'bg-blue-100 text-blue-800',
      liability: 'bg-red-100 text-red-800',
      equity: 'bg-green-100 text-green-800',
      revenue: 'bg-purple-100 text-purple-800',
      expense: 'bg-orange-100 text-orange-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hệ thống tài khoản</h1>
          <p className="text-muted-foreground">Quản lý danh mục tài khoản kế toán</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => seedCOAMutation.mutate()}
            disabled={seedCOAMutation.isPending || accounts.length > 0}
            variant="outline"
          >
            <FolderTree className="mr-2 h-4 w-4" />
            Khởi tạo COA chuẩn
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tạo tài khoản
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo tài khoản mới</DialogTitle>
                <DialogDescription>Thêm tài khoản vào hệ thống tài khoản</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Mã tài khoản</Label>
                  <Input
                    id="code"
                    value={newAccount.code}
                    onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                    placeholder="1110"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên tài khoản</Label>
                  <Input
                    id="name"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    placeholder="Cash and Cash Equivalents"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="account_type">Loại tài khoản</Label>
                  <Select
                    value={newAccount.account_type}
                    onValueChange={(value: any) => setNewAccount({ ...newAccount, account_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Tài sản</SelectItem>
                      <SelectItem value="liability">Nợ phải trả</SelectItem>
                      <SelectItem value="equity">Vốn chủ sở hữu</SelectItem>
                      <SelectItem value="revenue">Doanh thu</SelectItem>
                      <SelectItem value="expense">Chi phí</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="normal_balance">Số dư thường</Label>
                  <Select
                    value={newAccount.normal_balance}
                    onValueChange={(value: any) => setNewAccount({ ...newAccount, normal_balance: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">Nợ (Debit)</SelectItem>
                      <SelectItem value="credit">Có (Credit)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Hủy
                </Button>
                <Button
                  onClick={() => createAccountMutation.mutate(newAccount)}
                  disabled={createAccountMutation.isPending}
                >
                  Tạo tài khoản
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng tài khoản</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tài sản</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts.filter(a => a.account_type === 'asset').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nợ phải trả</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts.filter(a => a.account_type === 'liability').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts.filter(a => a.account_type === 'revenue').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách tài khoản</CardTitle>
          <CardDescription>Hệ thống phân cấp tài khoản kế toán</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã hoặc tên tài khoản..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Loại tài khoản" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="asset">Tài sản</SelectItem>
                <SelectItem value="liability">Nợ phải trả</SelectItem>
                <SelectItem value="equity">Vốn chủ sở hữu</SelectItem>
                <SelectItem value="revenue">Doanh thu</SelectItem>
                <SelectItem value="expense">Chi phí</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã TK</TableHead>
                  <TableHead>Tên tài khoản</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Số dư thường</TableHead>
                  <TableHead>Cấp</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Chưa có tài khoản nào. Nhấn "Khởi tạo COA chuẩn" để bắt đầu.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono font-medium">
                        {account.code}
                      </TableCell>
                      <TableCell style={{ paddingLeft: `${account.level * 20 + 12}px` }}>
                        <span className={account.level === 0 ? 'font-bold' : ''}>
                          {account.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getAccountTypeColor(account.account_type)}>
                          {getAccountTypeLabel(account.account_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {account.normal_balance === 'debit' ? 'Nợ' : 'Có'}
                        </Badge>
                      </TableCell>
                      <TableCell>{account.level}</TableCell>
                      <TableCell>
                        <Badge variant={account.is_active ? 'default' : 'secondary'}>
                          {account.is_active ? 'Hoạt động' : 'Không hoạt động'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
