/**
 * PLAYWRIGHT GLOBAL TEARDOWN
 * Chạy SAU tất cả tests để cleanup
 */

import { cleanupTestData } from './test-data';

async function globalTeardown() {
  console.log('\n🧹 Starting global teardown...\n');
  
  try {
    await cleanupTestData();
    console.log('\n✅ Global teardown complete!\n');
  } catch (error) {
    console.error('\n❌ Global teardown failed:', error);
  }
}

export default globalTeardown;
