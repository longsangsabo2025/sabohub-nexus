import { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';
import { Resend } from 'resend';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = await pool.connect();
  
  try {
    // Lấy ngày hôm nay
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Dữ liệu demo để test email
    const revenue = 2500000; // 2.5 triệu VNĐ
    const expense = 800000;  // 800k VNĐ 
    const totalReports = '1';
    
    const taskStats = {
      completed: 5,
      in_progress: 3,
      pending: 12
    };

    const profit = revenue - expense;

    // Tạo nội dung email tiếng Việt
    const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb; text-align: center;">🎱 BÁO CÁO HÀNG NGÀY SABO BILLIARDS</h2>
      <p style="text-align: center; color: #64748b;">Ngày: ${new Date().toLocaleDateString('vi-VN')}</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1e40af; margin-bottom: 15px;">💰 TÌNH HÌNH TÀI CHÍNH</h3>
        <p><strong>Doanh thu:</strong> <span style="color: #059669;">${revenue.toLocaleString('vi-VN')} VNĐ</span></p>
        <p><strong>Chi phí:</strong> <span style="color: #dc2626;">${expense.toLocaleString('vi-VN')} VNĐ</span></p>
        <p><strong>Lợi nhuận:</strong> <span style="color: ${profit >= 0 ? '#059669' : '#dc2626'};">${profit.toLocaleString('vi-VN')} VNĐ</span></p>
      </div>

      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #166534; margin-bottom: 15px;">📋 TRẠNG THÁI CÔNG VIỆC</h3>
        <p><strong>Hoàn thành:</strong> ${taskStats.completed || 0} nhiệm vụ</p>
        <p><strong>Đang thực hiện:</strong> ${taskStats.in_progress || 0} nhiệm vụ</p>
        <p><strong>Đang chờ:</strong> ${taskStats.pending || 0} nhiệm vụ</p>
      </div>

      <div style="background: #fefce8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #a16207; margin-bottom: 15px;">📊 THỐNG KÊ KHÁC</h3>
        <p><strong>Tổng số báo cáo:</strong> ${totalReports}</p>
        <p><strong>Thời gian tạo:</strong> ${new Date().toLocaleString('vi-VN')}</p>
      </div>

      <div style="text-align: center; margin-top: 30px; padding: 20px; background: #1e40af; color: white; border-radius: 8px;">
        <h3>🚀 HỆ THỐNG TỰ ĐỘNG SABO BILLIARDS</h3>
        <p>Báo cáo được tạo tự động lúc 7:00 AM hàng ngày</p>
        <p style="font-size: 12px; opacity: 0.8;">Powered by SABOHUB NEXUS - Centralized Management System</p>
      </div>
    </div>
    `;

    // Gửi email đến longsangsabo1@gmail.com (tài khoản Resend đã verify)
    const { data, error } = await resend.emails.send({
      from: 'SABO Billiards <onboarding@resend.dev>',
      to: ['longsangsabo1@gmail.com'],
      subject: `🎱 Báo cáo SABO Billiards - ${new Date().toLocaleDateString('vi-VN')}`,
      html: emailContent,
    });

    if (error) {
      console.error('Email sending error:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    // Log thông tin test (không lưu database)
    console.log('Test email sent with demo data:', { revenue, expense, profit, taskStats });

    res.status(200).json({
      success: true,
      message: `Báo cáo đã được gửi thành công đến longsangsabo1@gmail.com`,
      emailId: data?.id,
      data: {
        revenue,
        expense,
        profit,
        totalReports,
        taskStats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate and send report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
}