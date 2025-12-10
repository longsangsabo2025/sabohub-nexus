// Test Supabase connection and database access
import { supabase } from './supabase';

export async function testSupabaseConnection() {
  const results = {
    connection: false,
    auth: false,
    tables: {
      employees: false,
      tasks: false,
      attendance: false,
      companies: false,
    },
    errors: [] as string[],
  };

  try {
    // Test 1: Basic connection
    const { data: healthCheck, error: healthError } = await supabase
      .from('employees')
      .select('id')
      .limit(1);

    if (!healthError) {
      results.connection = true;
    } else {
      results.errors.push(`Connection error: ${healthError.message}`);
    }

    // Test 2: Auth check
    const {
      data: { session },
    } = await supabase.auth.getSession();
    results.auth = !!session;

    // Test 3: Check each table
    const tableTests = [
      { name: 'employees', query: supabase.from('employees').select('id').limit(1) },
      { name: 'tasks', query: supabase.from('tasks').select('id').limit(1) },
      { name: 'attendance', query: supabase.from('attendance').select('id').limit(1) },
      { name: 'companies', query: supabase.from('companies').select('id').limit(1) },
    ];

    for (const test of tableTests) {
      try {
        const { error } = await test.query;
        if (!error) {
          results.tables[test.name as keyof typeof results.tables] = true;
        } else {
          results.errors.push(`${test.name} table error: ${error.message}`);
        }
      } catch (err) {
        results.errors.push(`${test.name} table: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return results;
  } catch (error) {
    results.errors.push(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return results;
  }
}

// Log connection status (for debugging)
export function logConnectionStatus(results: Awaited<ReturnType<typeof testSupabaseConnection>>) {
  console.group('🔌 Supabase Connection Test');
  console.log('Connection:', results.connection ? '✅' : '❌');
  console.log('Auth:', results.auth ? '✅' : '❌');
  console.log('Tables:');
  Object.entries(results.tables).forEach(([table, status]) => {
    console.log(`  ${table}:`, status ? '✅' : '❌');
  });
  if (results.errors.length > 0) {
    console.error('Errors:', results.errors);
  }
  console.groupEnd();
}

