#!/usr/bin/env pwsh
# ПРОСТО РЕСТАРТНИ СЕРВЕР

Write-Host "🔄 РЕСТАРТ СЕРВЕРА С НОВЫМИ ТОКЕНАМИ" -ForegroundColor Cyan
Write-Host ""

pm2 restart onai-backend

Write-Host ""
Write-Host "⏳ Ждём 3 секунды..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "📊 СТАТУС:" -ForegroundColor Cyan
pm2 status

Write-Host ""
Write-Host "📝 ЛОГИ (последние 30 строк):" -ForegroundColor Cyan
pm2 logs onai-backend --lines 30 --nostream

Write-Host ""
Write-Host "✅ ГОТОВО! Теперь отправь тестовую заявку на сайте!" -ForegroundColor Green
Write-Host "   https://onai.academy/integrator/expresscourse" -ForegroundColor White
Write-Host ""
Write-Host "📱 Проверь Telegram ID: 789638302" -ForegroundColor Cyan
Write-Host ""


