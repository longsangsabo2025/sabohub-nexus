
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dqddxowyikefqcdiioyh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZGR4b3d5aWtlZnFjZGlpb3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTcxMzYsImV4cCI6MjA3NzM3MzEzNn0.okmsG2R248fxOHUEFFl5OBuCtjtCIlO9q9yVSyCV25Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTable(tableName) {
  console.log(`\n🔍 Checking ${tableName}...`);
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  
  if (error) {
    console.log(`❌ Error or table does not exist: ${error.message}`);
    return;
  }
  
  if (data && data.length > 0) {
    console.log(`✅ Columns: ${Object.keys(data[0]).join(', ')}`);
  } else {
    console.log(`⚠️ Table exists but is empty. Cannot infer columns.`);
  }
}

async function run() {
  await checkTable('financial_transactions');
  await checkTable('approval_requests');
  await checkTable('time_off_requests');
  await checkTable('tasks');
}

run();
