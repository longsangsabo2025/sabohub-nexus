import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.VITE_SUPABASE_POOLER_URL;

if (!connectionString) {
  console.error('Error: VITE_SUPABASE_POOLER_URL is not defined in .env file');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database.');

    console.log('Clearing attendance history...');
    
    // Delete all records from attendance table
    const result = await client.query('DELETE FROM attendance;');
    
    console.log(`Deleted ${result.rowCount} records from attendance table.`);
    console.log('Attendance history cleared successfully.');

  } catch (err) {
    console.error('Error clearing attendance data:', err);
  } finally {
    await client.end();
  }
}

run();
