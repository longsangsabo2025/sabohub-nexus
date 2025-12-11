/**
 * SABO Billiards - React Hooks for Data Management
 * Custom hooks for consistent data access across the web app
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { saboApi } from './api';
import type { 
  SaboCompany, 
  SaboEmployee, 
  SaboTask, 
  SaboCheckin,
  SaboOrder,
  SaboTable
} from './types';

/**
 * Hook to get SABO Billiards company information
 */
export function useSaboCompany() {
  const [company, setCompany] = useState<SaboCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = useCallback(async () => {
    try {
      setLoading(true);
      const response = await saboApi.company.getCompanyInfo();
      
      if (response.success) {
        setCompany(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch company info');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const updateCompany = useCallback(async (updates: Partial<SaboCompany>) => {
    try {
      const response = await saboApi.company.updateCompanyInfo(updates);
      
      if (response.success) {
        setCompany(response.data);
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Update failed' };
    }
  }, []);

  return {
    company,
    loading,
    error,
    refetch: fetchCompany,
    updateCompany
  };
}

/**
 * Hook to get SABO Billiards employees
 */
export function useSaboEmployees() {
  const [employees, setEmployees] = useState<SaboEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await saboApi.employee.getAllEmployees();
      
      if (response.success) {
        setEmployees(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch employees');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const createEmployee = useCallback(async (employeeData: Omit<SaboEmployee, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await saboApi.employee.createEmployee(employeeData);
      
      if (response.success) {
        await fetchEmployees(); // Refresh the list
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Creation failed' };
    }
  }, [fetchEmployees]);

  return {
    employees,
    loading,
    error,
    refetch: fetchEmployees,
    createEmployee
  };
}

/**
 * Hook to get SABO Billiards tasks
 */
export function useSaboTasks(filters?: { status?: string; assignee_id?: string }) {
  const [tasks, setTasks] = useState<SaboTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await saboApi.task.getAllTasks(filters);
      
      if (response.success) {
        setTasks(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch tasks');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async (taskData: Omit<SaboTask, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await saboApi.task.createTask(taskData);
      
      if (response.success) {
        await fetchTasks(); // Refresh the list
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Creation failed' };
    }
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask
  };
}

/**
 * Hook to get today's check-ins
 */
export function useSaboTodayCheckins() {
  const [checkins, setCheckins] = useState<SaboCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCheckins = useCallback(async () => {
    try {
      setLoading(true);
      const response = await saboApi.checkin.getTodayCheckins();
      
      if (response.success) {
        setCheckins(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch check-ins');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  return {
    checkins,
    loading,
    error,
    refetch: fetchCheckins
  };
}

/**
 * Hook to get SABO Billiards tables
 */
export function useSaboTables() {
  const [tables, setTables] = useState<SaboTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const response = await saboApi.table.getAllTables();
      
      if (response.success) {
        setTables(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch tables');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  return {
    data: tables,
    loading,
    error,
    refetch: fetchTables
  };
}

/**
 * Hook to get SABO Billiards orders
 */
export function useSaboOrders(filters?: { status?: string; date?: string }) {
  const [orders, setOrders] = useState<SaboOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await saboApi.order.getAllOrders(filters);
      
      if (response.success) {
        setOrders(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch orders');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders
  };
}

/**
 * Hook for real-time dashboard stats
 */
export function useSaboDashboardStats() {
  const { employees } = useSaboEmployees();
  const { tasks } = useSaboTasks();
  const { checkins } = useSaboTodayCheckins();
  const { orders } = useSaboOrders({ date: new Date().toISOString().split('T')[0] });

  const stats = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(emp => emp.is_active).length,
    todayCheckins: checkins.length,
    pendingTasks: tasks.filter(task => task.status === 'pending').length,
    completedTasks: tasks.filter(task => task.status === 'completed').length,
    todayOrders: orders.length,
    todayRevenue: orders.reduce((sum, order) => sum + order.total_amount, 0)
  };

  return stats;
}