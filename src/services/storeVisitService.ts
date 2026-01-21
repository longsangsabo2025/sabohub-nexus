import { supabase } from '@/lib/supabase';
import type {
  VisitChecklist,
  StoreVisit,
  StoreInventoryCheck,
  CompetitorTracking,
  POSMaterial,
  POSMaterialDeployment,
  CreateChecklistInput,
  CreateStoreVisitInput,
  CompleteStoreVisitInput,
  AddInventoryCheckInput,
  AddCompetitorInput,
  CreatePOSMaterialInput,
  DeployPOSMaterialInput,
  VisitFilters,
  ChecklistFilters,
} from '@/types/storeVisit';

class StoreVisitService {
  private getCompanyId(): string | null {
    return localStorage.getItem('company_id');
  }

  private getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  // ========== VISIT CHECKLISTS ==========

  async getAllChecklists(filters: ChecklistFilters = {}): Promise<VisitChecklist[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('visit_checklists')
      .select('*')
      .eq('company_id', companyId);

    if (filters.channel) {
      query = query.or(`channel.eq.${filters.channel},channel.eq.all`);
    }
    if (filters.customer_type) {
      query = query.or(`customer_type.eq.${filters.customer_type},customer_type.eq.all`);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getChecklistById(id: string): Promise<VisitChecklist | null> {
    const { data, error } = await supabase
      .from('visit_checklists')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createChecklist(input: CreateChecklistInput): Promise<VisitChecklist> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    const checklistCode = await this.generateChecklistCode();

    // Add IDs to checklist items
    const itemsWithIds = input.items.map(item => ({
      ...item,
      id: crypto.randomUUID(),
    }));

    const { data, error } = await supabase
      .from('visit_checklists')
      .insert({
        company_id: companyId,
        checklist_code: checklistCode,
        checklist_name: input.checklist_name,
        description: input.description,
        channel: input.channel || 'all',
        customer_type: input.customer_type || 'all',
        items: itemsWithIds,
        max_score: input.max_score || 100,
        passing_score: input.passing_score || 70,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateChecklist(id: string, input: Partial<CreateChecklistInput>): Promise<VisitChecklist> {
    const updateData: any = {};
    
    if (input.checklist_name) updateData.checklist_name = input.checklist_name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.channel) updateData.channel = input.channel;
    if (input.customer_type) updateData.customer_type = input.customer_type;
    if (input.max_score !== undefined) updateData.max_score = input.max_score;
    if (input.passing_score !== undefined) updateData.passing_score = input.passing_score;
    
    if (input.items) {
      updateData.items = input.items.map(item => ({
        ...item,
        id: item.id || crypto.randomUUID(),
      }));
      updateData.version = supabase.sql`version + 1`;
    }

    const { data, error } = await supabase
      .from('visit_checklists')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteChecklist(id: string): Promise<void> {
    const { error } = await supabase
      .from('visit_checklists')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  private async generateChecklistCode(): Promise<string> {
    const companyId = this.getCompanyId();
    const { data } = await supabase
      .from('visit_checklists')
      .select('checklist_code')
      .eq('company_id', companyId!)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastCode = data?.[0]?.checklist_code;
    const lastNumber = lastCode ? parseInt(lastCode.replace('CL', '')) : 0;
    return `CL${String(lastNumber + 1).padStart(4, '0')}`;
  }

  // ========== STORE VISITS ==========

  async getAllVisits(filters: VisitFilters = {}): Promise<StoreVisit[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('store_visits')
      .select(`
        *,
        customer:customer_id(id, name, code, address),
        sales_rep:sales_rep_id(id, display_name),
        supervisor:supervisor_id(id, display_name)
      `)
      .eq('company_id', companyId);

    if (filters.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }
    if (filters.sales_rep_id) {
      query = query.eq('sales_rep_id', filters.sales_rep_id);
    }
    if (filters.supervisor_id) {
      query = query.eq('supervisor_id', filters.supervisor_id);
    }
    if (filters.visit_type) {
      query = query.eq('visit_type', filters.visit_type);
    }
    if (filters.from_date) {
      query = query.gte('visit_date', filters.from_date);
    }
    if (filters.to_date) {
      query = query.lte('visit_date', filters.to_date);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.requires_followup !== undefined) {
      query = query.eq('requires_followup', filters.requires_followup);
    }

    const { data, error } = await query.order('visit_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getVisitById(id: string): Promise<StoreVisit | null> {
    const { data, error } = await supabase
      .from('store_visits')
      .select(`
        *,
        customer:customer_id(id, name, code, address, phone),
        sales_rep:sales_rep_id(id, display_name, email),
        supervisor:supervisor_id(id, display_name),
        checklist:checklist_id(id, checklist_name, items, max_score)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createVisit(input: CreateStoreVisitInput): Promise<StoreVisit> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    const { data: visitNumber, error: rpcError } = await supabase
      .rpc('generate_visit_number', { p_company_id: companyId });

    if (rpcError) throw rpcError;

    const { data, error } = await supabase
      .from('store_visits')
      .insert({
        company_id: companyId,
        visit_number: visitNumber,
        visit_date: input.visit_date,
        customer_id: input.customer_id,
        store_name: input.store_name,
        store_address: input.store_address,
        sales_rep_id: input.sales_rep_id,
        supervisor_id: input.supervisor_id,
        journey_plan_id: input.journey_plan_id,
        checkin_id: input.checkin_id,
        visit_type: input.visit_type || 'routine',
        visit_purpose: input.visit_purpose,
        checklist_id: input.checklist_id,
        start_time: input.start_time,
        status: 'in_progress',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async completeVisit(id: string, input: CompleteStoreVisitInput): Promise<StoreVisit> {
    // Calculate duration
    const { data: visit } = await supabase
      .from('store_visits')
      .select('start_time, checklist_id, checklist:checklist_id(max_score)')
      .eq('id', id)
      .single();

    let durationMinutes;
    if (visit) {
      const startDate = new Date(visit.start_time);
      const endDate = new Date(input.end_time);
      durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    }

    // Calculate checklist score
    let score, maxScore, passed;
    if (input.checklist_responses && visit?.checklist) {
      const checklist = visit.checklist as any;
      maxScore = checklist.max_score;
      score = this.calculateChecklistScore(checklist.items, input.checklist_responses);
      passed = score >= (checklist.passing_score || 70);
    }

    const { data, error } = await supabase
      .from('store_visits')
      .update({
        end_time: input.end_time,
        duration_minutes: durationMinutes,
        checklist_responses: input.checklist_responses,
        checklist_score: score,
        checklist_max_score: maxScore,
        checklist_passed: passed,
        photos: input.photos || [],
        observations: input.observations,
        issues: input.issues,
        recommendations: input.recommendations,
        requires_followup: input.requires_followup || false,
        followup_date: input.followup_date,
        followup_notes: input.followup_notes,
        status: 'completed',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private calculateChecklistScore(items: any[], responses: Record<string, any>): number {
    let totalScore = 0;
    
    items.forEach(item => {
      const response = responses[item.id];
      if (response !== undefined && item.scoring) {
        const score = item.scoring[String(response)] || 0;
        totalScore += score;
      }
    });

    return totalScore;
  }

  async cancelVisit(id: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('store_visits')
      .update({
        status: 'cancelled',
        issues: reason,
      })
      .eq('id', id);

    if (error) throw error;
  }

  // ========== INVENTORY CHECKS ==========

  async getInventoryChecks(visitId: string): Promise<StoreInventoryCheck[]> {
    const { data, error } = await supabase
      .from('store_inventory_checks')
      .select(`
        *,
        product:product_id(id, name, sku, unit)
      `)
      .eq('store_visit_id', visitId);

    if (error) throw error;
    return data || [];
  }

  async addInventoryCheck(visitId: string, input: AddInventoryCheckInput): Promise<StoreInventoryCheck> {
    const { data, error } = await supabase
      .from('store_inventory_checks')
      .insert({
        store_visit_id: visitId,
        product_id: input.product_id,
        shelf_stock: input.shelf_stock,
        back_stock: input.back_stock,
        is_out_of_stock: input.is_out_of_stock || false,
        is_low_stock: input.is_low_stock || false,
        is_expired: input.is_expired || false,
        expiry_date: input.expiry_date,
        has_shelf_space: input.has_shelf_space !== undefined ? input.has_shelf_space : true,
        shelf_position: input.shelf_position,
        shelf_share: input.shelf_share,
        current_price: input.current_price,
        competitor_price: input.competitor_price,
        price_difference: input.competitor_price && input.current_price 
          ? input.current_price - input.competitor_price 
          : undefined,
        on_promotion: input.on_promotion || false,
        promotion_details: input.promotion_details,
        photo_url: input.photo_url,
        notes: input.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ========== COMPETITOR TRACKING ==========

  async getCompetitorTracking(visitId: string): Promise<CompetitorTracking[]> {
    const { data, error } = await supabase
      .from('competitor_tracking')
      .select('*')
      .eq('store_visit_id', visitId);

    if (error) throw error;
    return data || [];
  }

  async addCompetitorTracking(visitId: string, input: AddCompetitorInput): Promise<CompetitorTracking> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('competitor_tracking')
      .insert({
        company_id: companyId,
        store_visit_id: visitId,
        competitor_name: input.competitor_name,
        competitor_brand: input.competitor_brand,
        competitor_product: input.competitor_product,
        product_category: input.product_category,
        product_description: input.product_description,
        package_size: input.package_size,
        price: input.price,
        currency: 'VND',
        shelf_position: input.shelf_position,
        shelf_share: input.shelf_share,
        display_type: input.display_type,
        has_promotion: input.has_promotion || false,
        promotion_type: input.promotion_type,
        promotion_details: input.promotion_details,
        stock_level: input.stock_level,
        photos: input.photos || [],
        threat_level: input.threat_level,
        notes: input.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ========== POS MATERIALS ==========

  async getAllPOSMaterials(): Promise<POSMaterial[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('pos_materials')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('material_name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createPOSMaterial(input: CreatePOSMaterialInput): Promise<POSMaterial> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    const materialCode = await this.generateMaterialCode();

    const { data, error } = await supabase
      .from('pos_materials')
      .insert({
        company_id: companyId,
        material_code: materialCode,
        material_name: input.material_name,
        material_type: input.material_type,
        description: input.description,
        size: input.size,
        quantity_in_stock: input.quantity_in_stock || 0,
        cost_per_unit: input.cost_per_unit,
        photo_url: input.photo_url,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deployPOSMaterial(visitId: string, input: DeployPOSMaterialInput): Promise<POSMaterialDeployment> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('pos_material_deployments')
      .insert({
        company_id: companyId,
        store_visit_id: visitId,
        material_id: input.material_id,
        quantity_deployed: input.quantity_deployed,
        placement_location: input.placement_location,
        condition: input.condition || 'new',
        before_photo_url: input.before_photo_url,
        after_photo_url: input.after_photo_url,
        deployed_by: userId,
        deployed_at: new Date().toISOString(),
        next_check_date: input.next_check_date,
        notes: input.notes,
      })
      .select()
      .single();

    if (error) throw error;

    // Update POS material stock
    await supabase
      .from('pos_materials')
      .update({
        quantity_in_stock: supabase.sql`quantity_in_stock - ${input.quantity_deployed}`,
      })
      .eq('id', input.material_id);

    return data;
  }

  async getPOSDeployments(visitId: string): Promise<POSMaterialDeployment[]> {
    const { data, error } = await supabase
      .from('pos_material_deployments')
      .select(`
        *,
        material:material_id(id, material_name, material_type)
      `)
      .eq('store_visit_id', visitId);

    if (error) throw error;
    return data || [];
  }

  private async generateMaterialCode(): Promise<string> {
    const companyId = this.getCompanyId();
    const { data } = await supabase
      .from('pos_materials')
      .select('material_code')
      .eq('company_id', companyId!)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastCode = data?.[0]?.material_code;
    const lastNumber = lastCode ? parseInt(lastCode.replace('POS', '')) : 0;
    return `POS${String(lastNumber + 1).padStart(5, '0')}`;
  }
}

export const storeVisitService = new StoreVisitService();
