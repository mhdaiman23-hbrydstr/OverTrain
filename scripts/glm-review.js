#!/usr/bin/env node
/**
 * GLM Code Review Script
 * Analyzes staged git changes and provides code review feedback
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { callGLM, createReviewPrompt, formatOutput } from './glm-helper.js';

const execAsync = promisify(exec);

async function getGitDiff() {
  try {
    const { stdout } = await execAsync('git diff --cached');
    if (!stdout) {
      console.log('No staged changes found. Stage files with "git add" first.');
      process.exit(0);
    }
    return stdout;
  } catch (error) {
    console.error('Error getting git diff:', error.message);
    process.exit(1);
  }
}

async function reviewCode() {
  console.log('🔍 Analyzing staged changes with GLM-4.6...\n');
  const diff = await getGitDiff();
  const messages = createReviewPrompt(diff, 'Git diff of staged changes for LiftLog app');
  
  try {
    const review = await callGLM(messages, { temperature: 0.4, maxTokens: 8192 });
    formatOutput(review, 'GLM-4.6 Code Review');
    console.log('✅ Review complete!\n');
  } catch (error) {
    console.error('❌ Error calling GLM API:', error.message);
    process.exit(1);
  }
}

reviewCode();
