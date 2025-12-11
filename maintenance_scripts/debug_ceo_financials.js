
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

async function debugCeoFinancials() {
  try {
    await client.connect();
    console.log('Connected to database.');

    console.log('--- Companies Schema ---');
    const schemaRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'companies'
    `);
    console.log(schemaRes.rows.map(r => r.column_name).join(', '));

    console.log('--- Companies ---');
    const companies = await client.query('SELECT * FROM companies LIMIT 5');
    console.table(companies.rows);

    console.log('--- Financial Transactions Sample ---');
    const transactions = await client.query('SELECT id, company_id, created_by, amount, date FROM financial_transactions LIMIT 5');
    console.table(transactions.rows);

    console.log('--- RLS Policies on financial_transactions ---');
    const policies = await client.query(`
      SELECT policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'financial_transactions'
    `);
    console.table(policies.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

debugCeoFinancials();
