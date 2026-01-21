// Enhanced hooks for Odori modules with optimistic updates
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  customerService, 
  productService, 
  orderService, 
  deliveryService, 
  receivableService,
  inventoryService,
  type CustomerFilters,
  type ProductFilters,
  type OrderFilters,
  type DeliveryFilters,
  type ReceivableFilters,
  type InventoryFilters,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type CreateProductInput,
  type UpdateProductInput,
  type CreateOrderInput,
  type UpdateOrderInput,
  type CreateDeliveryInput,
  type UpdateDeliveryInput,
  type CreateReceivableInput,
  type RecordPaymentInput,
  type AdjustInventoryInput,
  type TransferInventoryInput,
} from '@/services';
import type { Customer, Product, SalesOrder, Delivery, Receivable, InventoryItem } from '@/types/modules';
import { toast } from 'sonner';

// =====================================================
// CUSTOMER HOOKS
// =====================================================
export function useCustomersV2(filters?: CustomerFilters) {
  return useQuery({
    queryKey: ['customers-v2', filters],
    queryFn: () => customerService.getAll(filters || {}),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCustomerV2(id: string) {
  return useQuery({
    queryKey: ['customer-v2', id],
    queryFn: () => customerService.getById(id),
    enabled: !!id,
  });
}

export function useCustomerStats() {
  return useQuery({
    queryKey: ['customer-stats'],
    queryFn: () => customerService.getStats(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateCustomerV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCustomerInput) => customerService.create(input),
    onMutate: async (newCustomer) => {
      await queryClient.cancelQueries({ queryKey: ['customers-v2'] });
      const previousCustomers = queryClient.getQueryData<Customer[]>(['customers-v2']);
      
      // Optimistic update
      if (previousCustomers) {
        const optimisticCustomer = {
          id: `temp-${Date.now()}`,
          ...newCustomer,
          created_at: new Date().toISOString(),
        } as Customer;
        queryClient.setQueryData(['customers-v2'], [...previousCustomers, optimisticCustomer]);
      }
      
      return { previousCustomers };
    },
    onSuccess: () => {
      toast.success('Đã thêm khách hàng thành công');
      queryClient.invalidateQueries({ queryKey: ['customers-v2'] });
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] });
    },
    onError: (err, _, context) => {
      if (context?.previousCustomers) {
        queryClient.setQueryData(['customers-v2'], context.previousCustomers);
      }
      toast.error('Lỗi khi thêm khách hàng');
    },
  });
}

export function useUpdateCustomerV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateCustomerInput & { id: string }) => 
      customerService.update(id, input),
    onSuccess: (_, variables) => {
      toast.success('Đã cập nhật khách hàng');
      queryClient.invalidateQueries({ queryKey: ['customers-v2'] });
      queryClient.invalidateQueries({ queryKey: ['customer-v2', variables.id] });
    },
    onError: () => {
      toast.error('Lỗi khi cập nhật khách hàng');
    },
  });
}

export function useDeleteCustomerV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerService.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa khách hàng');
      queryClient.invalidateQueries({ queryKey: ['customers-v2'] });
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] });
    },
    onError: () => {
      toast.error('Lỗi khi xóa khách hàng');
    },
  });
}

// =====================================================
// PRODUCT HOOKS
// =====================================================
export function useProductsV2(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products-v2', filters],
    queryFn: () => productService.getAll(filters || {}),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductV2(id: string) {
  return useQuery({
    queryKey: ['product-v2', id],
    queryFn: () => productService.getById(id),
    enabled: !!id,
  });
}

export function useProductByBarcode(barcode: string) {
  return useQuery({
    queryKey: ['product-barcode', barcode],
    queryFn: () => productService.getByBarcode(barcode),
    enabled: !!barcode && barcode.length > 3,
  });
}

export function useProductCategoriesV2() {
  return useQuery({
    queryKey: ['product-categories-v2'],
    queryFn: () => productService.getCategories(),
  });
}

export function useProductStats() {
  return useQuery({
    queryKey: ['product-stats'],
    queryFn: () => productService.getStats(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateProductV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) => productService.create(input),
    onSuccess: () => {
      toast.success('Đã thêm sản phẩm thành công');
      queryClient.invalidateQueries({ queryKey: ['products-v2'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
    },
    onError: () => {
      toast.error('Lỗi khi thêm sản phẩm');
    },
  });
}

export function useUpdateProductV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateProductInput & { id: string }) => 
      productService.update(id, input),
    onSuccess: (_, variables) => {
      toast.success('Đã cập nhật sản phẩm');
      queryClient.invalidateQueries({ queryKey: ['products-v2'] });
      queryClient.invalidateQueries({ queryKey: ['product-v2', variables.id] });
    },
    onError: () => {
      toast.error('Lỗi khi cập nhật sản phẩm');
    },
  });
}

export function useDeleteProductV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productService.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa sản phẩm');
      queryClient.invalidateQueries({ queryKey: ['products-v2'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
    },
    onError: () => {
      toast.error('Lỗi khi xóa sản phẩm');
    },
  });
}

// =====================================================
// ORDER HOOKS
// =====================================================
export function useOrdersV2(filters?: OrderFilters) {
  return useQuery({
    queryKey: ['orders-v2', filters],
    queryFn: () => orderService.getAll(filters || {}),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrderV2(id: string) {
  return useQuery({
    queryKey: ['order-v2', id],
    queryFn: () => orderService.getById(id),
    enabled: !!id,
  });
}

export function useOrderItems(orderId: string) {
  return useQuery({
    queryKey: ['order-items', orderId],
    queryFn: () => orderService.getOrderItems(orderId),
    enabled: !!orderId,
  });
}

export function useOrderStats(filters?: { fromDate?: string; toDate?: string }) {
  return useQuery({
    queryKey: ['order-stats', filters],
    queryFn: () => orderService.getStats(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateOrderV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderInput) => orderService.create(input),
    onSuccess: () => {
      toast.success('Đã tạo đơn hàng thành công');
      queryClient.invalidateQueries({ queryKey: ['orders-v2'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    },
    onError: () => {
      toast.error('Lỗi khi tạo đơn hàng');
    },
  });
}

export function useUpdateOrderV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateOrderInput & { id: string }) => 
      orderService.update(id, input),
    onSuccess: (_, variables) => {
      toast.success('Đã cập nhật đơn hàng');
      queryClient.invalidateQueries({ queryKey: ['orders-v2'] });
      queryClient.invalidateQueries({ queryKey: ['order-v2', variables.id] });
    },
    onError: () => {
      toast.error('Lỗi khi cập nhật đơn hàng');
    },
  });
}

export function useApproveOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => orderService.approve(id),
    onSuccess: (_, id) => {
      toast.success('Đã duyệt đơn hàng');
      queryClient.invalidateQueries({ queryKey: ['orders-v2'] });
      queryClient.invalidateQueries({ queryKey: ['order-v2', id] });
    },
    onError: () => {
      toast.error('Lỗi khi duyệt đơn hàng');
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      orderService.cancel(id, reason),
    onSuccess: (_, { id }) => {
      toast.success('Đã hủy đơn hàng');
      queryClient.invalidateQueries({ queryKey: ['orders-v2'] });
      queryClient.invalidateQueries({ queryKey: ['order-v2', id] });
    },
    onError: () => {
      toast.error('Lỗi khi hủy đơn hàng');
    },
  });
}

// =====================================================
// DELIVERY HOOKS
// =====================================================
export function useDeliveriesV2(filters?: DeliveryFilters) {
  return useQuery({
    queryKey: ['deliveries-v2', filters],
    queryFn: () => deliveryService.getAll(filters || {}),
    staleTime: 2 * 60 * 1000,
  });
}

export function useDeliveryV2(id: string) {
  return useQuery({
    queryKey: ['delivery-v2', id],
    queryFn: () => deliveryService.getById(id),
    enabled: !!id,
  });
}

export function useDeliveryItems(deliveryId: string) {
  return useQuery({
    queryKey: ['delivery-items', deliveryId],
    queryFn: () => deliveryService.getDeliveryItems(deliveryId),
    enabled: !!deliveryId,
  });
}

export function useDriverDeliveries(driverId: string, date?: string) {
  return useQuery({
    queryKey: ['driver-deliveries', driverId, date],
    queryFn: () => deliveryService.getDriverDeliveries(driverId, date),
    enabled: !!driverId,
  });
}

export function useDeliveryStats(filters?: { fromDate?: string; toDate?: string }) {
  return useQuery({
    queryKey: ['delivery-stats', filters],
    queryFn: () => deliveryService.getStats(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDeliveryV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDeliveryInput) => deliveryService.create(input),
    onSuccess: () => {
      toast.success('Đã tạo phiếu giao hàng');
      queryClient.invalidateQueries({ queryKey: ['deliveries-v2'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
    },
    onError: () => {
      toast.error('Lỗi khi tạo phiếu giao hàng');
    },
  });
}

export function useStartDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, location }: { id: string; location?: { latitude: number; longitude: number } }) => 
      deliveryService.startDelivery(id, location),
    onSuccess: (_, { id }) => {
      toast.success('Đã bắt đầu giao hàng');
      queryClient.invalidateQueries({ queryKey: ['deliveries-v2'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-v2', id] });
      queryClient.invalidateQueries({ queryKey: ['driver-deliveries'] });
    },
    onError: () => {
      toast.error('Lỗi khi bắt đầu giao hàng');
    },
  });
}

export function useCompleteDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { 
      id: string; 
      deliveredItems: { itemId: string; quantity: number }[];
      location?: { latitude: number; longitude: number };
      signature?: string;
      photos?: string[];
    }) => deliveryService.completeDelivery(
      params.id, 
      params.deliveredItems, 
      params.location, 
      params.signature, 
      params.photos
    ),
    onSuccess: (_, { id }) => {
      toast.success('Đã hoàn thành giao hàng');
      queryClient.invalidateQueries({ queryKey: ['deliveries-v2'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-v2', id] });
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
    },
    onError: () => {
      toast.error('Lỗi khi hoàn thành giao hàng');
    },
  });
}

export function useFailDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason, location }: { 
      id: string; 
      reason: string;
      location?: { latitude: number; longitude: number };
    }) => deliveryService.failDelivery(id, reason, location),
    onSuccess: (_, { id }) => {
      toast.warning('Đã đánh dấu giao hàng thất bại');
      queryClient.invalidateQueries({ queryKey: ['deliveries-v2'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-v2', id] });
    },
    onError: () => {
      toast.error('Lỗi khi cập nhật trạng thái');
    },
  });
}

export function useUpdateDeliveryLocation() {
  return useMutation({
    mutationFn: ({ id, location }: { id: string; location: { latitude: number; longitude: number } }) => 
      deliveryService.updateLocation(id, location),
  });
}

// =====================================================
// RECEIVABLE HOOKS
// =====================================================
export function useReceivablesV2(filters?: ReceivableFilters) {
  return useQuery({
    queryKey: ['receivables-v2', filters],
    queryFn: () => receivableService.getAll(filters || {}),
    staleTime: 2 * 60 * 1000,
  });
}

export function useReceivableV2(id: string) {
  return useQuery({
    queryKey: ['receivable-v2', id],
    queryFn: () => receivableService.getById(id),
    enabled: !!id,
  });
}

export function useReceivablePayments(receivableId: string) {
  return useQuery({
    queryKey: ['receivable-payments', receivableId],
    queryFn: () => receivableService.getPayments(receivableId),
    enabled: !!receivableId,
  });
}

export function useCustomerBalance(customerId: string) {
  return useQuery({
    queryKey: ['customer-balance', customerId],
    queryFn: () => receivableService.getCustomerBalance(customerId),
    enabled: !!customerId,
  });
}

export function useAgingReport() {
  return useQuery({
    queryKey: ['aging-report'],
    queryFn: () => receivableService.getAgingReport(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useReceivableStats() {
  return useQuery({
    queryKey: ['receivable-stats'],
    queryFn: () => receivableService.getStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateReceivableV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReceivableInput) => receivableService.create(input),
    onSuccess: () => {
      toast.success('Đã tạo công nợ');
      queryClient.invalidateQueries({ queryKey: ['receivables-v2'] });
      queryClient.invalidateQueries({ queryKey: ['receivable-stats'] });
      queryClient.invalidateQueries({ queryKey: ['aging-report'] });
    },
    onError: () => {
      toast.error('Lỗi khi tạo công nợ');
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ receivableId, ...input }: RecordPaymentInput & { receivableId: string }) => 
      receivableService.recordPayment(receivableId, input),
    onSuccess: (_, { receivableId }) => {
      toast.success('Đã ghi nhận thanh toán');
      queryClient.invalidateQueries({ queryKey: ['receivables-v2'] });
      queryClient.invalidateQueries({ queryKey: ['receivable-v2', receivableId] });
      queryClient.invalidateQueries({ queryKey: ['receivable-payments', receivableId] });
      queryClient.invalidateQueries({ queryKey: ['receivable-stats'] });
      queryClient.invalidateQueries({ queryKey: ['aging-report'] });
      queryClient.invalidateQueries({ queryKey: ['customer-balance'] });
    },
    onError: () => {
      toast.error('Lỗi khi ghi nhận thanh toán');
    },
  });
}

// =====================================================
// INVENTORY HOOKS
// =====================================================
export function useInventoryV2(filters?: InventoryFilters) {
  return useQuery({
    queryKey: ['inventory-v2', filters],
    queryFn: () => inventoryService.getAll(filters || {}),
    staleTime: 2 * 60 * 1000,
  });
}

export function useProductInventory(productId: string) {
  return useQuery({
    queryKey: ['product-inventory', productId],
    queryFn: () => inventoryService.getByProduct(productId),
    enabled: !!productId,
  });
}

export function useWarehousesV2() {
  return useQuery({
    queryKey: ['warehouses-v2'],
    queryFn: () => inventoryService.getWarehouses(),
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: ['low-stock-items'],
    queryFn: () => inventoryService.getLowStockItems(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInventoryTransactions(filters?: {
  productId?: string;
  warehouseId?: string;
  fromDate?: string;
  toDate?: string;
  type?: string;
}) {
  return useQuery({
    queryKey: ['inventory-transactions', filters],
    queryFn: () => inventoryService.getTransactions(filters),
  });
}

export function useInventoryStats() {
  return useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => inventoryService.getStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdjustInventoryInput) => inventoryService.adjustInventory(input),
    onSuccess: () => {
      toast.success('Đã điều chỉnh tồn kho');
      queryClient.invalidateQueries({ queryKey: ['inventory-v2'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Lỗi khi điều chỉnh tồn kho');
    },
  });
}

export function useTransferInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TransferInventoryInput) => inventoryService.transferInventory(input),
    onSuccess: () => {
      toast.success('Đã chuyển kho thành công');
      queryClient.invalidateQueries({ queryKey: ['inventory-v2'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Lỗi khi chuyển kho');
    },
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, code, address }: { name: string; code?: string; address?: string }) => 
      inventoryService.createWarehouse(name, code, address),
    onSuccess: () => {
      toast.success('Đã tạo kho mới');
      queryClient.invalidateQueries({ queryKey: ['warehouses-v2'] });
    },
    onError: () => {
      toast.error('Lỗi khi tạo kho');
    },
  });
}
