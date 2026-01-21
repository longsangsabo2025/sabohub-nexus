// Types for Store Visit Management Module
// Matches database schema from migration 036

export interface VisitChecklist {
  id: string;
  company_id: string;
  checklist_code: string;
  checklist_name: string;
  description?: string;
  channel?: 'gt' | 'mt' | 'horeca' | 'all';
  customer_type?: 'retail' | 'wholesale' | 'distributor' | 'all';
  items: ChecklistItem[];
  max_score: number;
  passing_score: number;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  question: string;
  type: 'boolean' | 'number' | 'text' | 'photo' | 'multi_select';
  required: boolean;
  options?: string[];
  scoring?: Record<string, number>;
}

export interface StoreVisit {
  id: string;
  company_id: string;
  visit_number: string;
  visit_date: string;
  customer_id: string;
  store_name?: string;
  store_address?: string;
  sales_rep_id: string;
  supervisor_id?: string;
  journey_plan_id?: string;
  checkin_id?: string;
  visit_type: 'routine' | 'survey' | 'merchandising' | 'complaint' | 'collection';
  visit_purpose?: string;
  checklist_id?: string;
  checklist_responses?: Record<string, any>;
  checklist_score?: number;
  checklist_max_score?: number;
  checklist_passed?: boolean;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  photos: VisitPhoto[];
  observations?: string;
  issues?: string;
  recommendations?: string;
  requires_followup: boolean;
  followup_date?: string;
  followup_notes?: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface VisitPhoto {
  category: string;
  url: string;
  caption?: string;
  timestamp: string;
}

export interface StoreInventoryCheck {
  id: string;
  store_visit_id: string;
  product_id: string;
  shelf_stock: number;
  back_stock: number;
  total_stock: number;
  is_out_of_stock: boolean;
  is_low_stock: boolean;
  is_expired: boolean;
  expiry_date?: string;
  has_shelf_space: boolean;
  shelf_position?: 'eye_level' | 'top_shelf' | 'bottom_shelf' | 'end_cap';
  shelf_share?: number;
  current_price?: number;
  competitor_price?: number;
  price_difference?: number;
  on_promotion: boolean;
  promotion_details?: string;
  photo_url?: string;
  notes?: string;
  created_at: string;
}

export interface CompetitorTracking {
  id: string;
  company_id: string;
  store_visit_id: string;
  competitor_name: string;
  competitor_brand?: string;
  competitor_product?: string;
  product_category?: string;
  product_description?: string;
  package_size?: string;
  price?: number;
  currency: string;
  shelf_position?: string;
  shelf_share?: number;
  display_type?: 'shelf' | 'end_cap' | 'free_standing' | 'counter';
  has_promotion: boolean;
  promotion_type?: string;
  promotion_details?: string;
  stock_level?: 'high' | 'medium' | 'low' | 'out_of_stock';
  photos: string[];
  threat_level?: 'high' | 'medium' | 'low';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface POSMaterial {
  id: string;
  company_id: string;
  material_code: string;
  material_name: string;
  material_type: 'poster' | 'wobbler' | 'shelf_talker' | 'standee' | 'banner' | 'cooler';
  description?: string;
  size?: string;
  quantity_in_stock: number;
  cost_per_unit?: number;
  photo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface POSMaterialDeployment {
  id: string;
  company_id: string;
  store_visit_id: string;
  material_id: string;
  quantity_deployed: number;
  placement_location?: string;
  condition: 'new' | 'good' | 'damaged' | 'missing';
  before_photo_url?: string;
  after_photo_url?: string;
  deployed_by?: string;
  deployed_at: string;
  next_check_date?: string;
  notes?: string;
  created_at: string;
}

// ===== INPUT TYPES FOR API =====

export interface CreateChecklistInput {
  checklist_name: string;
  description?: string;
  channel?: 'gt' | 'mt' | 'horeca' | 'all';
  customer_type?: 'retail' | 'wholesale' | 'distributor' | 'all';
  items: Omit<ChecklistItem, 'id'>[];
  max_score?: number;
  passing_score?: number;
}

export interface CreateStoreVisitInput {
  visit_date: string;
  customer_id: string;
  store_name?: string;
  store_address?: string;
  sales_rep_id: string;
  supervisor_id?: string;
  journey_plan_id?: string;
  checkin_id?: string;
  visit_type?: 'routine' | 'survey' | 'merchandising' | 'complaint' | 'collection';
  visit_purpose?: string;
  checklist_id?: string;
  start_time: string;
}

export interface CompleteStoreVisitInput {
  end_time: string;
  checklist_responses?: Record<string, any>;
  photos?: VisitPhoto[];
  observations?: string;
  issues?: string;
  recommendations?: string;
  requires_followup?: boolean;
  followup_date?: string;
  followup_notes?: string;
}

export interface AddInventoryCheckInput {
  product_id: string;
  shelf_stock: number;
  back_stock: number;
  is_out_of_stock?: boolean;
  is_low_stock?: boolean;
  is_expired?: boolean;
  expiry_date?: string;
  has_shelf_space?: boolean;
  shelf_position?: 'eye_level' | 'top_shelf' | 'bottom_shelf' | 'end_cap';
  shelf_share?: number;
  current_price?: number;
  competitor_price?: number;
  on_promotion?: boolean;
  promotion_details?: string;
  photo_url?: string;
  notes?: string;
}

export interface AddCompetitorInput {
  competitor_name: string;
  competitor_brand?: string;
  competitor_product?: string;
  product_category?: string;
  product_description?: string;
  package_size?: string;
  price?: number;
  shelf_position?: string;
  shelf_share?: number;
  display_type?: 'shelf' | 'end_cap' | 'free_standing' | 'counter';
  has_promotion?: boolean;
  promotion_type?: string;
  promotion_details?: string;
  stock_level?: 'high' | 'medium' | 'low' | 'out_of_stock';
  photos?: string[];
  threat_level?: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface CreatePOSMaterialInput {
  material_name: string;
  material_type: 'poster' | 'wobbler' | 'shelf_talker' | 'standee' | 'banner' | 'cooler';
  description?: string;
  size?: string;
  quantity_in_stock?: number;
  cost_per_unit?: number;
  photo_url?: string;
}

export interface DeployPOSMaterialInput {
  material_id: string;
  quantity_deployed: number;
  placement_location?: string;
  condition?: 'new' | 'good' | 'damaged' | 'missing';
  before_photo_url?: string;
  after_photo_url?: string;
  next_check_date?: string;
  notes?: string;
}

export interface VisitFilters {
  customer_id?: string;
  sales_rep_id?: string;
  supervisor_id?: string;
  visit_type?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
  requires_followup?: boolean;
}

export interface ChecklistFilters {
  channel?: string;
  customer_type?: string;
  is_active?: boolean;
}
