#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// ASCII Art Logo
const logo = `
${colors.cyan}
     _                              
    | |    ___ _ __ ___  _   _ _ __ 
    | |   / _ \\ '_ \` _ \\| | | | '__|
    | |__|  __/ | | | | | |_| | |   
    |_____\\___|_| |_| |_|\\__,_|_|   
                                    
    🦫 AI-Powered Data Analysis
${colors.reset}`;

console.log(logo);

// Configuration
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 5173;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

// Process tracking
let backendProcess = null;
let frontendProcess = null;

// Loading animation
function showLoadingAnimation(message) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  
  const interval = setInterval(() => {
    process.stdout.write(`\r${colors.blue}${frames[i]} ${message}${colors.reset}`);
    i = (i + 1) % frames.length;
  }, 100);
  
  return () => {
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(message.length + 3) + '\r');
  };
}

// Check prerequisites
async function checkPrerequisites() {
  console.log(`${colors.blue}📋 Checking prerequisites...${colors.reset}\n`);
  
  const checks = [
    {
      name: 'Python',
      command: 'python --version',
      error: 'Python is not installed. Please install Python 3.11 or higher.'
    },
    {
      name: 'Node.js',
      command: 'node --version',
      error: 'Node.js is not installed. Please install Node.js 18 or higher.'
    },
    {
      name: 'npm',
      command: 'npm --version',
      error: 'npm is not installed. Please install npm.'
    }
  ];
  
  for (const check of checks) {
    try {
      await new Promise((resolve, reject) => {
        exec(check.command, (error, stdout) => {
          if (error) reject(error);
          else {
            console.log(`${colors.green}✓${colors.reset} ${check.name}: ${stdout.trim()}`);
            resolve();
          }
        });
      });
    } catch (error) {
      console.error(`${colors.red}✗ ${check.error}${colors.reset}`);
      process.exit(1);
    }
  }
  
  console.log();
}

// Check and create .env file
function checkEnvFile() {
  const envPath = path.join(__dirname, 'backend', '.env');
  const envExamplePath = path.join(__dirname, 'backend', '.env.example');
  
  if (!fs.existsSync(envPath)) {
    console.log(`${colors.yellow}⚠️  Creating backend/.env file...${colors.reset}`);
    
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log(`${colors.yellow}📝 Please add your OPENAI_API_KEY to backend/.env${colors.reset}`);
      console.log(`${colors.dim}   You can still use the app without it, but chat features will be limited.${colors.reset}\n`);
    }
  }
}

// Check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

// Install dependencies if needed
async function installDependencies() {
  // Check backend dependencies
  const requirementsExist = fs.existsSync(path.join(__dirname, 'backend', 'requirements.txt'));
  const backendDepsInstalled = fs.existsSync(path.join(__dirname, 'backend', '.deps_installed'));
  
  if (requirementsExist && !backendDepsInstalled) {
    console.log(`${colors.blue}📦 Installing backend dependencies...${colors.reset}`);
    const stopLoading = showLoadingAnimation('Installing Python packages');
    
    await new Promise((resolve, reject) => {
      exec('pip install -r requirements.txt', { cwd: path.join(__dirname, 'backend') }, (error) => {
        stopLoading();
        if (error) {
          console.error(`${colors.red}Failed to install backend dependencies${colors.reset}`);
          reject(error);
        } else {
          fs.writeFileSync(path.join(__dirname, 'backend', '.deps_installed'), '');
          console.log(`${colors.green}✓ Backend dependencies installed${colors.reset}`);
          resolve();
        }
      });
    });
  }
  
  // Check frontend dependencies
  if (!fs.existsSync(path.join(__dirname, 'frontend', 'node_modules'))) {
    console.log(`${colors.blue}📦 Installing frontend dependencies...${colors.reset}`);
    const stopLoading = showLoadingAnimation('Installing npm packages');
    
    await new Promise((resolve, reject) => {
      exec('npm install', { cwd: path.join(__dirname, 'frontend') }, (error) => {
        stopLoading();
        if (error) {
          console.error(`${colors.red}Failed to install frontend dependencies${colors.reset}`);
          reject(error);
        } else {
          console.log(`${colors.green}✓ Frontend dependencies installed${colors.reset}`);
          resolve();
        }
      });
    });
  }
  
  console.log();
}

// Wait for server to be ready
function waitForServer(url, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      const http = require('http');
      
      http.get(url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          resolve();
        } else if (attempts < maxAttempts) {
          setTimeout(check, 1000);
        } else {
          reject(new Error(`Server at ${url} failed to start`));
        }
      }).on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(check, 1000);
        } else {
          reject(new Error(`Server at ${url} failed to start`));
        }
      });
    };
    
    check();
  });
}

// Open browser
function openBrowser(url) {
  const platform = process.platform;
  let command;
  
  switch (platform) {
    case 'darwin':
      command = `open ${url}`;
      break;
    case 'win32':
      command = `start ${url}`;
      break;
    default:
      command = `xdg-open ${url}`;
  }
  
  exec(command, (error) => {
    if (error) {
      console.log(`${colors.yellow}Could not open browser automatically.${colors.reset}`);
      console.log(`${colors.yellow}Please open ${url} manually.${colors.reset}`);
    }
  });
}

// Start backend server
function startBackend() {
  return new Promise((resolve, reject) => {
    console.log(`${colors.blue}🚀 Starting backend server...${colors.reset}`);
    
    backendProcess = spawn('python', ['main.py'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Uvicorn running')) {
        console.log(`${colors.green}✓ Backend server started${colors.reset}`);
        resolve();
      }
      // Show backend logs in dim color
      process.stdout.write(`${colors.dim}[Backend] ${output}${colors.reset}`);
    });
    
    backendProcess.stderr.on('data', (data) => {
      process.stderr.write(`${colors.red}[Backend Error] ${data}${colors.reset}`);
    });
    
    backendProcess.on('error', (error) => {
      reject(new Error(`Failed to start backend: ${error.message}`));
    });
    
    // Also wait for HTTP endpoint
    waitForServer(BACKEND_URL)
      .then(resolve)
      .catch(reject);
  });
}

// Start frontend server
function startFrontend() {
  return new Promise((resolve, reject) => {
    console.log(`${colors.blue}🚀 Starting frontend server...${colors.reset}`);
    
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    
    frontendProcess = spawn(npmCommand, ['run', 'dev', '--', '--host'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    });
    
    let resolved = false;
    
    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') && !resolved) {
        console.log(`${colors.green}✓ Frontend server started${colors.reset}`);
        resolved = true;
        setTimeout(resolve, 1000); // Give it a moment to fully initialize
      }
      // Show frontend logs in dim color
      process.stdout.write(`${colors.dim}[Frontend] ${output}${colors.reset}`);
    });
    
    frontendProcess.stderr.on('data', (data) => {
      // Vite often outputs to stderr, so don't treat all as errors
      const output = data.toString();
      if (output.includes('error') || output.includes('Error')) {
        process.stderr.write(`${colors.red}[Frontend Error] ${output}${colors.reset}`);
      } else {
        process.stdout.write(`${colors.dim}[Frontend] ${output}${colors.reset}`);
      }
    });
    
    frontendProcess.on('error', (error) => {
      reject(new Error(`Failed to start frontend: ${error.message}`));
    });
  });
}

// Cleanup function
function cleanup() {
  console.log(`\n${colors.yellow}🛑 Shutting down Lemur...${colors.reset}`);
  
  if (backendProcess) {
    backendProcess.kill();
    console.log(`${colors.dim}Stopped backend server${colors.reset}`);
  }
  
  if (frontendProcess) {
    frontendProcess.kill();
    console.log(`${colors.dim}Stopped frontend server${colors.reset}`);
  }
  
  console.log(`${colors.green}✓ Lemur stopped successfully${colors.reset}`);
  process.exit(0);
}

// Main function
async function main() {
  try {
    // Check prerequisites
    await checkPrerequisites();
    
    // Check environment
    checkEnvFile();
    
    // Check ports
    console.log(`${colors.blue}🔍 Checking port availability...${colors.reset}`);
    
    const backendAvailable = await isPortAvailable(BACKEND_PORT);
    const frontendAvailable = await isPortAvailable(FRONTEND_PORT);
    
    if (!backendAvailable) {
      console.error(`${colors.red}✗ Port ${BACKEND_PORT} is already in use!${colors.reset}`);
      console.error(`${colors.yellow}Please stop the process using port ${BACKEND_PORT} and try again.${colors.reset}`);
      process.exit(1);
    }
    
    if (!frontendAvailable) {
      console.error(`${colors.red}✗ Port ${FRONTEND_PORT} is already in use!${colors.reset}`);
      console.error(`${colors.yellow}Please stop the process using port ${FRONTEND_PORT} and try again.${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`${colors.green}✓ Ports ${BACKEND_PORT} and ${FRONTEND_PORT} are available${colors.reset}\n`);
    
    // Install dependencies if needed
    await installDependencies();
    
    // Set up cleanup handlers
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
    
    // Start servers
    await startBackend();
    await startFrontend();
    
    // Open browser
    console.log(`\n${colors.cyan}🌐 Opening browser...${colors.reset}`);
    openBrowser(FRONTEND_URL);
    
    // Show success message
    console.log(`\n${colors.green}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.green}${colors.bright}✨ Lemur is running successfully!${colors.reset}`);
    console.log(`${colors.green}${'='.repeat(50)}${colors.reset}\n`);
    
    console.log(`${colors.cyan}📍 Frontend:${colors.reset} ${colors.bright}${FRONTEND_URL}${colors.reset}`);
    console.log(`${colors.cyan}📍 Backend API:${colors.reset} ${colors.bright}${BACKEND_URL}${colors.reset}`);
    console.log(`${colors.cyan}📍 API Documentation:${colors.reset} ${colors.bright}${BACKEND_URL}/docs${colors.reset}\n`);
    
    console.log(`${colors.yellow}💡 Press Ctrl+C to stop all servers${colors.reset}\n`);
    
    // Keep the process running
    process.stdin.resume();
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Error: ${error.message}${colors.reset}`);
    cleanup();
  }
}

// Run the application
main();