
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name, role, email, telegram_chat_id');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('All Employees:', data);
}

listEmployees();
