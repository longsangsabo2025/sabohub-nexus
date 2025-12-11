import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Use Service Role Key for production to bypass RLS if needed
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 SABO Neural Link (Telegram Service) is active...');
console.log('Listening for new notifications...');

// Listen to inserts on the 'notifications' table
const channel = supabase
  .channel('schema-db-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
    },
    async (payload) => {
      console.log('New notification received:', payload.new.id);
      await handleNotification(payload.new);
    }
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'executive_reports',
    },
    async (payload) => {
      console.log('Executive Report event:', payload.eventType);
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        await broadcastReport(payload.new);
      }
    }
  )
  .subscribe();

async function broadcastReport(report) {
  console.log('Broadcasting report to Executives...');
  
  // Fetch all CEOs and Managers with Telegram IDs
  const { data: executives, error } = await supabase
    .from('employees')
    .select('telegram_chat_id, full_name, role')
    .in('role', ['ceo', 'manager'])
    .not('telegram_chat_id', 'is', null);

  if (error) {
    console.error('Error fetching executives:', error);
    return;
  }

  if (!executives || executives.length === 0) {
    console.log('No executives found with Telegram linked.');
    return;
  }

  const revenue = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(report.total_revenue || 0);
  const profit = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(report.net_profit || 0);
  const date = new Date(report.report_date).toLocaleDateString('vi-VN');

  const message = `
📊 *BÁO CÁO TỔNG HỢP NGÀY ${date}*

💰 *Tài chính:*
- Doanh thu: \`${revenue}\`
- Lợi nhuận: \`${profit}\`

📋 *Vận hành:*
- Hoàn thành: ${report.total_tasks_completed} task
- Trễ hạn: ${report.total_tasks_overdue} task

👥 *Nhân sự:*
- Đi làm: ${report.staff_present}
- Đi trễ: ${report.staff_late}
- Nghỉ phép: ${report.staff_on_leave}

_SABO Neural Link - Auto Generated_
  `.trim();

  for (const exec of executives) {
    console.log(`Sending report to ${exec.role}: ${exec.full_name}`);
    await sendTelegramMessage(exec.telegram_chat_id, message);
  }
}

async function handleNotification(notification) {
  try {
    // 1. Get the user's Telegram Chat ID
    const { data: user, error } = await supabase
      .from('employees')
      .select('telegram_chat_id, full_name')
      .eq('id', notification.user_id)
      .single();

    if (error || !user || !user.telegram_chat_id) {
      console.log(`User ${notification.user_id} has no Telegram linked. Skipping.`);
      return;
    }

    // 2. Format the message
    const message = `
� *SABO Neural Link Update*

*${notification.title}*

${notification.message}

_Sent via SABO Neural Link_
    `.trim();

    // 3. Send to Telegram
    await sendTelegramMessage(user.telegram_chat_id, message);
    
  } catch (err) {
    console.error('Error processing notification:', err);
  }
}

async function sendTelegramMessage(chatId, text) {
  if (!telegramBotToken) {
    console.log('⚠️ Telegram Bot Token not set. Message would be:', text);
    return;
  }

  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();
    if (data.ok) {
      console.log(`Message sent to ${chatId}`);
    } else {
      console.error('Telegram API Error:', data);
    }
  } catch (err) {
    console.error('Network Error:', err);
  }
}

async function checkUnreadNotifications() {
  console.log('Checking for missed notifications...');
  // Only check for recent system notifications to avoid spamming old stuff
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('is_read', false)
    .eq('type', 'system')
    .order('created_at', { ascending: false })
    .limit(10); 

  if (error) {
    console.error('Error fetching unread notifications:', error);
    return;
  }

  if (notifications && notifications.length > 0) {
    for (const notification of notifications) {
      console.log('Processing missed notification:', notification.id);
      await handleNotification(notification);
      
      // Mark as read so we don't send it again
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
    }
  } else {
    console.log('No unread system notifications found.');
  }
}

// Call on startup
checkUnreadNotifications();

// Keep the process alive
process.stdin.resume();
