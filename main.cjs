const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');

let mainWindow = null;
let serverProcess = null;
let dbPath = null;

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Database Folder',
          click: () => {
            if (dbPath) {
              shell.showItemInFolder(dbPath);
            } else {
              dialog.showMessageBox({
                type: 'info',
                message: 'Database path not available',
                detail: 'The database path will be available after the backend starts.'
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Restart Backend',
          click: () => {
            restartBackend();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About PharmacyPOS',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About PharmacyPOS',
              message: 'Pharmacy Point of Sale System',
              detail: `Version ${app.getVersion()}\n\nDeveloped by Emmanuel Appiah\n\nA complete pharmacy management solution with inventory, sales, and reporting.`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'View Logs',
          click: () => {
            const logPath = path.join(app.getPath('logs'), 'pharmacy-pos.log');
            if (fs.existsSync(logPath)) {
              shell.openPath(logPath);
            } else {
              shell.openPath(app.getPath('logs'));
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('mailto:emk.appiah@gmail.com?subject=PharmacyPOS%20Issue%20Report');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Get platform-specific icon
function getIconPath() {
  const iconBase = 'build/icon';
  if (process.platform === 'win32') return path.join(__dirname, `${iconBase}.ico`);
  if (process.platform === 'darwin') return path.join(__dirname, `${iconBase}.icns`);
  return path.join(__dirname, `${iconBase}.png`);
}

// Get database path for current platform
function getDatabasePath() {
  if (app.isPackaged) {
    // In production, store in user's app data directory
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'database');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    return path.join(dbDir, 'pharmacy-pos.db');
  }
  
  // In development, use backend directory
  return path.join(__dirname, 'backend', 'pharmacy-pos.db');
}

function startBackendServer() {
  return new Promise((resolve, reject) => {
    try {
      console.log('=== Starting Backend Server ===');
      
      // Determine backend path
      let backendPath;
      if (app.isPackaged) {
        backendPath = path.join(process.resourcesPath, 'backend');
      } else {
        backendPath = path.join(__dirname, 'backend');
      }
      
      console.log('Backend path:', backendPath);
      
      // Check if backend exists
      if (!fs.existsSync(backendPath)) {
        console.error('Backend directory not found:', backendPath);
        reject(new Error('Backend directory not found'));
        return;
      }
      
      const serverJsPath = path.join(backendPath, 'server.js');
      console.log('Server.js path:', serverJsPath);
      
      if (!fs.existsSync(serverJsPath)) {
        console.error('server.js not found:', serverJsPath);
        reject(new Error('server.js not found'));
        return;
      }
      
      // Set database path for backend
      dbPath = getDatabasePath();
      console.log('Database path:', dbPath);
      
      // Copy seed data if needed
      copySeedDataIfNeeded(backendPath);
      
      // Start backend process
      const env = {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '5000',
        HOST: '127.0.0.1',
        ELECTRON: 'true',
        DB_PATH: dbPath,
        JWT_SECRET: 'pharmacy-pos-electron-secret-key-' + Date.now()
      };
      
      console.log('Starting backend with env:', { 
        PORT: env.PORT, 
        NODE_ENV: env.NODE_ENV,
        DB_PATH: env.DB_PATH 
      });
      
      serverProcess = spawn('node', [serverJsPath], {
        cwd: backendPath,
        env: env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Handle process output
      serverProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        console.log(`[Backend]: ${message}`);
        
        // Check for successful start
        if (message.includes('Server running') || 
            message.includes('Listening') || 
            message.includes('port 5000')) {
          console.log('✅ Backend server started successfully');
          setTimeout(() => resolve(true), 1000);
        }
      });
      
      serverProcess.stderr.on('data', (data) => {
        const error = data.toString().trim();
        console.error(`[Backend Error]: ${error}`);
      });
      
      serverProcess.on('error', (error) => {
        console.error('Failed to spawn backend process:', error);
        reject(error);
      });
      
      serverProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
        if (code !== 0 && code !== null) {
          console.error('Backend server crashed or failed to start');
        }
        serverProcess = null;
      });
      
      // Test connection after 5 seconds
      setTimeout(() => {
        testBackendConnection().then(resolve).catch(reject);
      }, 5000);
      
    } catch (error) {
      console.error('Error starting backend:', error);
      reject(error);
    }
  });
}

function copySeedDataIfNeeded(backendPath) {
  try {
    const dbPath = getDatabasePath();
    const seedFlagPath = path.join(path.dirname(dbPath), '.seeded');
    
    // Check if database already exists
    if (!fs.existsSync(dbPath) || !fs.existsSync(seedFlagPath)) {
      console.log('Database not found or needs seeding...');
      
      // Copy default database from backend folder
      const defaultDbPath = path.join(backendPath, 'pharmacy-pos.db');
      if (fs.existsSync(defaultDbPath)) {
        fs.copyFileSync(defaultDbPath, dbPath);
        console.log('Copied default database');
      }
      
      // Create seed flag
      fs.writeFileSync(seedFlagPath, Date.now().toString());
    }
  } catch (error) {
    console.error('Error copying seed data:', error);
  }
}

function testBackendConnection() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/health',
      method: 'GET',
      timeout: 10000
    }, (res) => {
      console.log(`Backend health check: ${res.statusCode}`);
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve(true);
      } else {
        reject(new Error(`Status: ${res.statusCode}`));
      }
    });
    
    req.on('error', (err) => {
      console.error('Backend connection failed:', err.message);
      reject(err);
    });
    
    req.on('timeout', () => {
      console.error('Backend connection timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

function restartBackend() {
  if (serverProcess) {
    console.log('Stopping backend server...');
    serverProcess.kill('SIGTERM');
    
    setTimeout(() => {
      console.log('Restarting backend server...');
      startBackendServer().then(() => {
        if (mainWindow) {
          mainWindow.webContents.send('backend-restarted');
        }
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          message: 'Backend Restarted',
          detail: 'The backend server has been restarted successfully.'
        });
      }).catch(error => {
        dialog.showErrorBox('Backend Restart Failed', error.message);
      });
    }, 1000);
  }
}

function createWindow() {
  const icon = getIconPath();
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      devTools: !app.isPackaged,
      allowRunningInsecureContent: false
    },
    icon: icon,
    show: false,
    backgroundColor: '#f5f5f5',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: true,
    autoHideMenuBar: false
  });
  
  // Create application menu
  createMenu();
  
  // Load the frontend
  loadFrontend();
  
  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links in default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  
  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
  
  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function loadFrontend() {
  if (app.isPackaged) {
    // Production: Load from bundled frontend
    const indexPath = path.join(process.resourcesPath, 'frontend', 'dist', 'index.html');
    
    if (fs.existsSync(indexPath)) {
      console.log(`✅ Loading frontend from: ${indexPath}`);
      mainWindow.loadFile(indexPath)
        .then(() => {
          console.log('✅ Frontend loaded successfully');
        })
        .catch(err => {
          console.error('Failed to load frontend:', err);
          showErrorPage(`Load error: ${err.message}`);
        });
    } else {
      console.error('❌ Frontend index.html not found at:', indexPath);
      showErrorPage('Frontend build not found. Please rebuild the application.');
    }
  } else {
    // Development: Load from Vite dev server
    console.log('Development mode: Loading from http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
  }
}

function showErrorPage(message) {
  const errorHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>PharmacyPOS - Error</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container { 
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 40px; 
            border-radius: 15px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            max-width: 600px;
            width: 90%;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          h1 { 
            color: white; 
            margin-top: 0;
            font-size: 24px;
          }
          .error { 
            background: rgba(255, 255, 255, 0.2); 
            color: white; 
            padding: 20px; 
            border-radius: 10px; 
            margin: 20px 0;
            text-align: left;
            border-left: 4px solid #ff6b6b;
            word-break: break-word;
          }
          .button { 
            display: inline-block;
            padding: 12px 24px; 
            background: rgba(255, 255, 255, 0.3); 
            color: white; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer;
            margin: 10px;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          .button:hover { 
            background: rgba(255, 255, 255, 0.4);
            transform: translateY(-2px);
          }
          .button-primary {
            background: #4CAF50;
            border-color: #4CAF50;
          }
          .button-primary:hover {
            background: #45a049;
          }
          .info { 
            color: rgba(255, 255, 255, 0.8); 
            margin-top: 30px;
            font-size: 14px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 20px;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">💊 PharmacyPOS</div>
          <h1>⚠️ Application Error</h1>
          <div class="error">
            <strong>Error:</strong> ${message}
          </div>
          <div>
            <button class="button button-primary" onclick="location.reload()">🔄 Retry Loading</button>
            <button class="button" onclick="window.location.href='http://localhost:5000'">🌐 Open Backend Directly</button>
          </div>
          <div class="info">
            <strong>Debug Information:</strong><br>
            Version: ${app.getVersion()}<br>
            Platform: ${process.platform} ${os.release()}<br>
            Electron: ${process.versions.electron}<br>
            ${app.isPackaged ? 'Production Mode' : 'Development Mode'}
          </div>
        </div>
      </body>
    </html>
  `;
  
  if (mainWindow) {
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
  }
}

// Handle single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus on existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Start the application
app.whenReady().then(async () => {
  console.log('=== PharmacyPOS Starting ===');
  console.log('Version:', app.getVersion());
  console.log('App path:', app.getAppPath());
  console.log('Resources path:', process.resourcesPath);
  console.log('Is packaged:', app.isPackaged);
  console.log('Platform:', process.platform, os.release());
  console.log('User data path:', app.getPath('userData'));
  
  // Create window first
  createWindow();
  
  // Start backend server in packaged mode
  if (app.isPackaged) {
    try {
      console.log('Starting backend server...');
      await startBackendServer();
      console.log('✅ Backend initialization complete');
      
      // Notify frontend that backend is ready
      if (mainWindow) {
        mainWindow.webContents.send('backend-ready');
      }
    } catch (error) {
      console.error('❌ Failed to start backend:', error.message);
      
      // Show user-friendly error but continue
      setTimeout(() => {
        dialog.showMessageBox(mainWindow, {
          type: 'warning',
          title: 'Backend Warning',
          message: 'Backend Server Issue',
          detail: `The backend server encountered an issue: ${error.message}\n\nThe application will continue but some features may be limited. You can try restarting from the File menu.`,
          buttons: ['OK']
        });
      }, 1000);
    }
  } else {
    console.log('Development mode: Assuming backend is already running on localhost:5000');
  }
});

// Cleanup on quit
app.on('window-all-closed', () => {
  if (serverProcess) {
    console.log('Stopping backend server...');
    serverProcess.kill('SIGTERM');
  }
  
  // Don't quit on macOS - apps usually stay open
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('get-backend-status', () => {
  return serverProcess ? 'running' : 'stopped';
});

ipcMain.handle('restart-backend', async () => {
  try {
    await restartBackend();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-db-path', () => {
  return dbPath;
});

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  const logPath = path.join(app.getPath('logs'), 'pharmacy-pos.log');
  const logDir = path.dirname(logPath);
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.appendFileSync(logPath, `${new Date().toISOString()} - Uncaught Exception: ${error.stack}\n`);
  
  // Show error dialog (only in production to avoid interrupting dev)
  if (app.isPackaged && mainWindow) {
    dialog.showErrorBox('Application Error', error.toString());
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});