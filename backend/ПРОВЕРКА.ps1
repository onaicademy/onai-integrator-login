#!/usr/bin/env pwsh
# Проверка что токены настроены

Write-Host "🔍 ПРОВЕРКА TELEGRAM БОТА" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка env.env
Write-Host "1️⃣ Проверка env.env..." -ForegroundColor Yellow
if (Test-Path "env.env") {
    $envContent = Get-Content "env.env" -Raw
    
    if ($envContent -match "TELEGRAM_LEADS_BOT_TOKEN=8275130868") {
        Write-Host "   ✅ Токен найден в env.env" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Токен НЕ найден в env.env" -ForegroundColor Red
    }
    
    if ($envContent -match "TELEGRAM_LEADS_CHAT_ID=789638302") {
        Write-Host "   ✅ Chat ID найден в env.env" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Chat ID НЕ найден в env.env" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ Файл env.env не найден" -ForegroundColor Red
}

Write-Host ""

# 2. Проверка .env.production
Write-Host "2️⃣ Проверка .env.production..." -ForegroundColor Yellow
if (Test-Path ".env.production") {
    $prodContent = Get-Content ".env.production" -Raw
    
    if ($prodContent -match "TELEGRAM_LEADS_BOT_TOKEN=8275130868") {
        Write-Host "   ✅ Токен найден в .env.production" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Токен НЕ найден в .env.production" -ForegroundColor Red
        Write-Host "   👉 ЗАПУСТИ: .\БЫСТРЫЙ_ФИКС.ps1" -ForegroundColor Yellow
    }
    
    if ($prodContent -match "TELEGRAM_LEADS_CHAT_ID=789638302") {
        Write-Host "   ✅ Chat ID найден в .env.production" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Chat ID НЕ найден в .env.production" -ForegroundColor Red
        Write-Host "   👉 ЗАПУСТИ: .\БЫСТРЫЙ_ФИКС.ps1" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Файл .env.production не найден" -ForegroundColor Red
}

Write-Host ""

# 3. Проверка PM2
Write-Host "3️⃣ Проверка PM2..." -ForegroundColor Yellow
$pm2Installed = Get-Command pm2 -ErrorAction SilentlyContinue

if ($pm2Installed) {
    Write-Host "   ✅ PM2 установлен" -ForegroundColor Green
    Write-Host ""
    pm2 status
} else {
    Write-Host "   ⚠️  PM2 не установлен" -ForegroundColor Yellow
}

Write-Host ""

# 4. Тест бота
Write-Host "4️⃣ Тест Telegram бота..." -ForegroundColor Yellow
Write-Host "   Запускаю тест..." -ForegroundColor Gray
Write-Host ""

if (Test-Path "test-telegram-bot.ts") {
    npx tsx test-telegram-bot.ts 2>&1 | Out-String | Write-Host
} else {
    Write-Host "   ⚠️  Файл test-telegram-bot.ts не найден" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "📱 Если тест прошёл успешно - проверь TELEGRAM!" -ForegroundColor Cyan
Write-Host "   ID: 789638302" -ForegroundColor White
Write-Host ""
Write-Host "❌ Если тест НЕ прошёл - запусти:" -ForegroundColor Red
Write-Host "   .\БЫСТРЫЙ_ФИКС.ps1" -ForegroundColor Yellow
Write-Host ""




