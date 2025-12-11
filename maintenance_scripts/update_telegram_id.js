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

    const chatId = '554888288';
    // We'll update for the CEO user we identified earlier: longsangsabo@gmail.com
    // ID: 4abf600f-bf7b-4aa8-b7c7-2d0b5f754686
    const userId = '4abf600f-bf7b-4aa8-b7c7-2d0b5f754686';

    console.log(`Updating Telegram Chat ID for user ${userId} to ${chatId}...`);

    const res = await client.query(`
      UPDATE employees 
      SET telegram_chat_id = $1 
      WHERE id = $2
    `, [chatId, userId]);

    console.log('Update successful:', res.rowCount);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
