// Database entity types for SABOHUB Nexus
// These types match the actual Supabase schema

export interface Employee {
  id: string;
  company_id: string | null;
  email: string;
  full_name: string | null;
  name?: string; // Alternative column name
  role: 'ceo' | 'manager' | 'shift_leader' | 'staff';
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  company_id: string | null;
  branch_id?: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string | null;
  assigned_to?: string | null;
  assignee_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
  due_date?: string | null;
  deadline?: string | null;
}

export interface Attendance {
  id: string;
  employee_id: string;
  check_in_time: string;
  check_out_time?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  break_start_time?: string | null;
  break_end_time?: string | null;
  total_break_minutes?: number;
  status?: 'present' | 'absent' | 'late' | 'left_early' | 'on_break' | 'on_leave';
  created_at: string;
  employees?: Employee | null;
}

export interface Company {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// ========== SHIFT/SCHEDULE TYPES ==========
export type ShiftType = 'morning' | 'afternoon' | 'night' | 'full';
export type ScheduleStatus = 'scheduled' | 'confirmed' | 'absent' | 'late' | 'cancelled';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Schedule {
  id: string;
  employee_id: string;
  employee_name?: string;
  company_id: string;
  date: string;
  shift_type: ShiftType;
  custom_start_time?: string | null;
  custom_end_time?: string | null;
  status: ScheduleStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  employees?: Employee | null;
}

export interface ShiftSwapRequest {
  id: string;
  requester_id: string;
  target_id: string;
  schedule_id: string;
  reason?: string | null;
  status: RequestStatus;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
}

// Shift configuration
export const SHIFT_CONFIG: Record<ShiftType, { label: string; startTime: string; endTime: string; color: string }> = {
  morning: { label: 'Ca sáng', startTime: '06:00', endTime: '14:00', color: '#FFEB3B' },
  afternoon: { label: 'Ca chiều', startTime: '14:00', endTime: '22:00', color: '#2196F3' },
  night: { label: 'Ca đêm', startTime: '22:00', endTime: '06:00', color: '#9C27B0' },
  full: { label: 'Ca full', startTime: '08:00', endTime: '17:00', color: '#4CAF50' },
};

// ========== DAILY WORK REPORT TYPES ==========
export interface DailyWorkReport {
  id: string;
  employee_id: string;
  employee_name?: string;
  company_id: string;
  report_date: string;
  tasks_completed: number;
  tasks_total: number;
  achievements?: string | null;
  challenges?: string | null;
  tomorrow_plan?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  total_work_hours?: number;
  status: 'draft' | 'submitted' | 'reviewed';
  reviewed_by?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
  employees?: Employee | null;
}

// ========== KPI TYPES ==========
export type KPIMetricType = 'completion_rate' | 'quality_score' | 'timeliness' | 'attendance_rate' | 'custom';
export type KPIPeriod = 'daily' | 'weekly' | 'monthly';

export interface KPITarget {
  id: string;
  user_id?: string | null;
  role?: string | null;
  metric_name: string;
  metric_type: KPIMetricType;
  target_value: number;
  period: KPIPeriod;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KPIResult {
  id: string;
  user_id: string;
  target_id: string;
  actual_value: number;
  period_start: string;
  period_end: string;
  achievement_rate: number; // percentage
  created_at: string;
}

// Type guards
export function isEmployee(obj: unknown): obj is Employee {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'email' in obj;
}

export function isTask(obj: unknown): obj is Task {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'title' in obj;
}
