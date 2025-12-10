/**
 * Custom React Query hooks for Tasks
 * Includes optimistic updates for better UX
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksService, type TaskFilters, type CreateTaskInput, type UpdateTaskInput } from '@/services';
import type { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  recent: (limit?: number) => [...taskKeys.all, 'recent', limit] as const,
  stats: () => [...taskKeys.all, 'stats'] as const,
};

/**
 * Hook to fetch tasks list with filters
 */
export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => tasksService.getAll(filters),
  });
}

/**
 * Hook to fetch a single task by ID
 */
export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => tasksService.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch recent tasks
 */
export function useRecentTasks(limit = 5) {
  return useQuery({
    queryKey: taskKeys.recent(limit),
    queryFn: () => tasksService.getRecent(limit),
  });
}

/**
 * Hook to fetch task statistics
 */
export function useTaskStats() {
  return useQuery({
    queryKey: taskKeys.stats(),
    queryFn: () => tasksService.getStats(),
  });
}

/**
 * Hook to create a task with optimistic update
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksService.create(input),
    
    // Optimistic update
    onMutate: async (newTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(taskKeys.lists());

      // Optimistically add the new task
      queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: Task[] | undefined) => {
        if (!old) return old;
        const optimisticTask: Task = {
          id: `temp-${Date.now()}`,
          title: newTask.title,
          description: newTask.description || null,
          status: newTask.status || 'pending',
          priority: newTask.priority || 'medium',
          category: newTask.category || null,
          company_id: null,
          created_at: new Date().toISOString(),
        };
        return [optimisticTask, ...old];
      });

      return { previousTasks };
    },

    onError: (err, _newTask, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueriesData({ queryKey: taskKeys.lists() }, context.previousTasks);
      }
      toast({
        title: 'Lỗi tạo công việc',
        description: err instanceof Error ? err.message : 'Đã có lỗi xảy ra',
        variant: 'destructive',
      });
    },

    onSuccess: () => {
      toast({
        title: 'Thành công',
        description: 'Đã tạo công việc mới',
      });
    },

    onSettled: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() });
    },
  });
}

/**
 * Hook to update a task with optimistic update
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: UpdateTaskInput) => tasksService.update(input),

    onMutate: async (updatedTask) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousTasks = queryClient.getQueryData(taskKeys.lists());

      // Optimistically update
      queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: Task[] | undefined) => {
        if (!old) return old;
        return old.map((task) =>
          task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        );
      });

      return { previousTasks };
    },

    onError: (err, _updatedTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueriesData({ queryKey: taskKeys.lists() }, context.previousTasks);
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
        description: 'Đã cập nhật công việc',
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Hook to delete a task with optimistic update
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tasksService.delete(id),

    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousTasks = queryClient.getQueryData(taskKeys.lists());

      // Optimistically remove
      queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: Task[] | undefined) => {
        if (!old) return old;
        return old.filter((task) => task.id !== deletedId);
      });

      return { previousTasks };
    },

    onError: (err, _deletedId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueriesData({ queryKey: taskKeys.lists() }, context.previousTasks);
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
        description: 'Đã xóa công việc',
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() });
    },
  });
}
