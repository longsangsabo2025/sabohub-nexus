-- =====================================================
-- RUN ALL DMS MIGRATIONS AT ONCE
-- =====================================================
-- Execute in Supabase SQL Editor
-- This will run all 5 DMS migrations (033-037) in sequence
-- =====================================================

\echo '========================================';
\echo 'Starting DMS Migrations (033-037)';
\echo '========================================';
\echo '';

-- Include all migration files
\i 033_create_distributor_portal.sql
\i 034_create_sell_in_sell_out.sql
\i 035_create_sales_routes.sql
\i 036_create_store_visits.sql
\i 037_create_accounting_module.sql

\echo '';
\echo '========================================';
\echo '✓ DMS Migrations Complete!';
\echo '========================================';
\echo '';
\echo 'TABLES CREATED:';
\echo '  Distribution Management:';
\echo '    - dms_distributors (NPP master data)';
\echo '    - dms_distributor_territories';
\echo '    - dms_price_lists';
\echo '    - dms_price_list_items';
\echo '    - dms_distributor_price_lists';
\echo '    - dms_distributor_promotions';
\echo '    - dms_quick_order_templates';
\echo '';
\echo '  Sell-In/Out:';
\echo '    - dms_sell_in_transactions';
\echo '    - dms_sell_out_transactions';
\echo '    - dms_distributor_inventory';
\echo '    - dms_sell_through_metrics';
\echo '';
\echo '  Sales Routes:';
\echo '    - dms_routes';
\echo '    - dms_route_customers';
\echo '    - dms_route_journeys';
\echo '    - dms_route_checkins';
\echo '';
\echo '  Store Visits:';
\echo '    - dms_visit_checklists';
\echo '    - dms_checklist_items';
\echo '    - dms_store_visits';
\echo '    - dms_visit_checklist_responses';
\echo '    - dms_store_inventory_checks';
\echo '    - dms_competitor_tracking';
\echo '    - dms_pos_material_deployment';
\echo '';
\echo '  Accounting:';
\echo '    - dms_chart_of_accounts';
\echo '    - dms_journal_entries';
\echo '    - dms_journal_entry_lines';
\echo '    - dms_general_ledger';
\echo '    - dms_fiscal_periods';
\echo '';
\echo 'TOTAL: 30 new tables';
\echo '';
\echo 'FEATURES ENABLED:';
\echo '  ✓ Auto-numbering (NPP, PL, SI, SO, RT, JN, CL, VS, JE codes)';
\echo '  ✓ Row Level Security (RLS)';
\echo '  ✓ Triggers for inventory updates';
\echo '  ✓ Fiscal period management';
\echo '  ✓ Double-entry validation';
\echo '  ✓ Visit scoring engine';
\echo '';
\echo 'Next Steps:';
\echo '  1. Test web UI: https://hub.saboarena.com';
\echo '  2. Access DMS routes: /dms/distributor-portal, /dms/price-lists, etc.';
\echo '  3. Seed standard COA in Accounting module';
\echo '  4. Create test data for distributors';
\echo '';
