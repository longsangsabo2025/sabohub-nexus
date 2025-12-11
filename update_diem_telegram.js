
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDiem() {
  const { error } = await supabase
    .from('employees')
    .update({ telegram_chat_id: '7591543439' })
    .eq('email', 'diem@sabohub.com');

  if (error) {
    console.error('Error updating Diem:', error);
  } else {
    console.log('Successfully updated Telegram ID for Võ Ngọc Diễm');
  }
}

updateDiem();
