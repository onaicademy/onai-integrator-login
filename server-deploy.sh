#!/bin/bash

# 🚀 Скрипт автоматического деплоя на сервер
# Выполняет все шаги из PROBLEM_SOLUTION_SUMMARY.md

echo "=================================="
echo "🚀 ДЕПЛОЙ НА PRODUCTION СЕРВЕР"
echo "=================================="
echo ""

# Проверка что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запусти скрипт из директории /var/www/onai-integrator-login"
    exit 1
fi

echo "📂 Текущая директория: $(pwd)"
echo ""

# Шаг 1: Обновление кода
echo "1️⃣ Обновление кода с GitHub..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Ошибка при git pull"
    exit 1
fi
echo "✅ Код обновлён"
echo ""

# Шаг 2: Установка зависимостей
echo "2️⃣ Установка зависимостей..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Ошибка при npm install"
    exit 1
fi
echo "✅ Зависимости установлены"
echo ""

# Шаг 3: Проверка .env файла
echo "3️⃣ Проверка .env файла..."
if [ ! -f ".env" ]; then
    echo "⚠️ Файл .env не найден!"
    echo "Создаём .env с правильными переменными..."
    cat > .env << 'EOF'
VITE_SUPABASE_URL=https://capdjvokjdivxjfdddmx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcGRqdm9ramRpdnhqZmRkZG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2Mzc3MDIsImV4cCI6MjA0NjIxMzcwMn0.1rHZY2Ng0HqA-A5JVh3IKYx4jqZqx9FJfI8iqMKLHVc
VITE_SITE_URL=https://onai.academy
EOF
    echo "✅ .env файл создан"
else
    echo "✅ .env файл существует"
    echo "Содержимое:"
    cat .env
fi
echo ""

# Шаг 4: Сборка проекта
echo "4️⃣ Сборка проекта..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Ошибка при сборке"
    exit 1
fi
echo "✅ Проект собран"
echo ""

# Шаг 5: Установка прав
echo "5️⃣ Установка прав на файлы..."
chown -R www-data:www-data dist
echo "✅ Права установлены"
echo ""

# Шаг 6: Проверка Nginx конфигурации
echo "6️⃣ Проверка Nginx конфигурации..."
NGINX_CONFIG="/etc/nginx/sites-available/onai-integrator-login"

if [ -f "$NGINX_CONFIG" ]; then
    echo "Файл конфигурации: $NGINX_CONFIG"
    
    # Проверяем наличие try_files
    if grep -q "try_files" "$NGINX_CONFIG"; then
        echo "✅ try_files найден в конфигурации"
        grep "try_files" "$NGINX_CONFIG"
    else
        echo "⚠️ ВНИМАНИЕ: try_files НЕ НАЙДЕН!"
        echo ""
        echo "Это КРИТИЧНО для работы React Router!"
        echo "Добавь в конфигурацию Nginx:"
        echo ""
        echo "location / {"
        echo "    try_files \$uri \$uri/ /index.html;"
        echo "}"
        echo ""
        echo "Команды для исправления:"
        echo "  nano $NGINX_CONFIG"
        echo "  nginx -t"
        echo "  systemctl restart nginx"
    fi
else
    echo "⚠️ Файл конфигурации не найден: $NGINX_CONFIG"
fi
echo ""

# Шаг 7: Проверка конфигурации Nginx
echo "7️⃣ Проверка синтаксиса Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Конфигурация Nginx корректна"
else
    echo "❌ Ошибка в конфигурации Nginx"
    exit 1
fi
echo ""

# Шаг 8: Перезапуск Nginx
echo "8️⃣ Перезапуск Nginx..."
systemctl restart nginx
if [ $? -eq 0 ]; then
    echo "✅ Nginx перезапущен"
else
    echo "❌ Ошибка при перезапуске Nginx"
    exit 1
fi
echo ""

# Финальная проверка
echo "=================================="
echo "✅ ДЕПЛОЙ ЗАВЕРШЁН!"
echo "=================================="
echo ""
echo "📊 Проверь работу сайта:"
echo "  https://onai.academy/"
echo "  https://onai.academy/profile"
echo "  https://onai.academy/welcome"
echo "  https://onai.academy/admin/activity"
echo ""
echo "🔍 Проверка через curl:"
curl -I http://localhost/profile | head -1
echo ""
echo "Если видишь 'HTTP/1.1 200 OK' - всё работает! ✅"
echo ""
echo "📝 Логи Nginx (если проблемы):"
echo "  tail -f /var/log/nginx/error.log"
echo ""

