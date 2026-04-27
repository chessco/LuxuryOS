# LuxuryOS - Production Deploy Script (Hostinger)
# Uso: .\deploy-hostinger.ps1

$ErrorActionPreference = "Stop"

Write-Host "--- Iniciando Despliegue de Frontend LuxuryOS (Hostinger) ---" -ForegroundColor Cyan

try {
    # 1. Entrar a la carpeta web
    $OriginalDir = Get-Location
    Set-Location "web"

    # 2. Instalar dependencias si es necesario
    if (-not (Test-Path "node_modules")) {
        Write-Host "Paso 1: Instalando dependencias..." -ForegroundColor Yellow
        npm install
    }

    # 3. Compilar el proyecto para producción
    Write-Host "Paso 2: Compilando el Frontend (Vite)..." -ForegroundColor Yellow
    npm run build

    # 4. Verificar configuración de despliegue
    if (-not (Test-Path ".env.deploy")) {
        Write-Host "⚠️ Error: Archivo .env.deploy no encontrado en la carpeta 'web'." -ForegroundColor Red
        Write-Host "Crea el archivo con: DEPLOY_HOST, DEPLOY_USER, DEPLOY_PASSWORD, DEPLOY_REMOTE_PATH" -ForegroundColor Gray
        Set-Location $OriginalDir
        exit 1
    }

    # 5. Ejecutar subida SFTP
    Write-Host "Paso 3: Subiendo archivos a Hostinger via SFTP..." -ForegroundColor Yellow
    npm run deploy

    Write-Host "--- DESPLIEGUE A HOSTINGER COMPLETADO CON ÉXITO ---" -ForegroundColor Green
    Set-Location $OriginalDir
}
catch {
    Write-Host "Error durante el despliegue: $($_.Exception.Message)" -ForegroundColor Red
    if ($OriginalDir) { Set-Location $OriginalDir }
    exit 1
}
