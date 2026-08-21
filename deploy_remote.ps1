$ServerIP = "46.224.155.43"
$User = "root"
$RepoUrl = "https://github.com/chessco/LuxuryOS.git"
$AppDir = "/opt/pitaya/luxuryos"

Write-Host "=== LuxuryOS API Deployment (Git Strategy) ===" -ForegroundColor Magenta
Write-Host "Server: $ServerIP" -ForegroundColor Gray
Write-Host ""

$RemoteCommands = "export DEBIAN_FRONTEND=noninteractive && echo '-> Installing dependencies...' && apt-get update -qq && apt-get install -y git docker-compose-plugin -qq --fix-missing && echo '-> Checking repository...' && if [ -d \"$AppDir / .git\" ]; then echo '-> Pulling latest changes...' && cd $AppDir && git pull; else echo '-> Cloning repository...' && git clone $RepoUrl $AppDir && cd $AppDir; fi && echo '-> Configuring environment...' && if [ ! -f .env.prod ]; then cp env-production-template.txt .env.prod; fi && echo '-> Running deployment script...' && bash scripts/deploy-api.sh"

Write-Host "Connecting to server..." -ForegroundColor Cyan
ssh -o StrictHostKeyChecking=no ${User}@${ServerIP} $RemoteCommands
