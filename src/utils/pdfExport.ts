/**
 * PDF Export Utility
 * Purpose: Generate PDF reports for CEO dashboard data
 * Philosophy: Lightweight, no external libs, browser-native
 */

interface CEOStats {
  healthScore: number;
  revenue: number;
  employees: number;
  completionRate: number;
  avgHours: number;
  criticalAlerts: number;
  pendingApprovals: number;
  topPerformers: Array<{ name: string; score: number }>;
  strategicGoals: Array<{ name: string; progress: number }>;
}

export function generateExecutiveSummaryPDF(stats: CEOStats): void {
  // Create a new window with the content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to download the report');
    return;
  }

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Executive Summary - ${currentDate}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    
    .header .subtitle {
      font-size: 14px;
      color: #6b7280;
    }
    
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .health-score {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    
    .health-score .score {
      font-size: 72px;
      font-weight: 700;
      line-height: 1;
    }
    
    .health-score .label {
      font-size: 18px;
      opacity: 0.9;
      margin-top: 8px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      background: #f9fafb;
      padding: 20px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    
    .stat-card .value {
      font-size: 32px;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 4px;
    }
    
    .stat-card .label {
      font-size: 14px;
      color: #6b7280;
    }
    
    .list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .list-item:last-child {
      border-bottom: none;
    }
    
    .list-item .name {
      font-weight: 500;
      color: #1a1a1a;
    }
    
    .list-item .value {
      font-weight: 600;
      color: #2563eb;
    }
    
    .progress-bar {
      background: #e5e7eb;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }
    
    .progress-fill {
      height: 100%;
      background: #2563eb;
      transition: width 0.3s ease;
    }
    
    .alert-badge {
      display: inline-block;
      background: #ef4444;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Executive Summary</h1>
    <div class="subtitle">SABO Hub • ${currentDate}</div>
  </div>

  <div class="health-score">
    <div class="score">${stats.healthScore}</div>
    <div class="label">Health Score</div>
  </div>

  <div class="section">
    <h2 class="section-title">Key Metrics</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="value">${formatCurrency(stats.revenue)}</div>
        <div class="label">Revenue (Monthly)</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.employees}</div>
        <div class="label">Total Employees</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.completionRate}%</div>
        <div class="label">Task Completion Rate</div>
      </div>
      <div class="stat-card">
        <div class="value">${stats.avgHours}h</div>
        <div class="label">Avg Daily Hours</div>
      </div>
    </div>
  </div>

  ${stats.criticalAlerts > 0 ? `
  <div class="section">
    <h2 class="section-title">⚠️ Critical Alerts</h2>
    <div class="stat-card">
      <span class="alert-badge">${stats.criticalAlerts} Active Alerts</span>
      <p style="margin-top: 12px; color: #6b7280;">Immediate attention required</p>
    </div>
  </div>
  ` : ''}

  ${stats.pendingApprovals > 0 ? `
  <div class="section">
    <h2 class="section-title">📋 Pending Approvals</h2>
    <div class="stat-card">
      <div class="value">${stats.pendingApprovals}</div>
      <div class="label">Awaiting your review</div>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2 class="section-title">🏆 Top Performers</h2>
    ${stats.topPerformers.map(performer => `
      <div class="list-item">
        <span class="name">${performer.name}</span>
        <span class="value">${performer.score}/100</span>
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2 class="section-title">🎯 Strategic Goals</h2>
    ${stats.strategicGoals.map(goal => `
      <div style="margin-bottom: 20px;">
        <div class="list-item" style="border-bottom: none; padding-bottom: 4px;">
          <span class="name">${goal.name}</span>
          <span class="value">${goal.progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${goal.progress}%"></div>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="footer">
    <p>Generated by SABO Hub • Confidential</p>
    <p style="margin-top: 4px;">This report is for internal use only</p>
  </div>

  <div class="no-print" style="text-align: center; margin-top: 30px;">
    <button onclick="window.print()" style="
      background: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    ">
      🖨️ Print / Save as PDF
    </button>
    <button onclick="window.close()" style="
      background: #6b7280;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-left: 12px;
    ">
      Close
    </button>
  </div>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  // Auto-print after a short delay
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

// CSV Export
export function generateCSVExport(stats: CEOStats): void {
  const csv = [
    ['Metric', 'Value'],
    ['Health Score', stats.healthScore],
    ['Revenue', stats.revenue],
    ['Employees', stats.employees],
    ['Completion Rate', `${stats.completionRate}%`],
    ['Avg Hours', stats.avgHours],
    ['Critical Alerts', stats.criticalAlerts],
    ['Pending Approvals', stats.pendingApprovals],
    [''],
    ['Top Performers', ''],
    ...stats.topPerformers.map(p => [p.name, p.score]),
    [''],
    ['Strategic Goals', ''],
    ...stats.strategicGoals.map(g => [g.name, `${g.progress}%`]),
  ]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `executive-summary-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
