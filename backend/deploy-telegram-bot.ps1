#!/usr/bin/env pwsh
# Скрипт для деплоя Telegram бота для уведомлений о лидах

Write-Host "🚀 Деплой Telegram бота для лидов..." -ForegroundColor Cyan
Write-Host ""

# Проверка что мы в правильной директории
if (-not (Test-Path "env.env")) {
    Write-Host "❌ Файл env.env не найден!" -ForegroundColor Red
    Write-Host "   Убедитесь что вы находитесь в директории backend/" -ForegroundColor Yellow
    exit 1
}

# Проверка переменных окружения
Write-Host "📋 Проверка конфигурации..." -ForegroundColor Yellow

$envContent = Get-Content "env.env" -Raw

if ($envContent -notmatch "TELEGRAM_LEADS_BOT_TOKEN") {
    Write-Host "❌ TELEGRAM_LEADS_BOT_TOKEN не найден в env.env!" -ForegroundColor Red
    Write-Host "   Добавьте токен в файл env.env" -ForegroundColor Yellow
    exit 1
}

if ($envContent -notmatch "TELEGRAM_LEADS_CHAT_ID") {
    Write-Host "❌ TELEGRAM_LEADS_CHAT_ID не найден в env.env!" -ForegroundColor Red
    Write-Host "   Добавьте Chat ID в файл env.env" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Переменные окружения настроены" -ForegroundColor Green
Write-Host ""

# Проверка .env.production
Write-Host "📋 Проверка продакшен конфигурации..." -ForegroundColor Yellow

if (Test-Path ".env.production") {
    $prodEnvContent = Get-Content ".env.production" -Raw
    
    if ($prodEnvContent -notmatch "TELEGRAM_LEADS_BOT_TOKEN") {
        Write-Host "⚠️  TELEGRAM_LEADS_BOT_TOKEN не найден в .env.production!" -ForegroundColor Yellow
        Write-Host "   Добавьте следующие строки в .env.production:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   TELEGRAM_LEADS_BOT_TOKEN=8275130868:AAGiH466WmyoUQUKN4VfwI3nM1qZAmlUJOQ" -ForegroundColor White
        Write-Host "   TELEGRAM_LEADS_CHAT_ID=789638302" -ForegroundColor White
        Write-Host ""
        
        $answer = Read-Host "Хотите чтобы я добавил их автоматически? (y/n)"
        if ($answer -eq "y") {
            Add-Content -Path ".env.production" -Value "`n# 🔔 Telegram бот для уведомлений о лидах с экспресс курса"
            Add-Content -Path ".env.production" -Value "TELEGRAM_LEADS_BOT_TOKEN=8275130868:AAGiH466WmyoUQUKN4VfwI3nM1qZAmlUJOQ"
            Add-Content -Path ".env.production" -Value "TELEGRAM_LEADS_CHAT_ID=789638302"
            Write-Host "✅ Переменные добавлены в .env.production" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Пропускаю обновление .env.production" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ .env.production настроен" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Файл .env.production не найден, пропускаю..." -ForegroundColor Yellow
}

Write-Host ""

# Тест бота
Write-Host "🧪 Запуск тестов..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path "test-telegram-bot.ts") {
    try {
        npx tsx test-telegram-bot.ts
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Тесты пройдены успешно!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Тесты не прошли" -ForegroundColor Red
            Write-Host "   Проверьте логи выше для деталей" -ForegroundColor Yellow
            exit 1
        }
    } catch {
        Write-Host "❌ Ошибка запуска тестов: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠️  Файл test-telegram-bot.ts не найден, пропускаю тесты..." -ForegroundColor Yellow
}

Write-Host ""

# Перезапуск сервера
Write-Host "🔄 Перезапуск сервера..." -ForegroundColor Yellow
Write-Host ""

$restart = Read-Host "Хотите перезапустить backend сервер? (y/n)"

if ($restart -eq "y") {
    # Проверка что pm2 установлен
    $pm2Installed = Get-Command pm2 -ErrorAction SilentlyContinue
    
    if ($pm2Installed) {
        Write-Host "   Останавливаю текущие процессы..." -ForegroundColor Cyan
        pm2 stop all
        
        Start-Sleep -Seconds 2
        
        Write-Host "   Запускаю сервер заново..." -ForegroundColor Cyan
        pm2 start ecosystem.config.js --env production
        
        Start-Sleep -Seconds 3
        
        Write-Host "   Проверяю статус..." -ForegroundColor Cyan
        pm2 status
        
        Write-Host ""
        Write-Host "✅ Сервер перезапущен!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Посмотреть логи: pm2 logs" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  PM2 не установлен" -ForegroundColor Yellow
        Write-Host "   Перезапустите сервер вручную" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Пропускаю перезапуск сервера" -ForegroundColor Yellow
    Write-Host "   Не забудьте перезапустить вручную для применения изменений!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Деплой завершен!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Следующие шаги:" -ForegroundColor Cyan
Write-Host "   1. Проверьте Telegram (ID: 789638302) - там должны быть тестовые сообщения" -ForegroundColor White
Write-Host "   2. Откройте https://onai.academy/integrator/expresscourse" -ForegroundColor White
Write-Host "   3. Заполните форму с тестовыми данными" -ForegroundColor White
Write-Host "   4. Проверьте что уведомление пришло в Telegram" -ForegroundColor White
Write-Host ""
Write-Host "📖 Подробная документация: TELEGRAM_LEADS_BOT_SETUP.md" -ForegroundColor Cyan
Write-Host ""





