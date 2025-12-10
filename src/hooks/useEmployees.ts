/**
 * Custom React Query hooks for Employees
 * Includes optimistic updates for better UX
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesService, type EmployeeFilters, type CreateEmployeeInput, type UpdateEmployeeInput } from '@/services';
import type { Employee } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Query keys
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: EmployeeFilters) => [...employeeKeys.lists(), filters] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
  stats: () => [...employeeKeys.all, 'stats'] as const,
};

/**
 * Hook to fetch employees list with filters
 */
export function useEmployees(filters: EmployeeFilters = {}) {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => employeesService.getAll(filters),
  });
}

/**
 * Hook to fetch a single employee by ID
 */
export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeesService.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch employee statistics
 */
export function useEmployeeStats() {
  return useQuery({
    queryKey: employeeKeys.stats(),
    queryFn: () => employeesService.getStats(),
  });
}

/**
 * Hook to create an employee with optimistic update
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => employeesService.create(input),

    onMutate: async (newEmployee) => {
      await queryClient.cancelQueries({ queryKey: employeeKeys.lists() });

      const previousEmployees = queryClient.getQueryData(employeeKeys.lists());

      queryClient.setQueriesData({ queryKey: employeeKeys.lists() }, (old: Employee[] | undefined) => {
        if (!old) return old;
        const optimisticEmployee: Employee = {
          id: `temp-${Date.now()}`,
          email: newEmployee.email,
          full_name: newEmployee.full_name || null,
          role: newEmployee.role || 'staff',
          company_id: null,
          created_at: new Date().toISOString(),
        };
        return [optimisticEmployee, ...old];
      });

      return { previousEmployees };
    },

    onError: (err, _newEmployee, context) => {
      if (context?.previousEmployees) {
        queryClient.setQueriesData({ queryKey: employeeKeys.lists() }, context.previousEmployees);
      }
      toast({
        title: 'Lỗi thêm nhân viên',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra',
        variant: 'destructive',
      });
    },

    onSuccess: () => {
      toast({
        title: 'Thành công',
        description: 'Đã thêm nhân viên mới',
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.stats() });
    },
  });
}

/**
 * Hook to update an employee with optimistic update
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: UpdateEmployeeInput) => employeesService.update(input),

    onMutate: async (updatedEmployee) => {
      await queryClient.cancelQueries({ queryKey: employeeKeys.lists() });

      const previousEmployees = queryClient.getQueryData(employeeKeys.lists());

      queryClient.setQueriesData({ queryKey: employeeKeys.lists() }, (old: Employee[] | undefined) => {
        if (!old) return old;
        return old.map((emp) =>
          emp.id === updatedEmployee.id ? { ...emp, ...updatedEmployee } : emp
        );
      });

      return { previousEmployees };
    },

    onError: (err, _updatedEmployee, context) => {
      if (context?.previousEmployees) {
        queryClient.setQueriesData({ queryKey: employeeKeys.lists() }, context.previousEmployees);
      }
      toast({
        title: 'Lỗi cập nhật',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra',
        variant: 'destructive',
      });
    },

    onSuccess: () => {
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật thông tin nhân viên',
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

/**
 * Hook to delete an employee with optimistic update
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => employeesService.delete(id),

    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: employeeKeys.lists() });

      const previousEmployees = queryClient.getQueryData(employeeKeys.lists());

      queryClient.setQueriesData({ queryKey: employeeKeys.lists() }, (old: Employee[] | undefined) => {
        if (!old) return old;
        return old.filter((emp) => emp.id !== deletedId);
      });

      return { previousEmployees };
    },

    onError: (err, _deletedId, context) => {
      if (context?.previousEmployees) {
        queryClient.setQueriesData({ queryKey: employeeKeys.lists() }, context.previousEmployees);
      }
      toast({
        title: 'Lỗi xóa',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra',
        variant: 'destructive',
      });
    },

    onSuccess: () => {
      toast({
        title: 'Thành công',
        description: 'Đã xóa nhân viên',
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.stats() });
    },
  });
}
