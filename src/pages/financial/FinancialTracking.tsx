/**
 * Financial Tracking Page
 * Purpose: Track company revenue and expenses with REAL data
 * Philosophy: Real operational financial metrics
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download,
  Calendar,
  Filter,
  Trash2,
  Edit,
  Plus
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from 'react-router-dom';
import { format, isSameDay, isSameWeek, isSameMonth, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

import { useAuth } from '@/contexts/AuthContext';

export default function FinancialTracking() {
  const { user, employeeUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('month');
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  
  // Add Transaction State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'revenue',
    amount: '',
    category: '',
    description: ''
  });

  const REVENUE_CATEGORIES = ['Bán hàng', 'Dịch vụ', 'Hoàn tiền', 'Khác'];
  const EXPENSE_CATEGORIES = ['Nhập hàng', 'Lương', 'Điện nước', 'Marketing', 'Mặt bằng', 'Bảo trì', 'Khác'];

  // Add Transaction Mutation
  const addTransactionMutation = useMutation({
    mutationFn: async (data: typeof newTransaction) => {
      if (!employeeUser?.company_id) throw new Error("Thiếu thông tin công ty");
      if (!data.amount) throw new Error("Vui lòng nhập số tiền");
      
      const amount = parseFloat(data.amount.replace(/\./g, '').replace(/,/g, ''));
      
      if (isNaN(amount)) throw new Error("Số tiền không hợp lệ");

      // ELON MUSK STRATEGY: Decentralized Submission, Centralized Approval
      const isManagerOrCEO = employeeUser.role === 'ceo' || employeeUser.role === 'manager';

      if (isManagerOrCEO || data.type === 'revenue') {
        // Direct Insert for Bosses OR Revenue (Sales)
        const { error } = await supabase.from('financial_transactions').insert({
          company_id: employeeUser.company_id,
          date: new Date(data.date).toISOString(),
          type: data.type,
          amount: amount,
          category: data.category,
          description: data.description,
          created_by: employeeUser.id
        });
        if (error) throw error;
      } else {
        // Submit for Approval for Staff (Expenses only)
        // Use RPC to bypass RLS
        const { data: rpcData, error } = await supabase.rpc('submit_approval_request', {
          p_requester_id: employeeUser.id,
          p_type: 'expense',
          p_details: {
            amount: amount,
            category: data.category,
            description: data.description,
            date: new Date(data.date).toISOString(),
            company_id: employeeUser.company_id
          }
        });
        
        if (error) throw error;
        if (rpcData && !rpcData.success) throw new Error(rpcData.error || 'Lỗi không xác định');
      }
    },
    onSuccess: (_, variables) => {
      const isManagerOrCEO = employeeUser?.role === 'ceo' || employeeUser?.role === 'manager';
      const isRevenue = variables.type === 'revenue';
      
      if (isManagerOrCEO || isRevenue) {
        queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
        toast({ title: 'Thành công', description: 'Đã thêm giao dịch mới.' });
      } else {
        toast({ title: 'Đã gửi yêu cầu', description: 'Yêu cầu chi phí đã được gửi để phê duyệt.' });
      }
      setIsAddOpen(false);
      setNewTransaction({
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'revenue',
        amount: '',
        category: '',
        description: ''
      });
      toast({ title: 'Thành công', description: 'Đã thêm giao dịch mới.' });
    },
    onError: (err) => {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  });

  // Fetch REAL financial data
  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financial-stats', employeeUser?.company_id, user?.id],
    queryFn: async () => {
      let companyId = employeeUser?.company_id;

      if (!companyId && user) {
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .single();
        companyId = company?.id;
      }

      if (!companyId) return [];

      const { data: transactions, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('date', { ascending: false });

      if (error) throw error;
      return transactions || [];
    },
    enabled: !!employeeUser?.company_id || !!user,
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
      toast({ title: 'Đã xóa giao dịch', description: 'Dữ liệu đã được cập nhật.' });
    },
    onError: (err) => {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('financial_transactions')
        .update({
          amount: data.amount,
          category: data.category,
          description: data.description,
          date: data.date,
          type: data.type
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
      setEditingTransaction(null);
      toast({ title: 'Đã cập nhật giao dịch', description: 'Thông tin đã được lưu.' });
    },
    onError: (err) => {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  });

  // Filter data based on timeRange
  const filteredTransactions = financialData?.filter(t => {
    if (!t.date) return false;
    try {
      const date = typeof t.date === 'string' ? parseISO(t.date) : new Date(t.date);
      const now = new Date();
      
      if (timeRange === 'day') return isSameDay(date, now);
      if (timeRange === 'week') return isSameWeek(date, now, { weekStartsOn: 1 });
      if (timeRange === 'month') return isSameMonth(date, now);
      return true;
    } catch (e) {
      return false;
    }
  }) || [];

  // Calculate stats based on FILTERED data
  const stats = filteredTransactions.reduce((acc, t) => {
    // Defensive parsing
    let amount = 0;
    try {
      amount = typeof t.amount === 'string' ? parseFloat(t.amount) : Number(t.amount);
      if (isNaN(amount)) amount = 0;
    } catch (e) {
      amount = 0;
    }

    if (t.type === 'revenue') {
      acc.revenue += amount;
    } else {
      acc.expenses += amount;
      const cat = t.category || 'Khác';
      acc.expensesByCategory[cat] = (acc.expensesByCategory[cat] || 0) + amount;
    }
    return acc;
  }, { revenue: 0, expenses: 0, expensesByCategory: {} as Record<string, number> });

  const profit = stats.revenue - stats.expenses;
  const profitMargin = stats.revenue > 0 ? ((profit / stats.revenue) * 100) : 0;

  const formatCurrency = (amount: any) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num) || num === null || num === undefined || typeof num !== 'number') return '0 ₫';
    try {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0
      }).format(num);
    } catch (e) {
      return '0 ₫';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              Tài Chính
            </h2>
            <p className="text-muted-foreground">Quản lý dòng tiền & Lợi nhuận</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Chọn thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Hôm nay</SelectItem>
                <SelectItem value="week">Tuần này</SelectItem>
                <SelectItem value="month">Tháng này</SelectItem>
                <SelectItem value="all">Tất cả</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Xuất Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Doanh Thu ({timeRange === 'all' ? 'Tất cả' : (timeRange === 'day' ? 'Hôm nay' : (timeRange === 'week' ? 'Tuần này' : 'Tháng này'))})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '...' : formatCurrency(stats.revenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Chi Phí
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoading ? '...' : formatCurrency(stats.expenses)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lợi Nhuận Ròng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {isLoading ? '...' : formatCurrency(profit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {profit >= 0 ? (
                <><TrendingUp className="h-3 w-3" /> Margin: {profitMargin.toFixed(1)}%</>
              ) : (
                <><TrendingDown className="h-3 w-3" /> Thâm hụt</>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* --- EXPENSE BREAKDOWN --- */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Phân bổ Chi phí</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.expensesByCategory).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(stats.expensesByCategory)
                  .sort(([,a], [,b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{category}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (amount / stats.expenses) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Chưa có dữ liệu chi phí</div>
            )}
          </CardContent>
        </Card>

        {/* --- TRANSACTION TABLE --- */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Nhật ký Giao dịch</CardTitle>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Nhập liệu
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Thêm giao dịch mới</DialogTitle>
                  <DialogDescription>
                    Nhập thông tin thu/chi vào hệ thống.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Ngày</Label>
                    <Input 
                      type="date" 
                      value={newTransaction.date}
                      onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                      className="col-span-3" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Loại</Label>
                    <Select 
                      value={newTransaction.type} 
                      onValueChange={(v) => setNewTransaction({...newTransaction, type: v, category: ''})}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Thu (Revenue)</SelectItem>
                        <SelectItem value="expense">Chi (Expense)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Số tiền</Label>
                    <Input 
                      value={newTransaction.amount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        if (!raw) {
                          setNewTransaction({...newTransaction, amount: ''});
                          return;
                        }
                        const num = parseInt(raw);
                        const formatted = new Intl.NumberFormat('vi-VN').format(num);
                        setNewTransaction({...newTransaction, amount: formatted});
                      }}
                      className="col-span-3 font-mono" 
                      placeholder="0"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Danh mục</Label>
                    <Select 
                      value={newTransaction.category} 
                      onValueChange={(v) => setNewTransaction({...newTransaction, category: v})}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        {(newTransaction.type === 'revenue' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Mô tả</Label>
                    <Textarea 
                      value={newTransaction.description}
                      onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                      className="col-span-3" 
                      placeholder="Ghi chú chi tiết..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Hủy</Button>
                  <Button onClick={() => addTransactionMutation.mutate(newTransaction)} disabled={addTransactionMutation.isPending}>
                    {addTransactionMutation.isPending ? 'Đang lưu...' : 'Lưu giao dịch'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Không có giao dịch nào trong khoảng thời gian này.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">
                        {format(parseISO(t.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${t.type === 'revenue' ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80' : 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80'}`}>
                          {t.type === 'revenue' ? 'Thu' : 'Chi'}
                        </span>
                      </TableCell>
                      <TableCell>{t.category}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {t.description}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${t.type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'revenue' ? '+' : '-'}{formatCurrency(parseFloat(t.amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setEditingTransaction(t)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
                                deleteMutation.mutate(t.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Giao dịch</DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ngày giao dịch</Label>
                  <Input 
                    type="date" 
                    value={editingTransaction.date ? format(typeof editingTransaction.date === 'string' ? parseISO(editingTransaction.date) : new Date(editingTransaction.date), 'yyyy-MM-dd') : ''}
                    onChange={(e) => setEditingTransaction({...editingTransaction, date: new Date(e.target.value).toISOString()})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Loại</Label>
                  <Select 
                    value={editingTransaction.type} 
                    onValueChange={(v) => setEditingTransaction({...editingTransaction, type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Doanh thu (Thu)</SelectItem>
                      <SelectItem value="expense">Chi phí (Chi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Số tiền (VNĐ)</Label>
                <Input 
                  value={editingTransaction.amount ?? ''}
                  onChange={(e) => setEditingTransaction({...editingTransaction, amount: parseFloat(e.target.value) || 0})}
                  type="number"
                />
              </div>

              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Input 
                  value={editingTransaction.category ?? ''}
                  onChange={(e) => setEditingTransaction({...editingTransaction, category: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Mô tả / Ghi chú</Label>
                <Input 
                  value={editingTransaction.description || ''}
                  onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTransaction(null)}>Hủy</Button>
            <Button onClick={() => updateMutation.mutate(editingTransaction)}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
