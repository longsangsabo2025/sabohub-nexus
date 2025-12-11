import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.VITE_SUPABASE_POOLER_URL;

if (!connectionString) {
  console.error('VITE_SUPABASE_POOLER_URL not found in .env');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database.');

    const sql = fs.readFileSync('CREATE_SUBMIT_APPROVAL_RPC.sql', 'utf8');
    console.log('Executing SQL...');
    
    await client.query(sql);
    console.log('SQL executed successfully.');
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

run();
