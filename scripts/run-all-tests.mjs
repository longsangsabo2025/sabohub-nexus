#!/usr/bin/env node

/**
 * Test Runner Script
 * Runs comprehensive test suite with reporting
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const runCommand = (command, args = []) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}`));
      } else {
        resolve();
      }
    });
  });
};

const main = async () => {
  console.log('\n🚀 Starting SaboHub Test Suite...\n');
  console.log('=' .repeat(60));

  const results = {
    backend: { passed: false, time: 0 },
    integration: { passed: false, time: 0 },
    e2e: { passed: false, time: 0 },
  };

  // Backend Tests
  try {
    console.log('\n📦 Running Backend API Tests...\n');
    const start = Date.now();
    await runCommand('npm', ['run', 'test:backend']);
    results.backend.time = Date.now() - start;
    results.backend.passed = true;
    console.log('✅ Backend tests passed!');
  } catch (error) {
    console.error('❌ Backend tests failed!');
  }

  // UI Integration Tests
  try {
    console.log('\n🎨 Running UI/UX Integration Tests...\n');
    const start = Date.now();
    await runCommand('npm', ['run', 'test:integration']);
    results.integration.time = Date.now() - start;
    results.integration.passed = true;
    console.log('✅ UI Integration tests passed!');
  } catch (error) {
    console.error('❌ UI Integration tests failed!');
  }

  // E2E Tests
  try {
    console.log('\n🌐 Running End-to-End Tests...\n');
    const start = Date.now();
    await runCommand('npm', ['run', 'test:e2e']);
    results.e2e.time = Date.now() - start;
    results.e2e.passed = true;
    console.log('✅ E2E tests passed!');
  } catch (error) {
    console.error('❌ E2E tests failed!');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary:\n');
  
  const total = Object.values(results).filter(r => r.passed).length;
  const totalTime = Object.values(results).reduce((sum, r) => sum + r.time, 0);

  console.log(`Backend Tests:     ${results.backend.passed ? '✅ PASS' : '❌ FAIL'} (${(results.backend.time / 1000).toFixed(2)}s)`);
  console.log(`Integration Tests: ${results.integration.passed ? '✅ PASS' : '❌ FAIL'} (${(results.integration.time / 1000).toFixed(2)}s)`);
  console.log(`E2E Tests:         ${results.e2e.passed ? '✅ PASS' : '❌ FAIL'} (${(results.e2e.time / 1000).toFixed(2)}s)`);
  
  console.log(`\nTotal: ${total}/3 test suites passed`);
  console.log(`Total Time: ${(totalTime / 1000).toFixed(2)}s`);
  
  if (total === 3) {
    console.log('\n🎉 All tests passed! System is production-ready!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix.\n');
    process.exit(1);
  }
};

main().catch(console.error);
