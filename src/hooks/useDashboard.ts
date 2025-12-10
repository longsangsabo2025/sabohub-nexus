/**
 * Custom React Query hook for Dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
};

/**
 * Hook to fetch all dashboard statistics in one call
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => dashboardService.getStats(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
