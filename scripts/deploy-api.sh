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

# Build and restart API service (Isolated)
echo "📦 Building and restarting API service..."
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d api

# Clean up unused images
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "📊 Verifying service status..."
docker ps | grep luxury-api-prod
docker logs --tail 20 luxury-api-prod

echo "✅ Deployment finished successfully!"
