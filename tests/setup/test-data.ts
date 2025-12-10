/**
 * TEST DATA SETUP - Tạo data test trong Supabase
 * Theo Playwright best practices: Test fixtures và test data isolation
 * Docs: https://playwright.dev/docs/test-fixtures
 * 
 * Strategy: Login với CEO user thật để tạo test data (không bypass RLS)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// CEO credentials (user thật trong DB)
const CEO_EMAIL = 'longsangsabo1@gmail.com';
const CEO_PASSWORD = 'Acookingoil123@';

// Lazy-init supabase client với CEO session
let supabaseInstance: SupabaseClient | null = null;

async function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseInstance) {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

    console.log('🔑 Creating Supabase Client with CEO session:');
    console.log('  URL:', SUPABASE_URL ? '✓ Loaded' : '✗ Missing');
    console.log('  ANON_KEY:', SUPABASE_ANON_KEY?.substring(0, 20) + '...' || '✗ Missing');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment');
    }

    // Create client với ANON key
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    // Login với CEO để có permissions tạo data
    console.log('  👤 Logging in as CEO...');
    const { data, error } = await supabaseInstance.auth.signInWithPassword({
      email: CEO_EMAIL,
      password: CEO_PASSWORD,
    });

    if (error) {
      throw new Error(`Failed to login as CEO: ${error.message}`);
    }

    console.log('  ✅ CEO logged in:', data.user?.email);
  }
  return supabaseInstance;
}

export interface TestUser {
  email: string;
  password: string;
  full_name: string;
  role: 'ceo' | 'manager' | 'shift_leader' | 'staff';
  id?: string;
}

export interface TestCompany {
  id?: string;
  name: string;
}

export interface TestEmployee {
  id?: string;
  company_id: string;
  email: string;
  full_name: string;
  role: 'ceo' | 'manager' | 'shift_leader' | 'staff';
}

export interface TestTask {
  id?: string;
  company_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  assigned_to?: string;
  due_date?: string;
}

export interface TestAttendance {
  id?: string;
  employee_id: string;
  check_in: string;
  check_out?: string;
  status: 'present' | 'late' | 'absent';
}

/**
 * Cleanup: NO-OP when using production data
 * Không xóa data thật của CEO
 */
export async function cleanupTestData() {
  console.log('🧹 Cleanup: Skipped (using production data, not test data)');
}

/**
 * Setup: Tạo test company
 */
export async function createTestCompany(companyData: TestCompany): Promise<string> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('companies')
    .insert([
      {
        name: companyData.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ])
    .select()
    .single();

  if (error) throw new Error(`Failed to create test company: ${error.message}`);
  return data.id;
}

/**
 * Setup: Tạo test employee (KHÔNG tạo auth user, chỉ DB record)
 */
export async function createTestEmployee(employeeData: TestEmployee): Promise<string> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('employees')
    .insert([
      {
        company_id: employeeData.company_id,
        email: employeeData.email,
        full_name: employeeData.full_name,
        role: employeeData.role,
        created_at: new Date().toISOString(),
      }
    ])
    .select()
    .single();

  if (error) throw new Error(`Failed to create test employee: ${error.message}`);
  return data.id;
}

/**
 * Setup: Tạo test tasks
 */
export async function createTestTasks(tasks: TestTask[]): Promise<string[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('tasks')
    .insert(tasks.map(task => ({
      company_id: task.company_id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      assigned_to: task.assigned_to,
      due_date: task.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    })))
    .select();

  if (error) throw new Error(`Failed to create test tasks: ${error.message}`);
  return data.map(t => t.id);
}

/**
 * Setup: Tạo test attendance
 */
export async function createTestAttendance(attendance: TestAttendance[]): Promise<string[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('attendance')
    .insert(attendance.map(att => ({
      employee_id: att.employee_id,
      check_in: att.check_in,
      check_out: att.check_out,
      status: att.status,
      created_at: new Date().toISOString(),
    })))
    .select();

  if (error) throw new Error(`Failed to create test attendance: ${error.message}`);
  return data.map(a => a.id);
}

/**
 * Full setup: Tạo complete test environment
 * Strategy: SKIP test data setup - dùng data THẬT trong DB
 * CEO đã có companies, employees, tasks, attendance → Test với data production
 */
export async function setupTestEnvironment() {
  console.log('🏗️ Setting up test environment...');
  console.log('ℹ️  Strategy: Using REAL production data (no test data creation needed)');
  console.log('ℹ️  CEO has existing companies, employees, tasks, attendance');

  // Login CEO để verify session hoạt động
  const supabase = await getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user?.email) {
    throw new Error('CEO session not established');
  }

  console.log('✅ CEO session verified:', userData.user.email);
  console.log('✅ Ready to run E2E tests with production data');

  return {
    message: 'Using production data - no test data created',
    ceoEmail: userData.user.email,
  };
}
