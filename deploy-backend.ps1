# 🚀 DEPLOY BACKEND НА DIGITALOCEAN
# Сервер: 207.154.231.30
# User: root
# Путь: /var/www/onai-integrator-login-main/backend

Write-Host "🚀 Starting Backend Deploy..." -ForegroundColor Green
Write-Host ""

$sshCommand = @"
echo '📦 Pulling latest changes from GitHub...'
cd /var/www/onai-integrator-login-main
git pull origin main

echo ''
echo '📦 Installing dependencies...'
cd backend
npm install --production

echo ''
echo '🔨 Building TypeScript...'
npm run build

echo ''
echo '🔄 Restarting PM2 process...'
pm2 restart onai-backend

echo ''
echo '📋 Recent logs:'
pm2 logs onai-backend --lines 20

echo ''
echo '✅ Backend deployed!'
"@

# Выполняем SSH команды
ssh root@207.154.231.30 $sshCommand

Write-Host ""
Write-Host "🔍 Testing API..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $response = Invoke-RestMethod -Uri "https://api.onai.academy/api/health" -Method Get
    Write-Host "✅ API Health Check:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json) -ForegroundColor Cyan
} catch {
    Write-Host "❌ API Health Check Failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Deploy completed!" -ForegroundColor Green

