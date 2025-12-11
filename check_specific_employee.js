
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

async function checkEmployee() {
  console.log('Checking employee data for diem@sabohub.com...');
  
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('email', 'diem@sabohub.com');

  if (error) {
    console.error('Error fetching employee:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Employee found:', data[0]);
    console.log('Base Salary:', data[0].base_salary);
    console.log('Bank Account:', data[0].bank_account_number);
    console.log('Bank Name:', data[0].bank_name);
  } else {
    console.log('Employee not found');
  }
}

checkEmployee();
