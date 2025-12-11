
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

async function inspectTable() {
  try {
    await client.connect();
    console.log('Connected to database via Transaction Pooler.');

    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'financial_transactions'
      ORDER BY ordinal_position;
    `);

    console.log('\n--- Table Structure: financial_transactions ---');
    if (res.rows.length === 0) {
        console.log('Table not found!');
    } else {
        console.table(res.rows);
    }

  } catch (err) {
    console.error('Error inspecting table:', err);
  } finally {
    await client.end();
  }
}

inspectTable();
