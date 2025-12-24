const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let serverProcess = null;

function getResourcePath(...paths) {
  if (app.isPackaged) {
    // In packaged app, backend is in app.asar.unpacked
    if (paths[0] === 'backend') {
      return path.join(process.resourcesPath, 'app.asar.unpacked', ...paths);
    }
    // Frontend is in app.asar
    return path.join(process.resourcesPath, 'app', ...paths);
  }
  return path.join(__dirname, ...paths);
}

function startBackendServer() {
  return new Promise((resolve, reject) => {
    try {
      const backendDir = getResourcePath('backend');
      const serverPath = path.join(backendDir, 'server.js');
      
      console.log('Backend directory:', backendDir);
      console.log('Server path:', serverPath);
      console.log('File exists:', fs.existsSync(serverPath));

      if (!fs.existsSync(serverPath)) {
        console.error('Server.js not found at:', serverPath);
        reject(new Error('server.js not found'));
        return;
      }

      // Start the backend server
      serverProcess = spawn('node', [serverPath], {
        cwd: backendDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: '5000',
          HOST: 'localhost'
        }
      });

      serverProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        console.log(`[Backend]: ${message}`);
        if (message.includes('Server running') || message.includes('Listening')) {
          console.log('✓ Backend server started successfully');
          resolve(true);
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const error = data.toString().trim();
        console.error(`[Backend Error]: ${error}`);
      });

      serverProcess.on('error', (error) => {
        console.error('Failed to start backend:', error);
        reject(error);
      });

      // Test connection after 2 seconds
      setTimeout(() => {
        testBackendConnection()
          .then(() => resolve(true))
          .catch(() => {});
      }, 2000);

    } catch (error) {
      console.error('Error starting backend:', error);
      reject(error);
    }
  });
}

function testBackendConnection() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      console.log(`Backend health check: ${res.statusCode}`);
      if (res.statusCode === 200 || res.statusCode === 404) {
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      devTools: !app.isPackaged // Only enable dev tools in development
    },
    icon: path.join(__dirname, 'icon.ico'),
    show: false
  });

  // Load the frontend
  loadFrontend();

  // Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function loadFrontend() {
  if (app.isPackaged) {
    // Try multiple possible paths for the frontend
    const possiblePaths = [
      path.join(process.resourcesPath, 'frontend', 'dist', 'index.html'),
      path.join(process.resourcesPath, 'app', 'frontend', 'dist', 'index.html'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend', 'dist', 'index.html'),
      path.join(__dirname, 'frontend', 'dist', 'index.html'),
      path.join(__dirname, '..', 'frontend', 'dist', 'index.html')
    ];

    let loaded = false;
    for (const indexPath of possiblePaths) {
      if (fs.existsSync(indexPath)) {
        console.log('Loading frontend from:', indexPath);
        mainWindow.loadFile(indexPath)
          .then(() => {
            console.log('✓ Frontend loaded successfully');
            mainWindow.show();
          })
          .catch(err => {
            console.error('Failed to load frontend:', err);
            showErrorPage(`Load error: ${err.message}`);
          });
        loaded = true;
        break;
      } else {
        console.log('Path not found:', indexPath);
      }
    }

    if (!loaded) {
      showErrorPage('Could not find index.html. Please check build process.');
    }
  } else {
    // Development mode - load from Vite dev server
    console.log('Development mode: Loading from http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.show();
  }
}

function showErrorPage(message) {
  const errorHTML = `
    <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px; 
            background: #f0f0f0;
            text-align: center;
          }
          .container { 
            background: white; 
            padding: 40px; 
            border-radius: 10px; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            max-width: 600px;
            margin: 50px auto;
          }
          h1 { color: #d32f2f; }
          .error { 
            background: #ffebee; 
            color: #c62828; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0;
            text-align: left;
          }
          pre { 
            background: #f8f8f8; 
            padding: 15px; 
            border-radius: 5px; 
            overflow: auto;
            font-size: 12px;
          }
          .button { 
            display: inline-block;
            padding: 12px 24px; 
            background: #1976d2; 
            color: white; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer;
            margin: 10px;
            text-decoration: none;
          }
          .button:hover { background: #1565c0; }
          .info { color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚠️ Application Error</h1>
          <div class="error">
            <strong>Error:</strong> ${message}
          </div>
          <h3>Debug Information:</h3>
          <pre>App Path: ${app.getAppPath()}
Resources Path: ${process.resourcesPath}
Current Directory: ${__dirname}
Is Packaged: ${app.isPackaged}
Platform: ${process.platform}
Electron Version: ${process.versions.electron}</pre>
          <button class="button" onclick="location.reload()">Retry Loading</button>
          <p class="info">Check the console for more details (F12 if DevTools is enabled)</p>
        </div>
      </body>
    </html>
  `;
  
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
  mainWindow.show();
}

// Start the application
app.whenReady().then(async () => {
  console.log('=== Pharmacy POS Starting ===');
  console.log('Version:', app.getVersion());
  console.log('App path:', app.getAppPath());
  console.log('Resources path:', process.resourcesPath);
  console.log('Is packaged:', app.isPackaged);
  console.log('Platform:', process.platform);

  // Create window first
  createWindow();

  // Start backend server
  if (app.isPackaged) {
    try {
      console.log('Starting backend server...');
      await startBackendServer();
      console.log('✓ Backend server is running');
    } catch (error) {
      console.error('Failed to start backend:', error);
      
      // Show error but continue - maybe frontend will show appropriate message
      dialog.showErrorBox(
        'Backend Error',
        `Failed to start backend server: ${error.message}\n\nFrontend will load but API calls may fail.`
      );
    }
  } else {
    console.log('Development mode: Assuming backend is already running');
  }
});

// Cleanup on quit
app.on('window-all-closed', () => {
  if (serverProcess) {
    console.log('Stopping backend server...');
    serverProcess.kill('SIGTERM');
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Uncaught Exception', error.toString());
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});