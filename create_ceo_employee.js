import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.VITE_SUPABASE_POOLER_URL;

const client = new pg.Client({
  connectionString: connectionString,
});

const CEO_ID = '944f7536-6c9a-4bea-99fc-f1c984fef2ef';
const CEO_EMAIL = 'longsangsabo@gmail.com'; // Assuming this is the CEO email based on context or I can use a placeholder
const COMPANY_ID = 'e3a03361-d8a6-4d69-8112-9617083028d6'; // Need to find a valid company ID or create one.

async function run() {
  try {
    await client.connect();
    console.log('Connected.');

    // 1. Find a company ID (or use the one from Manager)
    const managerRes = await client.query(`SELECT company_id FROM employees WHERE role = 'manager' LIMIT 1`);
    let companyId = managerRes.rows[0]?.company_id;

    if (!companyId) {
        console.log('No company found from manager. Checking companies table...');
        const compRes = await client.query(`SELECT id FROM companies LIMIT 1`);
        companyId = compRes.rows[0]?.id;
    }

    if (!companyId) {
        console.error('Cannot find any company ID to link CEO to.');
        return;
    }

    console.log(`Using Company ID: ${companyId}`);

    // 2. Insert CEO Record
    console.log('Creating CEO record in employees table...');
    const insertRes = await client.query(`
      INSERT INTO employees (
        id,
        company_id,
        email,
        username,
        password_hash,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, 'HASHED_PASSWORD_PLACEHOLDER', $5, $6, true, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET role = 'ceo';
    `, [CEO_ID, companyId, CEO_EMAIL, 'ceo_admin', 'Long Sang Sabo', 'ceo']);

    console.log('CEO Record Created/Updated.');

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
