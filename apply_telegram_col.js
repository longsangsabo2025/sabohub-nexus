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

    const sql = fs.readFileSync('ADD_TELEGRAM_COLUMN.sql', 'utf8');
    console.log('Executing SQL...');
    await client.query(sql);
    console.log('Telegram column added successfully.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
