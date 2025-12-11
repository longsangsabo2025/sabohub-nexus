import { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';
import { Resend } from 'resend';

const { Pool } = pg;

// Use connection string from environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client = await pool.connect();
  
  try {
    // Test basic functionality
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    console.log(`Testing report generation for ${dateStr}...`);

    // Test database connection
    const testQuery = await client.query('SELECT NOW() as current_time');
    
    const result = {
      status: 'success',
      message: 'Manual test of daily report system',
      timestamp: new Date().toISOString(),
      database_connection: 'OK',
      current_time: testQuery.rows[0]?.current_time,
      report_date: dateStr,
      environment_variables: {
        database_url: process.env.DATABASE_URL ? 'Set' : 'Not Set',
        resend_api_key: process.env.RESEND_API_KEY ? 'Set' : 'Not Set',
        cron_secret: process.env.CRON_SECRET ? 'Set' : 'Not Set'
      }
    };

    res.status(200).json(result);
    
  } catch (error) {
    console.error('Error in manual test:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    client.release();
  }
}