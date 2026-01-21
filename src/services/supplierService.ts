import { supabase } from '@/lib/supabase';

// Helper to get current user's company_id
async function getCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const companyId = user.user_metadata?.company_id;
  if (!companyId) throw new Error('User has no company');
  return companyId;
}

export interface Supplier {
  id: string;
  company_id: string;
  supplier_code: string;
  name: string;
  tax_code?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  address?: string;
  city?: string;
  district?: string;
  payment_terms?: number;
  credit_limit?: number;
  currency?: string;
  category?: 'raw_material' | 'packaging' | 'equipment' | 'service' | 'other';
  is_active?: boolean;
  rating?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface SupplierBalance {
  supplier_id: string;
  company_id: string;
  supplier_name: string;
  credit_limit: number;
  total_outstanding: number;
  available_credit: number;
  overdue_count: number;
}

class SupplierService {
  private readonly table = 'manufacturing_suppliers';

  // List suppliers
  async getSuppliers(filters?: {
    category?: string;
    is_active?: boolean;
    search?: string;
  }) {
    const companyId = await getCompanyId();
    let query = supabase
      .from(this.table)
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,supplier_code.ilike.%${filters.search}%,tax_code.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Supplier[];
  }

  // Get single supplier
  async getSupplier(id: string) {
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data as Supplier;
  }

  // Create supplier
  async createSupplier(supplier: Omit<Supplier, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'deleted_at'>) {
    const companyId = await getCompanyId();

    // Generate supplier code if not provided
    if (!supplier.supplier_code) {
      const { count } = await supabase
        .from(this.table)
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      supplier.supplier_code = `SUP${String((count || 0) + 1).padStart(5, '0')}`;
    }

    const { data, error } = await supabase
      .from(this.table)
      .insert({ ...supplier, company_id: companyId })
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  }

  // Update supplier
  async updateSupplier(id: string, updates: Partial<Supplier>) {
    const { data, error } = await supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  }

  // Soft delete supplier
  async deleteSupplier(id: string) {
    const { error } = await supabase
      .from(this.table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  // Get supplier balance (payables)
  async getSupplierBalance(supplierId?: string) {
    const companyId = await getCompanyId();
    let query = supabase
      .from('manufacturing_supplier_balance')
      .select('*')
      .eq('company_id', companyId);

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as SupplierBalance[];
  }

  // Get supplier statistics
  async getSupplierStats() {
    const companyId = await getCompanyId();

    const { data: suppliers, error } = await supabase
      .from(this.table)
      .select('category, is_active')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (error) throw error;

    const total = suppliers.length;
    const active = suppliers.filter(s => s.is_active).length;
    const byCategory = suppliers.reduce((acc, s) => {
      acc[s.category || 'other'] = (acc[s.category || 'other'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, active, inactive: total - active, byCategory };
  }
}

export const supplierService = new SupplierService();
