/**
 * Custom React Query hooks for Attendance
 */

import { useQuery } from '@tanstack/react-query';
import { attendanceService, type AttendanceFilters } from '@/services';

// Query keys
export const attendanceKeys = {
  all: ['attendance'] as const,
  lists: () => [...attendanceKeys.all, 'list'] as const,
  list: (filters: AttendanceFilters) => [...attendanceKeys.lists(), filters] as const,
  count: () => [...attendanceKeys.all, 'count'] as const,
};

/**
 * Hook to fetch attendance records with filters
 */
export function useAttendance(filters: AttendanceFilters = {}) {
  return useQuery({
    queryKey: attendanceKeys.list(filters),
    queryFn: () => attendanceService.getAll(filters),
  });
}

/**
 * Hook to fetch attendance count
 */
export function useAttendanceCount() {
  return useQuery({
    queryKey: attendanceKeys.count(),
    queryFn: () => attendanceService.getCount(),
  });
}
