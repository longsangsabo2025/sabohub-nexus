import { test, expect } from '@playwright/test';

// E2E Test Configuration
const BASE_URL = 'http://localhost:9000';
const TEST_EMAIL = 'test@sabohub.com';
const TEST_PASSWORD = 'test123';

test.describe('E2E Tests - Authentication Flow', () => {
  test('should complete full authentication flow', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveTitle(/SaboHub/i);

    // Fill in login form
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should display error for invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error, [role="alert"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*dashboard/);
    
    // Click logout
    await page.click('button[aria-label="Logout"], text=Logout');
    
    // Should redirect to login
    await page.waitForURL(/.*login/);
  });
});

test.describe('E2E Tests - Task Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should create a new task', async ({ page }) => {
    // Navigate to tasks
    await page.click('text=Tasks, text=Công việc');
    await page.waitForURL(/.*tasks/);
    
    // Click create task button
    await page.click('text=New Task, button:has-text("New")');
    
    // Fill task form
    await page.fill('input[name="title"]', 'E2E Test Task');
    await page.fill('textarea[name="description"]', 'This is a test task created by E2E test');
    await page.selectOption('select[name="priority"]', 'high');
    
    // Submit
    await page.click('button:has-text("Create"), button[type="submit"]');
    
    // Verify task appears in list
    await expect(page.locator('text=E2E Test Task')).toBeVisible({ timeout: 5000 });
  });

  test('should filter tasks by status', async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks`);
    
    // Click status filter
    await page.click('[role="combobox"]:has-text("Status")');
    await page.click('text=Completed');
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
    
    // Verify only completed tasks are shown
    const tasks = await page.locator('[data-status]').all();
    for (const task of tasks) {
      const status = await task.getAttribute('data-status');
      expect(status).toBe('completed');
    }
  });

  test('should update task status', async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks`);
    
    // Click on first task
    const firstTask = page.locator('[data-task-card]').first();
    await firstTask.click();
    
    // Change status
    await page.click('[role="combobox"]:has-text("Status")');
    await page.click('text=In Progress');
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Verify status updated
    await expect(page.locator('text=In Progress')).toBeVisible();
  });
});

test.describe('E2E Tests - Employee Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should view employee list', async ({ page }) => {
    await page.click('text=Employees, text=Nhân viên');
    await page.waitForURL(/.*employees/);
    
    // Should show employee cards
    await expect(page.locator('[data-employee-card]')).toHaveCount({ timeout: 5000 });
  });

  test('should search employees', async ({ page }) => {
    await page.goto(`${BASE_URL}/employees`);
    
    // Type in search box
    await page.fill('input[placeholder*="Search"]', 'John');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Verify filtered results
    const results = await page.locator('[data-employee-card]').all();
    expect(results.length).toBeGreaterThan(0);
  });

  test('should view employee details', async ({ page }) => {
    await page.goto(`${BASE_URL}/employees`);
    
    // Click on first employee
    await page.locator('[data-employee-card]').first().click();
    
    // Should show employee details
    await expect(page.locator('text=Email, text=Department, text=Position')).toBeVisible();
  });
});

test.describe('E2E Tests - Attendance Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should check in successfully', async ({ page }) => {
    await page.click('text=Attendance, text=Chấm công');
    await page.waitForURL(/.*attendance/);
    
    // Click check in button
    await page.click('button:has-text("Check In")');
    
    // Should show success message
    await expect(page.locator('text=Checked in, text=Success')).toBeVisible({ timeout: 3000 });
  });

  test('should view attendance history', async ({ page }) => {
    await page.goto(`${BASE_URL}/attendance`);
    
    // Should show calendar/list
    await expect(page.locator('[role="grid"], table')).toBeVisible();
  });

  test('should filter attendance by date range', async ({ page }) => {
    await page.goto(`${BASE_URL}/attendance`);
    
    // Click date filter
    await page.click('button:has-text("Filter"), button:has-text("Date")');
    
    // Select date range
    await page.fill('input[type="date"]', '2024-12-01');
    
    // Apply filter
    await page.click('button:has-text("Apply")');
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
  });
});

test.describe('E2E Tests - CEO Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'ceo@sabohub.com');
    await page.fill('input[type="password"]', 'ceo123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should display CEO Dashboard with all widgets', async ({ page }) => {
    await page.goto(`${BASE_URL}/ceo/dashboard`);
    
    // Check for key sections
    await expect(page.locator('text=Health Score')).toBeVisible();
    await expect(page.locator('text=Revenue Forecast')).toBeVisible();
    await expect(page.locator('text=Task Completion Forecast')).toBeVisible();
    await expect(page.locator('text=Key Metrics')).toBeVisible();
  });

  test('should navigate to Strategic KPI', async ({ page }) => {
    await page.click('text=Strategic KPI');
    await page.waitForURL(/.*strategic-kpi/);
    
    await expect(page.locator('h1:has-text("Strategic KPI")')).toBeVisible();
  });

  test('should view OKR tracking', async ({ page }) => {
    await page.click('text=OKR');
    await page.waitForURL(/.*okr/);
    
    // Should show OKR list
    await expect(page.locator('[data-okr-card]')).toHaveCount({ timeout: 5000 });
  });
});

test.describe('E2E Tests - Phase 3 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should view AI Performance Insights', async ({ page }) => {
    await page.click('text=AI Insights, text=Insights');
    await page.waitForURL(/.*insights/);
    
    // Check for insights sections
    await expect(page.locator('text=Warnings')).toBeVisible();
    await expect(page.locator('text=Optimizations')).toBeVisible();
    await expect(page.locator('text=Opportunities')).toBeVisible();
  });

  test('should create workflow automation', async ({ page }) => {
    await page.click('text=Automation');
    await page.waitForURL(/.*automation/);
    
    // Click new workflow
    await page.click('button:has-text("New Workflow")');
    
    // Fill workflow form
    await page.fill('input[name="name"]', 'Test Workflow');
    await page.fill('textarea[name="description"]', 'E2E test workflow');
    
    // Select trigger and action
    await page.selectOption('select[name="trigger"]', 'task_completed');
    await page.selectOption('select[name="action"]', 'send_notification');
    
    // Create
    await page.click('button:has-text("Create")');
    
    // Verify workflow appears
    await expect(page.locator('text=Test Workflow')).toBeVisible();
  });

  test('should view smart notifications', async ({ page }) => {
    await page.click('text=Notifications');
    await page.waitForURL(/.*smart-notifications/);
    
    // Should show notifications list
    await expect(page.locator('[data-notification]')).toHaveCount({ timeout: 5000 });
  });

  test('should schedule automated report', async ({ page }) => {
    await page.click('text=Auto Reports');
    await page.waitForURL(/.*automated-reports/);
    
    // Check for report templates
    await expect(page.locator('text=Executive Summary')).toBeVisible();
    await expect(page.locator('text=Team Performance')).toBeVisible();
  });
});

test.describe('E2E Tests - Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should navigate through all menu items', async ({ page }) => {
    const menuItems = [
      'Dashboard',
      'Tasks',
      'Attendance',
      'Schedules',
      'KPI',
      'Reports',
      'Documents',
    ];

    for (const item of menuItems) {
      await page.click(`text=${item}`);
      await page.waitForTimeout(500);
      await expect(page.locator(`h1:has-text("${item}")`)).toBeVisible();
    }
  });

  test('should show responsive mobile menu', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Click menu button
    await page.click('button[aria-label="Menu"]');
    
    // Menu should be visible
    await expect(page.locator('[role="dialog"], nav')).toBeVisible();
  });
});

test.describe('E2E Tests - Performance', () => {
  test('should load dashboard within 3 seconds', async ({ page }) => {
    const start = Date.now();
    
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Navigate to tasks with many items
    await page.goto(`${BASE_URL}/tasks`);
    
    // Should render without freezing
    await expect(page.locator('[data-task-card]')).toHaveCount({ timeout: 5000 });
  });
});

test.describe('E2E Tests - Error Scenarios', () => {
  test('should handle network errors gracefully', async ({ page, context }) => {
    await context.route('**/*', route => route.abort());
    
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Should show error message
    await expect(page.locator('text=Error, text=Failed')).toBeVisible({ timeout: 3000 });
  });

  test('should redirect to login when session expires', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Clear session
    await page.context().clearCookies();
    
    // Try to access protected route
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Should redirect to login
    await page.waitForURL(/.*login/);
  });
});
