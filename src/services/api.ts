/**
 * API Service Layer for SABOHUB Nexus
 * Abstracts Supabase queries for cleaner component code
 */

import { supabase } from '@/lib/supabase';
import type { Task, Employee, Attendance } from '@/types';

// ============================================
// TASKS SERVICE
// ============================================

export interface TaskFilters {
  status?: string;
  priority?: string;
  limit?: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  category?: string;
  due_date?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
}

export const tasksService = {
  async getAll(filters: TaskFilters = {}) {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query.limit(filters.limit || 50);

    if (error) throw error;
    return (data || []) as Task[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Task;
  },

  async create(input: CreateTaskInput) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: input.title,
        description: input.description || null,
        status: input.status || 'pending',
        priority: input.priority || 'medium',
        category: input.category || 'other',
        due_date: input.due_date || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  async update(input: UpdateTaskInput) {
    const { id, ...updates } = input;
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  async delete(id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },

  async getRecent(limit = 5) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as Task[];
  },

  async getStats() {
    const { data, error } = await supabase
      .from('tasks')
      .select('status, priority, created_at');

    if (error) throw error;

    const statusCounts = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
    const priorityCounts = { low: 0, medium: 0, high: 0, urgent: 0 };

    data?.forEach((task) => {
      if (task.status in statusCounts) {
        statusCounts[task.status as keyof typeof statusCounts]++;
      }
      if (task.priority in priorityCounts) {
        priorityCounts[task.priority as keyof typeof priorityCounts]++;
      }
    });

    return { statusCounts, priorityCounts, total: data?.length || 0 };
  },
};

// ============================================
// EMPLOYEES SERVICE
// ============================================

export interface EmployeeFilters {
  search?: string;
  role?: string;
  limit?: number;
}

export interface CreateEmployeeInput {
  email: string;
  full_name?: string;
  role?: Employee['role'];
}

export interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {
  id: string;
}

export const employeesService = {
  async getAll(filters: EmployeeFilters = {}) {
    let query = supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.search?.trim()) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }

    if (filters.role && filters.role !== 'all') {
      query = query.eq('role', filters.role);
    }

    const { data, error } = await query.limit(filters.limit || 100);

    if (error) throw error;
    return (data || []) as Employee[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Employee;
  },

  async create(input: CreateEmployeeInput) {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        email: input.email,
        full_name: input.full_name || null,
        role: input.role || 'staff',
      })
      .select()
      .single();

    if (error) throw error;
    return data as Employee;
  },

  async update(input: UpdateEmployeeInput) {
    const { id, ...updates } = input;
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Employee;
  },

  async delete(id: string) {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) throw error;
  },

  async getStats() {
    const { data, error } = await supabase.from('employees').select('role');

    if (error) throw error;

    const roleCounts = { ceo: 0, manager: 0, shift_leader: 0, staff: 0 };

    data?.forEach((emp) => {
      if (emp.role in roleCounts) {
        roleCounts[emp.role as keyof typeof roleCounts]++;
      }
    });

    return { roleCounts, total: data?.length || 0 };
  },
};

// ============================================
// ATTENDANCE SERVICE
// ============================================

export interface AttendanceFilters {
  employee_id?: string;
  date?: string;
  limit?: number;
}

export const attendanceService = {
  async getAll(filters: AttendanceFilters = {}) {
    let query = supabase
      .from('attendance')
      .select('*')
      .order('check_in_time', { ascending: false });

    if (filters.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }

    const { data: attendanceData, error } = await query.limit(filters.limit || 50);
    
    if (error) throw error;
    if (!attendanceData || attendanceData.length === 0) return { data: [], error: null };

    // Manual join
    const employeeIds = [...new Set(attendanceData.map((a: any) => a.employee_id).filter(Boolean))];
    
    if (employeeIds.length > 0) {
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name, email')
        .in('id', employeeIds);
        
      if (employeesData) {
        const empMap = new Map(employeesData.map((e: any) => [e.id, e]));
        const joinedData = attendanceData.map((record: any) => ({
          ...record,
          employees: record.employee_id ? empMap.get(record.employee_id) : null
        }));
        return { data: joinedData, error: null };
      }
    }

    return { data: attendanceData, error: null };
  },

  async getCount() {
    const { count, error } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  },
};

// ============================================
// DASHBOARD SERVICE
// ============================================

export const dashboardService = {
  async getStats() {
    const [employeeStats, taskStats, attendanceCount] = await Promise.all([
      employeesService.getStats(),
      tasksService.getStats(),
      attendanceService.getCount(),
    ]);

    return {
      totalEmployees: employeeStats.total,
      totalTasks: taskStats.total,
      totalAttendance: attendanceCount,
      tasksByStatus: taskStats.statusCounts,
      tasksByPriority: taskStats.priorityCounts,
      employeesByRole: employeeStats.roleCounts,
    };
  },
};
