import { supabase } from '@/integrations/supabase/client';
import type { Receivable, Payment } from '@/types/modules';

export interface CreateReceivableInput {
  customer_id: string;
  order_id?: string;
  delivery_id?: string;
  amount: number;
  due_date: string;
  notes?: string;
}

export interface RecordPaymentInput {
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'other';
  payment_date?: string;
  reference_number?: string;
  notes?: string;
  collected_by?: string;
  latitude?: number;
  longitude?: number;
}

export interface ReceivableFilters {
  customerId?: string;
  status?: 'pending' | 'partial' | 'paid' | 'overdue' | 'written_off';
  fromDate?: string;
  toDate?: string;
  isOverdue?: boolean;
  search?: string;
}

class ReceivableService {
  private getCompanyId(): string | null {
    return localStorage.getItem('company_id');
  }

  private getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  async getAll(filters: ReceivableFilters = {}): Promise<Receivable[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('receivables')
      .select(`
        *,
        customer:customer_id(id, name, code, phone),
        order:order_id(id, order_number),
        delivery:delivery_id(id, delivery_number)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true });

    if (filters.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.fromDate) {
      query = query.gte('due_date', filters.fromDate);
    }
    if (filters.toDate) {
      query = query.lte('due_date', filters.toDate);
    }
    if (filters.isOverdue) {
      query = query
        .lt('due_date', new Date().toISOString().split('T')[0])
        .in('status', ['pending', 'partial']);
    }
    if (filters.search) {
      query = query.ilike('receivable_number', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Receivable[];
  }

  async getById(id: string): Promise<Receivable | null> {
    const { data, error } = await supabase
      .from('receivables')
      .select(`
        *,
        customer:customer_id(id, name, code, phone, email, address),
        order:order_id(id, order_number, total_amount),
        delivery:delivery_id(id, delivery_number)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Receivable;
  }

  async getPayments(receivableId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        collected_by:collected_by(id, display_name)
      `)
      .eq('receivable_id', receivableId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data as Payment[];
  }

  async create(input: CreateReceivableInput): Promise<Receivable> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    // Generate receivable number
    const timestamp = Date.now().toString().slice(-8);
    const receivableNumber = `CN${new Date().getFullYear()}${timestamp}`;

    const { data, error } = await supabase
      .from('receivables')
      .insert({
        company_id: companyId,
        customer_id: input.customer_id,
        order_id: input.order_id,
        delivery_id: input.delivery_id,
        receivable_number: receivableNumber,
        amount: input.amount,
        paid_amount: 0,
        remaining_amount: input.amount,
        due_date: input.due_date,
        notes: input.notes,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data as Receivable;
  }

  async recordPayment(receivableId: string, input: RecordPaymentInput): Promise<Payment> {
    const userId = this.getUserId();

    // Get current receivable
    const receivable = await this.getById(receivableId);
    if (!receivable) throw new Error('Receivable not found');

    // Generate payment number
    const timestamp = Date.now().toString().slice(-8);
    const paymentNumber = `TT${new Date().getFullYear()}${timestamp}`;

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        receivable_id: receivableId,
        payment_number: paymentNumber,
        amount: input.amount,
        payment_method: input.payment_method,
        payment_date: input.payment_date || new Date().toISOString().split('T')[0],
        reference_number: input.reference_number,
        notes: input.notes,
        collected_by: input.collected_by || userId,
        latitude: input.latitude,
        longitude: input.longitude,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Update receivable totals
    const newPaidAmount = (receivable.paid_amount || 0) + input.amount;
    const newRemainingAmount = receivable.amount - newPaidAmount;
    const newStatus = newRemainingAmount <= 0 ? 'paid' : 'partial';

    await supabase
      .from('receivables')
      .update({
        paid_amount: newPaidAmount,
        remaining_amount: Math.max(0, newRemainingAmount),
        status: newStatus,
        last_payment_date: input.payment_date || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', receivableId);

    return payment as Payment;
  }

  async writeOff(id: string, reason: string): Promise<Receivable> {
    const { data, error } = await supabase
      .from('receivables')
      .update({
        status: 'written_off',
        notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Receivable;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('receivables')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async getCustomerBalance(customerId: string): Promise<{
    totalReceivables: number;
    totalPaid: number;
    totalRemaining: number;
    overdueAmount: number;
    receivablesCount: number;
    overdueCount: number;
  }> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('receivables')
      .select('amount, paid_amount, remaining_amount, due_date, status')
      .eq('company_id', companyId)
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .in('status', ['pending', 'partial']);

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const overdue = data.filter(r => r.due_date < today);

    return {
      totalReceivables: data.reduce((sum, r) => sum + (r.amount || 0), 0),
      totalPaid: data.reduce((sum, r) => sum + (r.paid_amount || 0), 0),
      totalRemaining: data.reduce((sum, r) => sum + (r.remaining_amount || 0), 0),
      overdueAmount: overdue.reduce((sum, r) => sum + (r.remaining_amount || 0), 0),
      receivablesCount: data.length,
      overdueCount: overdue.length,
    };
  }

  async getAgingReport(): Promise<{
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    over90days: number;
    total: number;
  }> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('receivables')
      .select('remaining_amount, due_date')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .in('status', ['pending', 'partial']);

    if (error) throw error;

    const today = new Date();
    const aging = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      over90days: 0,
      total: 0,
    };

    data.forEach(r => {
      const dueDate = new Date(r.due_date);
      const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const amount = r.remaining_amount || 0;

      aging.total += amount;

      if (daysPastDue <= 0) {
        aging.current += amount;
      } else if (daysPastDue <= 30) {
        aging.days1to30 += amount;
      } else if (daysPastDue <= 60) {
        aging.days31to60 += amount;
      } else if (daysPastDue <= 90) {
        aging.days61to90 += amount;
      } else {
        aging.over90days += amount;
      }
    });

    return aging;
  }

  async getStats(): Promise<{
    totalReceivables: number;
    totalPaid: number;
    totalRemaining: number;
    overdueAmount: number;
    collectionRate: number;
    averageDaysToCollect: number;
  }> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('receivables')
      .select('amount, paid_amount, remaining_amount, due_date, status, created_at, last_payment_date')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const overdue = data.filter(r => 
      r.due_date < today && ['pending', 'partial'].includes(r.status)
    );
    const paid = data.filter(r => r.status === 'paid');

    // Calculate average days to collect for paid receivables
    let totalDaysToCollect = 0;
    paid.forEach(r => {
      if (r.last_payment_date && r.created_at) {
        const created = new Date(r.created_at);
        const collected = new Date(r.last_payment_date);
        totalDaysToCollect += Math.floor((collected.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      }
    });

    const totalReceivables = data.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalPaid = data.reduce((sum, r) => sum + (r.paid_amount || 0), 0);

    return {
      totalReceivables,
      totalPaid,
      totalRemaining: data.reduce((sum, r) => sum + (r.remaining_amount || 0), 0),
      overdueAmount: overdue.reduce((sum, r) => sum + (r.remaining_amount || 0), 0),
      collectionRate: totalReceivables > 0 ? (totalPaid / totalReceivables) * 100 : 0,
      averageDaysToCollect: paid.length > 0 ? totalDaysToCollect / paid.length : 0,
    };
  }
}

export const receivableService = new ReceivableService();
