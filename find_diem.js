
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findDiem() {
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name, role, email, telegram_chat_id')
    .ilike('full_name', '%diem%');

  if (error) {
    console.error('Error finding Diem:', error);
    return;
  }

  console.log('Found employees matching "diem":', data);
}

findDiem();
