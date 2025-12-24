#!/bin/bash

# Скрипт для установки автоматического обновления токена
# Создает crон-задачу, которая будет проверять токен каждый день

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TOKEN_MANAGER="$SCRIPT_DIR/token-manager.cjs"
LOG_FILE="$SCRIPT_DIR/token-manager.log"

echo "🔧 УСТАНОВКА АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ ТОКЕНА"
echo "══════════════════════════════════════════════════════════════"
echo ""

# Проверяем существование скрипта
if [ ! -f "$TOKEN_MANAGER" ]; then
    echo "❌ Файл $TOKEN_MANAGER не найден!"
    exit 1
fi

# Добавляем крон-задачу (каждый день в 9:00 утра)
CRON_CMD="0 9 * * * cd $SCRIPT_DIR && node $TOKEN_MANAGER >> $LOG_FILE 2>&1"

# Проверяем существует ли уже такая задача
if crontab -l 2>/dev/null | grep -q "$TOKEN_MANAGER"; then
    echo "⚠️ Крон-задача уже установлена"
else
    # Добавляем новую крон-задачу
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    echo "✅ Крон-задача установлена!"
    echo ""
    echo "📋 ДЕТАЛИ:"
    echo "   ├─ Скрипт: $TOKEN_MANAGER"
    echo "   ├─ Время: Каждый день в 09:00"
    echo "   └─ Лог: $LOG_FILE"
    echo ""
    echo "📝 ДЛЯ ПРОСМОТРА КРОН-ЗАДАЧ:"
    echo "   crontab -l"
    echo ""
    echo "📝 ДЛЯ УДАЛЕНИЯ КРОН-ЗАДАЧИ:"
    echo "   crontab -e"
    echo "   # Удали строку с $TOKEN_MANAGER"
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "✅ Готово!"
