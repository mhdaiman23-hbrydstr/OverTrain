#!/usr/bin/env node

// Native build script for Capacitor
// This script builds the Next.js app for native platforms

import { spawn } from 'child_process';
import { copyFileSync, existsSync, renameSync } from 'fs';

console.log('🔨 Building OverTrain for native platforms...');

const mainConfig = 'next.config.mjs';
const nativeConfig = 'next.config.native.mjs';
const backupConfig = 'next.config.web.mjs';
const apiDir = 'app/api';
const tempApiDir = 'api_backup';

let configRestored = false;
let apiRestored = false;

function restoreConfig() {
  if (!configRestored && existsSync(backupConfig)) {
    renameSync(backupConfig, mainConfig);
    configRestored = true;
  }
}

function restoreApi() {
  if (!apiRestored && existsSync(tempApiDir)) {
    renameSync(tempApiDir, apiDir);
    apiRestored = true;
  }
}

function cleanupAndExit(code, error = null) {
  restoreConfig();
  restoreApi();
  
  if (error) {
    console.error('❌ Build error:', error);
    process.exit(1);
  } else if (code === 0) {
    console.log('✅ Native build completed successfully!');
    console.log('📱 Output ready for Capacitor platforms');
  } else {
    console.error('❌ Native build failed');
    process.exit(code);
  }
}

try {
  // Backup original config
  if (existsSync(mainConfig)) {
    copyFileSync(mainConfig, backupConfig);
  }
  
  // Use native config
  copyFileSync(nativeConfig, mainConfig);
  
  // Temporarily move API directory to avoid build errors
  if (existsSync(apiDir)) {
    console.log('📦 Temporarily moving API routes...');
    renameSync(apiDir, tempApiDir);
  }
  
  // Run next build
  const nextBuild = spawn('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });

  nextBuild.on('close', cleanupAndExit);
  nextBuild.on('error', (error) => cleanupAndExit(1, error));

} catch (error) {
  cleanupAndExit(1, error);
}
