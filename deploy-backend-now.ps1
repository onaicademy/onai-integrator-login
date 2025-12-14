# 🚀 Backend Deploy to Digital Ocean
# Server: 207.154.231.30

Write-Host "🚀 Starting backend deployment to Digital Ocean..." -ForegroundColor Green
Write-Host ""

# SSH command - single line to avoid PowerShell parsing issues
$command = "cd /var/www/onai-integrator-login-main; git pull origin main; cd backend; npm install --production; npm run build; pm2 restart onai-backend --update-env; pm2 logs onai-backend --lines 30 --nostream"

# Execute SSH
ssh root@207.154.231.30 $command

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔍 Testing API..." -ForegroundColor Cyan
    
    # Test health endpoint
    try {
        $response = Invoke-WebRequest -Uri "https://api.onai.academy/api/health" -UseBasicParsing
        Write-Host "✅ API Health Check: OK" -ForegroundColor Green
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ API Health Check: FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "   Check SSH connection or server logs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Test Tripwire lessons: https://onai.academy/tripwire" -ForegroundColor Gray
Write-Host "   2. Check backend logs: ssh root@207.154.231.30 'pm2 logs onai-backend'" -ForegroundColor Gray
