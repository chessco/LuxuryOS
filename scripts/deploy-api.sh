#!/bin/bash

# Configuration
APP_DIR="/opt/pitaya/luxuryos"
ENV_FILE=".env.prod"

echo "🚀 Starting full-stack deployment (Front & Back) to Hetzner..."

# Navigate to app directory
cd $APP_DIR || { echo "❌ Error: Directory $APP_DIR not found"; exit 1; }

# Pull latest changes (assuming git is used)
# git pull origin main

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️ Warning: $ENV_FILE not found. Please create it from env-production-template.txt"
    exit 1
fi

# Build and restart containers
echo "📦 Building and restarting containers..."
docker compose --env-file $ENV_FILE -f docker-compose.prod.yml up -d --build

# Clean up unused images
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Deployment finished successfully!"
