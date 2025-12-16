#!/usr/bin/env pwsh
# БЫСТРЫЙ ФИКС - Добавляет токены и перезапускает сервер

Write-Host "🔥 БЫСТРЫЙ ФИКС TELEGRAM БОТА" -ForegroundColor Red
Write-Host ""

# Проверяем что мы в правильной папке
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ Файл .env.production не найден!" -ForegroundColor Red
    Write-Host "   Убедитесь что вы в папке backend/" -ForegroundColor Yellow
    exit 1
}

Write-Host "📝 Добавляю токены в .env.production..." -ForegroundColor Cyan

# Проверяем есть ли уже токены
$prodContent = Get-Content ".env.production" -Raw

if ($prodContent -match "TELEGRAM_LEADS_BOT_TOKEN") {
    Write-Host "✅ Токены уже есть в .env.production" -ForegroundColor Green
} else {
    # Добавляем токены
    Add-Content -Path ".env.production" -Value "`n# 🔔 Telegram бот для уведомлений о лидах с экспресс курса"
    Add-Content -Path ".env.production" -Value "TELEGRAM_LEADS_BOT_TOKEN=8275130868:AAGiH466WmyoUQUKN4VfwI3nM1qZAmlUJOQ"
    Add-Content -Path ".env.production" -Value "TELEGRAM_LEADS_CHAT_ID=789638302"
    Write-Host "✅ Токены добавлены!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔄 Перезапускаю сервер..." -ForegroundColor Cyan
Write-Host ""

# Проверяем PM2
$pm2Installed = Get-Command pm2 -ErrorAction SilentlyContinue

if ($pm2Installed) {
    Write-Host "   Останавливаю..." -ForegroundColor Yellow
    pm2 stop all
    
    Start-Sleep -Seconds 2
    
    Write-Host "   Запускаю с новыми токенами..." -ForegroundColor Yellow
    pm2 start ecosystem.config.js --env production
    
    Start-Sleep -Seconds 3
    
    Write-Host ""
    pm2 status
    Write-Host ""
    Write-Host "✅ ГОТОВО!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 ПРОВЕРЬ TELEGRAM (ID: 789638302) - попробуй отправить заявку!" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  PM2 не установлен" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Перезапусти сервер ВРУЧНУЮ:" -ForegroundColor Yellow
    Write-Host "  1. Останови текущий процесс Node.js" -ForegroundColor White
    Write-Host "  2. Запусти: node src/server.js" -ForegroundColor White
    Write-Host ""
}

Write-Host "📝 Смотреть логи: pm2 logs" -ForegroundColor Gray
Write-Host ""




