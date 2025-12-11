
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import pg from 'pg';
import http from 'http';

dotenv.config();

// ==========================================
// HEALTH CHECK SERVER (For Render/Railway)
// ==========================================
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('SABO Neural Link v2.0 is Active');
  res.end();
}).listen(port, () => {
  console.log(`Health check server running on port ${port}`);
});

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const connectionString = process.env.VITE_SUPABASE_POOLER_URL;

if (!supabaseUrl || !supabaseKey || !telegramBotToken || !connectionString) {
  console.error('Missing credentials. Check .env');
  process.exit(1);
}

// Initialize Telegram Bot (Polling mode)
const bot = new TelegramBot(telegramBotToken, { polling: true });

// Initialize PG Client
const pgClient = new pg.Client({ connectionString });

console.log('🚀 SABO Neural Link v2.0 (Command Center) is active... [POLLING MODE]');

async function startService() {
  await pgClient.connect();
  console.log('Connected to DB. Starting polling loop...');

  setInterval(async () => {
    await checkApprovalRequests();
    await checkFinanceAlerts();
    await checkExecutiveReports();
  }, 5000); // Poll every 5 seconds
}

startService();

// ==========================================
// POLLING FUNCTIONS
// ==========================================

async function checkApprovalRequests() {
  try {
    const res = await pgClient.query(`
      SELECT * FROM approval_requests 
      WHERE notified_telegram = FALSE 
      ORDER BY created_at ASC
    `);

    for (const request of res.rows) {
      await sendApprovalRequestToManagers(request);
      await pgClient.query('UPDATE approval_requests SET notified_telegram = TRUE WHERE id = $1', [request.id]);
    }
  } catch (err) {
    console.error('Error polling approval_requests:', err.message);
  }
}

async function checkFinanceAlerts() {
  try {
    const res = await pgClient.query(`
      SELECT * FROM financial_transactions 
      WHERE notified_telegram = FALSE AND type = 'expense' AND amount > 10000000
    `);

    for (const tx of res.rows) {
      await sendFinanceAlert(tx);
      await pgClient.query('UPDATE financial_transactions SET notified_telegram = TRUE WHERE id = $1', [tx.id]);
    }
  } catch (err) {
    console.error('Error polling financial_transactions:', err.message);
  }
}

async function checkExecutiveReports() {
  try {
    const res = await pgClient.query(`
      SELECT * FROM executive_reports 
      WHERE notified_telegram = FALSE
    `);

    for (const report of res.rows) {
      await broadcastReport(report);
      await pgClient.query('UPDATE executive_reports SET notified_telegram = TRUE WHERE id = $1', [report.id]);
    }
  } catch (err) {
    console.error('Error polling executive_reports:', err.message);
  }
}

// ==========================================
// 1. MODULE: THE ORACLE (Natural Language Query)
// ==========================================
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.toLowerCase() : '';

  // Ignore commands (starting with /)
  if (text.startsWith('/')) return;

  console.log(`Received message from ${msg.from.first_name}: ${text}`);

  // Query: Doanh thu
  if (text.includes('doanh thu') || text.includes('revenue')) {
    await handleRevenueQuery(chatId);
  }
  // Query: Nhân sự / Đi làm
  else if (text.includes('nhân sự') || text.includes('đi làm') || text.includes('attendance')) {
    await handleAttendanceQuery(chatId);
  }
  // Query: Help / Chào
  else if (text.includes('hi') || text.includes('chào') || text.includes('help')) {
    const helpMsg = `
🤖 *SABO Neural Link Interface*

Tôi có thể giúp gì cho ngài, Boss?

*Tra cứu:*
- "Doanh thu hôm nay thế nào?"
- "Tình hình nhân sự hôm nay?"

*Lệnh:*
- \`/task [nội dung] @[tên]\` : Giao việc nhanh
- \`/broadcast [nội dung]\` : Gửi thông báo toàn công ty
    `;
    bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
  }
});

async function handleRevenueQuery(chatId) {
  const today = new Date().toISOString().split('T')[0];
  
  const res = await pgClient.query(`
    SELECT type, SUM(amount) as total 
    FROM financial_transactions 
    WHERE date(transaction_date) = $1 
    GROUP BY type
  `, [today]);

  let totalIncome = 0;
  let totalExpense = 0;

  res.rows.forEach(row => {
    if (row.type === 'income') totalIncome = Number(row.total);
    if (row.type === 'expense') totalExpense = Number(row.total);
  });

  const profit = totalIncome - totalExpense;
  const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  const msg = `
💰 *Tài chính Hôm nay (${today})*

📈 Thu: \`${fmt(totalIncome)}\`
📉 Chi: \`${fmt(totalExpense)}\`
----------------
💎 Lợi nhuận: \`${fmt(profit)}\`
  `;
  bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

async function handleAttendanceQuery(chatId) {
  const today = new Date().toISOString().split('T')[0];
  
  const res = await pgClient.query(`
    SELECT COUNT(*) as count FROM daily_work_reports WHERE report_date = $1
  `, [today]);

  const presentCount = res.rows[0].count;
  
  const msg = `
👥 *Nhân sự Hôm nay (${today})*

✅ Đã check-in: ${presentCount || 0} nhân viên
  `;
  bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

// ==========================================
// 2. MODULE: TASKMASTER (Quick Assign)
// ==========================================
bot.onText(/\/task (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const fullCommand = match[1]; // "Fix bug login @Diem priority:high"

  // Parse command
  // Format: "Task content @User"
  const userMatch = fullCommand.match(/@(\w+)/);
  const taskTitle = fullCommand.replace(/@\w+/, '').trim();
  
  if (!userMatch) {
    bot.sendMessage(chatId, '⚠️ Vui lòng tag nhân viên nhận việc (VD: @Diem)');
    return;
  }

  const assigneeNamePart = userMatch[1]; // "Diem"

  // Find user ID via PG
  const res = await pgClient.query(`
    SELECT id, full_name FROM employees WHERE full_name ILIKE $1 LIMIT 1
  `, [`%${assigneeNamePart}%`]);

  if (res.rows.length === 0) {
    bot.sendMessage(chatId, `⚠️ Không tìm thấy nhân viên nào tên "${assigneeNamePart}"`);
    return;
  }

  const assignee = res.rows[0];

  // Create Task via PG
  try {
    await pgClient.query(`
      INSERT INTO tasks (title, assigned_to, status, priority, created_by)
      VALUES ($1, $2, 'todo', 'medium', 'system')
    `, [taskTitle, assignee.id]);

    bot.sendMessage(chatId, `✅ Đã giao việc cho *${assignee.full_name}*\nTask: _${taskTitle}_`, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, `❌ Lỗi tạo task: ${err.message}`);
  }
});

// ==========================================
// 3. MODULE: ONE-TAP COMMAND (Approvals)
// ==========================================

async function sendApprovalRequestToManagers(request) {
  // Get requester name
  const res = await pgClient.query('SELECT full_name FROM employees WHERE id = $1', [request.requester_id]);
  const requesterName = res.rows[0] ? res.rows[0].full_name : 'Nhân viên';
  
  const typeMap = {
    'time_off': '📅 Xin nghỉ phép',
    'expense': '💸 Xin duyệt chi',
    'task_assignment': '📋 Giao việc'
  };

  // Format details based on type
  let formattedDetails = '';
  const data = request.details || {};

  if (request.type === 'time_off') {
    formattedDetails = `
- 🗓 *Bắt đầu:* ${data.start_date || 'N/A'}
- 🏁 *Kết thúc:* ${data.end_date || 'N/A'}
- ⏳ *Số ngày:* ${data.days || 0}
- 📝 *Lý do:* ${data.reason || 'Không có'}
    `.trim();
  } else if (request.type === 'expense') {
    const amount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.amount || 0);
    formattedDetails = `
- 💰 *Số tiền:* ${amount}
- 📂 *Danh mục:* ${data.category || 'Khác'}
- 📝 *Lý do:* ${data.reason || 'Không có'}
    `.trim();
  } else {
    // Fallback for other types
    formattedDetails = `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }

  const msg = `
🔔 *YÊU CẦU PHÊ DUYỆT MỚI*

👤 *Người gửi:* ${requesterName}
📂 *Loại:* ${typeMap[request.type] || request.type}
📝 *Chi tiết:*
${formattedDetails}

_Vui lòng xử lý:_
  `;

  const opts = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ DUYỆT NGAY', callback_data: `approve_${request.id}` },
          { text: '❌ TỪ CHỐI', callback_data: `reject_${request.id}` }
        ]
      ]
    }
  };

  // Send to CEO & Managers
  const mgrRes = await pgClient.query(`
    SELECT telegram_chat_id FROM employees 
    WHERE role IN ('ceo', 'manager') AND telegram_chat_id IS NOT NULL
  `);

  for (const mgr of mgrRes.rows) {
    console.log(`Sending approval request to ${mgr.telegram_chat_id}`);
    bot.sendMessage(mgr.telegram_chat_id, msg, opts);
  }
}

// Handle Button Clicks
bot.on('callback_query', async (callbackQuery) => {
  console.log('Received callback_query:', callbackQuery.data);
  const action = callbackQuery.data; // "approve_UUID" or "reject_UUID"
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;

  const [type, requestId] = action.split('_');
  const newStatus = type === 'approve' ? 'approved' : 'rejected';

  // Update DB via PG
  try {
    console.log(`Updating request ${requestId} to ${newStatus}...`);
    await pgClient.query('UPDATE approval_requests SET status = $1 WHERE id = $2', [newStatus, requestId]);
    console.log('DB Update successful.');

    // Update the message UI to remove buttons and show result
    const statusIcon = type === 'approve' ? '✅ ĐÃ DUYỆT' : '❌ ĐÃ TỪ CHỐI';
    bot.editMessageText(`${msg.text}\n\n👉 ${statusIcon} bởi ${callbackQuery.from.first_name}`, {
      chat_id: chatId,
      message_id: msg.message_id
    });

    bot.answerCallbackQuery(callbackQuery.id, { text: `Đã ${newStatus} thành công!` });
  } catch (err) {
    console.error('Error in callback_query:', err);
    bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Lỗi hệ thống!' });
  }
});

// ==========================================
// 4. MODULE: WATCHDOG (Anomaly Alerts)
// ==========================================
async function sendFinanceAlert(tx) {
  const amountFmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tx.amount);
  const alertMsg = `
🚨 *CẢNH BÁO TÀI CHÍNH*

Phát hiện giao dịch chi tiêu lớn!
💸 Số tiền: \`${amountFmt}\`
📝 Nội dung: ${tx.description || 'Không có mô tả'}
👤 Người tạo: ${tx.created_by || 'Unknown'}

_Cần kiểm tra ngay!_
  `;
  
  // Send to CEO only
  const res = await pgClient.query(`
    SELECT telegram_chat_id FROM employees WHERE role = 'ceo' LIMIT 1
  `);
    
  if (res.rows[0] && res.rows[0].telegram_chat_id) {
    bot.sendMessage(res.rows[0].telegram_chat_id, alertMsg, { parse_mode: 'Markdown' });
  }
}

async function broadcastReport(report) {
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

  const mgrRes = await pgClient.query(`
    SELECT telegram_chat_id, full_name, role FROM employees 
    WHERE role IN ('ceo', 'manager') AND telegram_chat_id IS NOT NULL
  `);

  for (const exec of mgrRes.rows) {
    console.log(`Sending report to ${exec.role}: ${exec.full_name}`);
    await bot.sendMessage(exec.telegram_chat_id, message, { parse_mode: 'Markdown' });
  }
}

