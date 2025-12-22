// web-server.js - For Render.com Frontend Service
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Check if frontend is built
const frontendDistPath = path.join(__dirname, 'frontend', 'dist');
const indexPath = path.join(frontendDistPath, 'index.html');

// Get backend URL from environment or use Render.com default
const BACKEND_URL = process.env.BACKEND_URL || 'https://pharmacy-pos-backend.onrender.com';

// Log startup info
console.log(`
==========================================
Pharmacy POS Frontend Server
==========================================
Port: ${PORT}
Frontend path: ${frontendDistPath}
Backend URL: ${BACKEND_URL}
Environment: ${process.env.NODE_ENV || 'production'}
==========================================
`);

// Check if frontend is built
if (!fs.existsSync(indexPath)) {
  console.error('ERROR: Frontend not built!');
  console.log('Attempting to build frontend...');
  
  const { execSync } = require('child_process');
  try {
    execSync('npm run build:frontend', { stdio: 'inherit' });
    console.log('Frontend built successfully!');
  } catch (error) {
    console.error('Build failed. Please build frontend manually.');
    console.error('Run: cd frontend && npm run build');
    
    // Serve error page
    app.get('*', (req, res) => {
      res.send(`
        <html>
          <head><title>Pharmacy POS - Build Required</title></head>
          <body style="font-family: Arial; padding: 40px;">
            <h1>⚠️ Frontend Not Built</h1>
            <p>Please build the frontend:</p>
            <pre style="background: #f5f5f5; padding: 20px; border-radius: 5px;">
cd frontend
npm install
npm run build
            </pre>
          </body>
        </html>
      `);
    });
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (error mode)`);
    });
    return;
  }
}

// Middleware
app.use(express.static(frontendDistPath));

// API Proxy endpoint (optional - if you want to proxy API calls)
app.use('/api', async (req, res) => {
  try {
    const apiUrl = `${BACKEND_URL}${req.url}`;
    console.log(`Proxying to backend: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' 
        ? JSON.stringify(req.body) 
        : undefined
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('API Proxy Error:', error);
    res.status(500).json({ 
      error: 'Backend service unavailable',
      message: 'Please check if the backend service is running',
      backendUrl: BACKEND_URL
    });
  }
});

// Health check for Render.com
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'frontend',
    frontend: fs.existsSync(indexPath) ? 'built' : 'not built',
    backendUrl: BACKEND_URL,
    timestamp: new Date().toISOString()
  });
});

// Serve frontend SPA - handle all other routes
app.get('*', (req, res) => {
  res.sendFile(indexPath);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Frontend server running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ Backend configured: ${BACKEND_URL}`);
});