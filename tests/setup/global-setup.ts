/**
 * PLAYWRIGHT GLOBAL SETUP
 * Chạy TRƯỚC tất cả tests để setup test environment
 * Docs: https://playwright.dev/docs/test-global-setup-teardown
 */

// Load env từ .env.test FIRST
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env.test');
console.log('📋 Loading env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('❌ Failed to load .env.test:', result.error);
} else {
  console.log('✅ Loaded', Object.keys(result.parsed || {}).length, 'env variables');
  console.log('   SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Present' : '✗ Missing');
}

import { setupTestEnvironment, cleanupTestData } from './test-data';

async function globalSetup() {
  console.log('\n🚀 Starting global test setup...\n');
  
  try {
    // Setup complete test environment (verify CEO session only)
    const result = await setupTestEnvironment();
    
    console.log('\n📊 Test Strategy:');
    console.log('  Message:', result.message);
    console.log('  CEO Email:', result.ceoEmail);
    
    console.log('\n✅ Global setup complete!\n');
    
    // Return data cho tests sử dụng (optional)
    return result;
  } catch (error) {
    console.error('\n❌ Global setup failed:', error);
    throw error;
  }
}

async function globalTeardown() {
  console.log('\n🧹 Starting global teardown...\n');
  
  try {
    // Cleanup all test data
    await cleanupTestData();
    console.log('\n✅ Global teardown complete!\n');
  } catch (error) {
    console.error('\n❌ Global teardown failed:', error);
    // Don't throw - allow tests to complete
  }
}

export default globalSetup;
export { globalTeardown };
