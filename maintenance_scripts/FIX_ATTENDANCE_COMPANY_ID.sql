-- Make company_id nullable to prevent blocking errors
ALTER TABLE attendance ALTER COLUMN company_id DROP NOT NULL;
