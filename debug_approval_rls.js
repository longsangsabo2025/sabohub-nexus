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

    // 1. Check employees table columns
    console.log('\n--- Employees Table Columns ---');
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees';
    `);
    cols.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));

    // 2. Check CEO record by ID
    console.log('\n--- CEO Record by ID ---');
    const CEO_ID = '944f7536-6c9a-4bea-99fc-f1c984fef2ef';
    const ceo = await client.query(`SELECT id, email, role FROM employees WHERE id = '${CEO_ID}'`);
    console.table(ceo.rows);

    if (ceo.rows.length === 0) {
        console.log('CEO record missing! Need to create it.');
    }

    // 3. Check Manager record
    console.log('\n--- Manager Record ---');
    const manager = await client.query(`SELECT id, email, role FROM employees WHERE role = 'manager' LIMIT 1`);
    console.table(manager.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
