import { supabase } from '@/lib/supabase';
import type {
  DistributorPortal,
  DistributorPriceList,
  DistributorPriceListItem,
  DistributorPromotion,
  QuickOrderTemplate,
  DistributorLoyaltyPoints,
  DistributorLoyaltyTransaction,
  CreatePortalInput,
  UpdatePortalInput,
  CreatePriceListInput,
  CreatePromotionInput,
  CreateQuickOrderTemplateInput,
  QuickOrderInput,
  PortalFilters,
  PriceListFilters,
  PromotionFilters,
} from '@/types/distributorPortal';

class DistributorPortalService {
  private getCompanyId(): string | null {
    return localStorage.getItem('company_id');
  }

  private getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  // ========== PORTAL MANAGEMENT ==========

  async getAllPortals(filters: PortalFilters = {}): Promise<DistributorPortal[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('distributor_portals')
      .select('*, customer:customer_id(id, name, code, type)')
      .eq('company_id', companyId);

    if (filters.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.search) {
      query = query.or(`portal_name.ilike.%${filters.search}%,portal_code.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getPortalById(id: string): Promise<DistributorPortal | null> {
    const { data, error } = await supabase
      .from('distributor_portals')
      .select('*, customer:customer_id(id, name, code, type, email, phone)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getPortalByCustomerId(customerId: string): Promise<DistributorPortal | null> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('distributor_portals')
      .select('*')
      .eq('company_id', companyId)
      .eq('customer_id', customerId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  }

  async createPortal(input: CreatePortalInput): Promise<DistributorPortal> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    // Generate portal code
    const portalCode = await this.generatePortalCode();

    const { data, error } = await supabase
      .from('distributor_portals')
      .insert({
        company_id: companyId,
        customer_id: input.customer_id,
        portal_code: portalCode,
        portal_name: input.portal_name,
        logo_url: input.logo_url,
        theme_config: input.theme_config || {},
        allowed_features: input.allowed_features || ['quick_order', 'order_history', 'invoices', 'payments', 'inventory', 'promotions'],
        default_payment_method: input.default_payment_method,
        auto_approve_orders: input.auto_approve_orders || false,
        max_order_amount: input.max_order_amount,
        min_order_amount: input.min_order_amount,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updatePortal(id: string, input: UpdatePortalInput): Promise<DistributorPortal> {
    const { data, error } = await supabase
      .from('distributor_portals')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deletePortal(id: string): Promise<void> {
    const { error } = await supabase
      .from('distributor_portals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private async generatePortalCode(): Promise<string> {
    const companyId = this.getCompanyId();
    const { data } = await supabase
      .from('distributor_portals')
      .select('portal_code')
      .eq('company_id', companyId!)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastCode = data?.[0]?.portal_code;
    const lastNumber = lastCode ? parseInt(lastCode.replace('NPP', '')) : 0;
    return `NPP${String(lastNumber + 1).padStart(5, '0')}`;
  }

  // ========== PRICE LIST MANAGEMENT ==========

  async getAllPriceLists(filters: PriceListFilters = {}): Promise<DistributorPriceList[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('distributor_price_lists')
      .select('*, portal:portal_id(id, portal_name, portal_code)')
      .eq('company_id', companyId);

    if (filters.portal_id) {
      query = query.eq('portal_id', filters.portal_id);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.valid_on_date) {
      query = query
        .lte('valid_from', filters.valid_on_date)
        .or(`valid_to.is.null,valid_to.gte.${filters.valid_on_date}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getPriceListById(id: string): Promise<DistributorPriceList | null> {
    const { data, error } = await supabase
      .from('distributor_price_lists')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getPriceListItems(priceListId: string): Promise<DistributorPriceListItem[]> {
    const { data, error } = await supabase
      .from('distributor_price_list_items')
      .select(`
        *,
        product:product_id(id, name, sku, unit)
      `)
      .eq('price_list_id', priceListId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createPriceList(input: CreatePriceListInput): Promise<DistributorPriceList> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    // Generate price list code
    const code = await this.generatePriceListCode();

    // Create price list
    const { data: priceList, error: priceListError } = await supabase
      .from('distributor_price_lists')
      .insert({
        company_id: companyId,
        portal_id: input.portal_id,
        name: input.name,
        code: code,
        description: input.description,
        valid_from: input.valid_from,
        valid_to: input.valid_to,
        base_discount_percent: input.base_discount_percent || 0,
        volume_discount_rules: input.volume_discount_rules || [],
        created_by: userId,
      })
      .select()
      .single();

    if (priceListError) throw priceListError;

    // Create price list items
    const items = input.items.map(item => ({
      price_list_id: priceList.id,
      product_id: item.product_id,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent || 0,
      final_price: item.unit_price * (1 - (item.discount_percent || 0) / 100),
      min_quantity: item.min_quantity || 1,
      max_quantity: item.max_quantity,
    }));

    const { error: itemsError } = await supabase
      .from('distributor_price_list_items')
      .insert(items);

    if (itemsError) throw itemsError;

    return priceList;
  }

  async updatePriceList(id: string, input: Partial<CreatePriceListInput>): Promise<DistributorPriceList> {
    const { data, error } = await supabase
      .from('distributor_price_lists')
      .update({
        name: input.name,
        description: input.description,
        valid_from: input.valid_from,
        valid_to: input.valid_to,
        base_discount_percent: input.base_discount_percent,
        volume_discount_rules: input.volume_discount_rules,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deletePriceList(id: string): Promise<void> {
    const { error } = await supabase
      .from('distributor_price_lists')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private async generatePriceListCode(): Promise<string> {
    const companyId = this.getCompanyId();
    const { data } = await supabase
      .from('distributor_price_lists')
      .select('code')
      .eq('company_id', companyId!)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastCode = data?.[0]?.code;
    const lastNumber = lastCode ? parseInt(lastCode.replace('PL', '')) : 0;
    return `PL${String(lastNumber + 1).padStart(5, '0')}`;
  }

  // ========== PROMOTION MANAGEMENT ==========

  async getAllPromotions(filters: PromotionFilters = {}): Promise<DistributorPromotion[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('distributor_promotions')
      .select('*')
      .eq('company_id', companyId);

    if (filters.portal_id) {
      query = query.eq('portal_id', filters.portal_id);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.promotion_type) {
      query = query.eq('promotion_type', filters.promotion_type);
    }
    if (filters.active_on_date) {
      query = query
        .lte('start_date', filters.active_on_date)
        .gte('end_date', filters.active_on_date);
    }

    const { data, error } = await query.order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getPromotionById(id: string): Promise<DistributorPromotion | null> {
    const { data, error } = await supabase
      .from('distributor_promotions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createPromotion(input: CreatePromotionInput): Promise<DistributorPromotion> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    // Generate promotion code
    const code = await this.generatePromotionCode(input.promotion_type);

    const { data, error } = await supabase
      .from('distributor_promotions')
      .insert({
        company_id: companyId,
        portal_id: input.portal_id,
        code: code,
        name: input.name,
        description: input.description,
        promotion_type: input.promotion_type,
        start_date: input.start_date,
        end_date: input.end_date,
        conditions: input.conditions,
        benefits: input.benefits,
        max_uses: input.max_uses,
        max_uses_per_customer: input.max_uses_per_customer,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updatePromotion(id: string, input: Partial<CreatePromotionInput>): Promise<DistributorPromotion> {
    const { data, error } = await supabase
      .from('distributor_promotions')
      .update({
        name: input.name,
        description: input.description,
        start_date: input.start_date,
        end_date: input.end_date,
        conditions: input.conditions,
        benefits: input.benefits,
        max_uses: input.max_uses,
        max_uses_per_customer: input.max_uses_per_customer,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deletePromotion(id: string): Promise<void> {
    const { error } = await supabase
      .from('distributor_promotions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private async generatePromotionCode(type: string): Promise<string> {
    const prefix = type.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  }

  // ========== QUICK ORDER TEMPLATES ==========

  async getQuickOrderTemplates(portalId: string): Promise<QuickOrderTemplate[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('quick_order_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('portal_id', portalId)
      .order('is_default', { ascending: false })
      .order('times_used', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createQuickOrderTemplate(input: CreateQuickOrderTemplateInput): Promise<QuickOrderTemplate> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('quick_order_templates')
      .insert({
        company_id: companyId,
        portal_id: input.portal_id,
        name: input.name,
        description: input.description,
        is_default: input.is_default || false,
        items: input.items,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateQuickOrderTemplate(id: string, input: Partial<CreateQuickOrderTemplateInput>): Promise<QuickOrderTemplate> {
    const { data, error } = await supabase
      .from('quick_order_templates')
      .update({
        name: input.name,
        description: input.description,
        is_default: input.is_default,
        items: input.items,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteQuickOrderTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('quick_order_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ========== QUICK ORDER PROCESSING ==========

  async processQuickOrder(input: QuickOrderInput): Promise<any> {
    // This will integrate with the existing order service
    // For now, just validate the items
    const portal = await this.getPortalById(input.portal_id);
    if (!portal) throw new Error('Portal not found');

    // Get active price list for this portal
    const priceLists = await this.getAllPriceLists({
      portal_id: input.portal_id,
      is_active: true,
      valid_on_date: new Date().toISOString().split('T')[0],
    });

    if (priceLists.length === 0) {
      throw new Error('No active price list found for this portal');
    }

    const priceList = priceLists[0];
    const priceListItems = await this.getPriceListItems(priceList.id);

    // Calculate order totals with prices from price list
    const orderItems = input.items.map(item => {
      const priceItem = priceListItems.find(p => p.product_id === item.product_id);
      if (!priceItem) {
        throw new Error(`Product ${item.product_id} not found in price list`);
      }

      return {
        product_id: item.product_id,
        product_name: priceItem.product?.name || '',
        product_sku: priceItem.product?.sku || '',
        unit: priceItem.product?.unit || '',
        quantity: item.quantity,
        unit_price: priceItem.final_price,
        discount_percent: priceItem.discount_percent,
      };
    });

    // TODO: Create sales order using orderService
    // For now, return the calculated items
    return {
      portal_id: input.portal_id,
      customer_id: portal.customer_id,
      items: orderItems,
      notes: input.notes,
    };
  }

  // ========== LOYALTY POINTS ==========

  async getLoyaltyPoints(portalId: string): Promise<DistributorLoyaltyPoints | null> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('distributor_loyalty_points')
      .select('*')
      .eq('company_id', companyId)
      .eq('portal_id', portalId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getLoyaltyTransactions(loyaltyAccountId: string): Promise<DistributorLoyaltyTransaction[]> {
    const { data, error } = await supabase
      .from('distributor_loyalty_transactions')
      .select('*')
      .eq('loyalty_account_id', loyaltyAccountId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async addLoyaltyPoints(
    portalId: string,
    points: number,
    referenceType?: string,
    referenceId?: string,
    description?: string
  ): Promise<void> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    // Get or create loyalty account
    let loyaltyAccount = await this.getLoyaltyPoints(portalId);
    
    if (!loyaltyAccount) {
      const { data, error } = await supabase
        .from('distributor_loyalty_points')
        .insert({
          company_id: companyId,
          portal_id: portalId,
          total_earned: 0,
          current_balance: 0,
        })
        .select()
        .single();

      if (error) throw error;
      loyaltyAccount = data;
    }

    const newBalance = loyaltyAccount.current_balance + points;

    // Update loyalty account
    const { error: updateError } = await supabase
      .from('distributor_loyalty_points')
      .update({
        total_earned: loyaltyAccount.total_earned + points,
        current_balance: newBalance,
      })
      .eq('id', loyaltyAccount.id);

    if (updateError) throw updateError;

    // Create transaction record
    const { error: txError } = await supabase
      .from('distributor_loyalty_transactions')
      .insert({
        loyalty_account_id: loyaltyAccount.id,
        transaction_type: 'earn',
        points: points,
        balance_after: newBalance,
        reference_type: referenceType,
        reference_id: referenceId,
        description: description,
        created_by: userId,
      });

    if (txError) throw txError;
  }
}

export const distributorPortalService = new DistributorPortalService();
