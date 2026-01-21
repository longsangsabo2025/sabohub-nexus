import { supabase } from '@/lib/supabase';

async function getCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const companyId = user.user_metadata?.company_id;
  if (!companyId) throw new Error('User has no company');
  return companyId;
}

export interface MaterialCategory {
  id: string;
  company_id: string;
  name: string;
  parent_id?: string;
  sort_order?: number;
  created_at?: string;
}

export interface Material {
  id: string;
  company_id: string;
  material_code: string;
  name: string;
  description?: string;
  category_id?: string;
  unit: string;
  unit_cost?: number;
  min_stock?: number;
  max_stock?: number;
  default_supplier_id?: string;
  lead_time_days?: number;
  storage_location?: string;
  shelf_life_days?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface MaterialInventory {
  id: string;
  company_id: string;
  material_id: string;
  warehouse_id?: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  last_received_at?: string;
  last_issued_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialTransaction {
  id: string;
  company_id: string;
  material_id: string;
  warehouse_id?: string;
  transaction_type: 'receive' | 'issue' | 'adjust' | 'transfer' | 'return';
  quantity: number;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: string;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

class MaterialService {
  private readonly table = 'manufacturing_materials';
  private readonly categoryTable = 'manufacturing_material_categories';
  private readonly inventoryTable = 'manufacturing_material_inventory';
  private readonly transactionTable = 'manufacturing_material_transactions';

  // ===== CATEGORIES =====
  async getCategories() {
    const companyId = await getCompanyId();
    const { data, error } = await supabase
      .from(this.categoryTable)
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as MaterialCategory[];
  }

  async createCategory(category: Omit<MaterialCategory, 'id' | 'company_id' | 'created_at'>) {
    const companyId = await getCompanyId();
    const { data, error } = await supabase
      .from(this.categoryTable)
      .insert({ ...category, company_id: companyId })
      .select()
      .single();

    if (error) throw error;
    return data as MaterialCategory;
  }

  // ===== MATERIALS =====
  async getMaterials(filters?: {
    category_id?: string;
    is_active?: boolean;
    search?: string;
    low_stock?: boolean;
  }) {
    const companyId = await getCompanyId();
    let query = supabase
      .from(this.table)
      .select('*, category:manufacturing_material_categories(name), supplier:manufacturing_suppliers(name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,material_code.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    // If low_stock filter, join with inventory
    if (filters?.low_stock) {
      const materials = data as Material[];
      const materialIds = materials.map(m => m.id);
      
      const { data: inventory } = await supabase
        .from(this.inventoryTable)
        .select('material_id, available_quantity')
        .in('material_id', materialIds);

      const invMap = new Map(inventory?.map(i => [i.material_id, i.available_quantity]));
      
      return materials.filter(m => {
        const qty = invMap.get(m.id) || 0;
        return qty < (m.min_stock || 0);
      });
    }

    return data as Material[];
  }

  async getMaterial(id: string) {
    const { data, error } = await supabase
      .from(this.table)
      .select('*, category:manufacturing_material_categories(name), supplier:manufacturing_suppliers(name)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data as Material;
  }

  async createMaterial(material: Omit<Material, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'deleted_at'>) {
    const companyId = await getCompanyId();

    if (!material.material_code) {
      const { count } = await supabase
        .from(this.table)
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      material.material_code = `MAT${String((count || 0) + 1).padStart(5, '0')}`;
    }

    const { data, error } = await supabase
      .from(this.table)
      .insert({ ...material, company_id: companyId })
      .select()
      .single();

    if (error) throw error;
    return data as Material;
  }

  async updateMaterial(id: string, updates: Partial<Material>) {
    const { data, error } = await supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Material;
  }

  async deleteMaterial(id: string) {
    const { error } = await supabase
      .from(this.table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  // ===== INVENTORY =====
  async getInventory(filters?: {
    material_id?: string;
    warehouse_id?: string;
  }) {
    const companyId = await getCompanyId();
    let query = supabase
      .from(this.inventoryTable)
      .select('*, material:manufacturing_materials(material_code, name, unit)')
      .eq('company_id', companyId);

    if (filters?.material_id) {
      query = query.eq('material_id', filters.material_id);
    }
    if (filters?.warehouse_id) {
      query = query.eq('warehouse_id', filters.warehouse_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as MaterialInventory[];
  }

  async getAvailableQuantity(materialId: string, warehouseId?: string): Promise<number> {
    const companyId = await getCompanyId();
    let query = supabase
      .from(this.inventoryTable)
      .select('available_quantity')
      .eq('company_id', companyId)
      .eq('material_id', materialId);

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId);
    }

    const { data, error } = await query.single();
    if (error) return 0;
    return data?.available_quantity || 0;
  }

  // ===== TRANSACTIONS =====
  async recordTransaction(transaction: Omit<MaterialTransaction, 'id' | 'company_id' | 'created_by' | 'created_at'>) {
    const companyId = await getCompanyId();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from(this.transactionTable)
      .insert({
        ...transaction,
        company_id: companyId,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;

    // Update inventory
    await this.updateInventory(transaction.material_id, transaction.warehouse_id, transaction.quantity, transaction.transaction_type);

    return data as MaterialTransaction;
  }

  private async updateInventory(materialId: string, warehouseId: string | undefined, quantity: number, type: string) {
    const companyId = await getCompanyId();

    // Get or create inventory record
    let { data: inv } = await supabase
      .from(this.inventoryTable)
      .select('*')
      .eq('company_id', companyId)
      .eq('material_id', materialId)
      .eq('warehouse_id', warehouseId || '')
      .single();

    if (!inv) {
      const { data: newInv } = await supabase
        .from(this.inventoryTable)
        .insert({
          company_id: companyId,
          material_id: materialId,
          warehouse_id: warehouseId,
          quantity: 0,
          reserved_quantity: 0
        })
        .select()
        .single();
      inv = newInv;
    }

    // Update quantity
    const newQty = inv!.quantity + quantity;
    
    await supabase
      .from(this.inventoryTable)
      .update({ 
        quantity: newQty,
        last_received_at: type === 'receive' ? new Date().toISOString() : inv!.last_received_at,
        last_issued_at: type === 'issue' ? new Date().toISOString() : inv!.last_issued_at
      })
      .eq('id', inv!.id);
  }

  async getTransactions(materialId?: string, limit = 50) {
    const companyId = await getCompanyId();
    let query = supabase
      .from(this.transactionTable)
      .select('*, material:manufacturing_materials(material_code, name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (materialId) {
      query = query.eq('material_id', materialId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as MaterialTransaction[];
  }
}

export const materialService = new MaterialService();
