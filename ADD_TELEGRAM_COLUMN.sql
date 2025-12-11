-- Add telegram_chat_id to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_telegram_chat_id ON employees(telegram_chat_id);
