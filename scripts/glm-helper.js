/**
 * GLM API Helper Utilities
 * Shared functions for calling GLM-4.6 API directly
 */

import 'dotenv/config';

const GLM_API_URL = process.env.GLM_API_URL || 'https://api.z.ai/api/paas/v4/chat/completions';
const GLM_API_KEY = process.env.GLM_API_KEY;

/**
 * Call GLM API with messages
 * @param {Array} messages - Array of message objects {role, content}
 * @param {Object} options - Optional parameters (temperature, max_tokens, etc.)
 * @returns {Promise<string>} - GLM response text
 */
export async function callGLM(messages, options = {}) {
  if (!GLM_API_KEY) {
    throw new Error('GLM_API_KEY not found in environment variables');
  }

  const payload = {
    model: options.model || 'glm-4.6',
    messages: messages,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature || 0.6,
    stream: options.stream || false,
    ...options
  };

  const response = await fetch(GLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GLM_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GLM API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Create a code review prompt
 * @param {string} code - Code to review
 * @param {string} context - Additional context about the code
 * @returns {Array} - Messages array for GLM
 */
export function createReviewPrompt(code, context = '') {
  return [
    {
      role: 'system',
      content: `You are an expert code reviewer specializing in React, Next.js, and TypeScript. 
Provide constructive feedback on code quality, performance, security, and best practices.
Focus on the LiftLog fitness tracking application context.`
    },
    {
      role: 'user',
      content: `Review this code${context ? ` (${context})` : ''}:\n\n\`\`\`\n${code}\n\`\`\``
    }
  ];
}

/**
 * Create a test generation prompt
 * @param {string} code - Code to generate tests for
 * @param {string} framework - Testing framework (jest, vitest, etc.)
 * @returns {Array} - Messages array for GLM
 */
export function createTestPrompt(code, framework = 'jest') {
  return [
    {
      role: 'system',
      content: `You are an expert in writing comprehensive test suites using ${framework}. 
Generate thorough unit and integration tests for React components and TypeScript functions.
Include edge cases, error handling, and user interaction testing.`
    },
    {
      role: 'user',
      content: `Generate ${framework} tests for this code:\n\n\`\`\`\n${code}\n\`\`\``
    }
  ];
}

/**
 * Create a refactoring suggestion prompt
 * @param {string} code - Code to analyze for refactoring
 * @returns {Array} - Messages array for GLM
 */
export function createRefactorPrompt(code) {
  return [
    {
      role: 'system',
      content: `You are an expert in code refactoring and optimization.
Suggest improvements for code quality, performance, maintainability, and adherence to best practices.
Provide specific, actionable recommendations with example code.`
    },
    {
      role: 'user',
      content: `Analyze this code and suggest refactoring improvements:\n\n\`\`\`\n${code}\n\`\`\``
    }
  ];
}

/**
 * Format GLM response for console output
 * @param {string} response - GLM response text
 * @param {string} title - Title for the output
 */
export function formatOutput(response, title = 'GLM Response') {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
  console.log(response);
  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Read file content
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} - File content
 */
export async function readFile(filePath) {
  const fs = await import('fs/promises');
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Write file content
 * @param {string} filePath - Path to file
 * @param {string} content - Content to write
 */
export async function writeFile(filePath, content) {
  const fs = await import('fs/promises');
  return fs.writeFile(filePath, content, 'utf-8');
}
