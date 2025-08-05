#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

console.log(`${colors.blue}🦫 Starting Lemur Application...${colors.reset}\n`);

// Check if .env file exists
const envPath = path.join(__dirname, 'backend', '.env');
const envExamplePath = path.join(__dirname, 'backend', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log(`${colors.yellow}⚠️  Warning: backend/.env file not found!${colors.reset}`);
  if (fs.existsSync(envExamplePath)) {
    console.log(`${colors.yellow}Creating from .env.example...${colors.reset}`);
    fs.copyFileSync(envExamplePath, envPath);
    console.log(`${colors.red}Please add your OPENAI_API_KEY to backend/.env before using the chat feature.${colors.reset}\n`);
  }
}

// Function to check if port is available
function checkPort(port) {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// Function to wait for server
function waitForServer(url, name, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          console.log(`${colors.green}✓ ${name} is ready!${colors.reset}`);
          resolve();
        } else if (attempts < maxAttempts) {
          setTimeout(check, 1000);
        } else {
          reject(new Error(`${name} failed to start`));
        }
      }).on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(check, 1000);
        } else {
          reject(new Error(`${name} failed to start`));
        }
      });
    };
    
    console.log(`Waiting for ${name} to start...`);
    check();
  });
}

// Function to open browser
function openBrowser(url) {
  console.log(`\n${colors.blue}Opening browser at ${url}${colors.reset}`);
  
  const platform = process.platform;
  let cmd;
  
  if (platform === 'darwin') {
    cmd = 'open';
  } else if (platform === 'win32') {
    cmd = 'start';
  } else {
    cmd = 'xdg-open';
  }
  
  spawn(cmd, [url], { detached: true, stdio: 'ignore' }).unref();
}

// Main startup function
async function start() {
  try {
    // Check ports
    console.log('Checking ports...');
    const backendPortAvailable = await checkPort(8000);
    const frontendPortAvailable = await checkPort(5173);
    
    if (!backendPortAvailable) {
      console.error(`${colors.red}Port 8000 is already in use!${colors.reset}`);
      console.error('Please stop the process using port 8000 and try again.');
      process.exit(1);
    }
    
    if (!frontendPortAvailable) {
      console.error(`${colors.red}Port 5173 is already in use!${colors.reset}`);
      console.error('Please stop the process using port 5173 and try again.');
      process.exit(1);
    }
    
    console.log(`${colors.green}✓ Ports are available${colors.reset}\n`);
    
    // Start backend
    console.log(`${colors.blue}Starting backend server...${colors.reset}`);
    const backendProcess = spawn('python', ['main.py'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    backendProcess.stdout.on('data', (data) => {
      process.stdout.write(`[Backend] ${data}`);
    });
    
    backendProcess.stderr.on('data', (data) => {
      process.stderr.write(`[Backend] ${data}`);
    });
    
    // Start frontend
    console.log(`${colors.blue}Starting frontend server...${colors.reset}`);
    const frontendProcess = spawn('npm', ['run', 'dev', '--', '--host'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });
    
    frontendProcess.stdout.on('data', (data) => {
      process.stdout.write(`[Frontend] ${data}`);
    });
    
    frontendProcess.stderr.on('data', (data) => {
      process.stderr.write(`[Frontend] ${data}`);
    });
    
    // Handle process termination
    const cleanup = () => {
      console.log(`\n${colors.yellow}Shutting down Lemur...${colors.reset}`);
      backendProcess.kill();
      frontendProcess.kill();
      console.log(`${colors.green}✓ Lemur stopped${colors.reset}`);
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // Wait for servers and open browser
    await waitForServer('http://localhost:8000', 'Backend');
    await waitForServer('http://localhost:5173', 'Frontend');
    
    openBrowser('http://localhost:5173');
    
    console.log(`\n${colors.green}========================================${colors.reset}`);
    console.log(`${colors.green}✨ Lemur is running!${colors.reset}`);
    console.log(`${colors.green}========================================${colors.reset}`);
    console.log(`\nFrontend: ${colors.blue}http://localhost:5173${colors.reset}`);
    console.log(`Backend API: ${colors.blue}http://localhost:8000${colors.reset}`);
    console.log(`API Docs: ${colors.blue}http://localhost:8000/docs${colors.reset}`);
    console.log(`\n${colors.yellow}Press Ctrl+C to stop all servers${colors.reset}\n`);
    
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Start the application
start();