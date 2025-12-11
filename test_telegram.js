import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = '554888288';

async function sendTest() {
  if (!telegramBotToken) {
    console.error('Missing Bot Token');
    return;
  }

  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  const message = `
🚀 *SABO Neural Link Activated*

Chào mừng Boss! Hệ thống đã kết nối thành công.
Từ giờ, mọi thông tin quan trọng sẽ được gửi trực tiếp đến đây.

_Ready to serve._
  `.trim();
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();
    console.log('Test message sent:', data.ok);
  } catch (err) {
    console.error('Error:', err);
  }
}

sendTest();
