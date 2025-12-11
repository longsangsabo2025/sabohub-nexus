import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.VITE_SUPABASE_TRANSACTION_POOLER,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    console.log('Checking companies table schema...');
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'companies'
    `);
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkSchema();
