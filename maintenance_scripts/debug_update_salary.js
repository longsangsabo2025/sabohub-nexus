
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugUpdate() {
  console.log('Attempting to update salary for diem@sabohub.com using Service Role...');
  
  const { data, error } = await supabase
    .from('employees')
    .update({ 
      base_salary: 8000000,
      updated_at: new Date().toISOString()
    })
    .eq('email', 'diem@sabohub.com')
    .select();

  if (error) {
    console.error('Update Error:', error);
  } else {
    console.log('Update Success. Rows affected:', data.length);
    if (data.length > 0) {
      console.log('Updated data:', data[0]);
    } else {
      console.log('No rows updated! Check if email matches exactly.');
    }
  }
}

debugUpdate();
