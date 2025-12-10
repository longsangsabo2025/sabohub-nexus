/**
 * Unit tests for Types
 */

import { describe, it, expect } from 'vitest';
import type { Task, Employee, Attendance, Company } from '@/types';
import { isEmployee, isTask } from '@/types';

describe('Type definitions', () => {
  describe('Task type', () => {
    it('should accept valid task object', () => {
      const task: Task = {
        id: '1',
        company_id: null,
        title: 'Test Task',
        description: 'Description',
        status: 'pending',
        priority: 'medium',
        category: 'other',
        created_at: '2025-01-01T00:00:00Z',
      };
      expect(task.id).toBe('1');
      expect(task.status).toBe('pending');
    });

    it('should allow all status values', () => {
      const statuses: Task['status'][] = ['pending', 'in_progress', 'completed', 'cancelled'];
      expect(statuses.length).toBe(4);
    });

    it('should allow all priority values', () => {
      const priorities: Task['priority'][] = ['low', 'medium', 'high', 'urgent'];
      expect(priorities.length).toBe(4);
    });
  });

  describe('Employee type', () => {
    it('should accept valid employee object', () => {
      const employee: Employee = {
        id: '1',
        company_id: null,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'staff',
        created_at: '2025-01-01T00:00:00Z',
      };
      expect(employee.id).toBe('1');
      expect(employee.role).toBe('staff');
    });

    it('should allow all role values', () => {
      const roles: Employee['role'][] = ['ceo', 'manager', 'shift_leader', 'staff'];
      expect(roles.length).toBe(4);
    });
  });

  describe('Attendance type', () => {
    it('should accept valid attendance object', () => {
      const attendance: Attendance = {
        id: '1',
        employee_id: '123',
        check_in_time: '2025-01-01T08:00:00Z',
        check_out_time: '2025-01-01T17:00:00Z',
        location: 'Office',
        created_at: '2025-01-01T08:00:00Z',
      };
      expect(attendance.id).toBe('1');
      expect(attendance.employee_id).toBe('123');
    });

    it('should allow null check_out_time', () => {
      const attendance: Attendance = {
        id: '1',
        employee_id: '123',
        check_in_time: '2025-01-01T08:00:00Z',
        check_out_time: null,
        created_at: '2025-01-01T08:00:00Z',
      };
      expect(attendance.check_out_time).toBeNull();
    });
  });
});

describe('Type guards', () => {
  describe('isEmployee', () => {
    it('should return true for valid employee object', () => {
      const obj = { id: '1', email: 'test@example.com' };
      expect(isEmployee(obj)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isEmployee(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isEmployee(undefined)).toBe(false);
    });

    it('should return false for object without id', () => {
      expect(isEmployee({ email: 'test@example.com' })).toBe(false);
    });

    it('should return false for object without email', () => {
      expect(isEmployee({ id: '1' })).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isEmployee('string')).toBe(false);
      expect(isEmployee(123)).toBe(false);
      expect(isEmployee([])).toBe(false);
    });
  });

  describe('isTask', () => {
    it('should return true for valid task object', () => {
      const obj = { id: '1', title: 'Test Task' };
      expect(isTask(obj)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isTask(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isTask(undefined)).toBe(false);
    });

    it('should return false for object without id', () => {
      expect(isTask({ title: 'Test' })).toBe(false);
    });

    it('should return false for object without title', () => {
      expect(isTask({ id: '1' })).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isTask('string')).toBe(false);
      expect(isTask(123)).toBe(false);
    });
  });
});
