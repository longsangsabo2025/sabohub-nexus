
import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.VITE_SUPABASE_POOLER_URL;

const client = new pg.Client({
  connectionString: connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected.');

    const sql = fs.readFileSync('ENABLE_REALTIME.sql', 'utf8');
    console.log('Executing SQL...');
    await client.query(sql);
    console.log('Realtime enabled for executive_reports.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
