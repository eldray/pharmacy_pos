#!/bin/bash

# Build script for Linux that prevents freezing

echo "🔧 Building PharmacyPOS for Linux..."

# Clean everything
echo "🧹 Cleaning previous builds..."
rm -rf release dist build frontend/dist 2>/dev/null || true

# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi
cd ..

# Build backend dependencies
echo "⚙️  Preparing backend..."
cd backend
npm ci --only=production
if [ $? -ne 0 ]; then
    echo "❌ Backend preparation failed"
    exit 1
fi
cd ..

# Remove heavy dependencies that cause issues
echo "🗑️  Removing problematic dependencies..."
rm -rf backend/node_modules/sqlite3/build 2>/dev/null || true
rm -rf backend/node_modules/sqlite3/deps 2>/dev/null || true

# Build the app
echo "🚀 Building Linux package..."
npx electron-builder --linux --x64 --dir

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 App is in: release/linux-unpacked/"
else
    echo "❌ Build failed"
    exit 1
fi