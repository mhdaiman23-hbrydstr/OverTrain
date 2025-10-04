#!/usr/bin/env node
/**
 * GLM Test Generation Script
 * Generates test cases for specified files
 */

import { callGLM, createTestPrompt, formatOutput, readFile } from './glm-helper.js';

const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node scripts/glm-test-gen.js <file-path>');
  console.log('Example: npm run glm:test -- lib/analytics.ts');
  process.exit(1);
}

async function generateTests() {
  console.log(`🧪 Generating tests for ${filePath}...\n`);

  try {
    const code = await readFile(filePath);
    const messages = createTestPrompt(code, 'vitest');
    const tests = await callGLM(messages, { temperature: 0.3, maxTokens: 8192 });
    
    formatOutput(tests, `Generated Tests for ${filePath}`);
    
    console.log('💾 Copy the tests above and save to a .test.ts file\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

generateTests();
