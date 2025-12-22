const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;

function getResourcePath(...paths) {
  if (app.isPackaged) {
    // Backend is unpacked from ASAR, so use process.resourcesPath
    // Frontend is inside ASAR, so use app.getAppPath()
    const pathStr = paths.join('/');
    
    if (pathStr.startsWith('backend')) {
      // Backend is unpacked
      return path.join(process.resourcesPath, 'app.asar.unpacked', ...paths);
    } else {
      // Frontend is in ASAR
      return path.join(process.resourcesPath, 'app', ...paths);
    }
  }
  // In development
  return path.join(__dirname, ...paths);
}

function startBackendServer() {
  try {
    const serverPath = getResourcePath('backend', 'server.js');
    const backendDir = path.dirname(serverPath);
    
    console.log('Starting backend server...');
    console.log('Server path:', serverPath);
    console.log('Backend directory:', backendDir);
    
    if (fs.existsSync(serverPath)) {
      serverProcess = spawn('node', [serverPath], {
        cwd: backendDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        env: { 
          ...process.env, 
          NODE_ENV: 'production',
          PORT: '5000'
        }
      });

      serverProcess.stdout.on('data', (data) => {
        console.log(`[Backend]: ${data.toString().trim()}`);
      });

      serverProcess.stderr.on('data', (data) => {
        console.error(`[Backend Error]: ${data.toString().trim()}`);
      });

      serverProcess.on('error', (error) => {
        console.error('Failed to start backend process:', error);
      });

      serverProcess.on('exit', (code, signal) => {
        console.log(`Backend process exited with code ${code} and signal ${signal}`);
      });
    } else {
      console.error('Backend server.js not found at:', serverPath);
      console.log('Contents of resources:', fs.readdirSync(process.resourcesPath));
    }
  } catch (error) {
    console.error('Failed to start backend:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    icon: getResourcePath('frontend', 'public', 'icon.ico'),
    show: false
  });

  console.log('=== Window Creation ===');
  console.log('App path:', app.getAppPath());
  console.log('Is packaged:', app.isPackaged);
  console.log('Resources path:', process.resourcesPath);

  if (app.isPackaged) {
    const indexPath = getResourcePath('frontend', 'dist', 'index.html');
    console.log('Loading index.html from:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));

    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath)
        .then(() => {
          console.log('Successfully loaded index.html');
          mainWindow.show();
        })
        .catch(err => {
          console.error('Failed to load index.html:', err);
          
          // Try alternative path (in case ASAR structure is different)
          const altPath = path.join(app.getAppPath(), 'frontend', 'dist', 'index.html');
          console.log('Trying alternative path:', altPath);
          
          if (fs.existsSync(altPath)) {
            mainWindow.loadFile(altPath).then(() => {
              console.log('Loaded from alternative path');
              mainWindow.show();
            });
          } else {
            mainWindow.loadURL('data:text/html,<h1>Loading Error</h1><p>Check logs</p>');
            mainWindow.show();
            mainWindow.webContents.openDevTools();
          }
        });
    } else {
      console.error('index.html not found at:', indexPath);
      
      // Debug: list available paths
      console.log('App path:', app.getAppPath());
      console.log('Resources path:', process.resourcesPath);
      
      mainWindow.loadURL('data:text/html,<h1>File Not Found</h1><p>index.html missing</p>');
      mainWindow.show();
      mainWindow.webContents.openDevTools();
    }
  } else {
    // Development mode
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
    mainWindow.show();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('=== Pharmacy POS Starting ===');
  console.log('Is packaged:', app.isPackaged);
  console.log('Platform:', process.platform);
  console.log('Node version:', process.version);
  console.log('Electron version:', process.versions.electron);

  // Start backend in production
  if (app.isPackaged) {
    console.log('Starting in production mode...');
    startBackendServer();
    
    // Give backend a moment to start before opening window
    setTimeout(() => {
      createWindow();
    }, 2000);
  } else {
    console.log('Starting in development mode...');
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    console.log('Killing backend server process...');
    serverProcess.kill();
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

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason