/**
 * Predictive Analytics Component
 * Purpose: AI-powered predictions for CEO dashboard
 * Philosophy: Simple linear regression, easy to understand
 */

export interface PredictionData {
  actual: number[];
  predicted: number[];
  confidence: number; // 0-100
  trend: 'up' | 'down' | 'stable';
  forecast: {
    next30Days: number;
    next90Days: number;
    nextQuarter: number;
  };
}

/**
 * Simple Linear Regression
 * y = mx + b
 */
function linearRegression(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * data[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

/**
 * Calculate R² (coefficient of determination)
 * Measures how well the model fits the data (0-1)
 */
function calculateR2(actual: number[], predicted: number[]): number {
  const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
  
  const ssTotal = actual.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0);
  const ssResidual = actual.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0);
  
  return 1 - (ssResidual / ssTotal);
}

/**
 * Predict future values
 */
export function predictValues(historicalData: number[], daysToPredict: number = 30): PredictionData {
  if (historicalData.length < 3) {
    // Not enough data
    return {
      actual: historicalData,
      predicted: historicalData,
      confidence: 0,
      trend: 'stable',
      forecast: {
        next30Days: historicalData[historicalData.length - 1] || 0,
        next90Days: historicalData[historicalData.length - 1] || 0,
        nextQuarter: historicalData[historicalData.length - 1] || 0,
      },
    };
  }

  const { slope, intercept } = linearRegression(historicalData);
  
  // Generate predicted values for historical data
  const predicted = historicalData.map((_, i) => slope * i + intercept);
  
  // Calculate confidence (R²)
  const r2 = calculateR2(historicalData, predicted);
  const confidence = Math.max(0, Math.min(100, r2 * 100));
  
  // Determine trend
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (slope > 0.05) trend = 'up';
  else if (slope < -0.05) trend = 'down';
  
  // Forecast future values
  const lastIndex = historicalData.length - 1;
  const next30Days = slope * (lastIndex + 30) + intercept;
  const next90Days = slope * (lastIndex + 90) + intercept;
  const nextQuarter = slope * (lastIndex + 90) + intercept;
  
  return {
    actual: historicalData,
    predicted,
    confidence: Math.round(confidence),
    trend,
    forecast: {
      next30Days: Math.max(0, next30Days),
      next90Days: Math.max(0, next90Days),
      nextQuarter: Math.max(0, nextQuarter),
    },
  };
}

/**
 * Predict task completion rate
 */
export function predictTaskCompletion(historicalCompletionRates: number[]): PredictionData {
  return predictValues(historicalCompletionRates, 30);
}

/**
 * Predict revenue
 */
export function predictRevenue(historicalRevenue: number[]): PredictionData {
  return predictValues(historicalRevenue, 30);
}

/**
 * Predict employee count
 */
export function predictEmployeeGrowth(historicalEmployeeCounts: number[]): PredictionData {
  return predictValues(historicalEmployeeCounts, 30);
}

/**
 * Anomaly Detection
 * Detect unusual values that deviate from the trend
 */
export function detectAnomalies(data: number[], threshold: number = 2): number[] {
  if (data.length < 3) return [];
  
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const stdDev = Math.sqrt(
    data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length
  );
  
  const anomalies: number[] = [];
  data.forEach((value, index) => {
    const zScore = Math.abs((value - mean) / stdDev);
    if (zScore > threshold) {
      anomalies.push(index);
    }
  });
  
  return anomalies;
}

/**
 * Moving Average
 * Smooth out short-term fluctuations
 */
export function movingAverage(data: number[], windowSize: number = 7): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
    const window = data.slice(start, end);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    result.push(avg);
  }
  
  return result;
}

/**
 * Calculate growth rate
 */
export function calculateGrowthRate(data: number[], period: 'daily' | 'weekly' | 'monthly' = 'monthly'): number {
  if (data.length < 2) return 0;
  
  const oldValue = data[0];
  const newValue = data[data.length - 1];
  
  if (oldValue === 0) return 0;
  
  const growthRate = ((newValue - oldValue) / oldValue) * 100;
  return Math.round(growthRate * 10) / 10;
}

/**
 * Predict churn risk
 * Based on attendance, task completion, and hours worked
 */
export interface ChurnRisk {
  employeeId: string;
  employeeName: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
}

export function predictChurnRisk(
  attendanceRate: number,
  taskCompletionRate: number,
  avgHoursWorked: number,
  expectedHours: number = 8
): ChurnRisk['riskLevel'] {
  let riskScore = 0;
  
  // Low attendance
  if (attendanceRate < 80) riskScore += 30;
  else if (attendanceRate < 90) riskScore += 15;
  
  // Low task completion
  if (taskCompletionRate < 70) riskScore += 30;
  else if (taskCompletionRate < 85) riskScore += 15;
  
  // Hours worked deviation
  const hoursDeviation = Math.abs(avgHoursWorked - expectedHours);
  if (hoursDeviation > 2) riskScore += 20;
  else if (hoursDeviation > 1) riskScore += 10;
  
  if (riskScore >= 60) return 'critical';
  if (riskScore >= 40) return 'high';
  if (riskScore >= 20) return 'medium';
  return 'low';
}
