#!/usr/bin/env node

const { spawn } = require('child_process');
const pty = require('@homebridge/node-pty-prebuilt-multiarch');

// Function to restore terminal state
function restoreTerminal() {
  // Show cursor
  process.stdout.write('\x1B[?25h');
  // Reset any terminal modes
  process.stdout.write('\x1B[0m');
  // Clear any remaining escape sequences
  process.stdout.write('\x1B[?1004l');
}

// Handle various exit scenarios
process.on('exit', restoreTerminal);
process.on('SIGINT', () => {
  restoreTerminal();
  process.exit(130);
});
process.on('SIGTERM', () => {
  restoreTerminal();
  process.exit(143);
});

// First build the project
const build = spawn('pnpm', ['build'], { stdio: 'inherit' });

build.on('close', (code) => {
  if (code !== 0) {
    process.exit(1);
  }

  
  // Create a pseudo-terminal
  const ptyProcess = pty.spawn('pnpm', ['node', './dist/cli.js'], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
  });

  // Set a timeout to kill the process if it takes too long
  const timeout = setTimeout(() => {
    restoreTerminal();
    ptyProcess.kill();
    process.exit(1);
  }, 10000);

  // Buffer to accumulate output
  let buffer = '';
  let responseCount = 0;
  
  // Forward output to console
  ptyProcess.on('data', (data) => {
    process.stdout.write(data);
    buffer += data;
    
    // Check for prompts and respond immediately
    if (buffer.includes('Do you want to continue') && buffer.includes('(y/N):')) {
      responseCount++;
      ptyProcess.write('y');
      buffer = ''; // Clear buffer after responding
      
    }
    
    // Check if we've reached the Claude CLI welcome screen
    if (data.includes('Welcome to Claude Code')) {
      clearTimeout(timeout);
      setTimeout(() => {
        restoreTerminal();
        ptyProcess.kill();
        process.exit(0);
      }, 1000);
    }
  });

  ptyProcess.on('exit', (exitCode) => {
    clearTimeout(timeout);
    process.exit(exitCode);
  });
});