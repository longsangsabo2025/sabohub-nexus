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

    const userId = '4abf600f-bf7b-4aa8-b7c7-2d0b5f754686';
    const companyId = 'feef10d3-899d-4554-8107-b2256918213a';
    const branchId = 'f741f160-75f4-421d-abe7-31ca4e0ed3c9';

    // 1. Update company owner
    console.log('Updating company owner...');
    await client.query(`
      UPDATE companies 
      SET owner_id = $1 
      WHERE id = $2
    `, [userId, companyId]);
    console.log('Company owner updated.');

    // 2. Create employee record for CEO
    console.log('Creating CEO employee record...');
    const checkEmp = await client.query(`SELECT id FROM employees WHERE id = $1`, [userId]);
    if (checkEmp.rows.length === 0) {
      await client.query(`
        INSERT INTO employees (
          id, 
          company_id, 
          branch_id, 
          email, 
          full_name, 
          role, 
          employment_type, 
          salary_type, 
          base_salary, 
          is_active
        ) VALUES (
          $1, $2, $3, 
          'longsangsabo@gmail.com', 
          'Long Sang Sabo (CEO)', 
          'ceo', 
          'full_time', 
          'fixed', 
          0, 
          true
        )
      `, [userId, companyId, branchId]);
      console.log('CEO employee record created.');
    } else {
      console.log('CEO employee record already exists.');
    }

    // 3. Fix branch company_id
    console.log('Fixing branch company_id...');
    await client.query(`
      UPDATE branches 
      SET company_id = $1 
      WHERE id = $2 AND company_id IS NULL
    `, [companyId, branchId]);
    console.log('Branch company_id fixed.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
