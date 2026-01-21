import { supabase } from '@/lib/supabase';

async function getCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const companyId = user.user_metadata?.company_id;
  if (!companyId) throw new Error('User has no company');
  return companyId;
}

export interface BOM {
  id: string;
  company_id: string;
  product_id: string;
  bom_code: string;
  name?: string;
  version?: string;
  description?: string;
  output_quantity?: number;
  output_unit?: string;
  production_time_minutes?: number;
  setup_time_minutes?: number;
  status?: 'draft' | 'active' | 'obsolete';
  is_default?: boolean;
  effective_from?: string;
  effective_to?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface BOMItem {
  id: string;
  bom_id: string;
  material_id: string;
  quantity: number;
  unit?: string;
  waste_percent?: number;
  substitute_material_id?: string;
  sequence?: number;
  notes?: string;
  created_at?: string;
}

export interface BOMWithCost extends BOM {
  product_name: string;
  product_sku: string;
  material_cost: number;
  item_count: number;
}

class BOMService {
  private readonly table = 'manufacturing_bom';
  private readonly itemTable = 'manufacturing_bom_items';

  // ===== BOM =====
  async getBOMs(filters?: {
    product_id?: string;
    status?: string;
    is_default?: boolean;
  }) {
    const companyId = await getCompanyId();
    let query = supabase
      .from('manufacturing_bom_with_cost')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.is_default !== undefined) {
      query = query.eq('is_default', filters.is_default);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as BOMWithCost[];
  }

  async getBOM(id: string) {
    const { data, error } = await supabase
      .from('manufacturing_bom_with_cost')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as BOMWithCost;
  }

  async createBOM(bom: Omit<BOM, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'created_by'>) {
    const companyId = await getCompanyId();
    const { data: { user } } = await supabase.auth.getUser();

    // Generate BOM code if not provided
    if (!bom.bom_code) {
      const { count } = await supabase
        .from(this.table)
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      bom.bom_code = `BOM${String((count || 0) + 1).padStart(5, '0')}`;
    }

    const { data, error } = await supabase
      .from(this.table)
      .insert({
        ...bom,
        company_id: companyId,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as BOM;
  }

  async updateBOM(id: string, updates: Partial<BOM>) {
    const { data, error } = await supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as BOM;
  }

  async deleteBOM(id: string) {
    const { error } = await supabase
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async approveBOM(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from(this.table)
      .update({
        status: 'active',
        approved_by: user?.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as BOM;
  }

  async setDefaultBOM(bomId: string, productId: string) {
    const companyId = await getCompanyId();

    // Unset all defaults for this product
    await supabase
      .from(this.table)
      .update({ is_default: false })
      .eq('company_id', companyId)
      .eq('product_id', productId);

    // Set new default
    const { data, error } = await supabase
      .from(this.table)
      .update({ is_default: true })
      .eq('id', bomId)
      .select()
      .single();

    if (error) throw error;
    return data as BOM;
  }

  // ===== BOM ITEMS =====
  async getBOMItems(bomId: string) {
    const { data, error } = await supabase
      .from(this.itemTable)
      .select('*, material:manufacturing_materials(material_code, name, unit, unit_cost), substitute:manufacturing_materials(material_code, name)')
      .eq('bom_id', bomId)
      .order('sequence', { ascending: true });

    if (error) throw error;
    return data as BOMItem[];
  }

  async createBOMItem(item: Omit<BOMItem, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from(this.itemTable)
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data as BOMItem;
  }

  async updateBOMItem(id: string, updates: Partial<BOMItem>) {
    const { data, error } = await supabase
      .from(this.itemTable)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as BOMItem;
  }

  async deleteBOMItem(id: string) {
    const { error } = await supabase
      .from(this.itemTable)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async bulkCreateBOMItems(items: Omit<BOMItem, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from(this.itemTable)
      .insert(items)
      .select();

    if (error) throw error;
    return data as BOMItem[];
  }

  // ===== CALCULATIONS =====
  async calculateBOMCost(bomId: string): Promise<number> {
    const { data, error } = await supabase.rpc('calculate_bom_cost', {
      p_bom_id: bomId
    });

    if (error) throw error;
    return data || 0;
  }

  async calculateMaterialRequirements(bomId: string, quantity: number) {
    const items = await this.getBOMItems(bomId);
    const bom = await this.getBOM(bomId);

    const outputQty = bom.output_quantity || 1;
    const multiplier = quantity / outputQty;

    return items.map(item => ({
      material_id: item.material_id,
      material_name: (item as any).material?.name,
      required_quantity: item.quantity * (1 + (item.waste_percent || 0) / 100) * multiplier,
      unit: item.unit,
      unit_cost: (item as any).material?.unit_cost || 0,
      total_cost: item.quantity * (1 + (item.waste_percent || 0) / 100) * multiplier * ((item as any).material?.unit_cost || 0)
    }));
  }

  // Clone BOM to new version
  async cloneBOM(bomId: string, newVersion: string) {
    const bom = await this.getBOM(bomId);
    const items = await this.getBOMItems(bomId);

    // Create new BOM
    const { id: newBomId, ...bomData } = bom;
    const newBOM = await this.createBOM({
      ...bomData,
      version: newVersion,
      status: 'draft',
      is_default: false,
      approved_by: undefined,
      approved_at: undefined
    });

    // Clone items
    const newItems = items.map(({ id, bom_id, created_at, ...item }) => ({
      ...item,
      bom_id: newBOM.id
    }));

    await this.bulkCreateBOMItems(newItems);

    return newBOM;
  }
}

export const bomService = new BOMService();
