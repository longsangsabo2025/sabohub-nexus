
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

async function checkConstraints() {
  console.log('Checking constraints for employees table...');
  
  try {
    const res = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'employees'::regclass;
    `);
    
    console.table(res.rows);
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    await pool.end();
  }
}

checkConstraints();
