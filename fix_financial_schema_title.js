
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

async function fixSchemaTitle() {
  try {
    await client.connect();
    console.log('Connected to database.');

    console.log('Altering table financial_transactions: Making "title" nullable...');
    
    await client.query(`
      ALTER TABLE financial_transactions 
      ALTER COLUMN title DROP NOT NULL;
    `);
    
    console.log('Column "title" is now nullable.');

    console.log('Reloading schema cache...');
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('Done.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fixSchemaTitle();
