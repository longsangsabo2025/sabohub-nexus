/**
 * CHECK DATABASE SCHEMA - Find correct column names
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dqddxowyikefqcdiioyh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZGR4b3d5aWtlZnFjZGlpb3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTcxMzYsImV4cCI6MjA3NzM3MzEzNn0.okmsG2R248fxOHUEFFl5OBuCtjtCIlO9q9yVSyCV25Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
  console.log('🔍 Checking companies table schema...\n');

  // Try to get a sample record to see available columns
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ Found sample company record:');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('\n📋 Available columns:');
    console.log(Object.keys(data[0]).join(', '));
  } else {
    console.log('⚠️ No companies found in database');
  }
}

checkSchema().then(() => process.exit(0));
