import { supabase } from '@/integrations/supabase/client';
import type { Customer, CustomerContact, CustomerVisit } from '@/types/modules';

export interface CreateCustomerInput {
  name: string;
  customer_code?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  latitude?: number;
  longitude?: number;
  customer_type: 'direct' | 'distributor' | 'agent';
  channel?: 'horeca' | 'retail' | 'wholesale';
  segment?: string;
  credit_limit?: number;
  payment_term_days?: number;
  price_list_id?: string;
  assigned_employee_id?: string;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  status?: 'active' | 'inactive' | 'blocked';
}

export interface CustomerFilters {
  status?: string;
  customerType?: string;
  channel?: string;
  assignedEmployeeId?: string;
  search?: string;
  province?: string;
}

class CustomerService {
  private getCompanyId(): string | null {
    // Get company_id from current user session
    // This should be retrieved from auth context in real implementation
    const companyId = localStorage.getItem('company_id');
    return companyId;
  }

  async getAll(filters: CustomerFilters = {}): Promise<Customer[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('customers')
      .select(`
        *,
        employees:assigned_employee_id(id, full_name)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name');

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.customerType) {
      query = query.eq('customer_type', filters.customerType);
    }
    if (filters.channel) {
      query = query.eq('channel', filters.channel);
    }
    if (filters.assignedEmployeeId) {
      query = query.eq('assigned_employee_id', filters.assignedEmployeeId);
    }
    if (filters.province) {
      query = query.eq('province', filters.province);
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,customer_code.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Customer[];
  }

  async getById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        employees:assigned_employee_id(id, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Customer;
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    // Generate customer code if not provided
    let customerCode = input.customer_code;
    if (!customerCode) {
      const prefix = input.customer_type === 'distributor' ? 'NPP' : 
                     input.customer_type === 'agent' ? 'DL' : 'KH';
      const timestamp = Date.now().toString().slice(-6);
      customerCode = `${prefix}${timestamp}`;
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        ...input,
        company_id: companyId,
        customer_code: customerCode,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  }

  async delete(id: string): Promise<void> {
    // Soft delete
    const { error } = await supabase
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async getContacts(customerId: string): Promise<CustomerContact[]> {
    const { data, error } = await supabase
      .from('customer_contacts')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_primary', { ascending: false });

    if (error) throw error;
    return data as CustomerContact[];
  }

  async addContact(customerId: string, contact: Omit<CustomerContact, 'id' | 'customer_id' | 'created_at'>): Promise<CustomerContact> {
    const { data, error } = await supabase
      .from('customer_contacts')
      .insert({
        ...contact,
        customer_id: customerId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as CustomerContact;
  }

  async getVisits(customerId: string): Promise<CustomerVisit[]> {
    const { data, error } = await supabase
      .from('customer_visits')
      .select(`
        *,
        employees:employee_id(id, full_name)
      `)
      .eq('customer_id', customerId)
      .order('visit_date', { ascending: false });

    if (error) throw error;
    return data as CustomerVisit[];
  }

  async recordVisit(visit: Omit<CustomerVisit, 'id' | 'created_at'>): Promise<CustomerVisit> {
    const { data, error } = await supabase
      .from('customer_visits')
      .insert(visit)
      .select()
      .single();

    if (error) throw error;
    return data as CustomerVisit;
  }

  async getStats(companyId?: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    blocked: number;
    byType: Record<string, number>;
    byChannel: Record<string, number>;
  }> {
    const cid = companyId || this.getCompanyId();
    if (!cid) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('customers')
      .select('status, customer_type, channel')
      .eq('company_id', cid)
      .is('deleted_at', null);

    if (error) throw error;

    const stats = {
      total: data.length,
      active: data.filter(c => c.status === 'active').length,
      inactive: data.filter(c => c.status === 'inactive').length,
      blocked: data.filter(c => c.status === 'blocked').length,
      byType: {} as Record<string, number>,
      byChannel: {} as Record<string, number>,
    };

    data.forEach(c => {
      stats.byType[c.customer_type] = (stats.byType[c.customer_type] || 0) + 1;
      if (c.channel) {
        stats.byChannel[c.channel] = (stats.byChannel[c.channel] || 0) + 1;
      }
    });

    return stats;
  }
}

export const customerService = new CustomerService();
