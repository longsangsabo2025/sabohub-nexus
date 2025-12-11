import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, CheckSquare, Zap, Upload, Play, AlertCircle, DollarSign, HelpCircle, Plus, Trash2, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parse, isValid } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FinancialRow {
  id: number;
  date: string;
  type: 'revenue' | 'expense';
  amount: string;
  category: string;
  description: string;
}

export default function OperationsCenter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { employeeUser } = useAuth();
  
  // --- BULK EMPLOYEE IMPORT STATE ---
  const [employeeData, setEmployeeData] = useState('');
  const [importResults, setImportResults] = useState<string[]>([]);

  // --- BULK FINANCIAL IMPORT STATE ---
  const [financialData, setFinancialData] = useState('');
  const [financialResults, setFinancialResults] = useState<string[]>([]);
  const [financialMode, setFinancialMode] = useState<'text' | 'table'>('table');
  
  // --- MANUAL FINANCIAL TABLE STATE ---
  const [manualRows, setManualRows] = useState<FinancialRow[]>([
    { id: 1, date: format(new Date(), 'yyyy-MM-dd'), type: 'revenue', amount: '', category: 'Bán hàng', description: '' }
  ]);

  // --- QUICK TASK STATE ---
  const [quickTaskInput, setQuickTaskInput] = useState('');

  // Fetch employees for auto-complete or validation
  const { data: employees } = useQuery({
    queryKey: ['employees-lite'],
    queryFn: async () => {
      const { data } = await supabase.from('employees').select('id, full_name, email');
      return data || [];
    },
  });

  // Fetch recent transactions for history view
  const { data: recentTransactions } = useQuery({
    queryKey: ['financial-recent', employeeUser?.company_id],
    queryFn: async () => {
      if (!employeeUser?.company_id) return [];
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('company_id', employeeUser.company_id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!employeeUser?.company_id
  });

  // --- MUTATIONS ---

  const bulkImportEmployees = useMutation({
    mutationFn: async (rawText: string) => {
      const lines = rawText.split('\n').filter(line => line.trim() !== '');
      const results: string[] = [];
      const employeesToInsert: any[] = [];
      
      // 1. Parse and Validate locally
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 2) {
          results.push(`❌ Bỏ qua dòng không hợp lệ: ${line}`);
          continue;
        }

        const [fullName, email, role = 'staff', password = '123'] = parts;
        
        if (!email.includes('@')) {
          results.push(`❌ Email không hợp lệ: ${email}`);
          continue;
        }
        
        employeesToInsert.push({
          full_name: fullName,
          email: email,
          role: role.toLowerCase(),
          password: password,
          company_id: employeeUser?.company_id,
          status: 'active'
        });
      }

      if (employeesToInsert.length === 0) return results;

      // 2. Check for existing emails in one query (Optimization)
      const emails = employeesToInsert.map(e => e.email);
      const { data: existingEmployees } = await supabase
        .from('employees')
        .select('email')
        .in('email', emails);
      
      const existingEmails = new Set(existingEmployees?.map(e => e.email) || []);
      
      const validInserts = employeesToInsert.filter(e => {
        if (existingEmails.has(e.email)) {
          results.push(`⚠️ Đã tồn tại: ${e.email}`);
          return false;
        }
        return true;
      });

      if (validInserts.length === 0) return results;

      // 3. Bulk Insert (Single Transaction via API)
      const { error } = await supabase
        .from('employees')
        .insert(validInserts);

      if (error) {
        results.push(`❌ Lỗi nhập liệu hàng loạt: ${error.message}`);
      } else {
        validInserts.forEach(e => results.push(`✅ Đã thêm: ${e.full_name} (${e.role})`));
      }

      return results;
    },
    onSuccess: (results) => {
      setImportResults(results);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Hoàn tất nhập liệu',
        description: `Đã xử lý ${results.length} dòng dữ liệu.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi hệ thống',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const createQuickTask = useMutation({
    mutationFn: async (input: string) => {
      // Parse input: "Title @AssigneeName #Priority"
      // Example: "Clean tables @Tuan #urgent"
      
      let title = input;
      let assigneeId = null;
      let priority = 'medium';

      // Extract Priority
      if (input.includes('#urgent')) { priority = 'urgent'; title = title.replace('#urgent', ''); }
      else if (input.includes('#high')) { priority = 'high'; title = title.replace('#high', ''); }
      else if (input.includes('#low')) { priority = 'low'; title = title.replace('#low', ''); }

      // Extract Assignee (Simple name match)
      const assigneeMatch = input.match(/@(\w+)/);
      if (assigneeMatch && employees) {
        const searchName = assigneeMatch[1].toLowerCase();
        const found = employees.find(e => 
          e.full_name?.toLowerCase().includes(searchName) || 
          e.email.toLowerCase().includes(searchName)
        );
        if (found) {
          assigneeId = found.id;
          title = title.replace(assigneeMatch[0], '');
        }
      }

      title = title.trim();
      if (!title) throw new Error("Tiêu đề công việc trống");

      const { error } = await supabase.from('tasks').insert({
        title: title,
        priority: priority,
        assignee_id: assigneeId,
        status: 'pending',
        company_id: employeeUser?.company_id,
        created_by: employeeUser?.id
      });

      if (error) throw error;
      return { title, assigneeId, priority };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setQuickTaskInput('');
      toast({
        title: 'Đã tạo công việc',
        description: `"${data.title}" - ${data.priority.toUpperCase()}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi tạo công việc',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const bulkImportFinancials = useMutation({
    mutationFn: async (rawText: string) => {
      const lines = rawText.split('\n').filter(line => line.trim() !== '');
      const results: string[] = [];
      const transactionsToInsert: any[] = [];

      for (const line of lines) {
        // Format: Date (YYYY-MM-DD), Type (thu/chi), Amount, Category, Description
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 3) {
          results.push(`❌ Bỏ qua dòng thiếu thông tin: ${line}`);
          continue;
        }

        const [dateStr, typeStr, amountStr, category = 'Khác', description = ''] = parts;

        // Validate Date
        const date = new Date(dateStr);
        if (!isValid(date)) {
          results.push(`❌ Ngày không hợp lệ: ${dateStr}`);
          continue;
        }

        // Validate Type
        const type = typeStr.toLowerCase() === 'thu' ? 'revenue' : (typeStr.toLowerCase() === 'chi' ? 'expense' : null);
        if (!type) {
          results.push(`❌ Loại giao dịch không hợp lệ (phải là 'thu' hoặc 'chi'): ${typeStr}`);
          continue;
        }

        // Validate Amount
        const amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, ""));
        if (isNaN(amount)) {
          results.push(`❌ Số tiền không hợp lệ: ${amountStr}`);
          continue;
        }

        transactionsToInsert.push({
          company_id: employeeUser?.company_id,
          date: date.toISOString(),
          type: type,
          amount: amount,
          category: category,
          description: description,
          created_by: employeeUser?.id
        });
      }

      if (transactionsToInsert.length === 0) return results;

      // Bulk Insert
      const { error } = await supabase
        .from('financial_transactions')
        .insert(transactionsToInsert);

      if (error) {
        results.push(`❌ Lỗi nhập liệu tài chính: ${error.message}`);
      } else {
        results.push(`✅ Đã nhập thành công ${transactionsToInsert.length} giao dịch.`);
      }

      return results;
    },
    onSuccess: (results) => {
      setFinancialResults(results);
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
      toast({
        title: 'Hoàn tất nhập liệu tài chính',
        description: `Đã xử lý xong dữ liệu.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi hệ thống',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const saveManualFinancials = useMutation({
    mutationFn: async (rows: FinancialRow[]) => {
      if (!employeeUser?.company_id) {
        throw new Error("Không tìm thấy thông tin công ty. Vui lòng đăng nhập lại.");
      }

      const transactionsToInsert = rows.map(row => ({
        company_id: employeeUser.company_id,
        date: new Date(row.date).toISOString(),
        type: row.type,
        // Remove dots/commas before parsing
        amount: parseFloat(row.amount.toString().replace(/\./g, '').replace(/,/g, '')),
        category: row.category,
        description: row.description,
        created_by: employeeUser?.id
      }));

      const { error } = await supabase
        .from('financial_transactions')
        .insert(transactionsToInsert);

      if (error) throw error;
      return transactionsToInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
      queryClient.invalidateQueries({ queryKey: ['financial-recent'] });
      setManualRows([{ id: 1, date: format(new Date(), 'yyyy-MM-dd'), type: 'revenue', amount: '', category: 'Bán hàng', description: '' }]);
      toast({
        title: 'Đã lưu thành công',
        description: `Đã thêm ${count} giao dịch vào hệ thống.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi lưu dữ liệu',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const addRow = () => {
    const newId = manualRows.length > 0 ? Math.max(...manualRows.map(r => r.id)) + 1 : 1;
    setManualRows([...manualRows, { 
      id: newId, 
      date: format(new Date(), 'yyyy-MM-dd'), 
      type: 'revenue', 
      amount: '', 
      category: 'Bán hàng', 
      description: '' 
    }]);
  };

  const removeRow = (id: number) => {
    if (manualRows.length > 1) {
      setManualRows(manualRows.filter(r => r.id !== id));
    }
  };

  const updateRow = (id: number, field: keyof FinancialRow, value: any) => {
    if (field === 'amount') {
      // Remove non-digits
      const rawValue = value.replace(/\D/g, '');
      // Format with dots (VN style)
      const formattedValue = rawValue ? new Intl.NumberFormat('vi-VN').format(parseInt(rawValue)) : '';
      setManualRows(manualRows.map(r => r.id === id ? { ...r, [field]: formattedValue } : r));
    } else {
      setManualRows(manualRows.map(r => r.id === id ? { ...r, [field]: value } : r));
    }
  };

  const REVENUE_CATEGORIES = ['Bán hàng', 'Dịch vụ', 'Hoàn tiền', 'Khác'];
  const EXPENSE_CATEGORIES = ['Nhập hàng', 'Lương', 'Điện nước', 'Marketing', 'Mặt bằng', 'Bảo trì', 'Khác'];

  const calculateTotal = () => {
    return manualRows.reduce((acc, row) => {
      const amount = parseFloat(row.amount.toString().replace(/\./g, '').replace(/,/g, '')) || 0;
      return acc + (row.type === 'revenue' ? amount : -amount);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-8 w-8 text-yellow-500" />
            Trung tâm Vận hành (Manager Hub)
          </h2>
          <p className="text-muted-foreground">
            Công cụ nhập liệu nhanh và xử lý hàng loạt dành cho Quản lý.
          </p>
        </div>
      </div>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="employees">Nhân sự</TabsTrigger>
          <TabsTrigger value="tasks">Công việc</TabsTrigger>
          <TabsTrigger value="financials">Tài chính</TabsTrigger>
          <TabsTrigger value="shortcuts">Phím tắt</TabsTrigger>
        </TabsList>

        {/* --- TAB: EMPLOYEES --- */}
        <TabsContent value="employees" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Nhập liệu Nhân viên Hàng loạt
                </CardTitle>
                <CardDescription>
                  Nhập danh sách nhân viên theo định dạng: <br/>
                  <code className="bg-muted px-1 rounded">Họ tên, Email, Vai trò (staff/manager), Mật khẩu</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  placeholder={`Nguyen Van A, a@gmail.com, staff, 123456\nTran Van B, b@gmail.com, manager, 123456`}
                  className="min-h-[200px] font-mono text-sm"
                  value={employeeData}
                  onChange={(e) => setEmployeeData(e.target.value)}
                />
                <Button 
                  className="w-full" 
                  onClick={() => bulkImportEmployees.mutate(employeeData)}
                  disabled={bulkImportEmployees.isPending || !employeeData.trim()}
                >
                  {bulkImportEmployees.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Xử lý & Nhập liệu
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kết quả xử lý</CardTitle>
                <CardDescription>Trạng thái nhập liệu sẽ hiện ở đây</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  {importResults.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Chưa có dữ liệu xử lý
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {importResults.map((res, idx) => (
                        <div key={idx} className="text-sm font-mono border-b pb-1 last:border-0">
                          {res}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- TAB: TASKS --- */}
        <TabsContent value="tasks" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Giao việc Nhanh (Command Line)
              </CardTitle>
              <CardDescription>
                Gõ lệnh để tạo công việc nhanh. Cú pháp: <br/>
                <code className="bg-muted px-1 rounded">Nội dung công việc @TênNhânViên #ĐộƯuTiên(urgent/high/low)</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Ví dụ: Dọn dẹp bàn số 5 @Tuan #urgent" 
                  value={quickTaskInput}
                  onChange={(e) => setQuickTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && quickTaskInput.trim()) {
                      createQuickTask.mutate(quickTaskInput);
                    }
                  }}
                  className="font-mono text-lg h-12"
                />
                <Button 
                  size="icon" 
                  className="h-12 w-12"
                  onClick={() => quickTaskInput.trim() && createQuickTask.mutate(quickTaskInput)}
                  disabled={createQuickTask.isPending}
                >
                  {createQuickTask.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Play className="h-6 w-6" />}
                </Button>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Gợi ý nhân viên (để tag @):</h4>
                <div className="flex flex-wrap gap-2">
                  {employees?.slice(0, 10).map(emp => (
                    <Badge key={emp.id} variant="outline" className="cursor-pointer" onClick={() => setQuickTaskInput(prev => `${prev} @${emp.full_name?.split(' ').pop()} `)}>
                      @{emp.full_name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB: FINANCIALS --- */}
        <TabsContent value="financials" className="space-y-4 mt-4">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant={financialMode === 'table' ? 'default' : 'outline'}
              onClick={() => setFinancialMode('table')}
              className="gap-2"
            >
              <Table className="h-4 w-4" />
              Nhập thủ công (Bảng)
            </Button>
            <Button 
              variant={financialMode === 'text' ? 'default' : 'outline'}
              onClick={() => setFinancialMode('text')}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Nhập hàng loạt (Text)
            </Button>
          </div>

          {financialMode === 'table' ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Nhập liệu Tài chính (Thủ công)
                    </div>
                    <Button onClick={addRow} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Thêm dòng
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Nhập dữ liệu trực tiếp vào bảng bên dưới. Nhấn "Lưu tất cả" khi hoàn tất.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">Ngày</TableHead>
                          <TableHead className="w-[120px]">Loại</TableHead>
                          <TableHead className="w-[150px]">Số tiền</TableHead>
                          <TableHead className="w-[150px]">Danh mục</TableHead>
                          <TableHead>Mô tả</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {manualRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Input 
                                type="date" 
                                value={row.date}
                                onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={row.type} 
                                onValueChange={(v) => updateRow(row.id, 'type', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="revenue">Thu</SelectItem>
                                  <SelectItem value="expense">Chi</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="text" 
                                placeholder="0"
                                value={row.amount}
                                onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                                className="font-mono text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={row.category} 
                                onValueChange={(v) => updateRow(row.id, 'category', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn danh mục" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(row.type === 'revenue' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input 
                                placeholder="Ghi chú..."
                                value={row.description}
                                onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeRow(row.id)}
                                disabled={manualRows.length === 1}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button 
                      onClick={() => saveManualFinancials.mutate(manualRows)}
                      disabled={saveManualFinancials.isPending}
                      className="w-[200px]"
                    >
                      {saveManualFinancials.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Lưu tất cả ({manualRows.length})
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* --- RECENT HISTORY --- */}
              <Card>
                <CardHeader>
                  <CardTitle>Lịch sử nhập liệu gần đây</CardTitle>
                  <CardDescription>10 giao dịch mới nhất vừa được thêm vào hệ thống.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ngày</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead>Số tiền</TableHead>
                          <TableHead>Danh mục</TableHead>
                          <TableHead>Mô tả</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentTransactions?.map((tx: any) => (
                          <TableRow key={tx.id}>
                            <TableCell>{format(new Date(tx.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant={tx.type === 'revenue' ? 'default' : 'destructive'}>
                                {tx.type === 'revenue' ? 'Thu' : 'Chi'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tx.amount)}
                            </TableCell>
                            <TableCell>{tx.category}</TableCell>
                            <TableCell className="text-muted-foreground">{tx.description}</TableCell>
                          </TableRow>
                        ))}
                        {(!recentTransactions || recentTransactions.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Chưa có dữ liệu gần đây
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Nhập liệu Tài chính (Doanh thu / Chi phí)
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <HelpCircle className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Hướng dẫn Nhập liệu Tài chính Hàng loạt</DialogTitle>
                        <DialogDescription>
                          Sử dụng tính năng này để nhập nhanh dữ liệu doanh thu/chi phí từ Excel hoặc file text.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-2">1. Nguyên lý hoạt động</h4>
                          <p className="text-muted-foreground">
                            Hệ thống sẽ đọc từng dòng dữ liệu bạn nhập vào, tự động phân tích và kiểm tra lỗi. 
                            Sau đó, tất cả các dòng hợp lệ sẽ được gửi lên hệ thống trong một lần duy nhất (Bulk Insert) để tối ưu tốc độ.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">2. Định dạng bắt buộc</h4>
                          <div className="bg-muted p-3 rounded-md font-mono text-xs">
                            Ngày, Loại, Số tiền, Danh mục, Mô tả
                          </div>
                          <ul className="list-disc list-inside mt-2 text-muted-foreground space-y-1">
                            <li><strong>Ngày:</strong> Định dạng YYYY-MM-DD (Ví dụ: 2023-12-31)</li>
                            <li><strong>Loại:</strong> "thu" (Doanh thu) hoặc "chi" (Chi phí)</li>
                            <li><strong>Số tiền:</strong> Số nguyên hoặc số thực (Ví dụ: 5000000 hoặc 5.000.000)</li>
                            <li><strong>Danh mục:</strong> Tên danh mục (Ví dụ: Bán hàng, Lương, Điện nước...)</li>
                            <li><strong>Mô tả:</strong> Ghi chú chi tiết (Không bắt buộc)</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">3. Ví dụ mẫu (Copy & Paste)</h4>
                          <pre className="bg-slate-950 text-slate-50 p-3 rounded-md font-mono text-xs overflow-x-auto">
{`2023-10-01, thu, 15000000, Bán hàng, Doanh thu ca sáng
2023-10-01, chi, 2000000, Nhập hàng, Mua bia Tiger
2023-10-02, thu, 12500000, Bán hàng, Doanh thu ngày thường
2023-10-02, chi, 500000, Điện nước, Tiền nước tháng 9`}
                          </pre>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
                <CardDescription>
                  Nhập danh sách giao dịch theo định dạng: <br/>
                  <code className="bg-muted px-1 rounded">Ngày (YYYY-MM-DD), Loại (thu/chi), Số tiền, Danh mục, Mô tả</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  placeholder={`2023-10-01, thu, 5000000, Bán hàng, Doanh thu ngày 1/10\n2023-10-02, chi, 200000, Nguyên liệu, Mua đá lạnh`}
                  className="min-h-[200px] font-mono text-sm"
                  value={financialData}
                  onChange={(e) => setFinancialData(e.target.value)}
                />
                <Button 
                  className="w-full" 
                  onClick={() => bulkImportFinancials.mutate(financialData)}
                  disabled={bulkImportFinancials.isPending || !financialData.trim()}
                >
                  {bulkImportFinancials.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Xử lý & Nhập liệu Tài chính
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kết quả xử lý</CardTitle>
                <CardDescription>Trạng thái nhập liệu sẽ hiện ở đây</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  {financialResults.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Chưa có dữ liệu xử lý
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {financialResults.map((res, idx) => (
                        <div key={idx} className="text-sm font-mono border-b pb-1 last:border-0">
                          {res}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        {/* --- TAB: SHORTCUTS --- */}
        <TabsContent value="shortcuts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Phím tắt & Mẹo nhanh</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-semibold">Điều hướng</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    <li>Sử dụng Tab để chuyển đổi giữa các ô nhập liệu.</li>
                    <li>Ctrl + Click vào menu để mở tab mới.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Nhập liệu</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    <li>Chuẩn bị danh sách nhân viên trong Excel, sau đó Copy/Paste vào ô nhập liệu hàng loạt.</li>
                    <li>Dùng cú pháp @Tên để gán việc nhanh mà không cần mở dialog chọn người.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
