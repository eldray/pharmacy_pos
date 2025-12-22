const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;

function getResourcePath(...paths) {
  if (app.isPackaged) {
    const pathStr = paths.join('/');
    if (pathStr.startsWith('backend')) {
      return path.join(process.resourcesPath, 'app.asar.unpacked', ...paths);
    } else {
      return path.join(process.resourcesPath, 'app', ...paths);
    }
  }
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
        const message = data.toString().trim();
        console.log(`[Backend]: ${message}`);
        // Check if server started successfully
        if (message.includes('Server running') || message.includes('Listening')) {
          console.log('Backend server started successfully!');
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const error = data.toString().trim();
        console.error(`[Backend Error]: ${error}`);
        
        // Show error dialog
        if (mainWindow && error.includes('Error') || error.includes('failed')) {
          mainWindow.webContents.send('backend-error', error);
        }
      });

      serverProcess.on('error', (error) => {
        console.error('Failed to start backend process:', error);
        showErrorDialog('Backend Error', `Failed to start server: ${error.message}`);
      });

      serverProcess.on('exit', (code, signal) => {
        console.log(`Backend process exited with code ${code} and signal ${signal}`);
        if (code !== 0 && mainWindow) {
          showErrorDialog('Backend Crashed', `Server exited with code ${code}`);
        }
      });

      // Test backend after 3 seconds
      setTimeout(() => {
        testBackendConnection();
      }, 3000);

    } else {
      console.error('Backend server.js not found!');
      showErrorDialog('File Missing', 'Backend server.js file not found!');
    }
  } catch (error) {
    console.error('Failed to start backend:', error);
    showErrorDialog('Startup Error', `Failed to start backend: ${error.message}`);
  }
}

function testBackendConnection() {
  const http = require('http');
  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/',
    method: 'GET',
    timeout: 3000
  }, (res) => {
    console.log(`Backend test response: ${res.statusCode}`);
    if (res.statusCode === 200 || res.statusCode === 404) {
      console.log('Backend is responding!');
    }
  });

  req.on('error', (err) => {
    console.error('Backend connection test failed:', err.message);
  });

  req.end();
}

function showErrorDialog(title, message) {
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: title,
      message: message,
      buttons: ['OK']
    });
  } else {
    console.error(`${title}: ${message}`);
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
      webSecurity: true,
      devTools: true  // Always enable DevTools
    },
    icon: getResourcePath('frontend', 'public', 'icon.ico'),
    show: false
  });

  // ALWAYS OPEN DEVTOOLS - Remove the if condition
  mainWindow.webContents.openDevTools();

  console.log('=== DEBUG INFO ===');
  console.log('App path:', app.getAppPath());
  console.log('Resources path:', process.resourcesPath);
  console.log('Current directory:', __dirname);
  console.log('Is packaged:', app.isPackaged);

  // Load URL or file - SIMPLE VERSION
  if (app.isPackaged) {
    console.log('Looking for index.html...');
    
    // Try the most likely path first
    const indexPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend', 'dist', 'index.html');
    console.log('Trying path:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));
    
    if (fs.existsSync(indexPath)) {
      console.log('Loading index.html from:', indexPath);
      mainWindow.loadFile(indexPath)
        .then(() => {
          console.log('✓ Successfully loaded index.html');
          mainWindow.show();
        })
        .catch(err => {
          console.error('Failed to load index.html:', err);
          // Fallback to error page
          loadErrorPage();
        });
    } else {
      console.error('index.html not found at:', indexPath);
      
      // Debug: List files in resources directory
      console.log('\n=== Listing files in resources directory ===');
      try {
        if (fs.existsSync(process.resourcesPath)) {
          const files = fs.readdirSync(process.resourcesPath);
          console.log('Files in resources:', files);
          
          // Check app.asar.unpacked directory
          const unpackedDir = path.join(process.resourcesPath, 'app.asar.unpacked');
          if (fs.existsSync(unpackedDir)) {
            console.log('\nFiles in app.asar.unpacked:');
            const unpackedFiles = fs.readdirSync(unpackedDir);
            console.log(unpackedFiles);
          }
        }
      } catch (err) {
        console.error('Error listing files:', err);
      }
      
      loadErrorPage();
    }
  } else {
    // Development mode
    console.log('Development mode: Loading from http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.show();
  }
  function loadErrorPage(errorMessage = 'Unknown error') {
    const errorHTML = `
      <html>
        <head>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              background: #f5f5f5;
            }
            .container { 
              background: white; 
              padding: 30px; 
              border-radius: 10px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #d32f2f; }
            .error { 
              background: #ffebee; 
              color: #c62828; 
              padding: 15px; 
              border-radius: 5px; 
              margin: 15px 0;
            }
            pre { 
              background: #f8f8f8; 
              padding: 15px; 
              border-radius: 5px; 
              overflow: auto;
            }
            button { 
              padding: 10px 20px; 
              background: #1976d2; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer;
              margin-top: 20px;
            }
            button:hover { background: #1565c0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ Application Error</h1>
            <div class="error">
              <strong>Error:</strong> ${errorMessage}
            </div>
            <h3>Debug Information:</h3>
            <pre>App Path: ${app.getAppPath()}
Resources Path: ${process.resourcesPath}
Current Directory: ${__dirname}
Is Packaged: ${app.isPackaged}
Platform: ${process.platform}</pre>
            <button onclick="location.reload()">Retry Loading</button>
            <p style="margin-top: 20px; color: #666;">
              Check the DevTools Console (F12) for more details.
            </p>
          </div>
        </body>
      </html>
    `;
    
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
    mainWindow.show();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Helper function to list files
function listAllFiles(dir, indent = '') {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          console.log(indent + '📁 ' + file + '/');
          listAllFiles(fullPath, indent + '  ');
        } else {
          console.log(indent + '📄 ' + file);
        }
      } catch (e) {
        console.log(indent + '❌ ' + file + ' (error reading)');
      }
    });
  } catch (e) {
    console.error('Error reading directory:', dir, e);
  }
}

app.whenReady().then(() => {
  console.log('=== Pharmacy POS Starting ===');
  console.log('App path:', app.getAppPath());
  console.log('Resources path:', process.resourcesPath);
  console.log('Is packaged:', app.isPackaged);
  console.log('Platform:', process.platform);
  console.log('Node version:', process.version);

  // Start backend in production


    // Load URL or file - FIXED VERSION
  if (app.isPackaged) {
    console.log('=== DEBUG: Looking for index.html ===');
    console.log('Resources path:', process.resourcesPath);
    
    // List ALL files in resources directory first
    console.log('\n=== ALL FILES IN RESOURCES FOLDER ===');
    try {
      const resourcesFiles = fs.readdirSync(process.resourcesPath);
      console.log('Top level:', resourcesFiles);
      
      // Check if app.asar.unpacked exists
      const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked');
      if (fs.existsSync(unpackedPath)) {
        console.log('\n=== FILES IN app.asar.unpacked ===');
        const unpackedFiles = fs.readdirSync(unpackedPath);
        console.log(unpackedFiles);
        
        // Check if frontend folder exists in unpacked
        const frontendPath = path.join(unpackedPath, 'frontend');
        if (fs.existsSync(frontendPath)) {
          console.log('\n=== FILES IN frontend folder ===');
          const frontendFiles = fs.readdirSync(frontendPath);
          console.log(frontendFiles);
          
          // Check if dist folder exists
          const distPath = path.join(frontendPath, 'dist');
          if (fs.existsSync(distPath)) {
            console.log('\n=== FILES IN dist folder ===');
            const distFiles = fs.readdirSync(distPath);
            console.log(distFiles);
            
            // Try to load index.html
            const indexPath = path.join(distPath, 'index.html');
            console.log('\n=== TRYING TO LOAD ===');
            console.log('Final path:', indexPath);
            console.log('File exists:', fs.existsSync(indexPath));
            
            if (fs.existsSync(indexPath)) {
              console.log('✓ Loading index.html...');
              mainWindow.loadFile(indexPath)
                .then(() => {
                  console.log('✓ Successfully loaded!');
                  mainWindow.show();
                })
                .catch(err => {
                  console.error('✗ Load failed:', err);
                  loadErrorPage('Load Error: ' + err.message);
                });
            } else {
              loadErrorPage('index.html not found in dist folder');
            }
          } else {
            loadErrorPage('dist folder not found in frontend');
          }
        } else {
          loadErrorPage('frontend folder not found in app.asar.unpacked');
        }
      } else {
        loadErrorPage('app.asar.unpacked folder not found');
      }
    } catch (err) {
      console.error('Error reading directory:', err);
      loadErrorPage('Directory read error: ' + err.message);
    }
  } else {
    console.log('Starting in development mode...');
    createWindow();
  }

});

app.on('window-all-closed', () => {
  if (serverProcess) {
    console.log('Killing backend server process...');
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

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});