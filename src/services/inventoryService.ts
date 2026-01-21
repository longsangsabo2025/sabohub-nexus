import { supabase } from '@/integrations/supabase/client';
import type { InventoryItem, InventoryTransaction, Warehouse } from '@/types/modules';

export interface CreateInventoryInput {
  product_id: string;
  warehouse_id?: string;
  quantity: number;
  min_quantity?: number;
  max_quantity?: number;
  reorder_point?: number;
  location?: string;
}

export interface AdjustInventoryInput {
  product_id: string;
  warehouse_id?: string;
  adjustment_type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  reason: string;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
}

export interface TransferInventoryInput {
  product_id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  quantity: number;
  notes?: string;
}

export interface InventoryFilters {
  warehouseId?: string;
  productId?: string;
  categoryId?: string;
  lowStock?: boolean;
  search?: string;
}

class InventoryService {
  private getCompanyId(): string | null {
    return localStorage.getItem('company_id');
  }

  private getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  async getAll(filters: InventoryFilters = {}): Promise<InventoryItem[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('inventory')
      .select(`
        *,
        product:product_id(id, name, sku, barcode, unit, category_id),
        warehouse:warehouse_id(id, name, code)
      `)
      .eq('company_id', companyId)
      .order('product_id');

    if (filters.warehouseId) {
      query = query.eq('warehouse_id', filters.warehouseId);
    }
    if (filters.productId) {
      query = query.eq('product_id', filters.productId);
    }
    if (filters.lowStock) {
      query = query.lte('quantity', supabase.raw('reorder_point'));
    }

    const { data, error } = await query;
    if (error) throw error;

    let result = data as InventoryItem[];

    // Filter by search on product name/sku
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(item => 
        (item.product as any)?.name?.toLowerCase().includes(searchLower) ||
        (item.product as any)?.sku?.toLowerCase().includes(searchLower) ||
        (item.product as any)?.barcode?.includes(filters.search)
      );
    }

    return result;
  }

  async getByProduct(productId: string): Promise<InventoryItem[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        warehouse:warehouse_id(id, name, code)
      `)
      .eq('company_id', companyId)
      .eq('product_id', productId);

    if (error) throw error;
    return data as InventoryItem[];
  }

  async getWarehouses(): Promise<Warehouse[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data as Warehouse[];
  }

  async createWarehouse(name: string, code?: string, address?: string): Promise<Warehouse> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('warehouses')
      .insert({
        company_id: companyId,
        name,
        code: code || name.substring(0, 10).toUpperCase(),
        address,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Warehouse;
  }

  async setInventory(input: CreateInventoryInput): Promise<InventoryItem> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    // Check if inventory record exists
    let query = supabase
      .from('inventory')
      .select('*')
      .eq('company_id', companyId)
      .eq('product_id', input.product_id);

    if (input.warehouse_id) {
      query = query.eq('warehouse_id', input.warehouse_id);
    } else {
      query = query.is('warehouse_id', null);
    }

    const { data: existing } = await query.single();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('inventory')
        .update({
          quantity: input.quantity,
          min_quantity: input.min_quantity,
          max_quantity: input.max_quantity,
          reorder_point: input.reorder_point,
          location: input.location,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as InventoryItem;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('inventory')
        .insert({
          company_id: companyId,
          product_id: input.product_id,
          warehouse_id: input.warehouse_id,
          quantity: input.quantity,
          min_quantity: input.min_quantity || 0,
          max_quantity: input.max_quantity,
          reorder_point: input.reorder_point || 10,
          location: input.location,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InventoryItem;
    }
  }

  async adjustInventory(input: AdjustInventoryInput): Promise<InventoryTransaction> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    // Get current inventory
    let inventoryQuery = supabase
      .from('inventory')
      .select('*')
      .eq('company_id', companyId)
      .eq('product_id', input.product_id);

    if (input.warehouse_id) {
      inventoryQuery = inventoryQuery.eq('warehouse_id', input.warehouse_id);
    }

    const { data: inventory } = await inventoryQuery.single();

    if (!inventory && input.adjustment_type === 'out') {
      throw new Error('Không đủ tồn kho');
    }

    const currentQty = inventory?.quantity || 0;
    let newQty = currentQty;

    switch (input.adjustment_type) {
      case 'in':
        newQty = currentQty + input.quantity;
        break;
      case 'out':
        if (currentQty < input.quantity) {
          throw new Error('Không đủ tồn kho');
        }
        newQty = currentQty - input.quantity;
        break;
      case 'adjustment':
        newQty = input.quantity; // Direct set
        break;
    }

    // Update or create inventory
    if (inventory) {
      await supabase
        .from('inventory')
        .update({
          quantity: newQty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inventory.id);
    } else {
      await this.setInventory({
        product_id: input.product_id,
        warehouse_id: input.warehouse_id,
        quantity: newQty,
      });
    }

    // Record transaction
    const transactionNumber = `TX${Date.now().toString().slice(-10)}`;
    const { data: transaction, error } = await supabase
      .from('inventory_transactions')
      .insert({
        company_id: companyId,
        product_id: input.product_id,
        warehouse_id: input.warehouse_id,
        transaction_number: transactionNumber,
        transaction_type: input.adjustment_type,
        quantity: input.quantity,
        quantity_before: currentQty,
        quantity_after: newQty,
        reference_type: input.reference_type,
        reference_id: input.reference_id,
        reason: input.reason,
        notes: input.notes,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return transaction as InventoryTransaction;
  }

  async transferInventory(input: TransferInventoryInput): Promise<void> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    // Decrease from source warehouse
    await this.adjustInventory({
      product_id: input.product_id,
      warehouse_id: input.from_warehouse_id,
      adjustment_type: 'out',
      quantity: input.quantity,
      reason: `Chuyển kho đến ${input.to_warehouse_id}`,
      reference_type: 'transfer',
      notes: input.notes,
    });

    // Increase in destination warehouse
    await this.adjustInventory({
      product_id: input.product_id,
      warehouse_id: input.to_warehouse_id,
      adjustment_type: 'in',
      quantity: input.quantity,
      reason: `Nhận từ kho ${input.from_warehouse_id}`,
      reference_type: 'transfer',
      notes: input.notes,
    });
  }

  async getTransactions(filters?: {
    productId?: string;
    warehouseId?: string;
    fromDate?: string;
    toDate?: string;
    type?: string;
  }): Promise<InventoryTransaction[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('inventory_transactions')
      .select(`
        *,
        product:product_id(id, name, sku),
        warehouse:warehouse_id(id, name),
        created_by_user:created_by(id, display_name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters?.productId) {
      query = query.eq('product_id', filters.productId);
    }
    if (filters?.warehouseId) {
      query = query.eq('warehouse_id', filters.warehouseId);
    }
    if (filters?.type) {
      query = query.eq('transaction_type', filters.type);
    }
    if (filters?.fromDate) {
      query = query.gte('created_at', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('created_at', filters.toDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as InventoryTransaction[];
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        product:product_id(id, name, sku, unit)
      `)
      .eq('company_id', companyId)
      .filter('quantity', 'lte', 'reorder_point');

    if (error) throw error;
    return data as InventoryItem[];
  }

  async getStats(): Promise<{
    totalProducts: number;
    totalQuantity: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  }> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select(`
        quantity,
        reorder_point,
        product:product_id(base_price)
      `)
      .eq('company_id', companyId);

    if (invError) throw invError;

    return {
      totalProducts: inventory.length,
      totalQuantity: inventory.reduce((sum, i) => sum + (i.quantity || 0), 0),
      totalValue: inventory.reduce((sum, i) => {
        const price = (i.product as any)?.base_price || 0;
        return sum + (i.quantity * price);
      }, 0),
      lowStockCount: inventory.filter(i => i.quantity <= i.reorder_point && i.quantity > 0).length,
      outOfStockCount: inventory.filter(i => i.quantity <= 0).length,
    };
  }
}

export const inventoryService = new InventoryService();
