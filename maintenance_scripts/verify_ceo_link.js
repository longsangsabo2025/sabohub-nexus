import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.VITE_SUPABASE_POOLER_URL;
const client = new pg.Client({ connectionString });

const CEO_ID = '944f7536-6c9a-4bea-99fc-f1c984fef2ef'; // From previous debug output

async function verifyCeoLink() {
  try {
    await client.connect();
    console.log(`Checking company for CEO ID: ${CEO_ID}`);
    
    const res = await client.query(`
      SELECT id, name, owner_id 
      FROM companies 
      WHERE owner_id = $1
    `, [CEO_ID]);
    
    if (res.rows.length > 0) {
      console.log('✅ Success! Found company linked to CEO:');
      console.table(res.rows);
      
      const companyId = res.rows[0].id;
      console.log(`\nChecking transactions for Company ID: ${companyId}`);
      
      const transRes = await client.query(`
        SELECT count(*) as count 
        FROM financial_transactions 
        WHERE company_id = $1
      `, [companyId]);
      
      console.log(`Found ${transRes.rows[0].count} transactions.`);
    } else {
      console.log('❌ No company found for this CEO ID using owner_id column.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

verifyCeoLink();
