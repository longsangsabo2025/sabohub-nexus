/**
 * Smart Scheduling Optimizer
 * AI-powered shift scheduling with conflict detection and load balancing
 */

export interface Employee {
  id: string;
  name: string;
  availability: {
    day: string; // 'monday', 'tuesday', etc.
    startTime: string; // '08:00'
    endTime: string; // '17:00'
  }[];
  maxHoursPerWeek: number;
  skills: string[];
  preferences: {
    preferredDays?: string[];
    avoidDays?: string[];
    preferredShifts?: ('morning' | 'afternoon' | 'evening')[];
  };
}

export interface ShiftRequirement {
  day: string;
  startTime: string;
  endTime: string;
  requiredSkills: string[];
  minEmployees: number;
  maxEmployees: number;
}

export interface ScheduleConflict {
  type: 'overlap' | 'overload' | 'unavailable' | 'skill_mismatch';
  severity: 'low' | 'medium' | 'high';
  employeeId: string;
  employeeName: string;
  description: string;
  suggestion: string;
}

export interface OptimizedShift {
  day: string;
  startTime: string;
  endTime: string;
  assignedEmployees: {
    id: string;
    name: string;
    score: number;
  }[];
  conflicts: ScheduleConflict[];
}

/**
 * Calculate employee suitability score for a shift
 */
export function calculateShiftFitScore(
  employee: Employee,
  shift: ShiftRequirement
): number {
  let score = 100;

  // Check availability
  const dayAvailability = employee.availability.find((a) => a.day === shift.day);
  if (!dayAvailability) {
    return 0; // Not available on this day
  }

  // Check time overlap
  const shiftStart = parseTime(shift.startTime);
  const shiftEnd = parseTime(shift.endTime);
  const availStart = parseTime(dayAvailability.startTime);
  const availEnd = parseTime(dayAvailability.endTime);

  if (shiftStart < availStart || shiftEnd > availEnd) {
    score -= 30; // Partial availability
  }

  // Check skills match
  const hasRequiredSkills = shift.requiredSkills.every((skill) =>
    employee.skills.includes(skill)
  );
  if (!hasRequiredSkills) {
    score -= 40;
  }

  // Check preferences
  if (employee.preferences.preferredDays?.includes(shift.day)) {
    score += 10;
  }
  if (employee.preferences.avoidDays?.includes(shift.day)) {
    score -= 20;
  }

  // Check shift type preference
  const shiftType = getShiftType(shift.startTime);
  if (employee.preferences.preferredShifts?.includes(shiftType)) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Detect scheduling conflicts
 */
export function detectConflicts(
  employee: Employee,
  assignedShifts: OptimizedShift[],
  newShift: ShiftRequirement
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  // Check for time overlaps
  const sameDayShifts = assignedShifts.filter((s) => s.day === newShift.day);
  for (const existingShift of sameDayShifts) {
    if (existingShift.assignedEmployees.some((e) => e.id === employee.id)) {
      if (hasTimeOverlap(existingShift, newShift)) {
        conflicts.push({
          type: 'overlap',
          severity: 'high',
          employeeId: employee.id,
          employeeName: employee.name,
          description: `Shift overlap detected on ${newShift.day}`,
          suggestion: 'Reassign to different employee or adjust shift times',
        });
      }
    }
  }

  // Check weekly hours
  const totalHours = calculateWeeklyHours(employee, assignedShifts);
  const newShiftHours = calculateShiftDuration(newShift);
  if (totalHours + newShiftHours > employee.maxHoursPerWeek) {
    conflicts.push({
      type: 'overload',
      severity: 'high',
      employeeId: employee.id,
      employeeName: employee.name,
      description: `Would exceed max hours (${employee.maxHoursPerWeek}h)`,
      suggestion: 'Distribute hours across more employees',
    });
  }

  // Check availability
  const dayAvailability = employee.availability.find((a) => a.day === newShift.day);
  if (!dayAvailability) {
    conflicts.push({
      type: 'unavailable',
      severity: 'high',
      employeeId: employee.id,
      employeeName: employee.name,
      description: `Not available on ${newShift.day}`,
      suggestion: 'Choose available employee',
    });
  }

  // Check skills
  const hasRequiredSkills = newShift.requiredSkills.every((skill) =>
    employee.skills.includes(skill)
  );
  if (!hasRequiredSkills) {
    conflicts.push({
      type: 'skill_mismatch',
      severity: 'medium',
      employeeId: employee.id,
      employeeName: employee.name,
      description: `Missing required skills: ${newShift.requiredSkills.join(', ')}`,
      suggestion: 'Assign employee with required skills or provide training',
    });
  }

  return conflicts;
}

/**
 * Optimize shift assignments using AI
 */
export function optimizeSchedule(
  employees: Employee[],
  shiftRequirements: ShiftRequirement[]
): OptimizedShift[] {
  const optimizedShifts: OptimizedShift[] = [];

  for (const shift of shiftRequirements) {
    // Score all employees for this shift
    const scoredEmployees = employees
      .map((emp) => ({
        id: emp.id,
        name: emp.name,
        score: calculateShiftFitScore(emp, shift),
        employee: emp,
      }))
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score);

    // Select best employees up to maxEmployees
    const assigned = scoredEmployees.slice(0, shift.maxEmployees);

    // Check if we meet minimum requirement
    const conflicts: ScheduleConflict[] = [];
    if (assigned.length < shift.minEmployees) {
      conflicts.push({
        type: 'unavailable',
        severity: 'high',
        employeeId: '',
        employeeName: 'System',
        description: `Only ${assigned.length} available, need ${shift.minEmployees}`,
        suggestion: 'Adjust shift requirements or add more employees',
      });
    }

    // Detect conflicts for each assigned employee
    for (const emp of assigned) {
      const empConflicts = detectConflicts(
        emp.employee,
        optimizedShifts,
        shift
      );
      conflicts.push(...empConflicts);
    }

    optimizedShifts.push({
      day: shift.day,
      startTime: shift.startTime,
      endTime: shift.endTime,
      assignedEmployees: assigned.map((e) => ({
        id: e.id,
        name: e.name,
        score: e.score,
      })),
      conflicts,
    });
  }

  return optimizedShifts;
}

/**
 * Balance workload across team
 */
export function balanceWorkload(
  employees: Employee[],
  optimizedShifts: OptimizedShift[]
): { employeeId: string; currentHours: number; targetHours: number; adjustment: number }[] {
  const targetHoursPerWeek = 40;
  const workloadReport = employees.map((emp) => {
    const currentHours = calculateWeeklyHours(emp, optimizedShifts);
    const adjustment = targetHoursPerWeek - currentHours;

    return {
      employeeId: emp.id,
      currentHours,
      targetHours: targetHoursPerWeek,
      adjustment,
    };
  });

  return workloadReport.sort((a, b) => Math.abs(b.adjustment) - Math.abs(a.adjustment));
}

/**
 * Generate schedule suggestions
 */
export function generateScheduleSuggestions(
  optimizedShifts: OptimizedShift[]
): string[] {
  const suggestions: string[] = [];
  const allConflicts = optimizedShifts.flatMap((s) => s.conflicts);

  // High severity conflicts
  const highSeverityCount = allConflicts.filter((c) => c.severity === 'high').length;
  if (highSeverityCount > 0) {
    suggestions.push(
      `⚠️ ${highSeverityCount} critical conflicts detected - immediate attention required`
    );
  }

  // Underst affed shifts
  const understaffed = optimizedShifts.filter(
    (s) => s.conflicts.some((c) => c.type === 'unavailable')
  );
  if (understaffed.length > 0) {
    suggestions.push(
      `📉 ${understaffed.length} shifts are understaffed - consider hiring or adjusting shifts`
    );
  }

  // Overloaded employees
  const overloaded = allConflicts.filter((c) => c.type === 'overload');
  if (overloaded.length > 0) {
    suggestions.push(
      `⏰ ${overloaded.length} employees exceeding max hours - redistribute workload`
    );
  }

  // Skill mismatches
  const skillIssues = allConflicts.filter((c) => c.type === 'skill_mismatch');
  if (skillIssues.length > 0) {
    suggestions.push(
      `🎯 ${skillIssues.length} shifts have skill mismatches - provide training or reassign`
    );
  }

  // No conflicts
  if (suggestions.length === 0) {
    suggestions.push('✅ Schedule is well-optimized with no major conflicts');
  }

  return suggestions;
}

// Helper functions

function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getShiftType(startTime: string): 'morning' | 'afternoon' | 'evening' {
  const hour = parseInt(startTime.split(':')[0]);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function hasTimeOverlap(shift1: OptimizedShift, shift2: ShiftRequirement): boolean {
  if (shift1.day !== shift2.day) return false;

  const s1Start = parseTime(shift1.startTime);
  const s1End = parseTime(shift1.endTime);
  const s2Start = parseTime(shift2.startTime);
  const s2End = parseTime(shift2.endTime);

  return s1Start < s2End && s2Start < s1End;
}

function calculateWeeklyHours(employee: Employee, shifts: OptimizedShift[]): number {
  let totalHours = 0;

  for (const shift of shifts) {
    if (shift.assignedEmployees.some((e) => e.id === employee.id)) {
      totalHours += calculateShiftDuration({
        day: shift.day,
        startTime: shift.startTime,
        endTime: shift.endTime,
        requiredSkills: [],
        minEmployees: 0,
        maxEmployees: 0,
      });
    }
  }

  return totalHours;
}

function calculateShiftDuration(shift: ShiftRequirement): number {
  const start = parseTime(shift.startTime);
  const end = parseTime(shift.endTime);
  return (end - start) / 60; // Convert minutes to hours
}
