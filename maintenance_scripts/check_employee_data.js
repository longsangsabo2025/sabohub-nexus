import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const connectionString = process.env.VITE_SUPABASE_POOLER_URL || process.env.DATABASE_URL;

const client = new pg.Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkData() {
  try {
    await client.connect();
    console.log('Connected.');

    // Get one employee
    const res = await client.query('SELECT id, full_name, role, base_salary, bank_account_number FROM employees LIMIT 5');
    console.log('Employees data:', res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkData();
