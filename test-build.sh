#!/bin/bash

echo "=== Testing Build Process ==="
echo ""

# Check if frontend build exists
if [ -d "frontend/dist" ]; then
    echo "✓ Frontend build exists"
    echo "  Files in frontend/dist:"
    ls -lh frontend/dist/ | head -10
else
    echo "✗ Frontend build missing - run: cd frontend && npm run build"
    exit 1
fi

# Check if index.html exists
if [ -f "frontend/dist/index.html" ]; then
    echo "✓ index.html found"
else
    echo "✗ index.html missing!"
    exit 1
fi

# Check backend files
if [ -f "backend/server.js" ]; then
    echo "✓ Backend server.js exists"
else
    echo "✗ Backend server.js missing!"
    exit 1
fi

# Check main files
if [ -f "main.cjs" ]; then
    echo "✓ main.cjs exists"
else
    echo "✗ main.cjs missing!"
    exit 1
fi

if [ -f "preload.js" ]; then
    echo "✓ preload.js exists"
else
    echo "✗ preload.js missing!"
    exit 1
fi

echo ""
echo "=== All checks passed! Ready to build ==="
echo ""
echo "Run: npm run build:win-portable"