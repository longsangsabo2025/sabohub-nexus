import { z } from 'zod';

// Task validation schemas
export const taskSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống').max(200, 'Tiêu đề quá dài'),
  description: z.string().max(1000, 'Mô tả quá dài').optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.string(),
  due_date: z.string().optional(),
});

export type TaskFormData = z.infer<typeof taskSchema>;

// Employee validation schemas
export const employeeSchema = z.object({
  full_name: z.string().min(1, 'Họ và tên không được để trống').max(100, 'Tên quá dài'),
  email: z.string().email('Email không hợp lệ'),
  role: z.enum(['ceo', 'manager', 'shift_leader', 'staff']),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export const signupSchema = z.object({
  full_name: z.string().min(1, 'Họ và tên không được để trống'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;

