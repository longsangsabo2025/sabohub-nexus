/**
 * Unit tests for custom hooks
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import hooks
import { taskKeys } from '@/hooks/useTasks';
import { employeeKeys } from '@/hooks/useEmployees';
import { attendanceKeys } from '@/hooks/useAttendance';
import { dashboardKeys } from '@/hooks/useDashboard';

// Mock services
vi.mock('@/services', () => ({
  tasksService: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    getRecent: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue({ statusCounts: {}, priorityCounts: {}, total: 0 }),
  },
  employeesService: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({ roleCounts: {}, total: 0 }),
  },
  attendanceService: {
    getAll: vi.fn().mockResolvedValue([]),
    getCount: vi.fn().mockResolvedValue(0),
  },
  dashboardService: {
    getStats: vi.fn().mockResolvedValue({
      totalEmployees: 0,
      totalTasks: 0,
      totalAttendance: 0,
    }),
  },
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Query Keys', () => {
  describe('taskKeys', () => {
    it('should generate correct base key', () => {
      expect(taskKeys.all).toEqual(['tasks']);
    });

    it('should generate correct lists key', () => {
      expect(taskKeys.lists()).toEqual(['tasks', 'list']);
    });

    it('should generate correct list key with filters', () => {
      const filters = { status: 'pending' };
      expect(taskKeys.list(filters)).toEqual(['tasks', 'list', filters]);
    });

    it('should generate correct detail key', () => {
      expect(taskKeys.detail('123')).toEqual(['tasks', 'detail', '123']);
    });

    it('should generate correct stats key', () => {
      expect(taskKeys.stats()).toEqual(['tasks', 'stats']);
    });

    it('should generate correct recent key', () => {
      expect(taskKeys.recent(5)).toEqual(['tasks', 'recent', 5]);
    });
  });

  describe('employeeKeys', () => {
    it('should generate correct base key', () => {
      expect(employeeKeys.all).toEqual(['employees']);
    });

    it('should generate correct lists key', () => {
      expect(employeeKeys.lists()).toEqual(['employees', 'list']);
    });

    it('should generate correct list key with filters', () => {
      const filters = { role: 'staff' };
      expect(employeeKeys.list(filters)).toEqual(['employees', 'list', filters]);
    });

    it('should generate correct detail key', () => {
      expect(employeeKeys.detail('456')).toEqual(['employees', 'detail', '456']);
    });

    it('should generate correct stats key', () => {
      expect(employeeKeys.stats()).toEqual(['employees', 'stats']);
    });
  });

  describe('attendanceKeys', () => {
    it('should generate correct base key', () => {
      expect(attendanceKeys.all).toEqual(['attendance']);
    });

    it('should generate correct lists key', () => {
      expect(attendanceKeys.lists()).toEqual(['attendance', 'list']);
    });

    it('should generate correct count key', () => {
      expect(attendanceKeys.count()).toEqual(['attendance', 'count']);
    });
  });

  describe('dashboardKeys', () => {
    it('should generate correct base key', () => {
      expect(dashboardKeys.all).toEqual(['dashboard']);
    });

    it('should generate correct stats key', () => {
      expect(dashboardKeys.stats()).toEqual(['dashboard', 'stats']);
    });
  });
});

describe('Type exports', () => {
  it('should export Task type from types', async () => {
    const types = await import('@/types');
    expect(types).toBeDefined();
  });
});
