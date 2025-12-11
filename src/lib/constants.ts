// App constants
export const APP_NAME = 'SABOHUB';
export const APP_VERSION = '1.0.0';

// Pagination
export const ITEMS_PER_PAGE = 20;
export const MAX_ITEMS_PER_PAGE = 100;

// Cache times (in milliseconds)
export const CACHE_TIME = {
  SHORT: 1000 * 60 * 5, // 5 minutes
  MEDIUM: 1000 * 60 * 15, // 15 minutes
  LONG: 1000 * 60 * 60, // 1 hour
};

// Task constants
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const TASK_CATEGORIES = {
  SALES: 'sales',
  ADMIN: 'admin',
  OPERATIONS: 'operations',
  MAINTENANCE: 'maintenance',
  INVENTORY: 'inventory',
  CUSTOMER_SERVICE: 'customer_service',
  OTHER: 'other',
} as const;

// Employee roles
export const EMPLOYEE_ROLES = {
  CEO: 'ceo',
  MANAGER: 'manager',
  SHIFT_LEADER: 'shift_leader',
  STAFF: 'staff',
} as const;

// Role labels
export const ROLE_LABELS: Record<string, string> = {
  ceo: 'CEO',
  manager: 'Quản lý',
  shift_leader: 'Tổ trưởng',
  staff: 'Nhân viên',
};

// Status labels
export const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  in_progress: 'Đang làm',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

// Priority labels
export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
};

// Category labels
export const CATEGORY_LABELS: Record<string, string> = {
  sales: 'Kinh doanh',
  admin: 'Hành chính',
  operations: 'Vận hành',
  maintenance: 'Bảo trì',
  inventory: 'Kho hàng',
  customer_service: 'Khách hàng',
  other: 'Khác',
};

