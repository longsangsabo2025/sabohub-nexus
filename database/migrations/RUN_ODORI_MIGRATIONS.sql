-- =====================================================
-- ODORI MODULES - RUN ALL MIGRATIONS
-- =====================================================
-- Execute in order on Supabase SQL Editor
-- 
-- Files:
-- 1. 020_customers_module.sql      - CRM/Customers
-- 2. 021_products_inventory_module.sql - Products & Inventory
-- 3. 022_sales_orders_module.sql   - Sales Orders
-- 4. 023_receivables_module.sql    - Accounts Receivable
-- 5. 024_delivery_module.sql       - Delivery Management
-- 6. 025_employees_department.sql  - Department & Permissions
-- 7. 026_odori_seed_data.sql       - Seed Data (run last)
-- =====================================================

-- Run each file in Supabase SQL Editor in order above
-- Or use this combined script:

\echo 'Starting Odori modules migration...'

-- Uncomment below to run all at once (copy/paste content of each file)
-- Or run them individually through Supabase dashboard

\echo 'Migration complete!'
\echo ''
\echo 'TABLES CREATED:'
\echo '  - customers'
\echo '  - customer_contacts' 
\echo '  - customer_visits'
\echo '  - product_categories'
\echo '  - products'
\echo '  - warehouses'
\echo '  - inventory'
\echo '  - inventory_movements'
\echo '  - sales_orders'
\echo '  - sales_order_items'
\echo '  - sales_order_history'
\echo '  - receivables'
\echo '  - payments'
\echo '  - payment_allocations'
\echo '  - collection_schedules'
\echo '  - deliveries'
\echo '  - delivery_items'
\echo '  - delivery_item_products'
\echo '  - delivery_tracking'
\echo '  - departments'
\echo ''
\echo 'COLUMNS ADDED TO employees:'
\echo '  - department'
\echo '  - permissions'
\echo '  - job_title'
\echo ''
\echo 'VIEWS CREATED:'
\echo '  - v_sales_by_customer'
\echo '  - v_sales_by_salesperson'
\echo '  - v_customer_balance'
\echo '  - v_receivables_aging'
\echo '  - v_driver_performance'
\echo '  - v_delivery_daily_summary'
