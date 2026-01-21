-- =====================================================
-- Migration: 026_odori_seed_data.sql
-- Description: Seed data for Odori company
-- Note: Run this AFTER all other migrations
-- =====================================================

-- =====================================================
-- IMPORTANT: Replace these UUIDs with actual values after creating
-- the company owner user in Supabase Auth
-- =====================================================

-- Variables (use DO block for flexibility)
DO $$
DECLARE
  v_company_id UUID;
  v_branch_nam_id UUID;
  v_branch_trung_id UUID;
  v_branch_bac_id UUID;
  v_warehouse_main_id UUID;
  v_category_nuoc_id UUID;
  v_category_thuc_pham_id UUID;
BEGIN

-- =====================================================
-- 1. CREATE COMPANY
-- =====================================================
INSERT INTO public.companies (id, name, business_type, address, phone, email, settings)
VALUES (
  gen_random_uuid(),
  'Odori',
  'Sản xuất & Thương mại',
  'TP. Hồ Chí Minh',
  '0123456789',
  'contact@odori.vn',
  '{
    "modules": {
      "employees": true,
      "attendance": true,
      "tasks": true,
      "crm": true,
      "inventory": true,
      "sales_orders": true,
      "receivables": true,
      "delivery": true,
      "reports": true
    },
    "customer_types": ["retail", "wholesale", "distributor", "horeca"],
    "payment_terms": [0, 7, 15, 30],
    "order_approval_required": true,
    "order_approval_threshold": 5000000,
    "default_tax_percent": 8
  }'::JSONB
)
RETURNING id INTO v_company_id;

RAISE NOTICE 'Created company Odori with ID: %', v_company_id;

-- =====================================================
-- 2. CREATE BRANCHES (Khu vực)
-- =====================================================
INSERT INTO public.branches (id, company_id, name, code, address)
VALUES 
  (gen_random_uuid(), v_company_id, 'Khu vực Miền Nam', 'NAM', 'TP. Hồ Chí Minh'),
  (gen_random_uuid(), v_company_id, 'Khu vực Miền Trung', 'TRUNG', 'Đà Nẵng'),
  (gen_random_uuid(), v_company_id, 'Khu vực Miền Bắc', 'BAC', 'Hà Nội');

SELECT id INTO v_branch_nam_id FROM public.branches WHERE company_id = v_company_id AND code = 'NAM';
SELECT id INTO v_branch_trung_id FROM public.branches WHERE company_id = v_company_id AND code = 'TRUNG';
SELECT id INTO v_branch_bac_id FROM public.branches WHERE company_id = v_company_id AND code = 'BAC';

RAISE NOTICE 'Created 3 branches: NAM=%, TRUNG=%, BAC=%', v_branch_nam_id, v_branch_trung_id, v_branch_bac_id;

-- =====================================================
-- 3. CREATE DEPARTMENTS
-- =====================================================
INSERT INTO public.departments (company_id, code, name, description, default_permissions, sort_order)
VALUES 
  (v_company_id, 'management', 'Quản lý', 'RSM, ASM, Supervisor', '{"view_reports": true, "approve_orders": true}'::JSONB, 1),
  (v_company_id, 'sales', 'Bán hàng', 'Sale, Sale Admin', '{"can_create_orders": true, "can_view_customers": true}'::JSONB, 2),
  (v_company_id, 'customer_service', 'CSKH', 'Chăm sóc khách hàng', '{"can_view_all_customers": true, "can_update_customers": true}'::JSONB, 3),
  (v_company_id, 'warehouse', 'Kho', 'Nhân viên kho', '{"can_manage_inventory": true}'::JSONB, 4),
  (v_company_id, 'delivery', 'Giao hàng', 'Tài xế, phụ xe', '{"can_manage_deliveries": true, "can_collect_payments": true}'::JSONB, 5),
  (v_company_id, 'finance', 'Kế toán', 'Kế toán, thu hồi công nợ', '{"can_view_financials": true, "can_collect_payments": true}'::JSONB, 6);

-- =====================================================
-- 4. CREATE WAREHOUSES
-- =====================================================
INSERT INTO public.warehouses (id, company_id, branch_id, code, name, address, type)
VALUES
  (gen_random_uuid(), v_company_id, v_branch_nam_id, 'WH-NAM', 'Kho Miền Nam', 'TP. HCM', 'main'),
  (gen_random_uuid(), v_company_id, v_branch_trung_id, 'WH-TRUNG', 'Kho Miền Trung', 'Đà Nẵng', 'main'),
  (gen_random_uuid(), v_company_id, v_branch_bac_id, 'WH-BAC', 'Kho Miền Bắc', 'Hà Nội', 'main');

SELECT id INTO v_warehouse_main_id FROM public.warehouses WHERE company_id = v_company_id AND code = 'WH-NAM';

-- =====================================================
-- 5. CREATE PRODUCT CATEGORIES
-- =====================================================
INSERT INTO public.product_categories (id, company_id, name, slug, sort_order)
VALUES
  (gen_random_uuid(), v_company_id, 'Nước giải khát', 'nuoc-giai-khat', 1),
  (gen_random_uuid(), v_company_id, 'Thực phẩm', 'thuc-pham', 2),
  (gen_random_uuid(), v_company_id, 'Đồ uống có cồn', 'do-uong-co-con', 3),
  (gen_random_uuid(), v_company_id, 'Snack & Bánh kẹo', 'snack-banh-keo', 4);

SELECT id INTO v_category_nuoc_id FROM public.product_categories WHERE company_id = v_company_id AND slug = 'nuoc-giai-khat';
SELECT id INTO v_category_thuc_pham_id FROM public.product_categories WHERE company_id = v_company_id AND slug = 'thuc-pham';

-- =====================================================
-- 6. CREATE SAMPLE PRODUCTS
-- =====================================================
INSERT INTO public.products (company_id, category_id, sku, name, unit, cost_price, selling_price, wholesale_price, min_stock, status)
VALUES
  -- Nước giải khát
  (v_company_id, v_category_nuoc_id, 'NGK-001', 'Nước suối Odori 500ml', 'thùng', 50000, 72000, 65000, 100, 'active'),
  (v_company_id, v_category_nuoc_id, 'NGK-002', 'Nước suối Odori 1.5L', 'thùng', 80000, 110000, 100000, 50, 'active'),
  (v_company_id, v_category_nuoc_id, 'NGK-003', 'Trà xanh Odori 350ml', 'thùng', 120000, 168000, 150000, 80, 'active'),
  (v_company_id, v_category_nuoc_id, 'NGK-004', 'Nước cam Odori 330ml', 'thùng', 140000, 192000, 175000, 60, 'active'),
  
  -- Thực phẩm
  (v_company_id, v_category_thuc_pham_id, 'TP-001', 'Mì gói Odori - Vị bò', 'thùng', 180000, 250000, 230000, 100, 'active'),
  (v_company_id, v_category_thuc_pham_id, 'TP-002', 'Mì gói Odori - Vị gà', 'thùng', 180000, 250000, 230000, 100, 'active'),
  (v_company_id, v_category_thuc_pham_id, 'TP-003', 'Bánh quy Odori 250g', 'thùng', 200000, 280000, 260000, 50, 'active');

-- =====================================================
-- 7. CREATE SAMPLE CUSTOMERS
-- =====================================================
INSERT INTO public.customers (company_id, branch_id, code, name, type, channel, phone, address, city, payment_terms, credit_limit, status)
VALUES
  -- Miền Nam
  (v_company_id, v_branch_nam_id, 'KH000001', 'Siêu thị CoopMart Quận 1', 'retail', 'mt', '028-1234567', '123 Nguyễn Huệ, Q.1', 'TP. HCM', 30, 100000000, 'active'),
  (v_company_id, v_branch_nam_id, 'KH000002', 'Nhà hàng Hải Sản Biển Đông', 'horeca', 'horeca', '028-2345678', '456 Lê Lợi, Q.1', 'TP. HCM', 15, 50000000, 'active'),
  (v_company_id, v_branch_nam_id, 'KH000003', 'Đại lý Thành Công', 'distributor', 'gt', '0901234567', '789 Cách Mạng Tháng 8, Q.3', 'TP. HCM', 30, 200000000, 'active'),
  (v_company_id, v_branch_nam_id, 'KH000004', 'Tạp hóa Bà Ba', 'retail', 'gt', '0912345678', '12 Nguyễn Văn Cừ, Q.5', 'TP. HCM', 0, 0, 'active'),
  
  -- Miền Trung
  (v_company_id, v_branch_trung_id, 'KH000005', 'Siêu thị Big C Đà Nẵng', 'retail', 'mt', '0236-1234567', '255 Hùng Vương', 'Đà Nẵng', 30, 150000000, 'active'),
  (v_company_id, v_branch_trung_id, 'KH000006', 'Nhà hàng Sơn Trà', 'horeca', 'horeca', '0905123456', '88 Bạch Đằng', 'Đà Nẵng', 15, 30000000, 'active'),
  
  -- Miền Bắc
  (v_company_id, v_branch_bac_id, 'KH000007', 'Siêu thị Vinmart Hà Nội', 'retail', 'mt', '024-1234567', '191 Bà Triệu', 'Hà Nội', 30, 200000000, 'active'),
  (v_company_id, v_branch_bac_id, 'KH000008', 'Đại lý Hoàng Long', 'distributor', 'gt', '0982123456', '45 Phố Huế', 'Hà Nội', 30, 300000000, 'active');

-- =====================================================
-- 8. SUMMARY
-- =====================================================
RAISE NOTICE '============================================';
RAISE NOTICE 'ODORI SEED DATA COMPLETE';
RAISE NOTICE '============================================';
RAISE NOTICE 'Company ID: %', v_company_id;
RAISE NOTICE 'Branches: 3 (Nam, Trung, Bắc)';
RAISE NOTICE 'Departments: 6';
RAISE NOTICE 'Warehouses: 3';
RAISE NOTICE 'Product Categories: 4';
RAISE NOTICE 'Products: 7';
RAISE NOTICE 'Customers: 8';
RAISE NOTICE '============================================';
RAISE NOTICE 'NEXT STEPS:';
RAISE NOTICE '1. Create users in Supabase Auth';
RAISE NOTICE '2. Link users to employees with correct company_id';
RAISE NOTICE '3. Set department and permissions for each employee';
RAISE NOTICE '============================================';

END $$;

-- =====================================================
-- SAMPLE EMPLOYEE INSERT (uncomment and modify after creating auth users)
-- =====================================================
/*
-- Example: Insert employees after creating auth users

-- RSM (CEO level)
INSERT INTO public.employees (company_id, user_id, full_name, email, phone, role, department, job_title, status)
VALUES (
  '<company_id>', 
  '<auth_user_id>',
  'Nguyễn Văn A',
  'rsm@odori.vn',
  '0901111111',
  'ceo',
  'management',
  'Regional Sales Manager',
  'active'
);

-- ASM Miền Nam
INSERT INTO public.employees (company_id, branch_id, user_id, full_name, email, phone, role, department, job_title, status)
VALUES (
  '<company_id>',
  '<branch_nam_id>',
  '<auth_user_id>',
  'Trần Văn B',
  'asm.nam@odori.vn',
  '0902222222',
  'manager',
  'management',
  'Area Sales Manager - Miền Nam',
  'active'
);

-- Supervisor
INSERT INTO public.employees (company_id, branch_id, user_id, full_name, email, phone, role, department, job_title, status)
VALUES (
  '<company_id>',
  '<branch_nam_id>',
  '<auth_user_id>',
  'Lê Thị C',
  'sup.nam1@odori.vn',
  '0903333333',
  'shift_leader',
  'management',
  'Supervisor',
  'active'
);

-- Sale
INSERT INTO public.employees (company_id, branch_id, user_id, full_name, email, phone, role, department, job_title, status, permissions)
VALUES (
  '<company_id>',
  '<branch_nam_id>',
  '<auth_user_id>',
  'Phạm Văn D',
  'sale1@odori.vn',
  '0904444444',
  'staff',
  'sales',
  'Nhân viên bán hàng',
  'active',
  '{"can_create_orders": true, "max_discount_percent": 5}'::JSONB
);

-- Sale Admin
INSERT INTO public.employees (company_id, branch_id, user_id, full_name, email, phone, role, department, job_title, status, permissions)
VALUES (
  '<company_id>',
  '<branch_nam_id>',
  '<auth_user_id>',
  'Nguyễn Thị E',
  'saleadmin@odori.vn',
  '0905555555',
  'staff',
  'sales',
  'Sale Admin',
  'active',
  '{"can_create_orders": true, "can_manage_orders": true}'::JSONB
);

-- CSKH
INSERT INTO public.employees (company_id, branch_id, user_id, full_name, email, phone, role, department, job_title, status, permissions)
VALUES (
  '<company_id>',
  '<branch_nam_id>',
  '<auth_user_id>',
  'Hoàng Văn F',
  'cskh@odori.vn',
  '0906666666',
  'staff',
  'customer_service',
  'Nhân viên CSKH',
  'active',
  '{"can_view_all_customers": true, "can_update_customers": true}'::JSONB
);

-- Warehouse
INSERT INTO public.employees (company_id, branch_id, user_id, full_name, email, phone, role, department, job_title, status, permissions)
VALUES (
  '<company_id>',
  '<branch_nam_id>',
  '<auth_user_id>',
  'Trương Văn G',
  'kho@odori.vn',
  '0907777777',
  'staff',
  'warehouse',
  'Nhân viên kho',
  'active',
  '{"can_manage_inventory": true}'::JSONB
);

-- Driver
INSERT INTO public.employees (company_id, branch_id, user_id, full_name, email, phone, role, department, job_title, status, permissions)
VALUES (
  '<company_id>',
  '<branch_nam_id>',
  '<auth_user_id>',
  'Đinh Văn H',
  'driver1@odori.vn',
  '0908888888',
  'staff',
  'delivery',
  'Tài xế giao hàng',
  'active',
  '{"can_manage_deliveries": true, "can_collect_payments": true}'::JSONB
);
*/
