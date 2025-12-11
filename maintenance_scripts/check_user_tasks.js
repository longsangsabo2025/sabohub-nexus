
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectionString = process.env.VITE_SUPABASE_POOLER_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: VITE_SUPABASE_POOLER_URL or DATABASE_URL is not defined in .env');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTasks() {
  const employeeId = '61715a20-dc93-480c-9dab-f21806114887'; // ID of diem@sabohub.com
  console.log(`Checking tasks for employee ID: ${employeeId}`);
  
  try {
    const res = await pool.query(`
      SELECT id, title, status, assigned_to 
      FROM tasks 
      WHERE assigned_to = $1
    `, [employeeId]);
    
    console.log(`Found ${res.rows.length} tasks.`);
    console.table(res.rows);
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    await pool.end();
  }
}

checkTasks();
