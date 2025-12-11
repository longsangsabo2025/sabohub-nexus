
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectionString = process.env.VITE_SUPABASE_POOLER_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: VITE_SUPABASE_POOLER_URL or DATABASE_URL is not defined in .env');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkEmployee() {
  console.log('Checking employee data for diem@sabohub.com...');
  
  try {
    const res = await pool.query("SELECT * FROM employees WHERE email = 'diem@sabohub.com'");
    
    if (res.rows.length > 0) {
      const emp = res.rows[0];
      console.log('Employee found:', emp.full_name);
      console.log('ID:', emp.id);
      console.log('Company ID:', emp.company_id);
      console.log('Role:', emp.role);
      console.log('Base Salary:', emp.base_salary);
      console.log('Hourly Rate:', emp.hourly_rate);
      console.log('Bank Name:', emp.bank_name);
      console.log('Bank Account:', emp.bank_account_number);
      console.log('Salary Type:', emp.salary_type);
      console.log('Employment Type:', emp.employment_type);
    } else {
      console.log('Employee not found');
    }
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    await pool.end();
  }
}

checkEmployee();
