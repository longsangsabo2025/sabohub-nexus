import { supabase } from '@/lib/supabase';

async function getCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const companyId = user.user_metadata?.company_id;
  if (!companyId) throw new Error('User has no company');
  return companyId;
}

export interface Payable {
  id: string;
  company_id: string;
  supplier_id: string;
  po_id?: string;
  invoice_number?: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount?: number;
  outstanding_amount: number;
  currency?: string;
  status: 'outstanding' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface PayablePayment {
  id: string;
  payable_id: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'other';
  reference?: string;
  bank_account?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface AgingReportItem {
  supplier_id: string;
  supplier_name: string;
  current_amount: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90_days: number;
  total_outstanding: number;
}

class PayableService {
  private readonly table = 'manufacturing_payables';
  private readonly paymentTable = 'manufacturing_payable_payments';

  // ===== PAYABLES =====
  async getPayables(filters?: {
    supplier_id?: string;
    status?: string;
    from_date?: string;
    to_date?: string;
    overdue?: boolean;
  }) {
    const companyId = await getCompanyId();
    let query = supabase
      .from(this.table)
      .select('*, supplier:manufacturing_suppliers(name), po:manufacturing_purchase_orders(po_number)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true });

    if (filters?.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.from_date) {
      query = query.gte('invoice_date', filters.from_date);
    }
    if (filters?.to_date) {
      query = query.lte('invoice_date', filters.to_date);
    }
    if (filters?.overdue) {
      query = query.eq('status', 'overdue');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Payable[];
  }

  async getPayable(id: string) {
    const { data, error } = await supabase
      .from(this.table)
      .select('*, supplier:manufacturing_suppliers(*), po:manufacturing_purchase_orders(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data as Payable;
  }

  async createPayable(payable: Omit<Payable, 'id' | 'company_id' | 'outstanding_amount' | 'created_at' | 'updated_at' | 'deleted_at'>) {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from(this.table)
      .insert({
        ...payable,
        company_id: companyId
      })
      .select()
      .single();

    if (error) throw error;
    return data as Payable;
  }

  async updatePayable(id: string, updates: Partial<Payable>) {
    const { data, error } = await supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Payable;
  }

  async deletePayable(id: string) {
    const { error } = await supabase
      .from(this.table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async cancelPayable(id: string) {
    return this.updatePayable(id, { status: 'cancelled' });
  }

  // ===== PAYMENTS =====
  async getPayments(payableId?: string) {
    let query = supabase
      .from(this.paymentTable)
      .select('*, payable:manufacturing_payables(invoice_number, supplier:manufacturing_suppliers(name))')
      .order('payment_date', { ascending: false });

    if (payableId) {
      query = query.eq('payable_id', payableId);
    } else {
      // Get all payments for company's payables
      const companyId = await getCompanyId();
      const { data: payableIds } = await supabase
        .from(this.table)
        .select('id')
        .eq('company_id', companyId);

      if (payableIds) {
        query = query.in('payable_id', payableIds.map(p => p.id));
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as PayablePayment[];
  }

  async recordPayment(
    payableId: string,
    payment: Omit<PayablePayment, 'id' | 'payable_id' | 'created_by' | 'created_at'>
  ) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from(this.paymentTable)
      .insert({
        ...payment,
        payable_id: payableId,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger will auto-update payable status and paid_amount
    
    return data as PayablePayment;
  }

  async updatePayment(id: string, updates: Partial<PayablePayment>) {
    const { data, error } = await supabase
      .from(this.paymentTable)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PayablePayment;
  }

  async deletePayment(id: string) {
    const { error } = await supabase
      .from(this.paymentTable)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===== AGING REPORT =====
  async getAgingReport(): Promise<AgingReportItem[]> {
    const companyId = await getCompanyId();

    const { data, error } = await supabase.rpc('get_payables_aging_report', {
      p_company_id: companyId
    });

    if (error) throw error;
    return data as AgingReportItem[];
  }

  // ===== STATISTICS =====
  async getPayableStats() {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from(this.table)
      .select('status, total_amount, outstanding_amount, due_date')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (error) throw error;

    const total = data.length;
    const totalOutstanding = data.reduce((sum, p) => sum + (p.outstanding_amount || 0), 0);
    const overdue = data.filter(p => p.status === 'overdue').length;
    const overdueAmount = data
      .filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + (p.outstanding_amount || 0), 0);
    const dueThisWeek = data.filter(p => {
      const dueDate = new Date(p.due_date);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return dueDate <= nextWeek && dueDate >= new Date();
    }).length;
    const dueThisMonth = data.filter(p => {
      const dueDate = new Date(p.due_date);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return dueDate <= nextMonth && dueDate >= new Date();
    }).length;

    return {
      total,
      totalOutstanding,
      overdue,
      overdueAmount,
      dueThisWeek,
      dueThisMonth,
      paid: data.filter(p => p.status === 'paid').length,
      partial: data.filter(p => p.status === 'partial').length
    };
  }

  async getSupplierPaymentHistory(supplierId: string, limit = 10) {
    const { data, error } = await supabase
      .from(this.paymentTable)
      .select('*, payable:manufacturing_payables!inner(supplier_id, invoice_number)')
      .eq('payable.supplier_id', supplierId)
      .order('payment_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as PayablePayment[];
  }

  // Update overdue status (call periodically)
  async updateOverduePayables() {
    await supabase.rpc('update_overdue_payables');
  }

  // Generate payment plan
  async getPaymentPlan(days = 30) {
    const companyId = await getCompanyId();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const { data, error } = await supabase
      .from(this.table)
      .select('*, supplier:manufacturing_suppliers(name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .in('status', ['outstanding', 'partial', 'overdue'])
      .lte('due_date', endDate.toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (error) throw error;

    // Group by due date
    const grouped = (data as Payable[]).reduce((acc, payable) => {
      const date = payable.due_date;
      if (!acc[date]) {
        acc[date] = { date, payables: [], total: 0 };
      }
      acc[date].payables.push(payable);
      acc[date].total += payable.outstanding_amount;
      return acc;
    }, {} as Record<string, { date: string; payables: Payable[]; total: number }>);

    return Object.values(grouped);
  }
}

export const payableService = new PayableService();
