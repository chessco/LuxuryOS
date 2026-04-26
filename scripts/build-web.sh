#!/bin/bash

# Configuration
FRONTEND_DIR="web"
OUTPUT_ZIP="dist.zip"

echo "🚀 Preparing Web for Hostinger..."

# Navigate to web directory
cd $FRONTEND_DIR || { echo "❌ Error: Directory $FRONTEND_DIR not found"; exit 1; }

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🏗️ Building static files..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed, dist directory not found"
    exit 1
fi

# Create zip file
echo "🗜️ Creating $OUTPUT_ZIP..."
# Check if zip is installed, otherwise use python or other available tool
if command -v zip >/dev/null 2>&1; then
    zip -r ../$OUTPUT_ZIP dist/*
elif command -v 7z >/dev/null 2>&1; then
    7z a -tzip ../$OUTPUT_ZIP ./dist/*
else
    echo "⚠️ Warning: 'zip' or '7z' command not found. Please zip the 'web/dist' folder manually."
    exit 0
fi

echo "✅ Web is ready! Upload 'dist.zip' to Hostinger."
