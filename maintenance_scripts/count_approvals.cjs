
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function countApprovals() {
  try {
    const res = await pool.query('SELECT COUNT(*) FROM approval_requests');
    console.log('Total approval requests:', res.rows[0].count);
    
    const res2 = await pool.query('SELECT * FROM approval_requests LIMIT 5');
    console.log('Sample approval requests:', res2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

countApprovals();
