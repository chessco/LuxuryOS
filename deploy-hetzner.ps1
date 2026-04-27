# LuxuryOS - Production Deploy Script (Hetzner)
# Uso: .\deploy-hetzner.ps1

$ErrorActionPreference = "Stop"
$SERVER_IP = "46.224.155.43"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_citaia"

Write-Host "--- Iniciando Despliegue de Producción LuxuryOS (Hetzner) ---" -ForegroundColor Cyan

try {
    Write-Host "Paso 1: Conectando a $SERVER_IP y actualizando código..." -ForegroundColor Yellow
    
    $remoteCommands = @"
        cd /opt/pitaya/luxuryos
        echo 'Actualizando repositorio git...'
        git fetch --all --prune
        git reset --hard origin/main
        git clean -fd
        
        echo 'Reconstruyendo contenedor luxury-api-prod...'
        docker compose -f docker-compose.prod.yml up -d --build api
        
        echo 'Actualizando base de datos...'
        docker exec luxury-api-prod npx prisma db push
        
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
