import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface RealtimeOptions {
  table: string;
  queryKey: string[];
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

/**
 * Hook to subscribe to realtime changes in Supabase tables
 * Automatically invalidates React Query cache when changes occur
 */
export function useRealtime({ table, queryKey, filter, event = '*' }: RealtimeOptions) {
  const queryClient = useQueryClient();
  const { user, employeeUser } = useAuth();
  const userId = user?.id || employeeUser?.id;

  useEffect(() => {
    if (!userId) return;

    const channelName = `${table}_${queryKey.join('_')}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          ...(filter && { filter }),
        },
        (payload) => {
          console.log(`Realtime update on ${table}:`, payload);
          
          // Invalidate relevant queries to refetch data
          queryClient.invalidateQueries({ queryKey });
          
          // If it's a specific record update, also invalidate detail queries
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            queryClient.invalidateQueries({ 
              queryKey: [...queryKey, payload.new.id as string] 
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, table, queryKey, filter, event, queryClient]);
}

/**
 * Hook for realtime task updates
 */
export function useTaskRealtime() {
  useRealtime({
    table: 'tasks',
    queryKey: ['tasks'],
  });
}

/**
 * Hook for realtime attendance updates
 */
export function useAttendanceRealtime() {
  useRealtime({
    table: 'attendance',
    queryKey: ['attendance'],
  });
}

/**
 * Hook for realtime schedule updates
 */
export function useScheduleRealtime() {
  useRealtime({
    table: 'work_schedules',
    queryKey: ['schedules'],
  });
}

/**
 * Hook for realtime daily reports updates
 */
export function useDailyReportsRealtime() {
  useRealtime({
    table: 'daily_work_reports',
    queryKey: ['daily-reports'],
  });
}

/**
 * Hook for realtime KPI updates
 */
export function useKPIRealtime() {
  useRealtime({
    table: 'kpi_targets',
    queryKey: ['kpi-targets'],
  });
  
  useRealtime({
    table: 'kpi_performance',
    queryKey: ['kpi-performance'],
  });
}

/**
 * Hook for realtime employee updates
 */
export function useEmployeeRealtime() {
  useRealtime({
    table: 'employees',
    queryKey: ['employees'],
  });
}

/**
 * Hook for realtime document updates
 */
export function useDocumentRealtime() {
  useRealtime({
    table: 'documents',
    queryKey: ['documents'],
  });
}
