
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const client = createClient(supabaseUrl, supabaseKey);

async function enableRealtime() {
  // We can't easily alter publication via JS client unless we use rpc or direct SQL connection.
  // But we can try to use the apply_auto_report.js approach which uses 'pg' client.
  console.log('Please run this SQL in Supabase Dashboard if this script fails:');
  console.log('ALTER PUBLICATION supabase_realtime ADD TABLE executive_reports;');
}

enableRealtime();
