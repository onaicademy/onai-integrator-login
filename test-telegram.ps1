# 🧪 Быстрый тест Telegram ботов
# Использование: .\test-telegram.ps1

Write-Host "🧪 ТЕСТИРОВАНИЕ TELEGRAM БОТОВ" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Получи JWT токен
Write-Host "1️⃣ Открой: http://localhost:8080" -ForegroundColor Yellow
Write-Host "2️⃣ Открой DevTools (F12) → Console" -ForegroundColor Yellow
Write-Host "3️⃣ Выполни: localStorage.getItem('supabase_token')" -ForegroundColor Yellow
Write-Host ""

$token = Read-Host "Вставь JWT токен"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "❌ Токен не введён!" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "✅ Токен получен!" -ForegroundColor Green
Write-Host ""

# Получи Telegram Chat ID
Write-Host "Теперь нужен Telegram Chat ID:" -ForegroundColor Yellow
Write-Host "1️⃣ Открой Telegram → найди @onaimentor_bot → отправь /start" -ForegroundColor Yellow
Write-Host "2️⃣ Открой в браузере:" -ForegroundColor Yellow
Write-Host "   https://api.telegram.org/bot8380600260:AAGtuSG9GqFOmkyThhWqRzilHi3gKdKiOSo/getUpdates" -ForegroundColor Yellow
Write-Host "3️⃣ Найди: `"chat`": { `"id`": 123456789 }" -ForegroundColor Yellow
Write-Host ""

$chatId = Read-Host "Вставь свой Chat ID"

if ([string]::IsNullOrWhiteSpace($chatId)) {
    Write-Host "❌ Chat ID не введён!" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "✅ Chat ID получен!" -ForegroundColor Green
Write-Host ""

# Запуск тестов
Write-Host "🚀 ЗАПУСК ТЕСТОВ..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000/api/telegram"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Тест 1: Проверка шаблонов
Write-Host "Тест 1: Проверка шаблонов..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/templates" -Method GET -Headers $headers
    Write-Host "✅ Шаблоны загружены!" -ForegroundColor Green
    Write-Host "   Mentor: $($response.mentor.templates.Count) шаблонов" -ForegroundColor Gray
    Write-Host "   Admin: $($response.admin.templates.Count) шаблонов" -ForegroundColor Gray
} catch {
    Write-Host "❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Тест 2: AI-Наставник → Мотивация
Write-Host "Тест 2: AI-Наставник → Мотивация..." -ForegroundColor Yellow
$body = @{
    chatId = $chatId
    template = "motivation"
    templateData = @("Александр", 75)
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/mentor/send" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Сообщение отправлено!" -ForegroundColor Green
    Write-Host "   Проверь Telegram бота @onaimentor_bot" -ForegroundColor Gray
} catch {
    Write-Host "❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Тест 3: AI-Наставник → Стрик
Write-Host "Тест 3: AI-Наставник → Стрик..." -ForegroundColor Yellow
$body = @{
    chatId = $chatId
    template = "streak"
    templateData = @("Александр", 7)
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/mentor/send" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Сообщение отправлено!" -ForegroundColor Green
    Write-Host "   Проверь Telegram бота @onaimentor_bot" -ForegroundColor Gray
} catch {
    Write-Host "❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Тест 4: AI-Аналитик → Алерт
Write-Host "Тест 4: AI-Аналитик → Алерт..." -ForegroundColor Yellow
$body = @{
    template = "alert"
    templateData = @{
        message = "🚀 Backend Telegram API успешно протестирован!"
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/send" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Сообщение отправлено!" -ForegroundColor Green
    Write-Host "   Проверь Telegram бота @onaianalyst_bot" -ForegroundColor Gray
} catch {
    Write-Host "❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Тест 5: AI-Аналитик → Ежедневный отчёт
Write-Host "Тест 5: AI-Аналитик → Ежедневный отчёт..." -ForegroundColor Yellow
$body = @{
    template = "dailyReport"
    templateData = @{
        activeStudents = 45
        completedLessons = 123
        newRegistrations = 5
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/send" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Сообщение отправлено!" -ForegroundColor Green
    Write-Host "   Проверь Telegram бота @onaianalyst_bot" -ForegroundColor Gray
} catch {
    Write-Host "❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Итог
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!" -ForegroundColor Green
Write-Host ""
Write-Host "Проверь Telegram:" -ForegroundColor Yellow
Write-Host "  - @onaimentor_bot (3 сообщения)" -ForegroundColor Gray
Write-Host "  - @onaianalyst_bot (2 сообщения)" -ForegroundColor Gray
Write-Host ""

