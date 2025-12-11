import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Or SERVICE_ROLE_KEY if RLS needs bypass

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function triggerReport() {
  console.log('Triggering daily executive report...');
  
  // Calculate yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = yesterday.toISOString().split('T')[0];

  console.log(`Target Date: ${targetDate}`);

  const { data, error } = await supabase.rpc('generate_daily_executive_report', {
    target_date: targetDate
  });

  if (error) {
    console.error('Error generating report:', error);
    process.exit(1);
  }

  console.log('Report generated successfully:', data);
}

triggerReport();
