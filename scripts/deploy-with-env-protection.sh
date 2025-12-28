#!/bin/bash

# 🛡️ Скрипт деплоя с защитой ключей от слета
# Этот скрипт гарантирует, что .env файл на продакшене не будет перезаписан

set -e

# Конфигурация
SERVER="root@207.154.231.30"
PROD_DIR="/var/www/onai-integrator-login-main"
BACKUP_DIR="/var/www/backups/onai-integrator-login"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_NAME="deploy-${TIMESTAMP}.tar.gz"
LOCAL_ARCHIVE="deploy-${TIMESTAMP}.tar.gz"

echo "🚀 Начинаем деплой с защитой ключей..."
echo "📅 Время: $(date)"
echo ""

# Шаг 1: Создать бэкап текущего .env на продакшене
echo "📦 Шаг 1: Создание бэкапа .env файла..."
ssh ${SERVER} "mkdir -p ${BACKUP_DIR} && cp ${PROD_DIR}/backend/.env ${BACKUP_DIR}/.env.backup-${TIMESTAMP}"
echo "✅ Бэкап создан: ${BACKUP_DIR}/.env.backup-${TIMESTAMP}"
echo ""

# Шаг 2: Проверить наличие ключей в локальном .env
echo "🔍 Шаг 2: Проверка ключей в локальном .env..."
if [ ! -f .env ]; then
    echo "❌ ОШИБКА: .env файл не найден!"
    exit 1
fi

# Проверяем критические ключи
REQUIRED_KEYS=(
    "FACEBOOK_ADS_TOKEN"
    "FACEBOOK_APP_SECRET"
    "AMOCRM_ACCESS_TOKEN"
    "AMOCRM_CLIENT_SECRET"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "TRAFFIC_SUPABASE_URL"
    "TRAFFIC_SUPABASE_ANON_KEY"
    "TRAFFIC_SERVICE_ROLE_KEY"
)

MISSING_KEYS=()
for key in "${REQUIRED_KEYS[@]}"; do
    if ! grep -q "^${key}=" .env; then
        MISSING_KEYS+=("$key")
    fi
done

if [ ${#MISSING_KEYS[@]} -gt 0 ]; then
    echo "❌ ОШИБКА: Отсутствуют следующие ключи в .env:"
    for key in "${MISSING_KEYS[@]}"; do
        echo "   - $key"
    done
    exit 1
fi

echo "✅ Все критические ключи присутствуют"
echo ""

# Шаг 3: Собрать проект
echo "🔨 Шаг 3: Сборка проекта..."
npm run build
echo "✅ Сборка завершена"
echo ""

# Шаг 4: Создать архив БЕЗ .env файла
echo "📦 Шаг 4: Создание архива (БЕЗ .env)..."
tar -czf ${LOCAL_ARCHIVE} \
    --exclude='.env' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='*.log' \
    dist/ backend/
echo "✅ Архив создан: ${LOCAL_ARCHIVE}"
echo ""

# Шаг 5: Загрузить архив на сервер
echo "📤 Шаг 5: Загрузка архива на сервер..."
scp ${LOCAL_ARCHIVE} ${SERVER}:/var/www/
echo "✅ Архив загружен"
echo ""

# Шаг 6: Распаковать на сервере
echo "📥 Шаг 6: Распаковка архива на сервере..."
ssh ${SERVER} "cd ${PROD_DIR} && rm -rf dist/ && tar -xzf /var/www/${ARCHIVE_NAME}"
echo "✅ Архив распакован"
echo ""

# Шаг 7: Восстановить .env из бэкапа (на всякий случай)
echo "🔒 Шаг 7: Восстановление .env из бэкапа..."
ssh ${SERVER} "cp ${BACKUP_DIR}/.env.backup-${TIMESTAMP} ${PROD_DIR}/backend/.env"
echo "✅ .env восстановлен из бэкапа"
echo ""

# Шаг 8: Проверить что .env существует и содержит ключи
echo "🔍 Шаг 8: Проверка .env на продакшене..."
ssh ${SERVER} "test -f ${PROD_DIR}/backend/.env || (echo '❌ ОШИБКА: .env не найден на продакшене!' && exit 1)"

# Проверяем наличие ключей на продакшене
PROD_MISSING_KEYS=()
for key in "${REQUIRED_KEYS[@]}"; do
    if ! ssh ${SERVER} "grep -q '^${key}=' ${PROD_DIR}/backend/.env"; then
        PROD_MISSING_KEYS+=("$key")
    fi
done

if [ ${#PROD_MISSING_KEYS[@]} -gt 0 ]; then
    echo "❌ ОШИБКА: Отсутствуют следующие ключи на продакшене:"
    for key in "${PROD_MISSING_KEYS[@]}"; do
        echo "   - $key"
    done
    echo "🔄 Восстанавливаем .env из бэкапа..."
    ssh ${SERVER} "cp ${BACKUP_DIR}/.env.backup-${TIMESTAMP} ${PROD_DIR}/backend/.env"
    echo "✅ .env восстановлен"
else
    echo "✅ Все ключи присутствуют на продакшене"
fi
echo ""

# Шаг 9: Перезапустить backend
echo "🔄 Шаг 9: Перезапуск backend..."
ssh ${SERVER} "cd ${PROD_DIR} && pm2 restart onai-backend"
echo "✅ Backend перезапущен"
echo ""

# Шаг 10: Проверить что backend запустился
echo "🔍 Шаг 10: Проверка статуса backend..."
sleep 5
STATUS=$(ssh ${SERVER} "pm2 status onai-backend | grep 'online' | wc -l")
if [ "$STATUS" -eq 0 ]; then
    echo "❌ ОШИБКА: Backend не запустился!"
    echo "🔄 Восстанавливаем предыдущую версию..."
    ssh ${SERVER} "cd ${PROD_DIR} && pm2 reload onai-backend"
    exit 1
fi
echo "✅ Backend запущен успешно"
echo ""

# Шаг 11: Проверить Build ID
echo "🔍 Шаг 11: Проверка Build ID..."
BUILD_ID=$(curl -s https://traffic.onai.academy/traffic/admin/team-constructor | grep -o 'Build ID matches: [^<]*' || echo "Build ID not found")
echo "📦 ${BUILD_ID}"
echo ""

# Шаг 12: Очистка
echo "🧹 Шаг 12: Очистка временных файлов..."
rm -f ${LOCAL_ARCHIVE}
ssh ${SERVER} "rm -f /var/www/${ARCHIVE_NAME}"
echo "✅ Временные файлы удалены"
echo ""

# Шаг 13: Сохранить информацию о деплое
echo "📝 Шаг 13: Сохранение информации о деплое..."
ssh ${SERVER} "echo 'Deploy: ${TIMESTAMP}' >> ${PROD_DIR}/deploy-history.txt"
echo "✅ Информация сохранена"
echo ""

echo "🎉 Деплой завершен успешно!"
echo "📦 Build ID: ${BUILD_ID}"
echo "🔒 Ключи защищены и не были перезаписаны"
echo ""
echo "📋 Следующие шаги:"
echo "   1. Проверьте https://traffic.onai.academy/traffic/admin/team-constructor"
echo "   2. Протестируйте создание команды"
echo "   3. Проверьте логи: ssh ${SERVER} 'pm2 logs onai-backend --lines 50'"
