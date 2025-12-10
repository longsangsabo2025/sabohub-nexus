/**
 * AI Recommendations Engine
 * Provides intelligent recommendations for task assignments, team optimization, and process improvements
 */

export interface EmployeeSkill {
  id: string;
  name: string;
  experience: number; // months
  taskCompletionRate: number; // percentage
  currentWorkload: number; // number of active tasks
  availability: number; // hours available per week
  avgTaskDuration: number; // hours
}

export interface TaskRequirement {
  estimatedHours: number;
  requiredSkills: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: Date;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface AssignmentRecommendation {
  employeeId: string;
  employeeName: string;
  score: number; // 0-100
  confidence: number; // 0-100
  reasons: string[];
  estimatedCompletionDate: Date;
  workloadImpact: 'low' | 'medium' | 'high';
}

export interface PerformanceInsight {
  type: 'optimization' | 'warning' | 'opportunity';
  category: 'team' | 'process' | 'resource' | 'budget';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendations: string[];
  data?: any;
}

/**
 * Calculate employee suitability score for a task
 */
export function calculateTaskFitScore(
  employee: EmployeeSkill,
  task: TaskRequirement
): number {
  let score = 0;
  const weights = {
    skill: 0.3,
    workload: 0.25,
    completion: 0.25,
    availability: 0.2,
  };

  // Skill match score
  const skillMatch = employee.experience > 0 ? Math.min(employee.experience / 12, 1) : 0;
  score += skillMatch * weights.skill * 100;

  // Workload score (inverse - less workload is better)
  const workloadScore = Math.max(0, 1 - employee.currentWorkload / 10);
  score += workloadScore * weights.workload * 100;

  // Completion rate score
  score += employee.taskCompletionRate * weights.completion;

  // Availability score
  const availabilityScore = Math.min(employee.availability / task.estimatedHours, 1);
  score += availabilityScore * weights.availability * 100;

  // Adjust for task priority
  if (task.priority === 'urgent' && employee.taskCompletionRate > 85) {
    score *= 1.1; // Boost for reliable employees on urgent tasks
  }

  // Adjust for complexity
  if (task.complexity === 'complex' && employee.experience > 24) {
    score *= 1.15; // Boost for experienced employees on complex tasks
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Get top recommendations for task assignment
 */
export function recommendTaskAssignments(
  employees: EmployeeSkill[],
  task: TaskRequirement,
  topN: number = 3
): AssignmentRecommendation[] {
  const recommendations: AssignmentRecommendation[] = employees
    .map((employee) => {
      const score = calculateTaskFitScore(employee, task);
      const confidence = calculateConfidence(employee, task);
      const reasons = generateReasons(employee, task, score);
      const estimatedCompletionDate = calculateEstimatedCompletion(
        employee,
        task
      );
      const workloadImpact = assessWorkloadImpact(employee, task);

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        score,
        confidence,
        reasons,
        estimatedCompletionDate,
        workloadImpact,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return recommendations;
}

/**
 * Calculate confidence level for recommendation
 */
function calculateConfidence(
  employee: EmployeeSkill,
  task: TaskRequirement
): number {
  let confidence = 70; // Base confidence

  // High completion rate increases confidence
  if (employee.taskCompletionRate > 90) confidence += 15;
  else if (employee.taskCompletionRate > 80) confidence += 10;
  else if (employee.taskCompletionRate < 70) confidence -= 20;

  // Experience increases confidence
  if (employee.experience > 36) confidence += 10;
  else if (employee.experience > 12) confidence += 5;
  else if (employee.experience < 6) confidence -= 10;

  // Low workload increases confidence
  if (employee.currentWorkload < 3) confidence += 5;
  else if (employee.currentWorkload > 7) confidence -= 15;

  return Math.max(0, Math.min(100, confidence));
}

/**
 * Generate human-readable reasons for recommendation
 */
function generateReasons(
  employee: EmployeeSkill,
  task: TaskRequirement,
  score: number
): string[] {
  const reasons: string[] = [];

  if (employee.taskCompletionRate > 85) {
    reasons.push(`Tỷ lệ hoàn thành cao (${employee.taskCompletionRate}%)`);
  }

  if (employee.currentWorkload < 4) {
    reasons.push('Khối lượng công việc hiện tại thấp');
  } else if (employee.currentWorkload > 7) {
    reasons.push('⚠️ Khối lượng công việc hiện tại cao');
  }

  if (employee.experience > 24) {
    reasons.push(`Kinh nghiệm ${Math.round(employee.experience / 12)} năm`);
  }

  if (employee.availability >= task.estimatedHours) {
    reasons.push('Đủ thời gian khả dụng');
  } else {
    reasons.push('⚠️ Thời gian khả dụng hạn chế');
  }

  if (score > 80) {
    reasons.push('✨ Ứng viên lý tưởng cho task này');
  }

  return reasons;
}

/**
 * Calculate estimated completion date
 */
function calculateEstimatedCompletion(
  employee: EmployeeSkill,
  task: TaskRequirement
): Date {
  const baseHours = task.estimatedHours;
  const efficiencyFactor = employee.taskCompletionRate / 100;
  const adjustedHours = baseHours / efficiencyFactor;
  const daysNeeded = Math.ceil(adjustedHours / 8);

  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + daysNeeded);

  return completionDate;
}

/**
 * Assess impact on employee workload
 */
function assessWorkloadImpact(
  employee: EmployeeSkill,
  task: TaskRequirement
): 'low' | 'medium' | 'high' {
  const newWorkload = employee.currentWorkload + 1;
  const hourImpact = task.estimatedHours / employee.availability;

  if (newWorkload <= 3 && hourImpact < 0.3) return 'low';
  if (newWorkload <= 6 && hourImpact < 0.6) return 'medium';
  return 'high';
}

/**
 * Generate performance insights from team data
 */
export function generatePerformanceInsights(data: {
  employees: EmployeeSkill[];
  completionRate: number;
  avgTaskDuration: number;
  budgetUtilization: number;
}): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];

  // Check for overloaded employees
  const overloaded = data.employees.filter((e) => e.currentWorkload > 7);
  if (overloaded.length > 0) {
    insights.push({
      type: 'warning',
      category: 'resource',
      title: 'Nhân viên quá tải',
      description: `${overloaded.length} nhân viên đang có khối lượng công việc quá cao (>7 tasks)`,
      impact: 'high',
      actionable: true,
      recommendations: [
        'Phân phối lại công việc cho nhân viên khác',
        'Xem xét tuyển thêm nhân sự',
        'Tạm hoãn các task ưu tiên thấp',
      ],
      data: { overloadedEmployees: overloaded.map((e) => e.name) },
    });
  }

  // Check for underutilized employees
  const underutilized = data.employees.filter((e) => e.currentWorkload < 2);
  if (underutilized.length > 0) {
    insights.push({
      type: 'opportunity',
      category: 'resource',
      title: 'Nhân sự chưa được tận dụng tối ưu',
      description: `${underutilized.length} nhân viên đang có khối lượng công việc thấp (<2 tasks)`,
      impact: 'medium',
      actionable: true,
      recommendations: [
        'Giao thêm task cho nhân viên này',
        'Đào tạo kỹ năng mới',
        'Xem xét dự án mới',
      ],
      data: { underutilizedEmployees: underutilized.map((e) => e.name) },
    });
  }

  // Check completion rate
  if (data.completionRate < 75) {
    insights.push({
      type: 'warning',
      category: 'process',
      title: 'Tỷ lệ hoàn thành thấp',
      description: `Tỷ lệ hoàn thành task hiện tại là ${data.completionRate}%, dưới mục tiêu 75%`,
      impact: 'high',
      actionable: true,
      recommendations: [
        'Review quy trình làm việc hiện tại',
        'Xác định bottlenecks trong workflow',
        'Tổ chức training về time management',
        'Giảm số lượng task đang chạy song song',
      ],
    });
  } else if (data.completionRate > 90) {
    insights.push({
      type: 'optimization',
      category: 'process',
      title: 'Hiệu suất làm việc xuất sắc',
      description: `Team đang duy trì tỷ lệ hoàn thành ${data.completionRate}%`,
      impact: 'medium',
      actionable: true,
      recommendations: [
        'Chia sẻ best practices với các team khác',
        'Xem xét tăng capacity',
        'Nhân rộng quy trình hiện tại',
      ],
    });
  }

  // Check for skill gaps
  const lowExperience = data.employees.filter((e) => e.experience < 6);
  if (lowExperience.length > data.employees.length * 0.3) {
    insights.push({
      type: 'opportunity',
      category: 'team',
      title: 'Cơ hội đào tạo và phát triển',
      description: `${Math.round((lowExperience.length / data.employees.length) * 100)}% team có ít hơn 6 tháng kinh nghiệm`,
      impact: 'medium',
      actionable: true,
      recommendations: [
        'Xây dựng chương trình mentorship',
        'Tổ chức training sessions',
        'Pair junior với senior developers',
        'Cung cấp learning resources',
      ],
    });
  }

  // Budget insights
  if (data.budgetUtilization > 85) {
    insights.push({
      type: 'warning',
      category: 'budget',
      title: 'Ngân sách sắp vượt mức',
      description: `Đã sử dụng ${data.budgetUtilization}% ngân sách dự án`,
      impact: 'high',
      actionable: true,
      recommendations: [
        'Review chi phí không cần thiết',
        'Tối ưu hóa quy trình để giảm chi phí',
        'Xem xét request thêm ngân sách',
        'Tạm hoãn các tính năng không critical',
      ],
    });
  }

  // Task duration insights
  const avgHoursPerTask = data.avgTaskDuration;
  if (avgHoursPerTask > 40) {
    insights.push({
      type: 'optimization',
      category: 'process',
      title: 'Tasks quá phức tạp',
      description: `Thời gian trung bình mỗi task là ${avgHoursPerTask} giờ`,
      impact: 'medium',
      actionable: true,
      recommendations: [
        'Chia nhỏ tasks thành subtasks',
        'Cải thiện task breakdown process',
        'Sử dụng agile methodologies',
        'Review estimation accuracy',
      ],
    });
  }

  // Team performance trends
  const highPerformers = data.employees.filter(
    (e) => e.taskCompletionRate > 90 && e.experience > 12
  );
  if (highPerformers.length > 0) {
    insights.push({
      type: 'optimization',
      category: 'team',
      title: 'Top Performers cần recognition',
      description: `${highPerformers.length} nhân viên đang có hiệu suất xuất sắc`,
      impact: 'low',
      actionable: true,
      recommendations: [
        'Ghi nhận và khen thưởng',
        'Xem xét thăng tiến',
        'Giao vai trò mentorship',
        'Tăng trách nhiệm và thử thách mới',
      ],
      data: { topPerformers: highPerformers.map((e) => e.name) },
    });
  }

  return insights;
}

/**
 * Predict task completion risk
 */
export interface TaskRisk {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-100
  factors: string[];
  mitigationStrategies: string[];
}

export function assessTaskRisk(
  task: TaskRequirement & { assignedTo?: EmployeeSkill; daysUntilDeadline?: number }
): TaskRisk {
  const factors: string[] = [];
  let riskScore = 0;

  // Deadline pressure
  if (task.daysUntilDeadline !== undefined) {
    if (task.daysUntilDeadline < 2) {
      riskScore += 30;
      factors.push('Deadline rất gần');
    } else if (task.daysUntilDeadline < 5) {
      riskScore += 15;
      factors.push('Deadline gần');
    }
  }

  // Assignee capability
  if (task.assignedTo) {
    if (task.assignedTo.taskCompletionRate < 70) {
      riskScore += 25;
      factors.push('Nhân viên có completion rate thấp');
    }
    if (task.assignedTo.currentWorkload > 7) {
      riskScore += 20;
      factors.push('Nhân viên đang quá tải');
    }
    if (task.assignedTo.experience < 6 && task.complexity === 'complex') {
      riskScore += 20;
      factors.push('Nhân viên thiếu kinh nghiệm cho task phức tạp');
    }
  }

  // Task complexity
  if (task.complexity === 'complex') {
    riskScore += 15;
    factors.push('Task có độ phức tạp cao');
  }

  // Priority vs resources
  if (task.priority === 'urgent' && task.estimatedHours > 40) {
    riskScore += 15;
    factors.push('Task urgent nhưng cần nhiều thời gian');
  }

  // Determine risk level
  let riskLevel: TaskRisk['riskLevel'];
  if (riskScore >= 70) riskLevel = 'critical';
  else if (riskScore >= 50) riskLevel = 'high';
  else if (riskScore >= 30) riskLevel = 'medium';
  else riskLevel = 'low';

  // Generate mitigation strategies
  const mitigationStrategies: string[] = [];
  if (riskScore >= 50) {
    mitigationStrategies.push('Reassign cho nhân viên có kinh nghiệm hơn');
    mitigationStrategies.push('Chia task thành subtasks nhỏ hơn');
    mitigationStrategies.push('Daily check-in với team lead');
  }
  if (task.assignedTo?.currentWorkload && task.assignedTo.currentWorkload > 7) {
    mitigationStrategies.push('Giảm workload của nhân viên này');
  }
  if (task.daysUntilDeadline && task.daysUntilDeadline < 5) {
    mitigationStrategies.push('Extend deadline nếu có thể');
    mitigationStrategies.push('Thêm resources hỗ trợ');
  }
  if (task.complexity === 'complex') {
    mitigationStrategies.push('Pair programming với senior');
    mitigationStrategies.push('Code review thường xuyên hơn');
  }

  return {
    riskLevel,
    probability: riskScore,
    factors,
    mitigationStrategies,
  };
}

/**
 * Smart notification prioritization
 */
export interface SmartNotification {
  id: string;
  type: 'task' | 'approval' | 'deadline' | 'alert' | 'info';
  title: string;
  message: string;
  priority: number; // 0-100
  urgent: boolean;
  actionable: boolean;
  actions?: { label: string; action: string }[];
  timestamp: Date;
}

export function prioritizeNotifications(
  notifications: Omit<SmartNotification, 'priority' | 'urgent'>[]
): SmartNotification[] {
  return notifications
    .map((notif) => {
      let priority = 50; // Base priority

      // Type-based priority
      if (notif.type === 'alert') priority += 30;
      else if (notif.type === 'deadline') priority += 25;
      else if (notif.type === 'approval') priority += 20;
      else if (notif.type === 'task') priority += 15;
      else priority += 5;

      // Time-based priority (recent is more important)
      const hoursAgo = (Date.now() - notif.timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursAgo < 1) priority += 10;
      else if (hoursAgo < 4) priority += 5;
      else if (hoursAgo > 24) priority -= 15;

      // Actionable items are more important
      if (notif.actionable) priority += 15;

      const urgent = priority >= 70;

      return {
        ...notif,
        priority: Math.min(100, priority),
        urgent,
      };
    })
    .sort((a, b) => b.priority - a.priority);
}
