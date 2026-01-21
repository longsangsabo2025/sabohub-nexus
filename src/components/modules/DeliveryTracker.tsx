import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  CheckCircle2, 
  Truck,
  AlertCircle,
  Route
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

interface DeliveryLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
}

interface DeliveryStop {
  id: string;
  order_id: string;
  customer_name: string;
  customer_address: string;
  customer_phone?: string;
  sequence: number;
  status: 'pending' | 'arrived' | 'delivered' | 'failed';
  arrived_at?: string;
  delivered_at?: string;
  notes?: string;
  location?: DeliveryLocation;
}

interface DeliveryRoute {
  id: string;
  route_number: string;
  driver_id: string;
  driver_name: string;
  vehicle_plate?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  stops: DeliveryStop[];
  current_location?: DeliveryLocation;
  total_distance?: number;
}

interface DeliveryTrackerProps {
  routeId?: string;
  deliveryId?: string;
  isDriver?: boolean;
}

export function DeliveryTracker({ routeId, deliveryId, isDriver = false }: DeliveryTrackerProps) {
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const queryClient = useQueryClient();

  // Fetch delivery route
  const { data: route, isLoading } = useQuery({
    queryKey: ['delivery-route', routeId, deliveryId],
    queryFn: async (): Promise<DeliveryRoute | null> => {
      if (routeId) {
        const { data, error } = await supabase
          .from('delivery_routes')
          .select(`
            *,
            driver:profiles(full_name),
            stops:delivery_stops(
              *,
              order:sales_orders(
                id,
                order_number,
                customer:customers(name, address, phone)
              )
            )
          `)
          .eq('id', routeId)
          .single();

        if (error) throw error;
        
        return {
          id: data.id,
          route_number: data.route_number,
          driver_id: data.driver_id,
          driver_name: data.driver?.full_name || 'Tài xế',
          vehicle_plate: data.vehicle_plate,
          status: data.status,
          started_at: data.started_at,
          completed_at: data.completed_at,
          current_location: data.current_location,
          total_distance: data.total_distance,
          stops: (data.stops || []).map((stop: Record<string, unknown>) => ({
            id: stop.id,
            order_id: (stop.order as Record<string, unknown>)?.id,
            customer_name: ((stop.order as Record<string, unknown>)?.customer as Record<string, unknown>)?.name || 'Khách hàng',
            customer_address: ((stop.order as Record<string, unknown>)?.customer as Record<string, unknown>)?.address || stop.address,
            customer_phone: ((stop.order as Record<string, unknown>)?.customer as Record<string, unknown>)?.phone,
            sequence: stop.sequence,
            status: stop.status,
            arrived_at: stop.arrived_at,
            delivered_at: stop.delivered_at,
            notes: stop.notes,
            location: stop.location,
          })).sort((a: DeliveryStop, b: DeliveryStop) => a.sequence - b.sequence),
        };
      }

      // Single delivery tracking
      if (deliveryId) {
        const { data, error } = await supabase
          .from('deliveries')
          .select(`
            *,
            order:sales_orders(
              id,
              order_number,
              customer:customers(name, address, phone)
            ),
            driver:profiles(full_name)
          `)
          .eq('id', deliveryId)
          .single();

        if (error) throw error;

        return {
          id: data.id,
          route_number: `GH-${data.id.slice(0, 8).toUpperCase()}`,
          driver_id: data.driver_id,
          driver_name: data.driver?.full_name || 'Tài xế',
          status: data.status,
          current_location: data.current_location,
          stops: [{
            id: data.id,
            order_id: data.order?.id,
            customer_name: data.order?.customer?.name || 'Khách hàng',
            customer_address: data.order?.customer?.address || data.delivery_address,
            customer_phone: data.order?.customer?.phone,
            sequence: 1,
            status: data.status === 'delivered' ? 'delivered' : 
                   data.status === 'in_transit' ? 'pending' : 'pending',
            delivered_at: data.delivered_at,
          }],
        };
      }

      return null;
    },
    enabled: !!routeId || !!deliveryId,
    refetchInterval: isTracking ? 30000 : false, // Refresh every 30s when tracking
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (location: DeliveryLocation) => {
      const targetId = routeId || deliveryId;
      const table = routeId ? 'delivery_routes' : 'deliveries';
      
      const { error } = await supabase
        .from(table)
        .update({ 
          current_location: location,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetId);

      if (error) throw error;

      // Also log to location history
      await supabase.from('delivery_location_logs').insert({
        delivery_id: deliveryId,
        route_id: routeId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        recorded_at: location.timestamp,
      });
    },
    onError: (error) => {
      console.error('Failed to update location:', error);
    },
  });

  // Update stop status mutation
  const updateStopMutation = useMutation({
    mutationFn: async ({ stopId, status, notes }: { stopId: string; status: string; notes?: string }) => {
      const updates: Record<string, unknown> = { 
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'arrived') {
        updates.arrived_at = new Date().toISOString();
        if (currentPosition) {
          updates.arrived_location = {
            latitude: currentPosition.coords.latitude,
            longitude: currentPosition.coords.longitude,
            timestamp: new Date().toISOString(),
          };
        }
      } else if (status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
        if (currentPosition) {
          updates.delivered_location = {
            latitude: currentPosition.coords.latitude,
            longitude: currentPosition.coords.longitude,
            timestamp: new Date().toISOString(),
          };
        }
      }

      if (notes) updates.notes = notes;

      const { error } = await supabase
        .from('delivery_stops')
        .update(updates)
        .eq('id', stopId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-route'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: () => {
      toast.error('Lỗi cập nhật trạng thái');
    },
  });

  // Start GPS tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ GPS');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPosition(position);
        
        // Update location on server
        updateLocationMutation.mutate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        });
      },
      (error) => {
        console.error('GPS error:', error);
        toast.error('Không thể lấy vị trí GPS');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );

    setWatchId(id);
    setIsTracking(true);
    toast.success('Đã bật theo dõi GPS');
  }, [updateLocationMutation]);

  // Stop GPS tracking
  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    toast.info('Đã tắt theo dõi GPS');
  }, [watchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Open navigation app
  const openNavigation = (address: string, lat?: number, lng?: number) => {
    let url: string;
    if (lat && lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }
    window.open(url, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'arrived': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ giao';
      case 'arrived': return 'Đã đến';
      case 'delivered': return 'Đã giao';
      case 'failed': return 'Thất bại';
      case 'planned': return 'Đã lên kế hoạch';
      case 'in_progress': return 'Đang giao';
      case 'completed': return 'Hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!route) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-500">
          <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Không tìm thấy thông tin giao hàng</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Route Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {route.route_number}
            </CardTitle>
            <Badge className={getStatusColor(route.status)}>
              {getStatusText(route.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Tài xế</p>
              <p className="font-medium">{route.driver_name}</p>
            </div>
            {route.vehicle_plate && (
              <div>
                <p className="text-gray-500">Biển số xe</p>
                <p className="font-medium">{route.vehicle_plate}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Số điểm giao</p>
              <p className="font-medium">{route.stops.length}</p>
            </div>
            <div>
              <p className="text-gray-500">Đã giao</p>
              <p className="font-medium">
                {route.stops.filter(s => s.status === 'delivered').length}/{route.stops.length}
              </p>
            </div>
          </div>

          {/* GPS Tracking Controls (for driver) */}
          {isDriver && (
            <div className="mt-4 pt-4 border-t flex items-center gap-4">
              {isTracking ? (
                <>
                  <Button variant="destructive" size="sm" onClick={stopTracking}>
                    <Navigation className="h-4 w-4 mr-1" />
                    Tắt GPS
                  </Button>
                  <span className="text-sm text-green-600 flex items-center">
                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                    Đang theo dõi
                  </span>
                </>
              ) : (
                <Button size="sm" onClick={startTracking}>
                  <Navigation className="h-4 w-4 mr-1" />
                  Bật GPS
                </Button>
              )}
              
              {currentPosition && (
                <span className="text-xs text-gray-500">
                  Độ chính xác: {currentPosition.coords.accuracy?.toFixed(0)}m
                </span>
              )}
            </div>
          )}

          {/* Current Location Display */}
          {route.current_location && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Vị trí hiện tại: {route.current_location.latitude.toFixed(6)}, {route.current_location.longitude.toFixed(6)}
                <span className="text-xs ml-2">
                  ({format(new Date(route.current_location.timestamp), 'HH:mm', { locale: vi })})
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Stops */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Route className="h-5 w-5" />
            Điểm giao hàng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {route.stops.map((stop, index) => (
              <div 
                key={stop.id} 
                className={`relative pl-8 pb-4 ${
                  index < route.stops.length - 1 ? 'border-l-2 border-gray-200 ml-3' : ''
                }`}
              >
                {/* Timeline dot */}
                <div 
                  className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold -translate-x-1/2 ${
                    stop.status === 'delivered' ? 'bg-green-500' :
                    stop.status === 'arrived' ? 'bg-blue-500' :
                    stop.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                  }`}
                >
                  {stop.status === 'delivered' ? '✓' : stop.sequence}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 ml-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{stop.customer_name}</span>
                        <Badge variant="outline" className={getStatusColor(stop.status)}>
                          {getStatusText(stop.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 flex items-start gap-1">
                        <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        {stop.customer_address}
                      </p>
                      {stop.customer_phone && (
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <Phone className="h-4 w-4" />
                          {stop.customer_phone}
                        </p>
                      )}
                      {stop.delivered_at && (
                        <p className="text-xs text-green-600 mt-2">
                          Giao lúc: {format(new Date(stop.delivered_at), 'HH:mm dd/MM', { locale: vi })}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openNavigation(stop.customer_address)}
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
                      
                      {stop.customer_phone && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`tel:${stop.customer_phone}`)}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Driver actions */}
                  {isDriver && stop.status !== 'delivered' && stop.status !== 'failed' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      {stop.status === 'pending' && (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => updateStopMutation.mutate({ stopId: stop.id, status: 'arrived' })}
                          disabled={updateStopMutation.isPending}
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          Đã đến
                        </Button>
                      )}
                      <Button 
                        size="sm"
                        onClick={() => updateStopMutation.mutate({ stopId: stop.id, status: 'delivered' })}
                        disabled={updateStopMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Đã giao
                      </Button>
                      <Button 
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStopMutation.mutate({ stopId: stop.id, status: 'failed', notes: 'Giao hàng thất bại' })}
                        disabled={updateStopMutation.isPending}
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Thất bại
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Mini tracker component for embedding
export function DeliveryTrackerMini({ deliveryId }: { deliveryId: string }) {
  const { data: delivery } = useQuery({
    queryKey: ['delivery-mini', deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('status, current_location, driver:profiles(full_name)')
        .eq('id', deliveryId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (!delivery) return null;

  const driverName = Array.isArray(delivery.driver) 
    ? delivery.driver[0]?.full_name 
    : (delivery.driver as { full_name: string } | null)?.full_name;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Truck className="h-4 w-4 text-gray-500" />
      <span>{driverName || 'Chưa phân công'}</span>
      {delivery.current_location && (
        <span className="text-green-500 flex items-center">
          <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-1"></span>
          Đang di chuyển
        </span>
      )}
    </div>
  );
}

export default DeliveryTracker;
