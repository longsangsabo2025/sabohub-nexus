import pg from 'pg';
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

    const res = await client.query(`
      SELECT * FROM pg_extension WHERE extname = 'pg_cron';
    `);
    console.log('pg_cron installed:', res.rows.length > 0);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
