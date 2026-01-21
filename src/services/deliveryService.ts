import { supabase } from '@/integrations/supabase/client';
import type { Delivery, DeliveryItem, DeliveryRoute } from '@/types/modules';

export interface CreateDeliveryInput {
  order_id: string;
  customer_id: string;
  shipping_address: string;
  expected_date: string;
  driver_id?: string;
  vehicle_info?: string;
  notes?: string;
}

export interface UpdateDeliveryInput {
  expected_date?: string;
  driver_id?: string;
  vehicle_info?: string;
  shipping_address?: string;
  notes?: string;
  status?: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed' | 'returned';
}

export interface DeliveryFilters {
  status?: string;
  driverId?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

class DeliveryService {
  private getCompanyId(): string | null {
    return localStorage.getItem('company_id');
  }

  private getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  async getAll(filters: DeliveryFilters = {}): Promise<Delivery[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('deliveries')
      .select(`
        *,
        customer:customer_id(id, name, code, address, phone),
        order:order_id(id, order_number),
        driver:driver_id(id, display_name)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('expected_date', { ascending: true });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.driverId) {
      query = query.eq('driver_id', filters.driverId);
    }
    if (filters.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }
    if (filters.fromDate) {
      query = query.gte('expected_date', filters.fromDate);
    }
    if (filters.toDate) {
      query = query.lte('expected_date', filters.toDate);
    }
    if (filters.search) {
      query = query.ilike('delivery_number', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Delivery[];
  }

  async getById(id: string): Promise<Delivery | null> {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        customer:customer_id(id, name, code, address, phone, latitude, longitude),
        order:order_id(id, order_number, total_amount),
        driver:driver_id(id, display_name, phone)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Delivery;
  }

  async getDeliveryItems(deliveryId: string): Promise<DeliveryItem[]> {
    const { data, error } = await supabase
      .from('delivery_items')
      .select(`
        *,
        product:product_id(id, name, sku)
      `)
      .eq('delivery_id', deliveryId)
      .order('line_number');

    if (error) throw error;
    return data as DeliveryItem[];
  }

  async create(input: CreateDeliveryInput): Promise<Delivery> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    // Generate delivery number
    const timestamp = Date.now().toString().slice(-8);
    const deliveryNumber = `DL${new Date().getFullYear()}${timestamp}`;

    const { data, error } = await supabase
      .from('deliveries')
      .insert({
        company_id: companyId,
        order_id: input.order_id,
        customer_id: input.customer_id,
        delivery_number: deliveryNumber,
        shipping_address: input.shipping_address,
        expected_date: input.expected_date,
        driver_id: input.driver_id,
        vehicle_info: input.vehicle_info,
        notes: input.notes,
        status: input.driver_id ? 'assigned' : 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Copy items from order
    await this.copyItemsFromOrder(data.id, input.order_id);

    return data as Delivery;
  }

  private async copyItemsFromOrder(deliveryId: string, orderId: string): Promise<void> {
    const { data: orderItems } = await supabase
      .from('sales_order_items')
      .select('*')
      .eq('order_id', orderId);

    if (orderItems && orderItems.length > 0) {
      const deliveryItems = orderItems.map(item => ({
        delivery_id: deliveryId,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        unit: item.unit,
        ordered_quantity: item.quantity,
        delivered_quantity: 0,
        line_number: item.line_number,
        status: 'pending',
      }));

      await supabase.from('delivery_items').insert(deliveryItems);
    }
  }

  async update(id: string, input: UpdateDeliveryInput): Promise<Delivery> {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Delivery;
  }

  async assignDriver(id: string, driverId: string, vehicleInfo?: string): Promise<Delivery> {
    return this.update(id, {
      driver_id: driverId,
      vehicle_info: vehicleInfo,
      status: 'assigned',
    });
  }

  async startDelivery(id: string, location?: GpsLocation): Promise<Delivery> {
    const updateData: any = {
      status: 'in_transit',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (location) {
      updateData.start_latitude = location.latitude;
      updateData.start_longitude = location.longitude;
    }

    const { data, error } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Delivery;
  }

  async completeDelivery(
    id: string,
    deliveredItems: { itemId: string; quantity: number }[],
    location?: GpsLocation,
    signature?: string,
    photos?: string[]
  ): Promise<Delivery> {
    const updateData: any = {
      status: 'delivered',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      signature_url: signature,
      photo_urls: photos,
    };

    if (location) {
      updateData.end_latitude = location.latitude;
      updateData.end_longitude = location.longitude;
    }

    // Update delivered quantities
    for (const item of deliveredItems) {
      await supabase
        .from('delivery_items')
        .update({
          delivered_quantity: item.quantity,
          status: item.quantity > 0 ? 'delivered' : 'failed',
        })
        .eq('id', item.itemId);
    }

    const { data, error } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Delivery;
  }

  async failDelivery(id: string, reason: string, location?: GpsLocation): Promise<Delivery> {
    const updateData: any = {
      status: 'failed',
      failure_reason: reason,
      updated_at: new Date().toISOString(),
    };

    if (location) {
      updateData.end_latitude = location.latitude;
      updateData.end_longitude = location.longitude;
    }

    const { data, error } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Delivery;
  }

  async updateLocation(id: string, location: GpsLocation): Promise<void> {
    // Record GPS track point
    await supabase.from('delivery_tracking').insert({
      delivery_id: id,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      recorded_at: location.timestamp || new Date().toISOString(),
    });

    // Update current location on delivery
    await supabase
      .from('deliveries')
      .update({
        current_latitude: location.latitude,
        current_longitude: location.longitude,
        location_updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  }

  async getTrackingHistory(deliveryId: string): Promise<GpsLocation[]> {
    const { data, error } = await supabase
      .from('delivery_tracking')
      .select('latitude, longitude, accuracy, recorded_at')
      .eq('delivery_id', deliveryId)
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    return data.map(t => ({
      latitude: t.latitude,
      longitude: t.longitude,
      accuracy: t.accuracy,
      timestamp: t.recorded_at,
    }));
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('deliveries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async getDriverDeliveries(driverId: string, date?: string): Promise<Delivery[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('deliveries')
      .select(`
        *,
        customer:customer_id(id, name, address, phone, latitude, longitude),
        order:order_id(id, order_number)
      `)
      .eq('company_id', companyId)
      .eq('driver_id', driverId)
      .is('deleted_at', null)
      .in('status', ['assigned', 'in_transit'])
      .order('expected_date');

    if (date) {
      query = query.eq('expected_date', date);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Delivery[];
  }

  async optimizeRoute(deliveryIds: string[]): Promise<DeliveryRoute> {
    // TODO: Integrate with routing API (Google Maps, Mapbox, etc.)
    // For now, return deliveries in order of expected time
    const deliveries = await Promise.all(
      deliveryIds.map(id => this.getById(id))
    );

    const validDeliveries = deliveries.filter(d => d !== null) as Delivery[];
    
    // Sort by expected date/time
    validDeliveries.sort((a, b) => 
      new Date(a.expected_date).getTime() - new Date(b.expected_date).getTime()
    );

    return {
      deliveries: validDeliveries,
      totalDistance: 0, // Would be calculated by routing API
      estimatedDuration: 0,
      optimizedOrder: validDeliveries.map(d => d.id),
    };
  }

  async getStats(filters?: { fromDate?: string; toDate?: string }): Promise<{
    total: number;
    pending: number;
    inTransit: number;
    delivered: number;
    failed: number;
    onTimeRate: number;
  }> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('deliveries')
      .select('status, expected_date, completed_at')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (filters?.fromDate) {
      query = query.gte('expected_date', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('expected_date', filters.toDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const delivered = data.filter(d => d.status === 'delivered');
    const onTime = delivered.filter(d => {
      if (!d.completed_at) return false;
      return new Date(d.completed_at) <= new Date(d.expected_date + 'T23:59:59');
    });

    return {
      total: data.length,
      pending: data.filter(d => d.status === 'pending').length,
      inTransit: data.filter(d => d.status === 'in_transit').length,
      delivered: delivered.length,
      failed: data.filter(d => d.status === 'failed').length,
      onTimeRate: delivered.length > 0 ? (onTime.length / delivered.length) * 100 : 0,
    };
  }
}

export const deliveryService = new DeliveryService();
