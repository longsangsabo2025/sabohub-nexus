import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const connectionString = process.env.VITE_SUPABASE_POOLER_URL;

const client = new pg.Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkPolicies() {
  try {
    await client.connect();
    console.log('Connected.');

    const query = `
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'employees';
    `;

    const res = await client.query(query);
    console.table(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkPolicies();
