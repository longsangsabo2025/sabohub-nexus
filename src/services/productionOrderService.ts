import { supabase } from '@/lib/supabase';

async function getCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const companyId = user.user_metadata?.company_id;
  if (!companyId) throw new Error('User has no company');
  return companyId;
}

export interface ProductionOrder {
  id: string;
  company_id: string;
  production_number: string;
  name?: string;
  product_id: string;
  bom_id?: string;
  planned_quantity: number;
  actual_quantity?: number;
  rejected_quantity?: number;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  status: 'draft' | 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  planned_cost?: number;
  actual_cost?: number;
  sales_order_id?: string;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ProductionMaterial {
  id: string;
  production_order_id: string;
  material_id: string;
  required_quantity: number;
  issued_quantity?: number;
  returned_quantity?: number;
  consumed_quantity?: number;
  unit?: string;
  unit_cost?: number;
  status?: 'pending' | 'partial' | 'issued' | 'returned';
  notes?: string;
  created_at?: string;
}

export interface ProductionOutput {
  id: string;
  production_order_id: string;
  output_date: string;
  quantity: number;
  rejected_quantity?: number;
  quality_status?: 'pending' | 'passed' | 'failed';
  quality_notes?: string;
  warehouse_id?: string;
  batch_number?: string;
  expiry_date?: string;
  unit_cost?: number;
  recorded_by?: string;
  created_at?: string;
}

class ProductionOrderService {
  private readonly table = 'manufacturing_production_orders';
  private readonly materialTable = 'manufacturing_production_materials';
  private readonly outputTable = 'manufacturing_production_output';

  // ===== PRODUCTION ORDERS =====
  async getProductionOrders(filters?: {
    product_id?: string;
    status?: string;
    priority?: string;
    from_date?: string;
    to_date?: string;
  }) {
    const companyId = await getCompanyId();
    let query = supabase
      .from(this.table)
      .select('*, product:odori_products(name, sku), bom:manufacturing_bom(bom_code, version)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('planned_start_date', { ascending: false });

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.from_date) {
      query = query.gte('planned_start_date', filters.from_date);
    }
    if (filters?.to_date) {
      query = query.lte('planned_end_date', filters.to_date);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as ProductionOrder[];
  }

  async getProductionOrder(id: string) {
    const { data, error } = await supabase
      .from(this.table)
      .select('*, product:odori_products(*), bom:manufacturing_bom(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data as ProductionOrder;
  }

  async createProductionOrder(po: Omit<ProductionOrder, 'id' | 'company_id' | 'production_number' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by'>) {
    const companyId = await getCompanyId();
    const { data: { user } } = await supabase.auth.getUser();

    // Generate production number
    const { data: productionNumber } = await supabase.rpc('generate_production_number', {
      p_company_id: companyId
    });

    const { data, error } = await supabase
      .from(this.table)
      .insert({
        ...po,
        company_id: companyId,
        production_number: productionNumber,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;

    // Create material requirements from BOM
    await supabase.rpc('create_production_materials', {
      p_production_id: data.id
    });

    return data as ProductionOrder;
  }

  async updateProductionOrder(id: string, updates: Partial<ProductionOrder>) {
    const { data, error } = await supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ProductionOrder;
  }

  async deleteProductionOrder(id: string) {
    const { error } = await supabase
      .from(this.table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async approveProductionOrder(id: string) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from(this.table)
      .update({
        status: 'confirmed',
        approved_by: user?.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ProductionOrder;
  }

  async startProduction(id: string) {
    return this.updateProductionOrder(id, {
      status: 'in_progress',
      actual_start_date: new Date().toISOString()
    });
  }

  async completeProduction(id: string) {
    return this.updateProductionOrder(id, {
      status: 'completed',
      actual_end_date: new Date().toISOString()
    });
  }

  async cancelProduction(id: string) {
    return this.updateProductionOrder(id, { status: 'cancelled' });
  }

  // ===== MATERIALS =====
  async getProductionMaterials(productionOrderId: string) {
    const { data, error } = await supabase
      .from(this.materialTable)
      .select('*, material:manufacturing_materials(material_code, name, unit)')
      .eq('production_order_id', productionOrderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as ProductionMaterial[];
  }

  async issueMaterial(materialId: string, quantity: number, notes?: string) {
    const { data, error } = await supabase
      .from(this.materialTable)
      .update({
        issued_quantity: quantity,
        status: 'issued',
        notes
      })
      .eq('id', materialId)
      .select()
      .single();

    if (error) throw error;

    // Record material transaction (issue from inventory)
    // This would integrate with materialService.recordTransaction
    
    return data as ProductionMaterial;
  }

  async returnMaterial(materialId: string, quantity: number, notes?: string) {
    const material = await supabase
      .from(this.materialTable)
      .select('*')
      .eq('id', materialId)
      .single();

    if (!material.data) throw new Error('Material not found');

    const { data, error } = await supabase
      .from(this.materialTable)
      .update({
        returned_quantity: (material.data.returned_quantity || 0) + quantity,
        status: 'returned',
        notes
      })
      .eq('id', materialId)
      .select()
      .single();

    if (error) throw error;
    return data as ProductionMaterial;
  }

  // ===== OUTPUT =====
  async getProductionOutputs(productionOrderId: string) {
    const { data, error } = await supabase
      .from(this.outputTable)
      .select('*')
      .eq('production_order_id', productionOrderId)
      .order('output_date', { ascending: false });

    if (error) throw error;
    return data as ProductionOutput[];
  }

  async recordOutput(output: Omit<ProductionOutput, 'id' | 'created_at' | 'recorded_by'>) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from(this.outputTable)
      .insert({
        ...output,
        recorded_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger will auto-update production order quantities and status
    // Also should add to inventory (finished goods)

    return data as ProductionOutput;
  }

  async updateOutput(id: string, updates: Partial<ProductionOutput>) {
    const { data, error } = await supabase
      .from(this.outputTable)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ProductionOutput;
  }

  async approveOutput(id: string) {
    return this.updateOutput(id, { quality_status: 'passed' });
  }

  async rejectOutput(id: string, notes: string) {
    return this.updateOutput(id, {
      quality_status: 'failed',
      quality_notes: notes
    });
  }

  // ===== STATISTICS =====
  async getProductionStats() {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from(this.table)
      .select('status, priority, planned_quantity, actual_quantity, planned_cost, actual_cost')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (error) throw error;

    const totalOrders = data.length;
    const inProgress = data.filter(po => po.status === 'in_progress').length;
    const completed = data.filter(po => po.status === 'completed').length;
    const planned = data.filter(po => ['draft', 'planned', 'confirmed'].includes(po.status)).length;
    const totalPlannedQty = data.reduce((sum, po) => sum + (po.planned_quantity || 0), 0);
    const totalActualQty = data.reduce((sum, po) => sum + (po.actual_quantity || 0), 0);
    const urgent = data.filter(po => po.priority === 'urgent' && po.status !== 'completed').length;

    return {
      totalOrders,
      inProgress,
      completed,
      planned,
      totalPlannedQty,
      totalActualQty,
      urgent,
      completionRate: totalPlannedQty > 0 ? (totalActualQty / totalPlannedQty) * 100 : 0
    };
  }

  async getProductionSchedule(fromDate: string, toDate: string) {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from(this.table)
      .select('*, product:odori_products(name, sku)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .gte('planned_start_date', fromDate)
      .lte('planned_end_date', toDate)
      .order('planned_start_date', { ascending: true });

    if (error) throw error;
    return data as ProductionOrder[];
  }
}

export const productionOrderService = new ProductionOrderService();
