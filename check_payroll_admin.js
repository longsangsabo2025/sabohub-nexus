import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

// Use the direct postgres connection string which gives full access
const connectionString = process.env.VITE_SUPABASE_POOLER_URL;

if (!connectionString) {
  console.error('No connection string found!');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkPayrollData() {
  try {
    await client.connect();
    console.log('Connected to database as admin (direct connection).');

    // Query specific payroll columns
    const query = `
      SELECT 
        full_name, 
        role, 
        employment_type, 
        salary_type, 
        base_salary, 
        hourly_rate, 
        bank_account_number,
        bank_name
      FROM employees 
      ORDER BY updated_at DESC
      LIMIT 5;
    `;

    const res = await client.query(query);
    console.table(res.rows);

  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await client.end();
  }
}

checkPayrollData();
