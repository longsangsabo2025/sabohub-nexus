import { supabase } from '@/lib/supabase';
import type {
  SalesRoute,
  RouteCustomer,
  JourneyPlan,
  JourneyCheckin,
  RouteOptimizationLog,
  SalesRepLocation,
  CreateRouteInput,
  UpdateRouteInput,
  AddRouteCustomerInput,
  CreateJourneyPlanInput,
  CheckinInput,
  CheckoutInput,
  LocationUpdateInput,
  RouteFilters,
  JourneyPlanFilters,
  RoutePerformanceMetrics,
} from '@/types/salesRoute';

class SalesRouteService {
  private getCompanyId(): string | null {
    return localStorage.getItem('company_id');
  }

  private getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  // ========== ROUTE MANAGEMENT ==========

  async getAllRoutes(filters: RouteFilters = {}): Promise<SalesRoute[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('sales_routes')
      .select(`
        *,
        assigned_user:assigned_to(id, display_name),
        backup_user:backup_rep(id, display_name)
      `)
      .eq('company_id', companyId);

    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }
    if (filters.region) {
      query = query.eq('region', filters.region);
    }
    if (filters.territory) {
      query = query.eq('territory', filters.territory);
    }
    if (filters.channel) {
      query = query.eq('channel', filters.channel);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.search) {
      query = query.or(`route_name.ilike.%${filters.search}%,route_code.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getRouteById(id: string): Promise<SalesRoute | null> {
    const { data, error } = await supabase
      .from('sales_routes')
      .select(`
        *,
        assigned_user:assigned_to(id, display_name, email),
        backup_user:backup_rep(id, display_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createRoute(input: CreateRouteInput): Promise<SalesRoute> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    const routeCode = await this.generateRouteCode();

    const { data, error } = await supabase
      .from('sales_routes')
      .insert({
        company_id: companyId,
        route_code: routeCode,
        route_name: input.route_name,
        description: input.description,
        assigned_to: input.assigned_to,
        backup_rep: input.backup_rep,
        region: input.region,
        territory: input.territory,
        channel: input.channel,
        frequency: input.frequency || 'weekly',
        visit_days: input.visit_days || [],
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateRoute(id: string, input: UpdateRouteInput): Promise<SalesRoute> {
    const { data, error } = await supabase
      .from('sales_routes')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteRoute(id: string): Promise<void> {
    const { error } = await supabase
      .from('sales_routes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  private async generateRouteCode(): Promise<string> {
    const companyId = this.getCompanyId();
    const { data } = await supabase
      .from('sales_routes')
      .select('route_code')
      .eq('company_id', companyId!)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastCode = data?.[0]?.route_code;
    const lastNumber = lastCode ? parseInt(lastCode.replace('RT', '')) : 0;
    return `RT${String(lastNumber + 1).padStart(4, '0')}`;
  }

  // ========== ROUTE CUSTOMERS ==========

  async getRouteCustomers(routeId: string): Promise<RouteCustomer[]> {
    const { data, error } = await supabase
      .from('route_customers')
      .select(`
        *,
        customer:customer_id(id, name, code, address, phone)
      `)
      .eq('route_id', routeId)
      .eq('is_active', true)
      .order('visit_sequence', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async addCustomerToRoute(routeId: string, input: AddRouteCustomerInput): Promise<RouteCustomer> {
    const { data, error } = await supabase
      .from('route_customers')
      .insert({
        route_id: routeId,
        customer_id: input.customer_id,
        visit_sequence: input.visit_sequence,
        preferred_visit_time: input.preferred_visit_time,
        estimated_duration_minutes: input.estimated_duration_minutes || 30,
        visit_frequency: input.visit_frequency || 'every_visit',
        visit_days: input.visit_days,
        latitude: input.latitude,
        longitude: input.longitude,
        address: input.address,
        must_take_order: input.must_take_order || false,
        must_take_photo: input.must_take_photo || false,
        must_check_inventory: input.must_check_inventory || false,
      })
      .select()
      .single();

    if (error) throw error;

    // Update route customer count
    await this.updateRouteCustomerCount(routeId);

    return data;
  }

  async updateRouteCustomer(id: string, input: Partial<AddRouteCustomerInput>): Promise<RouteCustomer> {
    const { data, error } = await supabase
      .from('route_customers')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeCustomerFromRoute(id: string): Promise<void> {
    const { data: customer, error: fetchError } = await supabase
      .from('route_customers')
      .select('route_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('route_customers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    if (customer) {
      await this.updateRouteCustomerCount(customer.route_id);
    }
  }

  private async updateRouteCustomerCount(routeId: string): Promise<void> {
    const { count } = await supabase
      .from('route_customers')
      .select('*', { count: 'exact', head: true })
      .eq('route_id', routeId)
      .eq('is_active', true);

    await supabase
      .from('sales_routes')
      .update({ 
        total_customers: count || 0,
        active_customers: count || 0,
      })
      .eq('id', routeId);
  }

  // ========== JOURNEY PLANS ==========

  async getAllJourneyPlans(filters: JourneyPlanFilters = {}): Promise<JourneyPlan[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('journey_plans')
      .select(`
        *,
        route:route_id(id, route_name, route_code),
        sales_rep:sales_rep_id(id, display_name),
        supervisor:supervisor_id(id, display_name)
      `)
      .eq('company_id', companyId);

    if (filters.route_id) {
      query = query.eq('route_id', filters.route_id);
    }
    if (filters.sales_rep_id) {
      query = query.eq('sales_rep_id', filters.sales_rep_id);
    }
    if (filters.supervisor_id) {
      query = query.eq('supervisor_id', filters.supervisor_id);
    }
    if (filters.plan_date) {
      query = query.eq('plan_date', filters.plan_date);
    }
    if (filters.from_date) {
      query = query.gte('plan_date', filters.from_date);
    }
    if (filters.to_date) {
      query = query.lte('plan_date', filters.to_date);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('plan_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getJourneyPlanById(id: string): Promise<JourneyPlan | null> {
    const { data, error } = await supabase
      .from('journey_plans')
      .select(`
        *,
        route:route_id(id, route_name, route_code),
        sales_rep:sales_rep_id(id, display_name, email, phone),
        supervisor:supervisor_id(id, display_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createJourneyPlan(input: CreateJourneyPlanInput): Promise<JourneyPlan> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    // Get route customers
    let customers;
    if (input.customer_ids && input.customer_ids.length > 0) {
      // Use provided customer IDs
      const { data } = await supabase
        .from('route_customers')
        .select('*, customer:customer_id(*)')
        .eq('route_id', input.route_id)
        .in('customer_id', input.customer_ids)
        .eq('is_active', true)
        .order('visit_sequence', { ascending: true });
      customers = data || [];
    } else {
      // Use all route customers
      customers = await this.getRouteCustomers(input.route_id);
    }

    // Generate plan number
    const { data: planNumber, error: rpcError } = await supabase
      .rpc('generate_journey_plan_number', { p_company_id: companyId });

    if (rpcError) throw rpcError;

    const { data, error } = await supabase
      .from('journey_plans')
      .insert({
        company_id: companyId,
        route_id: input.route_id,
        plan_number: planNumber,
        plan_date: input.plan_date,
        sales_rep_id: input.sales_rep_id,
        supervisor_id: input.supervisor_id,
        planned_start_time: input.planned_start_time,
        planned_end_time: input.planned_end_time,
        planned_customers: customers,
        total_planned_visits: customers.length,
        notes: input.notes,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async startJourney(id: string): Promise<void> {
    const { error } = await supabase
      .from('journey_plans')
      .update({
        status: 'in_progress',
        actual_start_time: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async completeJourney(id: string): Promise<void> {
    const { error } = await supabase
      .from('journey_plans')
      .update({
        status: 'completed',
        actual_end_time: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async cancelJourney(id: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('journey_plans')
      .update({
        status: 'cancelled',
        notes: reason,
      })
      .eq('id', id);

    if (error) throw error;
  }

  // ========== CHECKINS ==========

  async getJourneyCheckins(journeyPlanId: string): Promise<JourneyCheckin[]> {
    const { data, error } = await supabase
      .from('journey_checkins')
      .select(`
        *,
        customer:customer_id(id, name, code, address)
      `)
      .eq('journey_plan_id', journeyPlanId)
      .order('checkin_time', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async checkin(input: CheckinInput): Promise<JourneyCheckin> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    // Generate checkin number
    const { data: checkinNumber, error: rpcError } = await supabase
      .rpc('generate_checkin_number', { p_company_id: companyId });

    if (rpcError) throw rpcError;

    const { data, error } = await supabase
      .from('journey_checkins')
      .insert({
        company_id: companyId,
        journey_plan_id: input.journey_plan_id,
        customer_id: input.customer_id,
        checkin_number: checkinNumber,
        checkin_time: new Date().toISOString(),
        checkin_latitude: input.latitude,
        checkin_longitude: input.longitude,
        checkin_address: input.address,
        checkin_photo_url: input.photo_url,
        visit_type: input.visit_type || 'scheduled',
        visit_purpose: input.visit_purpose,
        notes: input.notes,
        status: 'checked_in',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async checkout(checkinId: string, input: CheckoutInput): Promise<JourneyCheckin> {
    const checkoutTime = new Date().toISOString();
    
    // Get checkin time to calculate duration
    const { data: checkin } = await supabase
      .from('journey_checkins')
      .select('checkin_time')
      .eq('id', checkinId)
      .single();

    let durationMinutes;
    if (checkin) {
      const checkinDate = new Date(checkin.checkin_time);
      const checkoutDate = new Date(checkoutTime);
      durationMinutes = Math.round((checkoutDate.getTime() - checkinDate.getTime()) / 60000);
    }

    const { data, error } = await supabase
      .from('journey_checkins')
      .update({
        checkout_time: checkoutTime,
        checkout_latitude: input.latitude,
        checkout_longitude: input.longitude,
        checkout_address: input.address,
        checkout_photo_url: input.photo_url,
        visit_duration_minutes: durationMinutes,
        activities_completed: input.activities_completed || [],
        notes: input.notes,
        issues: input.issues,
        status: 'checked_out',
      })
      .eq('id', checkinId)
      .select()
      .single();

    if (error) throw error;

    // Update journey plan completed visits count
    if (data) {
      await this.updateJourneyCompletedVisits(data.journey_plan_id);
    }

    return data;
  }

  private async updateJourneyCompletedVisits(journeyPlanId: string): Promise<void> {
    const { count } = await supabase
      .from('journey_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('journey_plan_id', journeyPlanId)
      .eq('status', 'checked_out');

    await supabase
      .from('journey_plans')
      .update({ completed_visits: count || 0 })
      .eq('id', journeyPlanId);
  }

  // ========== LOCATION TRACKING ==========

  async updateLocation(journeyPlanId: string, input: LocationUpdateInput): Promise<void> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId || !userId) throw new Error('Company ID or User ID not found');

    const { error } = await supabase
      .from('sales_rep_locations')
      .insert({
        company_id: companyId,
        sales_rep_id: userId,
        journey_plan_id: journeyPlanId,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy_meters: input.accuracy_meters,
        altitude_meters: input.altitude_meters,
        speed_kmh: input.speed_kmh,
        heading_degrees: input.heading_degrees,
        activity_type: input.activity_type,
        battery_level: input.battery_level,
        network_type: input.network_type,
        recorded_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  async getRecentLocations(salesRepId: string, limit: number = 50): Promise<SalesRepLocation[]> {
    const { data, error } = await supabase
      .from('sales_rep_locations')
      .select('*')
      .eq('sales_rep_id', salesRepId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // ========== ROUTE OPTIMIZATION ==========

  async optimizeRoute(routeId: string): Promise<RouteOptimizationLog> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    // Get route customers with coordinates
    const customers = await this.getRouteCustomers(routeId);
    const customersWithCoords = customers.filter(c => c.latitude && c.longitude);

    if (customersWithCoords.length < 2) {
      throw new Error('Need at least 2 customers with coordinates to optimize');
    }

    // Simple optimization: sort by latitude then longitude (greedy approach)
    // In production, use Google Maps API or optimization algorithm
    const originalSequence = customers.map(c => ({
      customer_id: c.customer_id,
      sequence: c.visit_sequence,
    }));

    const optimized = [...customersWithCoords].sort((a, b) => {
      if (a.latitude! !== b.latitude!) return a.latitude! - b.latitude!;
      return a.longitude! - b.longitude!;
    });

    const optimizedSequence = optimized.map((c, idx) => ({
      customer_id: c.customer_id,
      sequence: idx + 1,
    }));

    // Calculate distance savings (simplified)
    const originalDistance = this.calculateTotalDistance(customers);
    const optimizedDistance = this.calculateTotalDistance(optimized);
    const distanceSaved = originalDistance - optimizedDistance;
    const improvementPercent = (distanceSaved / originalDistance) * 100;

    const { data, error } = await supabase
      .from('route_optimization_logs')
      .insert({
        company_id: companyId,
        route_id: routeId,
        optimization_date: new Date().toISOString().split('T')[0],
        algorithm: 'greedy',
        original_sequence: originalSequence,
        original_distance_km: originalDistance,
        optimized_sequence: optimizedSequence,
        optimized_distance_km: optimizedDistance,
        distance_saved_km: distanceSaved,
        improvement_percent: improvementPercent,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async applyOptimization(optimizationId: string): Promise<void> {
    const userId = this.getUserId();

    // Get optimization log
    const { data: log, error: logError } = await supabase
      .from('route_optimization_logs')
      .select('*')
      .eq('id', optimizationId)
      .single();

    if (logError) throw logError;
    if (!log || !log.optimized_sequence) throw new Error('Optimization not found');

    // Update route customers with new sequence
    for (const item of log.optimized_sequence as any[]) {
      await supabase
        .from('route_customers')
        .update({ visit_sequence: item.sequence })
        .eq('customer_id', item.customer_id)
        .eq('route_id', log.route_id!);
    }

    // Mark optimization as applied
    await supabase
      .from('route_optimization_logs')
      .update({
        is_applied: true,
        applied_by: userId,
        applied_at: new Date().toISOString(),
      })
      .eq('id', optimizationId);
  }

  private calculateTotalDistance(customers: RouteCustomer[]): number {
    // Simplified distance calculation (Haversine formula)
    let total = 0;
    for (let i = 0; i < customers.length - 1; i++) {
      const c1 = customers[i];
      const c2 = customers[i + 1];
      if (c1.latitude && c1.longitude && c2.latitude && c2.longitude) {
        total += this.haversineDistance(
          c1.latitude, c1.longitude,
          c2.latitude, c2.longitude
        );
      }
    }
    return total;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ========== PERFORMANCE METRICS ==========

  async getRoutePerformance(routeId: string, startDate: string, endDate: string): Promise<RoutePerformanceMetrics> {
    const journeys = await this.getAllJourneyPlans({
      route_id: routeId,
      from_date: startDate,
      to_date: endDate,
    });

    const completedJourneys = journeys.filter(j => j.status === 'completed');
    const totalVisits = journeys.reduce((sum, j) => sum + j.total_planned_visits, 0);
    const completedVisits = journeys.reduce((sum, j) => sum + j.completed_visits, 0);
    const totalDistance = completedJourneys.reduce((sum, j) => sum + (j.actual_distance_km || 0), 0);
    const totalDuration = completedJourneys.reduce((sum, j) => {
      if (j.actual_start_time && j.actual_end_time) {
        const start = new Date(j.actual_start_time);
        const end = new Date(j.actual_end_time);
        return sum + (end.getTime() - start.getTime()) / 60000;
      }
      return sum;
    }, 0);

    return {
      total_journeys: journeys.length,
      completed_journeys: completedJourneys.length,
      completion_rate: journeys.length > 0 ? (completedJourneys.length / journeys.length) * 100 : 0,
      total_visits: totalVisits,
      completed_visits: completedVisits,
      visit_completion_rate: totalVisits > 0 ? (completedVisits / totalVisits) * 100 : 0,
      avg_visits_per_journey: journeys.length > 0 ? totalVisits / journeys.length : 0,
      total_distance_km: totalDistance,
      avg_distance_per_journey: completedJourneys.length > 0 ? totalDistance / completedJourneys.length : 0,
      total_duration_minutes: totalDuration,
      avg_duration_per_journey: completedJourneys.length > 0 ? totalDuration / completedJourneys.length : 0,
    };
  }
}

export const salesRouteService = new SalesRouteService();
