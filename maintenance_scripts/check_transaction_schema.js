import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.VITE_SUPABASE_POOLER_URL;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function checkTransactionSchema() {
  try {
    await client.connect();
    console.log('Connected.');

    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'financial_transactions'
    `);
    console.table(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkTransactionSchema();
