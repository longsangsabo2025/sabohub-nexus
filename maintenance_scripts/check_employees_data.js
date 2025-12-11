import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const connectionString = process.env.VITE_SUPABASE_POOLER_URL;

if (!connectionString) {
  console.error('Error: VITE_SUPABASE_POOLER_URL is not defined');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkEmployees() {
  try {
    await client.connect();
    console.log('Connected to DB');
    
    // Check employees schema
    console.log('--- Employees Schema ---');
    const schemaRes = await client.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees';
    `);
    console.table(schemaRes.rows);

    // Check first 5 employees data
    console.log('--- Employees Data (First 5) ---');
    const dataRes = await client.query(`
      SELECT id, full_name, branch_id, company_id FROM employees LIMIT 5;
    `);
    console.table(dataRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkEmployees();