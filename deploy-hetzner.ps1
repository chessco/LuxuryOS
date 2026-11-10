# LuxuryOS - Production Deploy Script (Hetzner)
# Uso: .\deploy-hetzner.ps1

$ErrorActionPreference = "Stop"
$SERVER_IP = "46.224.155.43"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_citaia"

Write-Host "--- Iniciando Despliegue de Producción LuxuryOS (Hetzner) ---" -ForegroundColor Cyan

try {
    Write-Host "Paso 1: Empaquetando y subiendo archivos locales..." -ForegroundColor Yellow
    
    # Comprimir api (excluyendo node_modules y dist)
    tar --exclude="node_modules" --exclude="dist" -czf deploy_api_only.tar.gz -C . api

    scp -i $SSH_KEY -o StrictHostKeyChecking=no deploy_api_only.tar.gz root@${SERVER_IP}:/opt/pitaya/luxuryos/

    Write-Host "Paso 2: Descomprimiendo y reconstruyendo..." -ForegroundColor Yellow
    
    $remoteCommands = @"
        cd /opt/pitaya/luxuryos
        
        echo 'Descomprimiendo archivos...'
        tar -xzf deploy_api_only.tar.gz
        rm deploy_api_only.tar.gz

        
        echo 'Construyendo imagen de luxury-api-prod...'
        docker compose --env-file .env.prod -f docker-compose.prod.yml build api
        
        echo 'Aplicando migraciones versionadas...'
        docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm --no-deps api npx prisma migrate deploy

        echo 'Iniciando luxury-api-prod...'
        docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --no-deps api
        
        echo 'Esperando inicialización (5s)...'
        sleep 5
        
        echo 'Estado final del contenedor:'
        docker ps --filter name=luxury-api-prod
        
        echo 'Últimos logs:'
        docker logs --tail 20 luxury-api-prod
"@

    ssh -i $SSH_KEY -o StrictHostKeyChecking=no root@$SERVER_IP $remoteCommands

    Write-Host "--- DESPLIEGUE A HETZNER COMPLETADO CON ÉXITO ---" -ForegroundColor Green
}
catch {
    Write-Host "Error durante el despliegue: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
