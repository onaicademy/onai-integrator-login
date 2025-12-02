#!/bin/bash
# Скрипт для обновления кода на сервере

echo "🚀 Обновление кода на сервере onai.academy..."
echo ""

ssh root@178.128.203.40 << 'ENDSSH'
set -e

echo "📂 Переход в папку проекта..."
cd /var/www/onai-integrator-login

echo "📥 Получение последних изменений с GitHub..."
git pull origin main

echo "📦 Установка зависимостей (если добавились новые)..."
npm install

echo "🔨 Сборка production версии..."
npm run build

echo "🔐 Установка прав доступа..."
chown -R www-data:www-data /var/www/onai-integrator-login/dist
chmod -R 755 /var/www/onai-integrator-login/dist

echo "🔄 Перезапуск Nginx..."
systemctl restart nginx

echo ""
echo "✅ Обновление завершено!"
echo "📍 Проверьте сайт: https://onai.academy"
echo ""

ENDSSH

echo "✅ Готово! Проверьте сайт в браузере."

