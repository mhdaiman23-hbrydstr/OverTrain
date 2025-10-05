#!/usr/bin/env node

import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SyntaxErrorChecker {
  constructor() {
    this.isRunning = false;
    this.lastCheckTime = 0;
    this.checkInterval = 2000; // Check every 2 seconds
    this.watchedFiles = new Set();
    this.errorCache = new Map();
    this.consoleColors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      reset: '\x1b[0m',
      bold: '\x1b[1m'
    };
  }

  log(message, color = 'white') {
    const timestamp = new Date().toISOString();
    console.log(`${this.consoleColors[color]}[${timestamp}] ${message}${this.consoleColors.reset}`);
  }

  async checkTypeScriptErrors() {
    return new Promise((resolve) => {
      exec('npx tsc --noEmit --pretty false', (error, stdout, stderr) => {
        const errors = [];
        
        if (error) {
          const output = stderr || stdout;
          const lines = output.split('\n');
          
          for (const line of lines) {
            if (line.includes('error TS') || line.includes('error:')) {
              errors.push({
                type: 'typescript',
                message: line.trim(),
                severity: 'error'
              });
            }
          }
        }
        
        resolve(errors);
      });
    });
  }

  async checkESLintErrors() {
    return new Promise((resolve) => {
      exec('npx next lint --quiet', (error, stdout, stderr) => {
        const errors = [];
        
        if (error) {
          const output = stderr || stdout;
          const lines = output.split('\n');
          
          for (const line of lines) {
            if (line.includes('error') || line.includes('Error:')) {
              errors.push({
                type: 'eslint',
                message: line.trim(),
                severity: 'error'
              });
            } else if (line.includes('warning') || line.includes('Warning:')) {
              errors.push({
                type: 'eslint',
                message: line.trim(),
                severity: 'warning'
              });
            }
          }
        }
        
        resolve(errors);
      });
    });
  }

  async checkNextBuild() {
    return new Promise((resolve) => {
      exec('npx next build --dry-run', (error, stdout, stderr) => {
        const errors = [];
        
        if (error) {
          const output = stderr || stdout;
          const lines = output.split('\n');
          
          for (const line of lines) {
            if (line.includes('Error:') || line.includes('Failed to compile')) {
              errors.push({
                type: 'nextjs',
                message: line.trim(),
                severity: 'error'
              });
            }
          }
        }
        
        resolve(errors);
      });
    });
  }

  async checkSyntaxErrors() {
    try {
      const [tsErrors, eslintErrors, nextErrors] = await Promise.all([
        this.checkTypeScriptErrors(),
        this.checkESLintErrors(),
        this.checkNextBuild()
      ]);

      const allErrors = [...tsErrors, ...eslintErrors, ...nextErrors];
      
      if (allErrors.length > 0) {
        this.log(`\n${this.consoleColors.bold}${this.consoleColors.red}🚨 SYNTAX ERRORS DETECTED:${this.consoleColors.reset}`, 'red');
        
        allErrors.forEach((error, index) => {
          const color = error.severity === 'error' ? 'red' : 'yellow';
          const icon = error.severity === 'error' ? '❌' : '⚠️';
          this.log(`${icon} [${error.type.toUpperCase()}] ${error.message}`, color);
        });
        
        this.log(`${this.consoleColors.bold}Total errors: ${allErrors.length}${this.consoleColors.reset}\n`, 'red');
        return allErrors;
      } else {
        this.log(`${this.consoleColors.green}✅ No syntax errors detected${this.consoleColors.reset}`, 'green');
        return [];
      }
    } catch (error) {
      this.log(`Error during syntax check: ${error.message}`, 'red');
      return [];
    }
  }

  setupFileWatcher() {
    const watchPatterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.json'
    ];

    const watcher = chokidar.watch(watchPatterns, {
      ignored: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**'
      ],
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', (filePath) => {
      this.log(`File changed: ${filePath}`, 'cyan');
      this.scheduleCheck();
    });

    watcher.on('add', (filePath) => {
      this.log(`File added: ${filePath}`, 'cyan');
      this.scheduleCheck();
    });

    watcher.on('unlink', (filePath) => {
      this.log(`File removed: ${filePath}`, 'cyan');
      this.scheduleCheck();
    });

    return watcher;
  }

  scheduleCheck() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    setTimeout(async () => {
      await this.checkSyntaxErrors();
      this.isRunning = false;
    }, 1000); // Debounce by 1 second
  }

  async start() {
    this.log(`${this.consoleColors.bold}${this.consoleColors.blue}🔍 Starting Syntax Error Checker...${this.consoleColors.reset}`, 'blue');
    this.log('Monitoring TypeScript, ESLint, and Next.js build errors', 'white');
    this.log('Press Ctrl+C to stop\n', 'white');

    // Initial check
    await this.checkSyntaxErrors();

    // Set up file watcher
    const watcher = this.setupFileWatcher();

    // Periodic checks as backup
    const intervalId = setInterval(async () => {
      if (!this.isRunning) {
        await this.checkSyntaxErrors();
      }
    }, this.checkInterval);

    // Graceful shutdown
    process.on('SIGINT', () => {
      this.log('\n🛑 Stopping syntax error checker...', 'yellow');
      clearInterval(intervalId);
      watcher.close();
      process.exit(0);
    });

    // Keep the process running
    process.on('uncaughtException', (error) => {
      this.log(`Uncaught exception: ${error.message}`, 'red');
    });

    process.on('unhandledRejection', (reason) => {
      this.log(`Unhandled rejection: ${reason}`, 'red');
    });
  }
}

// Check if chokidar is available, if not, install it
const checkDependencies = async () => {
  try {
    await import('chokidar');
  } catch (error) {
    console.log('Installing chokidar for file watching...');
    exec('npm install chokidar --save-dev', (error) => {
      if (error) {
        console.error('Failed to install chokidar:', error);
        process.exit(1);
      } else {
        console.log('Chokidar installed successfully');
        new SyntaxErrorChecker().start();
      }
    });
    return;
  }
  
  new SyntaxErrorChecker().start();
};

checkDependencies();