-- FIX AUTO-DELEGATE: Tạo company record cho CEO
-- Issue: GET /companies?ceo_id=... returns 400 → No metrics → Auto-Delegate không trigger

-- 1. Kiểm tra xem CEO đã có company chưa
SELECT id, name, ceo_id 
FROM companies 
WHERE ceo_id = '944f7536-6c9a-4bea-99fc-f1c984fef2ef';

-- 2. Nếu không có, tạo company mới
INSERT INTO companies (id, name, ceo_id, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'SABO Tech Company',
  '944f7536-6c9a-4bea-99fc-f1c984fef2ef',
  NOW(),
  NOW()
)
ON CONFLICT (ceo_id) DO NOTHING;

-- 3. Verify
SELECT 
  c.id as company_id,
  c.name,
  c.ceo_id,
  u.email as ceo_email
FROM companies c
LEFT JOIN auth.users u ON u.id = c.ceo_id
WHERE c.ceo_id = '944f7536-6c9a-4bea-99fc-f1c984fef2ef';
