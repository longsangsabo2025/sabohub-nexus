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

    const res = await client.query(`
      select
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      from
        pg_policies
      where
        tablename = 'approval_requests';
    `);

    console.log('Current Policies on approval_requests:');
    console.table(res.rows);

    const rlsRes = await client.query(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE oid = 'public.approval_requests'::regclass;
    `);
    console.log('RLS Status:', rlsRes.rows[0]);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
