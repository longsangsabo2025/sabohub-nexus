/**
 * SABO Billiards - TypeScript Types & Interfaces
 * Shared types between mobile app and web app
 */

import { SABO_ROLES, SABO_OPERATIONS } from './constants';

// Base Company Information
export interface SaboCompany {
  id: string;
  name: string;
  business_type: string;
  address: string;
  check_in_latitude: number;
  check_in_longitude: number;
  check_in_radius: number;
  created_at: string;
  updated_at: string;
}

// Employee/User Information
export interface SaboEmployee {
  id: string;
  company_id: string;
  name: string;
  full_name?: string;
  email: string;
  username?: string;
  role: keyof typeof SABO_ROLES;
  phone?: string;
  is_active: boolean;
  hired_date?: string;
  created_at: string;
  updated_at: string;
}

export interface SaboUser {
  id: string;
  email: string;
  role: keyof typeof SABO_ROLES;
  company_id: string;
  profile?: {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
  };
  created_at: string;
  last_sign_in_at?: string;
}

export interface SaboTable {
  id: string;
  company_id: string;
  name: string;
  status: 'available' | 'occupied' | 'maintenance';
  hourly_rate: number;
  created_at: string;
  updated_at: string;
}

// Task Management
export interface SaboTask {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  creator_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  completed_at?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SaboTaskTemplate {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  category: string;
  estimated_duration?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Check-in System
export interface SaboCheckin {
  id: string;
  employee_id: string;
  company_id: string;
  check_in_time: string;
  check_out_time?: string;
  latitude: number;
  longitude: number;
  is_valid: boolean;
  notes?: string;
  created_at: string;
}

// Order Management
export interface SaboOrder {
  id: string;
  company_id: string;
  customer_name?: string;
  customer_phone?: string;
  items: SaboOrderItem[];
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SaboOrderItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: keyof typeof SABO_OPERATIONS.SERVICES;
}

// Document Management
export interface SaboDocument {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  file_url?: string;
  file_type?: string;
  category: string;
  uploaded_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Business Analytics
export interface SaboAnalytics {
  daily_revenue: number;
  daily_orders: number;
  active_employees: number;
  table_utilization: number;
  customer_satisfaction: number;
  date: string;
}

// API Response Types
export interface SaboApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface SaboListResponse<T> extends SaboApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}