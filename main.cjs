const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;

function startBackendServer() {
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    console.log('Development mode: Backend server should be started manually');
    return;
  }
  
  const serverPath = path.join(process.resourcesPath, 'backend', 'server.js');
  const serverDir = path.join(process.resourcesPath, 'backend');
  
  console.log('Starting backend server from:', serverPath);
  
  if (fs.existsSync(serverPath)) {
    serverProcess = spawn('node', [serverPath], {
      cwd: serverDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' },
      shell: process.platform === 'win32'
    });
    
    serverProcess.stdout.on('data', (data) => {
      console.log(`[Backend]: ${data.toString().trim()}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error]: ${data.toString().trim()}`);
    });
    
    serverProcess.on('error', (err) => {
      console.error('Failed to start backend server:', err);
    });
    
    serverProcess.on('close', (code) => {
      console.log(`Backend server exited with code ${code}`);
    });
  } else {
    console.error('Backend server not found at:', serverPath);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'frontend', 'public', 'icon.ico')
  });
  
  // Load the frontend
  if (app.isPackaged) {
    // In production: load from built files
    const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
    console.log('Loading from:', indexPath);
    mainWindow.loadFile(indexPath);
  } else {
    // In development: load from dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  console.log('Pharmacy POS starting...');
  
  // Start backend server (in production mode only)
  if (app.isPackaged) {
    console.log('Production mode: Starting backend server...');
    startBackendServer();
    // Give server time to start
    setTimeout(createWindow, 2000);
  } else {
    console.log('Development mode: Skipping backend startup');
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});