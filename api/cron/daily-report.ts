import { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';
import { Resend } from 'resend';

const { Pool } = pg;

// Use connection string from environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase/some cloud DBs
  }
});

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Debug environment variables
  console.log('CRON_SECRET exists:', !!process.env.CRON_SECRET);
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
  console.log('User-Agent:', req.headers['user-agent']);
  
  // Vercel cron jobs use "vercel-cron/1.0" user agent
  const isVercelCron = req.headers['user-agent']?.includes('vercel-cron');
  const hasValidAuth = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
  
  // Allow Vercel cron OR valid Bearer token
  if (process.env.CRON_SECRET && !isVercelCron && !hasValidAuth) {
    return res.status(401).end('Unauthorized');
  }

  const client = await pool.connect();
  
  try {
    // Calculate date for "yesterday" (since report runs at 7AM for the previous day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    console.log(`Generating report for ${dateStr}...`);

    // 1. Daily Work Reports Stats
    const reportsRes = await client.query(`
      SELECT COUNT(*) as total, SUM(total_hours) as total_hours
      FROM daily_work_reports
      WHERE report_date = $1
    `, [dateStr]);
    const { total: totalReports, total_hours: totalHours } = reportsRes.rows[0] || { total: 0, total_hours: 0 };

    // 2. Financial Stats
    const financeRes = await client.query(`
      SELECT type, SUM(amount) as total
      FROM financial_transactions
      WHERE DATE(transaction_date) = $1
      GROUP BY type
    `, [dateStr]);
    
    let revenue = 0;
    let expense = 0;
    financeRes.rows.forEach(row => {
      if (row.type === 'income') revenue = Number(row.total);
      if (row.type === 'expense') expense = Number(row.total);
    });

    // 3. Task Stats
    const tasksRes = await client.query(`
      SELECT status, COUNT(*) as count
      FROM tasks
      WHERE DATE(updated_at) = $1
      GROUP BY status
    `, [dateStr]);
    
    const taskStats = tasksRes.rows.reduce((acc: any, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {});

    // 4. Construct Message
    const message = `
BÁO CÁO TỔNG HỢP NGÀY ${dateStr}

1. NHÂN SỰ:
- Tổng báo cáo: ${totalReports}
- Tổng giờ làm: ${totalHours || 0}

2. TÀI CHÍNH:
- Thu: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenue)}
- Chi: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(expense)}
- Lợi nhuận: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenue - expense)}

3. CÔNG VIỆC:
- Hoàn thành: ${taskStats['completed'] || 0}
- Đang thực hiện: ${taskStats['in_progress'] || 0}
- Mới: ${taskStats['todo'] || 0}
    `.trim();

    // 5. Send Email Reports to CEO and Manager
    const recipients = [
      { 
        email: 'longsangsabo1@gmail.com', 
        role: 'CEO',
        name: 'CEO SABO'
      },
      { 
        email: 'ngocdiem1112@gmail.com', 
        role: 'Manager', 
        name: 'Manager Operations'
      }
    ];
    
    let emailCount = 0;
    const emailPromises = recipients.map(async (recipient) => {
      if (process.env.RESEND_API_KEY) {
        try {
          const emailContent = recipient.role === 'CEO' ? 
            // CEO Report - Strategic Overview
            `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af; text-align: center;">🎱 BÁO CÁO CEO - SABO BILLIARDS</h2>
                <p style="text-align: center; color: #64748b;">Ngày: ${new Date(dateStr).toLocaleDateString('vi-VN')}</p>
                
                <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <h3>💰 TỔNG QUAN KINH DOANH</h3>
                  <p style="font-size: 18px;"><strong>Lợi nhuận hôm nay: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenue - expense)}</strong></p>
                </div>

                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #059669;">📊 CHI TIẾT TÀI CHÍNH</h3>
                  <p><strong>Doanh thu:</strong> <span style="color: #059669;">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenue)}</span></p>
                  <p><strong>Chi phí:</strong> <span style="color: #dc2626;">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(expense)}</span></p>
                  <p><strong>ROI:</strong> ${revenue > 0 ? ((revenue - expense) / revenue * 100).toFixed(1) : 0}%</p>
                </div>

                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #166534;">🎯 HIỆU SUẤT HOẠT ĐỘNG</h3>
                  <p><strong>Tổng báo cáo:</strong> ${totalReports}</p>
                  <p><strong>Tác vụ hoàn thành:</strong> ${taskStats['completed'] || 0} / ${(taskStats['completed'] || 0) + (taskStats['in_progress'] || 0) + (taskStats['pending'] || 0)}</p>
                  <p><strong>Tỷ lệ hoàn thành:</strong> ${(taskStats['completed'] || 0) > 0 ? ((taskStats['completed'] || 0) / ((taskStats['completed'] || 0) + (taskStats['in_progress'] || 0) + (taskStats['pending'] || 0)) * 100).toFixed(1) : 0}%</p>
                </div>

                <div style="text-align: center; margin-top: 30px; padding: 15px; background: #1e40af; color: white; border-radius: 8px;">
                  <p style="margin: 0; font-size: 12px;">SABOHUB NEXUS - Centralized Management System</p>
                </div>
              </div>
            ` :
            // Manager Report - Operational Details  
            `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #059669; text-align: center;">📊 BÁO CÁO QUẢN LÝ - SABO BILLIARDS</h2>
                <p style="text-align: center; color: #64748b;">Ngày: ${new Date(dateStr).toLocaleDateString('vi-VN')}</p>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #1e40af;">💰 TÌNH HÌNH TÀI CHÍNH</h3>
                  <p><strong>Doanh thu:</strong> <span style="color: #059669;">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenue)}</span></p>
                  <p><strong>Chi phí:</strong> <span style="color: #dc2626;">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(expense)}</span></p>
                  <p><strong>Lợi nhuận:</strong> <span style="color: ${revenue - expense >= 0 ? '#059669' : '#dc2626'};">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenue - expense)}</span></p>
                </div>

                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #166534;">📋 QUẢN LÝ CÔNG VIỆC</h3>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span><strong>✅ Hoàn thành:</strong> ${taskStats['completed'] || 0}</span>
                    <span><strong>🔄 Đang làm:</strong> ${taskStats['in_progress'] || 0}</span>
                    <span><strong>⏳ Chờ xử lý:</strong> ${taskStats['pending'] || 0}</span>
                  </div>
                  <div style="background: #e5e7eb; border-radius: 8px; height: 8px; margin-top: 10px;">
                    <div style="background: #059669; height: 8px; border-radius: 8px; width: ${(taskStats['completed'] || 0) > 0 ? ((taskStats['completed'] || 0) / ((taskStats['completed'] || 0) + (taskStats['in_progress'] || 0) + (taskStats['pending'] || 0)) * 100) : 0}%;"></div>
                  </div>
                </div>

                <div style="background: #fefce8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #a16207;">📈 THỐNG KÊ HOẠT ĐỘNG</h3>
                  <p><strong>Tổng báo cáo:</strong> ${totalReports}</p>
                  <p><strong>Tổng giờ làm:</strong> ${totalHours || 0}</p>
                  <p><strong>Hiệu quả:</strong> ${(taskStats['completed'] || 0) > 0 ? 'Tích cực' : 'Cần cải thiện'}</p>
                </div>

                <div style="text-align: center; margin-top: 30px; padding: 15px; background: #059669; color: white; border-radius: 8px;">
                  <p style="margin: 0; font-size: 12px;">SABOHUB NEXUS - Operational Management Dashboard</p>
                </div>
              </div>
            `;

          await resend.emails.send({
            from: 'SABO Billiards System <onboarding@resend.dev>',
            to: recipient.email,
            subject: `🎱 ${recipient.role === 'CEO' ? 'CEO Report' : 'Operations Report'} - SABO Billiards (${new Date(dateStr).toLocaleDateString('vi-VN')})`,
            html: emailContent
          });
          
          emailCount++;
          console.log(`✅ Email sent successfully to ${recipient.role} (${recipient.email})`);
        } catch (emailErr) {
          console.error(`❌ Failed to send email to ${recipient.role} (${recipient.email}):`, emailErr);
        }
      }
    });

    // Wait for all emails to be sent
    await Promise.allSettled(emailPromises);

    res.status(200).json({ 
      success: true, 
      message: `Report generated for ${dateStr}`, 
      sentTo: 2, // CEO + Manager
      emailedTo: emailCount,
      recipients: ['CEO (longsangsabo1@gmail.com)', 'Manager (ngocdiem1112@gmail.com)'],
      data: {
        revenue,
        expense,
        profit: revenue - expense,
        totalReports,
        taskStats
      }
    });

  } catch (err: any) {
    console.error('Error generating report:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
}
