import { supabase } from '@/lib/supabase';

async function getCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const companyId = user.user_metadata?.company_id;
  if (!companyId) throw new Error('User has no company');
  return companyId;
}

export interface PurchaseOrder {
  id: string;
  company_id: string;
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_date?: string;
  received_date?: string;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'partial' | 'received' | 'cancelled';
  subtotal?: number;
  tax_percent?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  payment_terms?: number;
  payment_status?: 'unpaid' | 'partial' | 'paid';
  delivery_address?: string;
  warehouse_id?: string;
  notes?: string;
  internal_notes?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  material_id: string;
  quantity: number;
  unit?: string;
  received_quantity?: number;
  unit_price: number;
  discount_percent?: number;
  tax_percent?: number;
  total: number;
  production_order_id?: string;
  notes?: string;
  created_at?: string;
}

export interface PurchaseReceipt {
  id: string;
  company_id: string;
  po_id: string;
  receipt_number: string;
  receipt_date: string;
  warehouse_id?: string;
  notes?: string;
  received_by?: string;
  created_at?: string;
}

export interface PurchaseReceiptItem {
  id: string;
  receipt_id: string;
  po_item_id: string;
  material_id: string;
  quantity: number;
  batch_number?: string;
  expiry_date?: string;
  quality_status?: 'pending' | 'passed' | 'failed' | 'partial';
  quality_notes?: string;
  created_at?: string;
}

class PurchaseOrderService {
  private readonly table = 'manufacturing_purchase_orders';
  private readonly itemTable = 'manufacturing_purchase_order_items';
  private readonly receiptTable = 'manufacturing_purchase_receipts';
  private readonly receiptItemTable = 'manufacturing_purchase_receipt_items';

  // ===== PURCHASE ORDERS =====
  async getPurchaseOrders(filters?: {
    supplier_id?: string;
    status?: string;
    from_date?: string;
    to_date?: string;
  }) {
    const companyId = await getCompanyId();
    let query = supabase
      .from(this.table)
      .select('*, supplier:manufacturing_suppliers(name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('order_date', { ascending: false });

    if (filters?.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.from_date) {
      query = query.gte('order_date', filters.from_date);
    }
    if (filters?.to_date) {
      query = query.lte('order_date', filters.to_date);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as PurchaseOrder[];
  }

  async getPurchaseOrder(id: string) {
    const { data, error } = await supabase
      .from(this.table)
      .select('*, supplier:manufacturing_suppliers(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data as PurchaseOrder;
  }

  async createPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'company_id' | 'po_number' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by'>) {
    const companyId = await getCompanyId();
    const { data: { user } } = await supabase.auth.getUser();

    // Generate PO number
    const { data: poNumber } = await supabase.rpc('generate_po_number', {
      p_company_id: companyId
    });

    const { data, error } = await supabase
      .from(this.table)
      .insert({
        ...po,
        company_id: companyId,
        po_number: poNumber,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as PurchaseOrder;
  }

  async updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>) {
    const { data, error } = await supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PurchaseOrder;
  }

  async deletePurchaseOrder(id: string) {
    const { error } = await supabase
      .from(this.table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async approvePurchaseOrder(id: string) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from(this.table)
      .update({
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PurchaseOrder;
  }

  async submitPurchaseOrder(id: string) {
    return this.updatePurchaseOrder(id, { status: 'ordered' });
  }

  async cancelPurchaseOrder(id: string) {
    return this.updatePurchaseOrder(id, { status: 'cancelled' });
  }

  // ===== PO ITEMS =====
  async getPOItems(poId: string) {
    const { data, error } = await supabase
      .from(this.itemTable)
      .select('*, material:manufacturing_materials(material_code, name, unit)')
      .eq('po_id', poId);

    if (error) throw error;
    return data as PurchaseOrderItem[];
  }

  async createPOItem(item: Omit<PurchaseOrderItem, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from(this.itemTable)
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data as PurchaseOrderItem;
  }

  async updatePOItem(id: string, updates: Partial<PurchaseOrderItem>) {
    const { data, error } = await supabase
      .from(this.itemTable)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PurchaseOrderItem;
  }

  async deletePOItem(id: string) {
    const { error } = await supabase
      .from(this.itemTable)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async bulkCreatePOItems(items: Omit<PurchaseOrderItem, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from(this.itemTable)
      .insert(items)
      .select();

    if (error) throw error;
    return data as PurchaseOrderItem[];
  }

  // ===== RECEIPTS =====
  async getReceipts(poId?: string) {
    const companyId = await getCompanyId();
    let query = supabase
      .from(this.receiptTable)
      .select('*, po:manufacturing_purchase_orders(po_number)')
      .eq('company_id', companyId)
      .order('receipt_date', { ascending: false });

    if (poId) {
      query = query.eq('po_id', poId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as PurchaseReceipt[];
  }

  async createReceipt(
    poId: string,
    receiptData: Omit<PurchaseReceipt, 'id' | 'company_id' | 'po_id' | 'receipt_number' | 'created_at' | 'received_by'>,
    items: Omit<PurchaseReceiptItem, 'id' | 'receipt_id' | 'created_at'>[]
  ) {
    const companyId = await getCompanyId();
    const { data: { user } } = await supabase.auth.getUser();

    // Generate receipt number
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from(this.receiptTable)
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .like('receipt_number', `GR${year}%`);

    const receiptNumber = `GR${year}${String((count || 0) + 1).padStart(5, '0')}`;

    // Create receipt
    const { data: receipt, error: receiptError } = await supabase
      .from(this.receiptTable)
      .insert({
        ...receiptData,
        company_id: companyId,
        po_id: poId,
        receipt_number: receiptNumber,
        received_by: user?.id
      })
      .select()
      .single();

    if (receiptError) throw receiptError;

    // Create receipt items
    const receiptItems = items.map(item => ({
      ...item,
      receipt_id: receipt.id
    }));

    const { data: createdItems, error: itemsError } = await supabase
      .from(this.receiptItemTable)
      .insert(receiptItems)
      .select();

    if (itemsError) throw itemsError;

    return { receipt, items: createdItems };
  }

  // ===== STATISTICS =====
  async getPOStats() {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from(this.table)
      .select('status, total_amount, payment_status')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (error) throw error;

    const totalOrders = data.length;
    const totalValue = data.reduce((sum, po) => sum + (po.total_amount || 0), 0);
    const pending = data.filter(po => po.status === 'pending' || po.status === 'draft').length;
    const inProgress = data.filter(po => po.status === 'ordered' || po.status === 'partial').length;
    const completed = data.filter(po => po.status === 'received').length;
    const unpaidValue = data
      .filter(po => po.payment_status === 'unpaid' || po.payment_status === 'partial')
      .reduce((sum, po) => sum + (po.total_amount || 0), 0);

    return { totalOrders, totalValue, pending, inProgress, completed, unpaidValue };
  }
}

export const purchaseOrderService = new PurchaseOrderService();
