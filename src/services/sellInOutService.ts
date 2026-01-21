import { supabase } from '@/lib/supabase';
import type {
  SellInTransaction,
  SellOutTransaction,
  DistributorInventory,
  SellThroughAnalytics,
  CreateSellInInput,
  CreateSellOutInput,
  SellInFilters,
  SellOutFilters,
  DistributorInventoryFilters,
  AnalyticsFilters,
  SellThroughMetrics,
} from '@/types/sellInOut';

class SellInOutService {
  private getCompanyId(): string | null {
    return localStorage.getItem('company_id');
  }

  private getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  // ========== SELL-IN TRANSACTIONS ==========

  async getAllSellIn(filters: SellInFilters = {}): Promise<SellInTransaction[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('sell_in_transactions')
      .select(`
        *,
        distributor:distributor_id(id, name, code),
        sales_rep:sales_rep_id(id, display_name)
      `)
      .eq('company_id', companyId);

    if (filters.distributor_id) {
      query = query.eq('distributor_id', filters.distributor_id);
    }
    if (filters.sales_rep_id) {
      query = query.eq('sales_rep_id', filters.sales_rep_id);
    }
    if (filters.channel) {
      query = query.eq('channel', filters.channel);
    }
    if (filters.region) {
      query = query.eq('region', filters.region);
    }
    if (filters.from_date) {
      query = query.gte('transaction_date', filters.from_date);
    }
    if (filters.to_date) {
      query = query.lte('transaction_date', filters.to_date);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('transaction_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getSellInById(id: string): Promise<SellInTransaction | null> {
    const { data, error } = await supabase
      .from('sell_in_transactions')
      .select(`
        *,
        distributor:distributor_id(id, name, code, email, phone),
        sales_rep:sales_rep_id(id, display_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createSellIn(input: CreateSellInInput): Promise<SellInTransaction> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    // Calculate totals
    const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discount = input.items.reduce((sum, item) => sum + (item.discount || 0), 0);
    const total_quantity = input.items.reduce((sum, item) => sum + item.quantity, 0);

    // Generate transaction number using RPC function
    const { data: transactionNumber, error: rpcError } = await supabase
      .rpc('generate_sell_in_number', { p_company_id: companyId });

    if (rpcError) throw rpcError;

    const { data, error } = await supabase
      .from('sell_in_transactions')
      .insert({
        company_id: companyId,
        transaction_number: transactionNumber,
        transaction_date: input.transaction_date,
        distributor_id: input.distributor_id,
        sales_rep_id: input.sales_rep_id,
        sales_order_id: input.sales_order_id,
        delivery_id: input.delivery_id,
        invoice_number: input.invoice_number,
        items: input.items,
        total_quantity: total_quantity,
        subtotal: subtotal,
        discount: discount,
        tax: 0, // TODO: Calculate tax based on company settings
        total_amount: subtotal - discount,
        channel: input.channel,
        region: input.region,
        territory: input.territory,
        status: 'completed',
        notes: input.notes,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateSellInStatus(id: string, status: 'completed' | 'returned' | 'cancelled'): Promise<void> {
    const { error } = await supabase
      .from('sell_in_transactions')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  }

  // ========== SELL-OUT TRANSACTIONS ==========

  async getAllSellOut(filters: SellOutFilters = {}): Promise<SellOutTransaction[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('sell_out_transactions')
      .select(`
        *,
        distributor:distributor_id(id, name, code)
      `)
      .eq('company_id', companyId);

    if (filters.distributor_id) {
      query = query.eq('distributor_id', filters.distributor_id);
    }
    if (filters.outlet_type) {
      query = query.eq('outlet_type', filters.outlet_type);
    }
    if (filters.channel) {
      query = query.eq('channel', filters.channel);
    }
    if (filters.region) {
      query = query.eq('region', filters.region);
    }
    if (filters.from_date) {
      query = query.gte('transaction_date', filters.from_date);
    }
    if (filters.to_date) {
      query = query.lte('transaction_date', filters.to_date);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.source) {
      query = query.eq('source', filters.source);
    }

    const { data, error } = await query.order('transaction_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getSellOutById(id: string): Promise<SellOutTransaction | null> {
    const { data, error } = await supabase
      .from('sell_out_transactions')
      .select(`
        *,
        distributor:distributor_id(id, name, code)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createSellOut(input: CreateSellOutInput): Promise<SellOutTransaction> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    // Calculate totals
    const subtotal = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discount = input.items.reduce((sum, item) => sum + (item.discount || 0), 0);
    const total_quantity = input.items.reduce((sum, item) => sum + item.quantity, 0);

    // Generate transaction number using RPC function
    const { data: transactionNumber, error: rpcError } = await supabase
      .rpc('generate_sell_out_number', { p_company_id: companyId });

    if (rpcError) throw rpcError;

    const { data, error } = await supabase
      .from('sell_out_transactions')
      .insert({
        company_id: companyId,
        transaction_number: transactionNumber,
        transaction_date: input.transaction_date,
        distributor_id: input.distributor_id,
        outlet_id: input.outlet_id,
        outlet_name: input.outlet_name,
        outlet_type: input.outlet_type,
        sell_in_transaction_id: input.sell_in_transaction_id,
        items: input.items,
        total_quantity: total_quantity,
        subtotal: subtotal,
        discount: discount,
        total_amount: subtotal - discount,
        channel: input.channel,
        region: input.region,
        territory: input.territory,
        city: input.city,
        status: 'completed',
        source: input.source || 'manual',
        reported_by: input.reported_by,
        notes: input.notes,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateSellOutStatus(id: string, status: 'completed' | 'returned' | 'cancelled'): Promise<void> {
    const { error } = await supabase
      .from('sell_out_transactions')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  }

  // ========== DISTRIBUTOR INVENTORY ==========

  async getDistributorInventory(filters: DistributorInventoryFilters = {}): Promise<DistributorInventory[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('distributor_inventory')
      .select(`
        *,
        distributor:distributor_id(id, name, code),
        product:product_id(id, name, sku, unit)
      `)
      .eq('company_id', companyId);

    if (filters.distributor_id) {
      query = query.eq('distributor_id', filters.distributor_id);
    }
    if (filters.product_id) {
      query = query.eq('product_id', filters.product_id);
    }
    if (filters.low_stock_only) {
      query = query.filter('current_stock', 'lte', 'reorder_point');
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getInventoryByDistributorAndProduct(
    distributorId: string,
    productId: string
  ): Promise<DistributorInventory | null> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('distributor_inventory')
      .select('*')
      .eq('company_id', companyId)
      .eq('distributor_id', distributorId)
      .eq('product_id', productId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  }

  async updateInventoryReorderLevels(
    distributorId: string,
    productId: string,
    levels: {
      min_stock?: number;
      max_stock?: number;
      reorder_point?: number;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('distributor_inventory')
      .update(levels)
      .eq('distributor_id', distributorId)
      .eq('product_id', productId);

    if (error) throw error;
  }

  // ========== SELL-THROUGH ANALYTICS ==========

  async getSellThroughAnalytics(filters: AnalyticsFilters): Promise<SellThroughAnalytics[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('sell_through_analytics')
      .select('*')
      .eq('company_id', companyId)
      .eq('period_type', filters.period_type)
      .gte('period_start', filters.period_start)
      .lte('period_end', filters.period_end);

    if (filters.distributor_id) {
      query = query.eq('distributor_id', filters.distributor_id);
    }
    if (filters.product_id) {
      query = query.eq('product_id', filters.product_id);
    }
    if (filters.channel) {
      query = query.eq('channel', filters.channel);
    }
    if (filters.region) {
      query = query.eq('region', filters.region);
    }

    const { data, error } = await query.order('period_start', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async calculateSellThroughMetrics(
    startDate: string,
    endDate: string
  ): Promise<SellThroughMetrics> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    // Get sell-in transactions
    const sellInData = await this.getAllSellIn({
      from_date: startDate,
      to_date: endDate,
      status: 'completed',
    });

    // Get sell-out transactions
    const sellOutData = await this.getAllSellOut({
      from_date: startDate,
      to_date: endDate,
      status: 'completed',
    });

    // Calculate totals
    const sell_in_total = sellInData.reduce((sum, t) => sum + t.total_amount, 0);
    const sell_out_total = sellOutData.reduce((sum, t) => sum + t.total_amount, 0);

    // Get current inventory value
    const inventory = await this.getDistributorInventory({});
    const inventory_value = inventory.reduce((sum, i) => sum + (i.total_value || 0), 0);

    // Calculate sell-through rate
    const sell_through_rate = sell_in_total > 0 ? (sell_out_total / sell_in_total) * 100 : 0;

    // Top distributors
    const distributorMap = new Map<string, { name: string; sell_in: number; sell_out: number }>();
    
    sellInData.forEach(t => {
      const existing = distributorMap.get(t.distributor_id) || { 
        name: (t as any).distributor?.name || '',
        sell_in: 0, 
        sell_out: 0 
      };
      existing.sell_in += t.total_amount;
      distributorMap.set(t.distributor_id, existing);
    });

    sellOutData.forEach(t => {
      const existing = distributorMap.get(t.distributor_id) || { 
        name: (t as any).distributor?.name || '',
        sell_in: 0, 
        sell_out: 0 
      };
      existing.sell_out += t.total_amount;
      distributorMap.set(t.distributor_id, existing);
    });

    const top_distributors = Array.from(distributorMap.entries())
      .map(([id, data]) => ({
        distributor_id: id,
        distributor_name: data.name,
        sell_in: data.sell_in,
        sell_out: data.sell_out,
        sell_through_rate: data.sell_in > 0 ? (data.sell_out / data.sell_in) * 100 : 0,
      }))
      .sort((a, b) => b.sell_out - a.sell_out)
      .slice(0, 10);

    // By channel
    const channelMap = new Map<string, { sell_in: number; sell_out: number }>();
    
    sellInData.forEach(t => {
      if (t.channel) {
        const existing = channelMap.get(t.channel) || { sell_in: 0, sell_out: 0 };
        existing.sell_in += t.total_amount;
        channelMap.set(t.channel, existing);
      }
    });

    sellOutData.forEach(t => {
      if (t.channel) {
        const existing = channelMap.get(t.channel) || { sell_in: 0, sell_out: 0 };
        existing.sell_out += t.total_amount;
        channelMap.set(t.channel, existing);
      }
    });

    const by_channel = Array.from(channelMap.entries())
      .map(([channel, data]) => ({
        channel,
        sell_in: data.sell_in,
        sell_out: data.sell_out,
        sell_through_rate: data.sell_in > 0 ? (data.sell_out / data.sell_in) * 100 : 0,
      }));

    return {
      sell_in_total,
      sell_out_total,
      inventory_value,
      sell_through_rate,
      top_distributors,
      top_products: [], // TODO: Implement product aggregation
      by_channel,
    };
  }

  // ========== BATCH IMPORT ==========

  async importSellOutTransactions(transactions: CreateSellOutInput[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ transaction: CreateSellOutInput; error: string }>;
  }> {
    let success = 0;
    let failed = 0;
    const errors: Array<{ transaction: CreateSellOutInput; error: string }> = [];

    for (const transaction of transactions) {
      try {
        await this.createSellOut(transaction);
        success++;
      } catch (error) {
        failed++;
        errors.push({
          transaction,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { success, failed, errors };
  }
}

export const sellInOutService = new SellInOutService();
