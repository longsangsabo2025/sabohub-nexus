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

    // Check tables
    const tables = ['financial_transactions', 'projects', 'tasks', 'daily_work_reports', 'approval_requests'];
    for (const table of tables) {
      const res = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      console.log(`Table ${table}: ${res.rows[0].exists}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
