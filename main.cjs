const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;

// Function to start the backend server
function startBackendServer() {
  const serverPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'backend', 'server.js')
    : path.join(__dirname, 'backend', 'server.js');
  
  const serverDir = app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, 'backend');
  
  console.log('Starting server from:', serverDir);
  
  if (fs.existsSync(serverPath)) {
    serverProcess = spawn('node', [serverPath], {
      cwd: serverDir,
      stdio: 'pipe',
      shell: true
    });
    
    serverProcess.stdout.on('data', (data) => {
      console.log(`[Backend Server]: ${data}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(`[Backend Server Error]: ${data}`);
    });
    
    serverProcess.on('close', (code) => {
      console.log(`Backend server process exited with code ${code}`);
    });
  } else {
    console.log('Backend server not found at:', serverPath);
  }
}

// Function to create the Electron window
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
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  } else {
    // In development: load from dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  }
}

// When Electron is ready
app.whenReady().then(() => {
  console.log('Electron app starting...');
  
  // Start backend server (in production mode only)
  if (app.isPackaged || process.env.NODE_ENV === 'production') {
    console.log('Starting backend server...');
    startBackendServer();
    // Wait for server to start
    setTimeout(createWindow, 3000);
  } else {
    // In development, server is started by npm run dev:backend
    console.log('Development mode: Backend should already be running');
    createWindow();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Kill backend server when app closes
  if (serverProcess) {
    serverProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS specific: re-create window on activate
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});