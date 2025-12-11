
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

async function inspectSpecificConstraint() {
  try {
    await client.connect();
    console.log('Connected to database.');

    const query = `
      SELECT pg_get_constraintdef(oid) AS constraint_def
      FROM pg_constraint
      WHERE conname = 'financial_transactions_created_by_fkey';
    `;

    const res = await client.query(query);
    console.table(res.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

inspectSpecificConstraint();
