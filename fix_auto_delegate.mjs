/**
 * FIX AUTO-DELEGATE: Create company record for CEO user
 * Issue: GET /companies?ceo_id=... returns 400 → No metrics → Auto-Delegate không trigger
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dqddxowyikefqcdiioyh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZGR4b3d5aWtlZnFjZGlpb3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTcxMzYsImV4cCI6MjA3NzM3MzEzNn0.okmsG2R248fxOHUEFFl5OBuCtjtCIlO9q9yVSyCV25Y';
const CEO_USER_ID = '944f7536-6c9a-4bea-99fc-f1c984fef2ef';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixCompanyRecord() {
  console.log('=' .repeat(60));
  console.log('🚀 FIX AUTO-DELEGATE - Create Company Record');
  console.log('='.repeat(60));
  console.log();

  try {
    // Check if CEO already has company
    console.log(`🔍 Checking for existing company (owner_id=${CEO_USER_ID.slice(0, 8)}...)`);
    
    const { data: existingCompany, error: checkError } = await supabase
      .from('companies')
      .select('id, name, owner_id')
      .eq('owner_id', CEO_USER_ID)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking company:', checkError);
      return false;
    }

    if (existingCompany) {
      console.log(`✅ Company already exists: ${existingCompany.name} (id=${existingCompany.id})`);
      console.log('✅ Auto-Delegate should work now!');
      return true;
    }

    // Create new company
    console.log('📝 Creating new company for CEO...');
    
    const { data: newCompany, error: insertError } = await supabase
      .from('companies')
      .insert({
        name: 'SABO Tech Company',
        owner_id: CEO_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating company:', insertError);
      return false;
    }

    console.log('✅ Company created successfully!');
    console.log(`   - ID: ${newCompany.id}`);
    console.log(`   - Name: ${newCompany.name}`);
    console.log(`   - CEO ID: ${CEO_USER_ID}`);

    // Verify
    const { data: verifyCompany } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        owner_id
      `)
      .eq('owner_id', CEO_USER_ID)
      .single();

    if (verifyCompany) {
      console.log('\n📊 VERIFICATION:');
      console.log(`   - Company ID: ${verifyCompany.id}`);
      console.log(`   - Company Name: ${verifyCompany.name}`);
      console.log('\n🎉 Auto-Delegate is now ready to use!');
      console.log("   → Refresh browser and try: 'Giao 10 việc cấp bách cho manager'");
    }

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the fix
fixCompanyRecord().then(success => {
  console.log();
  console.log('='.repeat(60));
  if (success) {
    console.log('✅ DONE! Auto-Delegate should work now!');
  } else {
    console.log('❌ FAILED! Check errors above.');
  }
  console.log('='.repeat(60));
  process.exit(success ? 0 : 1);
});
