#!/usr/bin/env node
/**
 * GLM Integration Verification Script
 * Tests that GLM API is properly configured
 */

import { callGLM, formatOutput } from './glm-helper.js';

async function verifyGLM() {
  console.log('🔬 Verifying GLM-4.6 Integration...\n');

  const messages = [
    {
      role: 'system',
      content: 'You are GLM-4.6, an advanced AI coding assistant.'
    },
    {
      role: 'user',
      content: 'Respond with: "GLM-4.6 is successfully integrated and ready to assist with LiftLog development!"'
    }
  ];

  try {
    const response = await callGLM(messages, { temperature: 0.1, maxTokens: 100 });
    formatOutput(response, 'GLM-4.6 Verification Test');
    
    console.log('✅ GLM API is working correctly!');
    console.log('✅ You can now use GLM helper scripts:\n');
    console.log('  npm run glm:review    - Review staged changes');
    console.log('  npm run glm:test      - Generate tests');
    console.log('  npm run glm:verify    - Run this verification\n');
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('\n📋 Troubleshooting:');
    console.error('  1. Check GLM_API_KEY in .env.local');
    console.error('  2. Ensure .env.local is in project root');
    console.error('  3. Verify API key is valid at https://z.ai\n');
    process.exit(1);
  }
}

verifyGLM();
