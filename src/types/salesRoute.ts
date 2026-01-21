// Types for Sales Route Management Module
// Matches database schema from migration 035

export interface SalesRoute {
  id: string;
  company_id: string;
  route_code: string;
  route_name: string;
  description?: string;
  assigned_to?: string;
  backup_rep?: string;
  region?: string;
  territory?: string;
  channel?: 'gt' | 'mt' | 'horeca';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  visit_days: string[]; // ['monday', 'wednesday', 'friday']
  total_customers: number;
  active_customers: number;
  estimated_duration_minutes?: number;
  total_distance_km?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface RouteCustomer {
  id: string;
  route_id: string;
  customer_id: string;
  visit_sequence: number;
  preferred_visit_time?: string;
  estimated_duration_minutes: number;
  visit_frequency: 'every_visit' | 'weekly' | 'biweekly' | 'monthly';
  visit_days?: string[];
  latitude?: number;
  longitude?: number;
  address?: string;
  must_take_order: boolean;
  must_take_photo: boolean;
  must_check_inventory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JourneyPlan {
  id: string;
  company_id: string;
  route_id: string;
  plan_number: string;
  plan_date: string;
  sales_rep_id: string;
  supervisor_id?: string;
  planned_start_time: string;
  planned_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  planned_customers: any[];
  total_planned_visits: number;
  completed_visits: number;
  planned_distance_km?: number;
  actual_distance_km?: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface JourneyCheckin {
  id: string;
  company_id: string;
  journey_plan_id: string;
  customer_id: string;
  checkin_number: string;
  visit_sequence?: number;
  checkin_time: string;
  checkin_latitude: number;
  checkin_longitude: number;
  checkin_address?: string;
  checkin_photo_url?: string;
  checkout_time?: string;
  checkout_latitude?: number;
  checkout_longitude?: number;
  checkout_address?: string;
  checkout_photo_url?: string;
  visit_duration_minutes?: number;
  distance_from_customer_m?: number;
  activities_completed: string[];
  visit_type: 'scheduled' | 'unscheduled' | 'emergency';
  visit_purpose?: string;
  status: 'checked_in' | 'checked_out' | 'cancelled';
  notes?: string;
  issues?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface RouteOptimizationLog {
  id: string;
  company_id: string;
  route_id?: string;
  optimization_date: string;
  algorithm?: string;
  original_sequence?: any;
  original_distance_km?: number;
  original_duration_minutes?: number;
  optimized_sequence?: any;
  optimized_distance_km?: number;
  optimized_duration_minutes?: number;
  distance_saved_km?: number;
  time_saved_minutes?: number;
  improvement_percent?: number;
  is_applied: boolean;
  applied_by?: string;
  applied_at?: string;
  created_at: string;
  created_by?: string;
}

export interface SalesRepLocation {
  id: string;
  company_id: string;
  sales_rep_id: string;
  journey_plan_id?: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  altitude_meters?: number;
  speed_kmh?: number;
  heading_degrees?: number;
  activity_type?: 'moving' | 'stationary' | 'in_vehicle';
  battery_level?: number;
  network_type?: string;
  recorded_at: string;
  created_at: string;
}

// ===== INPUT TYPES FOR API =====

export interface CreateRouteInput {
  route_name: string;
  description?: string;
  assigned_to?: string;
  backup_rep?: string;
  region?: string;
  territory?: string;
  channel?: 'gt' | 'mt' | 'horeca';
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  visit_days?: string[];
}

export interface UpdateRouteInput {
  route_name?: string;
  description?: string;
  assigned_to?: string;
  backup_rep?: string;
  region?: string;
  territory?: string;
  channel?: 'gt' | 'mt' | 'horeca';
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  visit_days?: string[];
  is_active?: boolean;
}

export interface AddRouteCustomerInput {
  customer_id: string;
  visit_sequence: number;
  preferred_visit_time?: string;
  estimated_duration_minutes?: number;
  visit_frequency?: 'every_visit' | 'weekly' | 'biweekly' | 'monthly';
  visit_days?: string[];
  latitude?: number;
  longitude?: number;
  address?: string;
  must_take_order?: boolean;
  must_take_photo?: boolean;
  must_check_inventory?: boolean;
}

export interface CreateJourneyPlanInput {
  route_id: string;
  plan_date: string;
  sales_rep_id: string;
  supervisor_id?: string;
  planned_start_time: string;
  planned_end_time: string;
  customer_ids?: string[]; // Optional override
  notes?: string;
}

export interface CheckinInput {
  journey_plan_id: string;
  customer_id: string;
  latitude: number;
  longitude: number;
  address?: string;
  photo_url?: string;
  visit_type?: 'scheduled' | 'unscheduled' | 'emergency';
  visit_purpose?: string;
  notes?: string;
}

export interface CheckoutInput {
  latitude: number;
  longitude: number;
  address?: string;
  photo_url?: string;
  activities_completed?: string[];
  notes?: string;
  issues?: string;
}

export interface LocationUpdateInput {
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  altitude_meters?: number;
  speed_kmh?: number;
  heading_degrees?: number;
  activity_type?: 'moving' | 'stationary' | 'in_vehicle';
  battery_level?: number;
  network_type?: string;
}

export interface RouteFilters {
  assigned_to?: string;
  region?: string;
  territory?: string;
  channel?: string;
  is_active?: boolean;
  search?: string;
}

export interface JourneyPlanFilters {
  route_id?: string;
  sales_rep_id?: string;
  supervisor_id?: string;
  plan_date?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
}

export interface RoutePerformanceMetrics {
  total_journeys: number;
  completed_journeys: number;
  completion_rate: number;
  total_visits: number;
  completed_visits: number;
  visit_completion_rate: number;
  avg_visits_per_journey: number;
  total_distance_km: number;
  avg_distance_per_journey: number;
  total_duration_minutes: number;
  avg_duration_per_journey: number;
}
