import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to get connection string from different possible env vars
const connectionString = process.env.VITE_SUPABASE_POOLER_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: VITE_SUPABASE_POOLER_URL or DATABASE_URL is not defined in .env');
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

    const sqlFilePath = path.join(__dirname, 'database', 'migrations', '009_fix_role_case_sensitivity.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
        console.error(`Error: SQL file not found at ${sqlFilePath}`);
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Executing SQL migration to fix role case sensitivity...');
    
    await client.query(sqlContent);

    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await client.end();
  }
}

runMigration();
