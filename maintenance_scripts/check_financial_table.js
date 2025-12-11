
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role if available for admin tasks

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

// Use service role key if possible to bypass RLS and get schema info if needed, 
// but for inspecting columns via rpc or just trying to select, anon might be enough if RLS allows.
// However, to inspect information_schema, we might need direct SQL access or a specific function.
// Since we don't have direct SQL access via this script easily without a connection string, 
// we will try to insert a dummy record and see the error, or select * limit 1.

const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

async function checkTable() {
  console.log('Checking financial_transactions table...');

  // Try to select one row
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error selecting from table:', error);
    
    // If error is about schema cache, we might need to reload it.
    // In Supabase, we can reload schema cache by running: NOTIFY pgrst, 'reload schema';
    // But we can't run raw SQL via supabase-js client easily unless we have a function for it.
    
    // Let's try to see if we can infer columns from the error or if it works.
  } else {
    console.log('Table exists. Data sample:', data);
    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('Table is empty.');
    }
  }
}

async function reloadSchema() {
    // This is a hacky way to try to force a schema reload if we have the rpc function set up, 
    // or we can try to use the 'pg' library if we have the connection string.
    // Since we used 'pg' in previous scripts, let's look for a script that uses 'pg'.
    console.log('Attempting to reload schema cache via SQL...');
}

checkTable();
