
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.VITE_SUPABASE_POOLER_URL;

const client = new pg.Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function syncDates() {
  try {
    await client.connect();
    console.log('Syncing transaction_date to date...');
    
    // Update date column with transaction_date where transaction_date is not null
    await client.query(`
      UPDATE financial_transactions 
      SET date = transaction_date 
      WHERE transaction_date IS NOT NULL;
    `);
    
    console.log('Sync complete.');
    
    // Optional: Drop transaction_date to avoid confusion? 
    // Better keep it for now to be safe, or just ignore it.
    // But the code uses 'date'.

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

syncDates();
