import { z } from 'zod';

// Vietnamese error messages
const messages = {
  required: 'Trường này là bắt buộc',
  email: 'Email không hợp lệ',
  phone: 'Số điện thoại không hợp lệ',
  minLength: (min: number) => `Tối thiểu ${min} ký tự`,
  maxLength: (max: number) => `Tối đa ${max} ký tự`,
  positiveNumber: 'Phải là số dương',
  minValue: (min: number) => `Giá trị tối thiểu là ${min}`,
  maxValue: (max: number) => `Giá trị tối đa là ${max}`,
  invalidDate: 'Ngày không hợp lệ',
  futureDate: 'Ngày phải trong tương lai',
};

// Reusable field schemas
export const phoneSchema = z
  .string()
  .regex(/^[0-9+\-\s()]*$/, messages.phone)
  .optional()
  .or(z.literal(''));

export const emailSchema = z
  .string()
  .email(messages.email)
  .optional()
  .or(z.literal(''));

export const requiredString = (fieldName?: string) =>
  z.string().min(1, fieldName ? `${fieldName} là bắt buộc` : messages.required);

export const optionalString = z.string().optional().or(z.literal(''));

export const positiveNumber = z.number().positive(messages.positiveNumber);

export const nonNegativeNumber = z.number().min(0, 'Không được âm');

// ==================== Customer Schemas ====================
export const customerSchema = z.object({
  name: requiredString('Tên khách hàng'),
  code: optionalString,
  type: z.enum(['distributor', 'retailer', 'end_customer']).default('retailer'),
  contact_person: optionalString,
  phone: phoneSchema,
  email: emailSchema,
  address: optionalString,
  city: optionalString,
  district: optionalString,
  ward: optionalString,
  tax_id: optionalString,
  credit_limit: nonNegativeNumber.optional(),
  payment_terms: z.number().int().min(0).max(365).optional(),
  notes: optionalString,
});

export const customerContactSchema = z.object({
  name: requiredString('Tên liên hệ'),
  position: optionalString,
  phone: phoneSchema,
  email: emailSchema,
  is_primary: z.boolean().default(false),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
export type CustomerContactFormData = z.infer<typeof customerContactSchema>;

// ==================== Product Schemas ====================
export const productSchema = z.object({
  name: requiredString('Tên sản phẩm'),
  sku: optionalString,
  barcode: optionalString,
  description: optionalString,
  category_id: optionalString,
  unit: requiredString('Đơn vị tính'),
  base_price: positiveNumber,
  cost_price: nonNegativeNumber.optional(),
  weight: nonNegativeNumber.optional(),
  volume: nonNegativeNumber.optional(),
  image_url: optionalString,
});

export const productCategorySchema = z.object({
  name: requiredString('Tên danh mục'),
  description: optionalString,
  parent_id: optionalString,
});

export type ProductFormData = z.infer<typeof productSchema>;
export type ProductCategoryFormData = z.infer<typeof productCategorySchema>;

// ==================== Order Schemas ====================
export const orderItemSchema = z.object({
  product_id: requiredString('Sản phẩm'),
  product_name: z.string(),
  product_sku: optionalString,
  unit: z.string(),
  quantity: z.number().int().positive('Số lượng phải lớn hơn 0'),
  unit_price: positiveNumber,
  discount_percent: z.number().min(0).max(100).optional().default(0),
  notes: optionalString,
});

export const orderSchema = z.object({
  customer_id: requiredString('Khách hàng'),
  expected_delivery_date: optionalString,
  shipping_address: optionalString,
  notes: optionalString,
  items: z.array(orderItemSchema).min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm'),
});

export const updateOrderSchema = z.object({
  expected_delivery_date: optionalString,
  shipping_address: optionalString,
  notes: optionalString,
  status: z.enum([
    'draft',
    'pending',
    'approved',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ]).optional(),
});

export type OrderFormData = z.infer<typeof orderSchema>;
export type OrderItemFormData = z.infer<typeof orderItemSchema>;
export type UpdateOrderFormData = z.infer<typeof updateOrderSchema>;

// ==================== Delivery Schemas ====================
export const deliverySchema = z.object({
  order_id: requiredString('Đơn hàng'),
  customer_id: requiredString('Khách hàng'),
  shipping_address: requiredString('Địa chỉ giao hàng'),
  expected_date: requiredString('Ngày giao dự kiến'),
  driver_id: optionalString,
  vehicle_info: optionalString,
  notes: optionalString,
});

export const updateDeliverySchema = z.object({
  expected_date: optionalString,
  driver_id: optionalString,
  vehicle_info: optionalString,
  shipping_address: optionalString,
  notes: optionalString,
  status: z.enum([
    'pending',
    'assigned',
    'in_transit',
    'delivered',
    'failed',
    'returned',
  ]).optional(),
});

export const completeDeliverySchema = z.object({
  items: z.array(z.object({
    itemId: z.string(),
    quantity: nonNegativeNumber,
  })),
  signature: optionalString,
  photos: z.array(z.string()).optional(),
  notes: optionalString,
});

export type DeliveryFormData = z.infer<typeof deliverySchema>;
export type UpdateDeliveryFormData = z.infer<typeof updateDeliverySchema>;
export type CompleteDeliveryFormData = z.infer<typeof completeDeliverySchema>;

// ==================== Receivable Schemas ====================
export const receivableSchema = z.object({
  customer_id: requiredString('Khách hàng'),
  order_id: optionalString,
  delivery_id: optionalString,
  amount: positiveNumber,
  due_date: requiredString('Ngày đến hạn'),
  notes: optionalString,
});

export const paymentSchema = z.object({
  amount: positiveNumber,
  payment_method: z.enum(['cash', 'bank_transfer', 'check', 'other']),
  payment_date: optionalString,
  reference_number: optionalString,
  notes: optionalString,
});

export type ReceivableFormData = z.infer<typeof receivableSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;

// ==================== Inventory Schemas ====================
export const inventorySchema = z.object({
  product_id: requiredString('Sản phẩm'),
  warehouse_id: optionalString,
  quantity: nonNegativeNumber,
  min_quantity: nonNegativeNumber.optional(),
  max_quantity: nonNegativeNumber.optional(),
  reorder_point: nonNegativeNumber.optional(),
  location: optionalString,
});

export const inventoryAdjustmentSchema = z.object({
  product_id: requiredString('Sản phẩm'),
  warehouse_id: optionalString,
  adjustment_type: z.enum(['in', 'out', 'adjustment', 'transfer']),
  quantity: positiveNumber,
  reason: requiredString('Lý do'),
  notes: optionalString,
});

export const inventoryTransferSchema = z.object({
  product_id: requiredString('Sản phẩm'),
  from_warehouse_id: requiredString('Kho nguồn'),
  to_warehouse_id: requiredString('Kho đích'),
  quantity: positiveNumber,
  notes: optionalString,
}).refine(
  (data) => data.from_warehouse_id !== data.to_warehouse_id,
  {
    message: 'Kho nguồn và kho đích không được trùng nhau',
    path: ['to_warehouse_id'],
  }
);

export const warehouseSchema = z.object({
  name: requiredString('Tên kho'),
  code: optionalString,
  address: optionalString,
});

export type InventoryFormData = z.infer<typeof inventorySchema>;
export type InventoryAdjustmentFormData = z.infer<typeof inventoryAdjustmentSchema>;
export type InventoryTransferFormData = z.infer<typeof inventoryTransferSchema>;
export type WarehouseFormData = z.infer<typeof warehouseSchema>;

// ==================== Customer Visit Schemas ====================
export const customerVisitSchema = z.object({
  customer_id: requiredString('Khách hàng'),
  visit_type: z.enum(['sales', 'collection', 'support', 'other']).default('sales'),
  purpose: optionalString,
  notes: optionalString,
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type CustomerVisitFormData = z.infer<typeof customerVisitSchema>;

// ==================== Helper Functions ====================
export const validateForm = <T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> } => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  });
  
  return { success: false, errors };
};

export const getFieldError = (
  errors: Record<string, string> | undefined,
  fieldName: string
): string | undefined => {
  return errors?.[fieldName];
};
