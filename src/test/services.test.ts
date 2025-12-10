/**
 * Unit tests for Services
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tasksService, employeesService, attendanceService } from '@/services';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

describe('tasksService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export getAll method', () => {
    expect(tasksService.getAll).toBeDefined();
    expect(typeof tasksService.getAll).toBe('function');
  });

  it('should export getById method', () => {
    expect(tasksService.getById).toBeDefined();
    expect(typeof tasksService.getById).toBe('function');
  });

  it('should export create method', () => {
    expect(tasksService.create).toBeDefined();
    expect(typeof tasksService.create).toBe('function');
  });

  it('should export update method', () => {
    expect(tasksService.update).toBeDefined();
    expect(typeof tasksService.update).toBe('function');
  });

  it('should export delete method', () => {
    expect(tasksService.delete).toBeDefined();
    expect(typeof tasksService.delete).toBe('function');
  });

  it('should export getRecent method', () => {
    expect(tasksService.getRecent).toBeDefined();
    expect(typeof tasksService.getRecent).toBe('function');
  });

  it('should export getStats method', () => {
    expect(tasksService.getStats).toBeDefined();
    expect(typeof tasksService.getStats).toBe('function');
  });
});

describe('employeesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export getAll method', () => {
    expect(employeesService.getAll).toBeDefined();
    expect(typeof employeesService.getAll).toBe('function');
  });

  it('should export getById method', () => {
    expect(employeesService.getById).toBeDefined();
    expect(typeof employeesService.getById).toBe('function');
  });

  it('should export create method', () => {
    expect(employeesService.create).toBeDefined();
    expect(typeof employeesService.create).toBe('function');
  });

  it('should export update method', () => {
    expect(employeesService.update).toBeDefined();
    expect(typeof employeesService.update).toBe('function');
  });

  it('should export delete method', () => {
    expect(employeesService.delete).toBeDefined();
    expect(typeof employeesService.delete).toBe('function');
  });

  it('should export getStats method', () => {
    expect(employeesService.getStats).toBeDefined();
    expect(typeof employeesService.getStats).toBe('function');
  });
});

describe('attendanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export getAll method', () => {
    expect(attendanceService.getAll).toBeDefined();
    expect(typeof attendanceService.getAll).toBe('function');
  });

  it('should export getCount method', () => {
    expect(attendanceService.getCount).toBeDefined();
    expect(typeof attendanceService.getCount).toBe('function');
  });
});
