
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const connectionString = process.env.VITE_SUPABASE_POOLER_URL;

if (!connectionString) {
  console.error('Error: VITE_SUPABASE_POOLER_URL is not defined in .env');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixSchema() {
  try {
    await client.connect();
    console.log('Connected to database.');

    // 1. Check if column exists
    const checkRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'financial_transactions';
    `);
    
    console.log('Current columns in financial_transactions:', checkRes.rows.map(r => r.column_name));

    const hasDate = checkRes.rows.some(r => r.column_name === 'date');
    if (!hasDate) {
        console.log('Column "date" is MISSING! Attempting to add it...');
        await client.query(`ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ NOT NULL DEFAULT NOW();`);
        console.log('Column "date" added.');
    } else {
        console.log('Column "date" exists.');
    }

    // 2. Reload PostgREST schema cache
    console.log('Reloading PostgREST schema cache...');
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('Schema cache reload notified.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fixSchema();
