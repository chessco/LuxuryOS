Write-Host "Starting LuxuryOS Development Environment..." -ForegroundColor Cyan

# 1. Start Database
Write-Host "Starting Database (Docker)..." -ForegroundColor Green
docker compose up -d mysql

# Wait a moment for DB to be ready might be good, but 'depends_on' in docker-compose handles intra-container, not local.
# However, for prisma generate, it only needs the schema, not the running DB (unless pulling).
# Only migration/push needs running DB. Assuming schema is up to date or user handles migrations.

# 2. Setup API
Set-Location "$PSScriptRoot\api"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing API dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Generating Prisma Client..." -ForegroundColor Green
npx prisma generate

Write-Host "Building API..." -ForegroundColor Green
npm run build

Write-Host "Starting API Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\api'; npm run start:dev"

# 3. Setup Frontend
Set-Location "$PSScriptRoot\frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Frontend dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Set-Location "$PSScriptRoot"
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "LuxuryOS started!" -ForegroundColor Cyan
Write-Host "DB (MySQL): localhost:3307" -ForegroundColor Gray
Write-Host "API:        http://localhost:3001" -ForegroundColor Gray
Write-Host "Frontend:   http://localhost:5173" -ForegroundColor Gray
Write-Host "------------------------------------------------" -ForegroundColor Cyan
