
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const createRpcSql = `
CREATE OR REPLACE FUNCTION submit_daily_report(
  p_employee_id UUID,
  p_company_id UUID,
  p_branch_id UUID,
  p_report_date DATE,
  p_check_in_time TIMESTAMPTZ,
  p_check_out_time TIMESTAMPTZ,
  p_total_hours NUMERIC,
  p_tasks_summary TEXT,
  p_achievements TEXT,
  p_challenges TEXT,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO daily_work_reports (
    employee_id,
    company_id,
    branch_id,
    report_date,
    check_in_time,
    check_out_time,
    total_hours,
    tasks_summary,
    achievements,
    challenges,
    notes
  ) VALUES (
    p_employee_id,
    p_company_id,
    p_branch_id,
    p_report_date,
    p_check_in_time,
    p_check_out_time,
    p_total_hours,
    p_tasks_summary,
    p_achievements,
    p_challenges,
    p_notes
  );
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
`;

async function deployRpc() {
  console.log('Deploying submit_daily_report RPC...');
  
  const { error } = await supabase.rpc('exec_sql', { query: createRpcSql });
  
  if (error) {
    // If exec_sql is not available (it's a custom RPC itself), we might need another way.
    // But looking at the codebase, exec_sql seems common.
    console.error('Error deploying RPC:', error);
    
    // Fallback: Try to run it as raw SQL if possible (not possible with JS client usually unless using pg)
    // But we have pg client in other scripts.
  } else {
    console.log('RPC deployed successfully!');
  }
}

deployRpc();
