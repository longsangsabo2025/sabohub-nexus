/**
 * SABO Billiards - Supabase API Client
 * Centralized API functions for all SABO Billiards operations
 */

import { supabase } from '@/lib/supabase';
import { SABO_BILLIARDS, SABO_TABLES } from './constants';
import type { 
  SaboCompany, 
  SaboEmployee, 
  SaboUser, 
  SaboTask, 
  SaboTaskTemplate,
  SaboCheckin,
  SaboOrder,
  SaboDocument,
  SaboTable,
  SaboApiResponse,
  SaboListResponse 
} from './types';

/**
 * Company Operations
 */
export const saboCompanyApi = {
  // Get SABO Billiards company info
  async getCompanyInfo(): Promise<SaboApiResponse<SaboCompany>> {
    try {
      const { data, error } = await supabase
        .from(SABO_TABLES.COMPANIES)
        .select('*')
        .eq('id', SABO_BILLIARDS.COMPANY_ID)
        .single();

      if (error) throw error;

      return { data, success: true };
    } catch (error) {
      return { 
        data: {} as SaboCompany, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  // Update company information
  async updateCompanyInfo(updates: Partial<SaboCompany>): Promise<SaboApiResponse<SaboCompany>> {
    try {
      const { data, error } = await supabase
        .from(SABO_TABLES.COMPANIES)
        .update(updates)
        .eq('id', SABO_BILLIARDS.COMPANY_ID)
        .select()
        .single();

      if (error) throw error;

      return { data, success: true, message: 'Company updated successfully' };
    } catch (error) {
      return { 
        data: {} as SaboCompany, 
        success: false, 
        error: error instanceof Error ? error.message : 'Update failed' 
      };
    }
  }
};

/**
 * Employee Operations
 */
export const saboEmployeeApi = {
  // Get all employees
  async getAllEmployees(): Promise<SaboListResponse<SaboEmployee>> {
    try {
      const { data, error, count } = await supabase
        .from(SABO_TABLES.EMPLOYEES)
        .select('*', { count: 'exact' })
        .eq('company_id', SABO_BILLIARDS.COMPANY_ID)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { 
        data: data || [], 
        success: true, 
        total: count || 0,
        page: 1,
        limit: 50
      };
    } catch (error) {
      return { 
        data: [], 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch employees',
        total: 0,
        page: 1,
        limit: 50
      };
    }
  },

  // Get employee by ID
  async getEmployeeById(id: string): Promise<SaboApiResponse<SaboEmployee>> {
    try {
      const { data, error } = await supabase
        .from(SABO_TABLES.EMPLOYEES)
        .select('*')
        .eq('id', id)
        .eq('company_id', SABO_BILLIARDS.COMPANY_ID)
        .single();

      if (error) throw error;

      return { data, success: true };
    } catch (error) {
      return { 
        data: {} as SaboEmployee, 
        success: false, 
        error: error instanceof Error ? error.message : 'Employee not found' 
      };
    }
  },

  // Create new employee
  async createEmployee(employee: Omit<SaboEmployee, 'id' | 'company_id' | 'created_at' | 'updated_at'>): Promise<SaboApiResponse<SaboEmployee>> {
    try {
      const { data, error } = await supabase
        .from(SABO_TABLES.EMPLOYEES)
        .insert({
          ...employee,
          company_id: SABO_BILLIARDS.COMPANY_ID
        })
        .select()
        .single();

      if (error) throw error;

      return { data, success: true, message: 'Employee created successfully' };
    } catch (error) {
      return { 
        data: {} as SaboEmployee, 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create employee' 
      };
    }
  }
};

/**
 * Table Operations
 */
export const saboTableApi = {
  // Get all tables
  async getAllTables(): Promise<SaboListResponse<SaboTable>> {
    try {
      const { data, error, count } = await supabase
        .from(SABO_TABLES.TABLES)
        .select('*', { count: 'exact' })
        .eq('company_id', SABO_BILLIARDS.COMPANY_ID)
        .order('name', { ascending: true });

      if (error) throw error;

      return { 
        data: data || [], 
        success: true, 
        total: count || 0,
        page: 1,
        limit: 50
      };
    } catch (error) {
      return { 
        data: [], 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch tables',
        total: 0,
        page: 1,
        limit: 50
      };
    }
  }
};

/**
 * Task Operations
 */
export const saboTaskApi = {
  // Get all tasks
  async getAllTasks(filters?: { status?: string; assignee_id?: string }): Promise<SaboListResponse<SaboTask>> {
    try {
      let query = supabase
        .from(SABO_TABLES.TASKS)
        .select('*', { count: 'exact' })
        .eq('company_id', SABO_BILLIARDS.COMPANY_ID)
        .is('deleted_at', null);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id);
      }

      const { data, error, count } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return { 
        data: data || [], 
        success: true, 
        total: count || 0,
        page: 1,
        limit: 50
      };
    } catch (error) {
      return { 
        data: [], 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        total: 0,
        page: 1,
        limit: 50
      };
    }
  },

  // Create new task
  async createTask(task: Omit<SaboTask, 'id' | 'company_id' | 'created_at' | 'updated_at'>): Promise<SaboApiResponse<SaboTask>> {
    try {
      const { data, error } = await supabase
        .from(SABO_TABLES.TASKS)
        .insert({
          ...task,
          company_id: SABO_BILLIARDS.COMPANY_ID
        })
        .select()
        .single();

      if (error) throw error;

      return { data, success: true, message: 'Task created successfully' };
    } catch (error) {
      return { 
        data: {} as SaboTask, 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create task' 
      };
    }
  }
};

/**
 * Check-in Operations
 */
export const saboCheckinApi = {
  // Get today's check-ins
  async getTodayCheckins(): Promise<SaboListResponse<SaboCheckin>> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      const { data, error, count } = await supabase
        .from(SABO_TABLES.CHECKINS)
        .select('*', { count: 'exact' })
        .eq('company_id', SABO_BILLIARDS.COMPANY_ID)
        .gte('check_in_time', startOfDay.toISOString())
        .lte('check_in_time', endOfDay.toISOString())
        .order('check_in_time', { ascending: false });

      if (error) throw error;

      return { 
        data: data || [], 
        success: true, 
        total: count || 0,
        page: 1,
        limit: 50
      };
    } catch (error) {
      return { 
        data: [], 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch check-ins',
        total: 0,
        page: 1,
        limit: 50
      };
    }
  }
};

/**
 * Order Operations
 */
export const saboOrderApi = {
  // Get all orders
  async getAllOrders(filters?: { status?: string; date?: string }): Promise<SaboListResponse<SaboOrder>> {
    try {
      let query = supabase
        .from(SABO_TABLES.ORDERS)
        .select('*', { count: 'exact' })
        .eq('company_id', SABO_BILLIARDS.COMPANY_ID);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.date) {
        query = query.gte('created_at', `${filters.date}T00:00:00`)
                    .lte('created_at', `${filters.date}T23:59:59`);
      }

      const { data, error, count } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return { 
        data: data || [], 
        success: true, 
        total: count || 0,
        page: 1,
        limit: 50
      };
    } catch (error) {
      return { 
        data: [], 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
        total: 0,
        page: 1,
        limit: 50
      };
    }
  }
};

// Export all APIs
export const saboApi = {
  company: saboCompanyApi,
  employee: saboEmployeeApi,
  table: saboTableApi,
  task: saboTaskApi,
  checkin: saboCheckinApi,
  order: saboOrderApi
};

export default saboApi;