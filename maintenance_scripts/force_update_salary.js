
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

async function forceUpdate() {
  console.log('Forcing update of salary for diem@sabohub.com...');
  
  try {
    const res = await pool.query(`
      UPDATE employees 
      SET 
        base_salary = 8000000,
        salary_type = 'fixed',
        employment_type = 'full_time',
        updated_at = NOW()
      WHERE email = 'diem@sabohub.com'
      RETURNING *;
    `);
    
    if (res.rows.length > 0) {
      console.log('Update SUCCESS via Postgres!');
      console.log('New Base Salary:', res.rows[0].base_salary);
    } else {
      console.log('Update FAILED: Employee not found.');
    }
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    await pool.end();
  }
}

forceUpdate();
