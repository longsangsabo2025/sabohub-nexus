
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.VITE_SUPABASE_POOLER_URL;

if (!connectionString) {
  console.error('Error: VITE_SUPABASE_POOLER_URL is not defined in .env');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkFinancialData() {
  try {
    await client.connect();
    console.log('Connected to database.');

    const res = await client.query(`
      SELECT count(*) as total, company_id, created_by 
      FROM financial_transactions 
      GROUP BY company_id, created_by;
    `);
    
    console.log('Financial Transactions Summary:');
    console.table(res.rows);

    const recent = await client.query(`
      SELECT id, date, amount, description, created_at 
      FROM financial_transactions 
      ORDER BY created_at DESC 
      LIMIT 5;
    `);
    
    console.log('Recent Transactions:');
    console.table(recent.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkFinancialData();
