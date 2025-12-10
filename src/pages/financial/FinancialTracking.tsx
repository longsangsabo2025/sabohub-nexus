/**
 * Financial Tracking Page
 * Purpose: Track company revenue and expenses with REAL data
 * Philosophy: Real operational financial metrics
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download,
} from 'lucide-react';

export default function FinancialTracking() {
  // Fetch REAL financial data
  const { data: financialStats, isLoading } = useQuery({
    queryKey: ['financial-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('ceo_id', user.id)
        .single();

      if (!company) throw new Error('Company not found');

      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('company_id', company.id)
        .order('date', { ascending: false });

      if (!transactions) return null;

      const revenue = transactions
        .filter(t => t.type === 'revenue')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const profit = revenue - expenses;
      const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;

      const thisMonth = new Date();
      const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      
      const monthlyRevenue = transactions
        .filter(t => t.type === 'revenue' && new Date(t.date) >= monthStart)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const monthlyExpenses = transactions
        .filter(t => t.type === 'expense' && new Date(t.date) >= monthStart)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const expensesByCategory = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc: Record<string, number>, t) => {
          acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount);
          return acc;
        }, {});

      return {
        totalRevenue: revenue,
        totalExpenses: expenses,
        profit,
        profitMargin,
        monthlyRevenue,
        monthlyExpenses,
        expensesByCategory,
        transactionCount: transactions.length,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              Tài Chính
            </h2>
            <p className="text-muted-foreground">Quản lý tài chính công ty - Real Data</p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Doanh Thu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '...' : new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                maximumFractionDigits: 0
              }).format(financialStats?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {financialStats?.transactionCount || 0} giao dịch
            </p>
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
              {isLoading ? '...' : new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                maximumFractionDigits: 0
              }).format(financialStats?.totalExpenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Chi tiêu vận hành
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lợi Nhuận
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(financialStats?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {isLoading ? '...' : new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                maximumFractionDigits: 0
              }).format(financialStats?.profit || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {(financialStats?.profit || 0) >= 0 ? (
                <><TrendingUp className="h-3 w-3" /> Profit Margin: {financialStats?.profitMargin.toFixed(1)}%</>
              ) : (
                <><TrendingDown className="h-3 w-3" /> Loss</>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Doanh Thu Tháng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoading ? '...' : new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                maximumFractionDigits: 0
              }).format(financialStats?.monthlyRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Chi phí: {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                maximumFractionDigits: 0
              }).format(financialStats?.monthlyExpenses || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chi Phí Theo Danh Mục</CardTitle>
          </CardHeader>
          <CardContent>
            {financialStats && Object.keys(financialStats.expensesByCategory).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(financialStats.expensesByCategory)
                  .sort(([,a], [,b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm">{category}</span>
                      <span className="text-sm font-semibold">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                          maximumFractionDigits: 0
                        }).format(amount)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Chưa có dữ liệu chi phí</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tổng Quan Tài Chính</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Doanh thu</span>
                  <span className="text-sm text-green-600">100%</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Chi phí</span>
                  <span className="text-sm text-red-600">
                    {financialStats?.totalRevenue ? 
                      ((financialStats.totalExpenses / financialStats.totalRevenue) * 100).toFixed(1) 
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ 
                      width: financialStats?.totalRevenue ? 
                        `${Math.min(100, (financialStats.totalExpenses / financialStats.totalRevenue) * 100)}%` 
                        : '0%' 
                    }} 
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Lợi nhuận</span>
                  <span className={`text-sm ${(financialStats?.profitMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {financialStats?.profitMargin.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full">
                  <div 
                    className={`h-2 rounded-full ${(financialStats?.profitMargin || 0) >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                    style={{ width: `${Math.min(100, Math.abs(financialStats?.profitMargin || 0))}%` }} 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
