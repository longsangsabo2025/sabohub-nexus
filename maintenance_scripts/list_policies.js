
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

async function listPolicies() {
  console.log('Listing policies for employees table...');
  
  try {
    const res = await pool.query(`
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM
        pg_policies
      WHERE
        tablename = 'employees';
    `);
    
    console.table(res.rows);
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    await pool.end();
  }
}

listPolicies();
