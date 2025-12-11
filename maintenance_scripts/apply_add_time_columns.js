import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.VITE_SUPABASE_POOLER_URL;

if (!connectionString) {
  console.error('Error: VITE_SUPABASE_POOLER_URL is not defined in .env');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Supabase connection
  }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database successfully.');

    const sqlFilePath = path.join(__dirname, 'ADD_TIME_COLUMNS_TO_SCHEDULES.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Executing SQL migration to add time columns...');
    console.log(sqlContent);

    await client.query(sqlContent);

    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await client.end();
  }
}

runMigration();
