// main.cjs - PharmacyPOS Electron main process
//
// Packaged layout (Windows):
//   <install dir>\PharmacyPOS.exe
//   <install dir>\resources\app.asar            <- this file, preload.js
//   <install dir>\resources\backend\            <- Express API + node_modules
//   <install dir>\resources\frontend\dist\      <- built React app (served by the backend)
//
// The backend is started with Electron's own runtime (ELECTRON_RUN_AS_NODE), so the
// target PC does NOT need Node.js installed. It does need PostgreSQL.
// Database settings live in %APPDATA%\<app>\.env so they survive reinstalls/upgrades.

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const crypto = require('crypto');

const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 5000;
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
// First launch runs every migration + seed, so allow plenty of time.
const BACKEND_START_TIMEOUT_MS = 90 * 1000;
const MAX_LOG_BYTES = 5 * 1024 * 1024;

const DEFAULT_ENV = `# PharmacyPOS settings
# Edit this file, save it, then use File > Restart Backend (or restart the app).

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=pharmacy_pos
DB_USER=postgres
DB_PASSWORD=postgres

# Alternatively, use a single connection string (overrides the DB_* values above):
# DATABASE_URL=postgres://user:password@host:5432/pharmacy_pos
# DB_SSL=true
`;

let mainWindow = null;
let serverProcess = null;
let backendOutput = [];
let launching = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==================== LOGGING ====================
function getLogFilePath() {
  return path.join(app.getPath('logs'), 'pharmacy-pos.log');
}

function log(...args) {
  const line = args
    .map((a) => (typeof a === 'string' ? a : (a && a.stack) || JSON.stringify(a)))
    .join(' ');
  console.log(line);
  try {
    fs.mkdirSync(app.getPath('logs'), { recursive: true });
    fs.appendFileSync(getLogFilePath(), `${new Date().toISOString()} ${line}\n`);
  } catch (e) {
    // Logging must never crash the app.
  }
}

function rotateLogIfLarge() {
  try {
    const file = getLogFilePath();
    if (fs.existsSync(file) && fs.statSync(file).size > MAX_LOG_BYTES) {
      fs.renameSync(file, file.replace(/\.log$/, '.old.log'));
    }
  } catch (e) {
    // ignore
  }
}

// ==================== JWT SECRET (Persistent) ====================
function getOrCreateJwtSecret() {
  const secretPath = path.join(app.getPath('userData'), '.jwt-secret');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
  } catch (e) {
    // File read failed, generate new one
  }
  const secret = crypto.randomBytes(64).toString('hex');
  try {
    const dir = path.dirname(secretPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  } catch (e) {
    log('Could not persist JWT secret:', e.message);
  }
  return secret;
}

// ==================== PATHS ====================
function getIconPath() {
  // Only Windows uses an .ico for the window icon; other platforms use the default.
  if (process.platform === 'win32') return path.join(__dirname, 'build-resources', 'icon.ico');
  return undefined;
}

function getBackendPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }
  return path.join(__dirname, 'backend');
}

// Packaged: settings in the user's app-data folder (survives upgrades).
// Development: the backend's own .env, which is what `npm run dev:backend` reads.
function getEnvPath() {
  if (app.isPackaged) return path.join(app.getPath('userData'), '.env');
  return path.join(getBackendPath(), '.env');
}

// ==================== ENV FILE ====================
function parseEnv(text) {
  const out = {};
  // Windows Notepad may save a UTF-8 BOM and CRLF line endings.
  for (const rawLine of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function readEnv() {
  try {
    return parseEnv(fs.readFileSync(getEnvPath(), 'utf8'));
  } catch (e) {
    return {};
  }
}

function ensureUserEnv() {
  const envPath = getEnvPath();
  if (fs.existsSync(envPath)) return;
  try {
    fs.mkdirSync(path.dirname(envPath), { recursive: true });
    fs.writeFileSync(envPath, DEFAULT_ENV, 'utf8');
    log('Created default settings file at', envPath);
  } catch (e) {
    log('Could not create settings file:', e.message);
  }
}

function openInEditor(filePath) {
  if (process.platform === 'win32') {
    // ".env" has no file association on Windows, so open it in Notepad explicitly.
    try {
      spawn('notepad.exe', [filePath], { detached: true, stdio: 'ignore' }).unref();
      return;
    } catch (e) {
      // fall through to shell.openPath
    }
  }
  shell.openPath(filePath);
}

function openSettingsFile() {
  ensureUserEnv();
  if (!fs.existsSync(getEnvPath())) {
    dialog.showErrorBox('Settings file not found', `No settings file at:\n${getEnvPath()}`);
    return;
  }
  openInEditor(getEnvPath());
}

function getDatabaseInfo() {
  const defaults = {
    host: '127.0.0.1',
    port: '5432',
    database: 'pharmacy_pos',
    user: 'postgres',
    status: 'Not configured'
  };

  const envPath = getEnvPath();
  if (!fs.existsSync(envPath)) return { ...defaults, status: `Settings file not found (${envPath})` };

  const env = readEnv();

  if (env.DATABASE_URL) {
    try {
      const u = new URL(env.DATABASE_URL);
      return {
        host: u.hostname,
        port: u.port || '5432',
        database: u.pathname.replace(/^\//, ''),
        user: decodeURIComponent(u.username),
        status: `Using DATABASE_URL (${envPath})`
      };
    } catch (e) {
      return { ...defaults, status: `DATABASE_URL is not a valid URL (${envPath})` };
    }
  }

  return {
    host: env.DB_HOST || defaults.host,
    port: env.DB_PORT || defaults.port,
    database: env.DB_NAME || defaults.database,
    user: env.DB_USER || defaults.user,
    status: `Settings file: ${envPath}`
  };
}

// ==================== APPLICATION MENU ====================
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Database Connection Info',
          click: () => {
            const dbInfo = getDatabaseInfo();
            dialog.showMessageBox({
              type: 'info',
              title: 'Database Connection',
              message: 'PostgreSQL Connection',
              detail: `Host: ${dbInfo.host}\nPort: ${dbInfo.port}\nDatabase: ${dbInfo.database}\nUser: ${dbInfo.user}\n\n${dbInfo.status}`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Edit Database Settings...',
          click: () => openSettingsFile()
        },
        { type: 'separator' },
        {
          label: 'Restart Backend',
          click: () => restartBackend()
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
              detail: `Version ${app.getVersion()}\n\nDeveloped by Emmanuel Appiah\n\nA complete pharmacy management solution with inventory, sales, and reporting.\n\nDatabase: PostgreSQL`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'View Logs',
          click: () => {
            const logPath = getLogFilePath();
            if (fs.existsSync(logPath)) {
              openInEditor(logPath);
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

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ==================== BACKEND SERVER ====================
// Turn the backend's raw output into something a pharmacy admin can act on:
// a plain-language hint for the common failures, then the key technical lines.
function backendFailureSummary() {
  const text = backendOutput.join('\n');
  const rules = [
    [/password authentication failed/i,
      'PostgreSQL rejected the user name or password. Correct DB_USER / DB_PASSWORD in the settings file.'],
    [/ECONNREFUSED/i,
      'Could not connect to PostgreSQL. Make sure the PostgreSQL service is running and that DB_HOST / DB_PORT are correct.'],
    [/ENOTFOUND|getaddrinfo/i,
      'The database host name could not be found. Check DB_HOST in the settings file.'],
    [/EADDRINUSE/i,
      `Port ${BACKEND_PORT} is already in use by another program. Close it and try again.`],
    [/permission denied to create database/i,
      'The database user is not allowed to create the database. Create "pharmacy_pos" manually, or use a user with CREATEDB rights.']
  ];
  const hint = (rules.find(([re]) => re.test(text)) || [])[1];

  const keyLines = [...new Set(
    backendOutput
      .filter((l) => /\berror:/i.test(l))
      .map((l) => l.replace(/^\s*(parent|original):\s*/i, '').trim())
  )].slice(-3);
  const details = (keyLines.length ? keyLines : backendOutput.slice(-8)).join('\n') || 'No output captured';

  return `${hint ? `${hint}\n\n` : ''}Technical details:\n${details}`;
}

// Resolves true only if our PharmacyPOS backend answers /api/health.
function isBackendHealthy() {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: BACKEND_HOST, port: BACKEND_PORT, path: '/api/health', method: 'GET', timeout: 2000 },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) return resolve(false);
          try {
            resolve(JSON.parse(body).service === 'pharmacy-pos-backend');
          } catch (e) {
            resolve(false);
          }
        });
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function startBackendServer() {
  if (serverProcess) return;

  // A previous session may have been force-killed (Task Manager, crash) and left its
  // backend running. Reuse it rather than failing with "address already in use".
  if (await isBackendHealthy()) {
    log(`A PharmacyPOS backend is already running on port ${BACKEND_PORT} - reusing it`);
    return;
  }

  const backendPath = getBackendPath();
  log('Starting backend. Path:', backendPath);

  const serverJsPath = path.join(backendPath, 'server.js');
  if (!fs.existsSync(serverJsPath)) {
    throw new Error(`Backend not found at: ${serverJsPath}`);
  }

  ensureUserEnv();

  const env = {
    ...process.env,
    ...readEnv(),
    NODE_ENV: 'production',
    PORT: String(BACKEND_PORT),
    HOST: BACKEND_HOST,
    ELECTRON: 'true',
    // Run the backend on Electron's bundled Node runtime. A bare `node` command
    // would fail on any PC that doesn't have Node.js installed.
    ELECTRON_RUN_AS_NODE: '1',
    JWT_SECRET: getOrCreateJwtSecret()
  };

  backendOutput = [];
  let spawnError = null;
  let exited = null;

  const child = spawn(process.execPath, [serverJsPath], {
    cwd: backendPath,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  serverProcess = child;

  const onData = (data) => {
    for (const line of data.toString().split(/\r?\n/)) {
      if (!line.trim()) continue;
      backendOutput.push(line);
      if (backendOutput.length > 80) backendOutput.shift();
      log('[backend]', line);
    }
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('error', (err) => {
    spawnError = err;
    log('Failed to spawn backend:', err);
  });
  child.on('close', (code, signal) => {
    exited = { code, signal };
    log(`Backend process exited (code ${code}, signal ${signal})`);
    if (serverProcess === child) serverProcess = null;
  });

  const deadline = Date.now() + BACKEND_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (exited) {
      throw new Error(`The backend stopped during startup (exit code ${exited.code}).\n\n${backendFailureSummary()}`);
    }
    if (await isBackendHealthy()) {
      if (exited) {
        throw new Error(`The backend stopped during startup (exit code ${exited.code}).\n\n${backendFailureSummary()}`);
      }
      log('Backend is up');
      return;
    }
    await sleep(500);
  }

  await stopBackend();
  throw new Error(
    `The backend did not start within ${BACKEND_START_TIMEOUT_MS / 1000} seconds.\n\n${backendFailureSummary()}`
  );
}

function stopBackend() {
  return new Promise((resolve) => {
    const child = serverProcess;
    if (!child) return resolve();
    log('Stopping backend...');
    const force = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (e) { /* already gone */ }
    }, 3000);
    child.once('close', () => {
      clearTimeout(force);
      resolve();
    });
    try {
      child.kill();
    } catch (e) {
      clearTimeout(force);
      resolve();
    }
  });
}

// Packaged mode: show a loading page, start the backend, then load the UI from it.
async function launchApp() {
  if (launching) return false;
  launching = true;
  try {
    showLoadingPage();
    await startBackendServer();
    if (!mainWindow) return false;
    await mainWindow.loadURL(BACKEND_URL);
    log('UI loaded');
    mainWindow.webContents.send('backend-ready');
    return true;
  } catch (error) {
    log('Launch failed:', error);
    showErrorPage(`Could not start PharmacyPOS.\n\n${error.message}`);
    return false;
  } finally {
    launching = false;
  }
}

async function restartBackend() {
  if (!app.isPackaged) {
    dialog.showMessageBox({
      type: 'info',
      message: 'Development mode',
      detail: 'In development the backend is run by npm (npm run dev). Restart it from your terminal.'
    });
    return false;
  }
  await stopBackend();
  return launchApp();
}

// ==================== WINDOW ====================
function createWindow() {
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
    icon: getIconPath(),
    show: false,
    backgroundColor: '#f5f5f5',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: true,
    autoHideMenuBar: false
  });

  createMenu();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==================== STATUS PAGES ====================
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showPage(html) {
  if (!mainWindow) return;
  mainWindow
    .loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    .catch(() => { /* superseded by a newer navigation */ });
}

const PAGE_STYLE = `
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    margin: 0; padding: 40px; min-height: 100vh; box-sizing: border-box;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; display: flex; align-items: center; justify-content: center;
  }
  .container {
    background: rgba(255,255,255,0.12); padding: 40px; border-radius: 15px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 640px; width: 90%;
    text-align: center; border: 1px solid rgba(255,255,255,0.2);
  }
  h1 { margin-top: 0; font-size: 24px; }
  .error {
    background: rgba(0,0,0,0.25); padding: 20px; border-radius: 10px; margin: 20px 0;
    text-align: left; border-left: 4px solid #ff6b6b; word-break: break-word;
    white-space: pre-wrap; font-size: 13px; max-height: 260px; overflow: auto;
  }
  .hint {
    background: rgba(255,200,0,0.2); border-left: 4px solid #ffc107;
    padding: 15px; border-radius: 8px; margin: 15px 0; text-align: left; font-size: 14px;
  }
  button {
    padding: 12px 24px; background: rgba(255,255,255,0.3); color: white;
    border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; cursor: pointer;
    margin: 6px; font-weight: 500; font-size: 14px;
  }
  button.primary { background: #4CAF50; border-color: #4CAF50; }
  button:hover { filter: brightness(1.1); }
  .info { color: rgba(255,255,255,0.8); margin-top: 24px; font-size: 12px; }
  .spinner {
    width: 40px; height: 40px; margin: 20px auto; border-radius: 50%;
    border: 4px solid rgba(255,255,255,0.3); border-top-color: white;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

function showLoadingPage() {
  showPage(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PharmacyPOS</title>
    <style>${PAGE_STYLE}</style></head><body><div class="container">
      <h1>PharmacyPOS</h1>
      <div class="spinner"></div>
      <div>Starting up, please wait...</div>
      <div class="info">The first launch can take a little longer while the database is set up.</div>
    </div></body></html>`);
}

function showErrorPage(message) {
  showPage(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PharmacyPOS - Error</title>
    <style>${PAGE_STYLE}</style></head><body><div class="container">
      <h1>PharmacyPOS could not start</h1>
      <div class="error">${escapeHtml(message)}</div>
      <div class="hint">
        <strong>Please check:</strong><br>
        1. PostgreSQL is installed and running (Windows Services: "postgresql-x64-NN")<br>
        2. The database user and password in the settings file are correct<br>
        3. Nothing else is using port ${BACKEND_PORT}<br><br>
        Settings file: <code>${escapeHtml(getEnvPath())}</code>
      </div>
      <div>
        <button class="primary" onclick="window.electronAPI && window.electronAPI.restartBackend()">Retry</button>
        <button onclick="window.electronAPI && window.electronAPI.openSettings()">Edit Database Settings</button>
      </div>
      <div class="info">
        Version ${escapeHtml(app.getVersion())} | ${escapeHtml(process.platform)} ${escapeHtml(os.release())} |
        Electron ${escapeHtml(process.versions.electron)}
      </div>
    </div></body></html>`);
}

// ==================== LOAD FRONTEND (DEV) ====================
function loadDevFrontend() {
  log('Development mode: loading http://localhost:3000');
  mainWindow.loadURL('http://localhost:3000').catch((err) => {
    log('Failed to load dev server:', err);
    showErrorPage('Development server not running.\n\nStart it with: npm run dev');
  });
}

// ==================== APP STARTUP ====================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    rotateLogIfLarge();
    log('=== PharmacyPOS starting ===');
    log('Version:', app.getVersion(), '| packaged:', app.isPackaged);
    log('Platform:', process.platform, os.release());
    log('Resources:', process.resourcesPath || 'N/A (dev)');
    log('User data:', app.getPath('userData'));
    log('Backend:', getBackendPath());
    log('Settings file:', getEnvPath());

    createWindow();

    if (app.isPackaged) {
      await launchApp();
    } else {
      loadDevFrontend();
    }
  });
}

// ==================== CLEANUP ====================
function killBackendNow() {
  if (!serverProcess) return;
  try {
    serverProcess.kill();
  } catch (e) {
    // already gone
  }
}

app.on('window-all-closed', () => {
  killBackendNow();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', killBackendNow);

app.on('activate', () => {
  if (mainWindow === null && app.isReady()) {
    createWindow();
    if (app.isPackaged) launchApp();
    else loadDevFrontend();
  }
});

// ==================== PRINTING ====================
// The renderer builds a self-contained print document (see
// frontend/src/utils/printEngine.ts) and hands it here. Printing from the main
// process is what lets a till fire a slip at the receipt printer with no dialog
// in the way; the browser has no such API, so outside Electron the same document
// still goes through the print preview.
const PRINT_WAIT_MS = 200;

async function withHiddenPrintWindow(html, run) {
  const win = new BrowserWindow({
    show: false,
    width: 900,
    height: 1200,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    // One paint, so fonts and the @page box are settled before the job is taken.
    await sleep(PRINT_WAIT_MS);
    return await run(win);
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

function toMargins(marginType) {
  return { marginType: marginType === 'none' ? 'none' : 'default' };
}

ipcMain.handle('print-html', async (event, payload) => {
  const { html = '', silent = false, deviceName = '', marginType = 'default' } = payload || {};
  if (!html.trim()) return { success: false, error: 'Nothing to print' };

  const options = {
    silent,
    printBackground: true,
    margins: toMargins(marginType)
  };
  // An empty name means "whatever Windows has set as default"; passing
  // deviceName: '' outright makes Chromium fail the job.
  if (deviceName) options.deviceName = deviceName;

  try {
    const result = await withHiddenPrintWindow(html, (win) =>
      new Promise((resolve) => {
        win.webContents.print(options, (success, failureType) => resolve({ success, failureType }));
      })
    );
    if (result.success) return { success: true, printer: deviceName || 'default printer' };

    log(`Print job failed (${result.failureType}) for printer "${deviceName || 'default'}"`);
    return {
      success: false,
      error:
        result.failureType === 'printer-invalid'
          ? `"${deviceName}" is not available on this machine. Pick a printer in Preferences.`
          : 'The print job was rejected by Windows.'
    };
  } catch (error) {
    log('Print error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-pdf', async (event, payload) => {
  const { html = '', fileName = 'document.pdf', marginType = 'default' } = payload || {};
  if (!html.trim()) return { success: false, error: 'Nothing to save' };

  const target = await dialog.showSaveDialog({
    title: 'Save as PDF',
    defaultPath: fileName,
    filters: [{ name: 'PDF document', extensions: ['pdf'] }]
  });
  if (target.canceled || !target.filePath) return { success: false, cancelled: true };

  try {
    const data = await withHiddenPrintWindow(html, (win) =>
      win.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
        margins: toMargins(marginType)
      })
    );
    fs.writeFileSync(target.filePath, data);
    return { success: true, path: target.filePath };
  } catch (error) {
    log('PDF error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-printers', async () => {
  const win = new BrowserWindow({ show: false });
  try {
    const printers = await win.webContents.getPrintersAsync();
    return printers.map((p) => ({
      name: p.name,
      displayName: p.displayName || p.name,
      isDefault: p.isDefault,
      status: p.status
    }));
  } catch (error) {
    log('Could not list printers:', error);
    return [];
  } finally {
    win.destroy();
  }
});

// ==================== IPC HANDLERS ====================
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('get-backend-status', () => (serverProcess ? 'running' : 'stopped'));

ipcMain.handle('restart-backend', async () => {
  try {
    const ok = await restartBackend();
    return { success: ok };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-settings', () => {
  openSettingsFile();
  return true;
});

ipcMain.handle('get-db-info', () => getDatabaseInfo());

// ==================== ERROR HANDLERS ====================
process.on('uncaughtException', (error) => {
  log('Uncaught Exception:', error);
  if (app.isPackaged && mainWindow) {
    dialog.showErrorBox('Application Error', error.toString());
  }
});

process.on('unhandledRejection', (reason) => {
  log('Unhandled Rejection:', reason);
});
