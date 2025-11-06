#!/bin/bash
cd /var/www/onai-integrator-login

echo "======================================"
echo "🔄 ПЕРЕСБОРКА ПРОЕКТА"
echo "======================================"
echo ""

# 1. Проверка что мы в правильной папке
echo "1️⃣ Текущая директория:"
pwd
echo ""

# 2. Проверка Git коммита (для информации)
echo "2️⃣ Текущий коммит:"
git log --oneline -1
echo ""

# 3. Проверка что src/ существует
echo "3️⃣ Проверка исходного кода:"
if [ -f "src/pages/admin/Activity.tsx" ]; then
    echo "✅ src/pages/admin/Activity.tsx существует"
    echo ""
    echo "Проверка на MOCK данные:"
    if grep -q "const topStudentsData = \[" src/pages/admin/Activity.tsx; then
        echo "⚠️  ВНИМАНИЕ: MOCK данные НАЙДЕНЫ в src/!"
        echo "Показываю строку:"
        grep -n "const topStudentsData" src/pages/admin/Activity.tsx
        echo ""
        echo "❌ ОСТАНОВКА! Сначала нужно удалить MOCK из src/"
        exit 1
    else
        echo "✅ MOCK данные отсутствуют в src/"
    fi
else
    echo "❌ Activity.tsx НЕ НАЙДЕН!"
    exit 1
fi
echo ""

# 4. Проверка старого dist/
echo "4️⃣ Проверка старого dist/:"
if [ -d "dist" ]; then
    echo "dist/ существует, показываю дату создания:"
    stat -c "Создан: %y" dist/ 2>/dev/null || stat -f "Создан: %Sm" dist/
    echo "Размер: $(du -sh dist/ | cut -f1)"
else
    echo "dist/ не существует (будет создан)"
fi
echo ""

# 5. УДАЛЕНИЕ СТАРОГО dist/ и кеша
echo "5️⃣ Удаление старых файлов..."
rm -rf dist/
rm -rf .vite/
echo "✅ dist/ и .vite/ удалены"
echo ""

# 6. Проверка .env
echo "6️⃣ Проверка .env файла:"
if [ -f ".env" ]; then
    echo "✅ .env существует"
    echo "Содержимое:"
    cat .env | sed 's/PUBLISHABLE_KEY=.*/PUBLISHABLE_KEY=[HIDDEN]/'
else
    echo "⚠️  .env НЕ НАЙДЕН! Создаю..."
    cat > .env <<'EOF'
VITE_SUPABASE_URL=https://capdjvokjdivxjfdddmx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcGRqdm9ramRpdnhqZmRkZG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjc5MDUsImV4cCI6MjA3Nzc0MzkwNX0.bsikIoF86BjthWauzbLXq3SZbNQFodppZ2TC64NniJs
VITE_SITE_URL=https://integratoronai.kz
EOF
    echo "✅ .env создан"
fi
echo ""

# 7. Сборка проекта
echo "7️⃣ Запуск сборки проекта..."
echo "Это займёт 30-60 секунд..."
echo ""

npm run build

# 8. Проверка что сборка успешна
echo ""
echo "8️⃣ Проверка результата сборки:"
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo "✅ Сборка УСПЕШНА!"
    echo ""
    echo "Новый dist/:"
    echo "Размер: $(du -sh dist/ | cut -f1)"
    echo "Дата: $(stat -c %y dist/index.html 2>/dev/null || stat -f %Sm dist/index.html)"
    echo ""
    echo "JavaScript файлы:"
    ls -lht dist/assets/*.js 2>/dev/null | head -3
else
    echo "❌ ОШИБКА: dist/ НЕ СОЗДАН!"
    echo "Проверь ошибки выше!"
    exit 1
fi
echo ""

# 9. Права на файлы
echo "9️⃣ Выставление прав на файлы..."
chown -R www-data:www-data dist/
chmod -R 755 dist/
echo "✅ Права выставлены (www-data:www-data)"
echo ""

# 10. Очистка кеша Nginx
echo "🔟 Очистка кеша Nginx..."
rm -rf /var/cache/nginx/* 2>/dev/null || true
echo "✅ Кеш очищен"
echo ""

# 11. Перезапуск Nginx
echo "1️⃣1️⃣ Перезапуск Nginx..."
systemctl restart nginx

if systemctl is-active nginx > /dev/null; then
    echo "✅ Nginx перезапущен успешно"
else
    echo "❌ Nginx НЕ запустился!"
    echo "Проверяю конфиг:"
    nginx -t
    exit 1
fi
echo ""

# 12. Финальные проверки
echo "======================================"
echo "✅ ФИНАЛЬНАЯ ПРОВЕРКА"
echo "======================================"
echo ""

# HTTP localhost
echo "HTTP localhost/:"
HTTP_ROOT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
echo "Код: $HTTP_ROOT"
[ "$HTTP_ROOT" = "200" ] && echo "✅ OK" || echo "❌ FAIL"
echo ""

# HTTP localhost/admin/activity
echo "HTTP localhost/admin/activity:"
HTTP_ACTIVITY=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin/activity)
echo "Код: $HTTP_ACTIVITY"
[ "$HTTP_ACTIVITY" = "200" ] && echo "✅ OK" || echo "❌ FAIL"
echo ""

# HTTPS production
echo "HTTPS integratoronai.kz/:"
HTTPS_ROOT=$(curl -s -o /dev/null -w "%{http_code}" https://integratoronai.kz/)
echo "Код: $HTTPS_ROOT"
[ "$HTTPS_ROOT" = "200" ] && echo "✅ OK" || echo "❌ FAIL"
echo ""

# HTTPS /admin/activity
echo "HTTPS integratoronai.kz/admin/activity:"
HTTPS_ACTIVITY=$(curl -s -o /dev/null -w "%{http_code}" https://integratoronai.kz/admin/activity)
echo "Код: $HTTPS_ACTIVITY"
[ "$HTTPS_ACTIVITY" = "200" ] && echo "✅ OK" || echo "❌ FAIL"
echo ""

# Итоговая оценка
TOTAL_CHECKS=4
SUCCESS_CHECKS=0

[ "$HTTP_ROOT" = "200" ] && SUCCESS_CHECKS=$((SUCCESS_CHECKS + 1))
[ "$HTTP_ACTIVITY" = "200" ] && SUCCESS_CHECKS=$((SUCCESS_CHECKS + 1))
[ "$HTTPS_ROOT" = "200" ] && SUCCESS_CHECKS=$((SUCCESS_CHECKS + 1))
[ "$HTTPS_ACTIVITY" = "200" ] && SUCCESS_CHECKS=$((SUCCESS_CHECKS + 1))

echo "======================================"
if [ $SUCCESS_CHECKS -eq $TOTAL_CHECKS ]; then
    echo "🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! ($SUCCESS_CHECKS/$TOTAL_CHECKS)"
    echo ""
    echo "Сайт работает:"
    echo "→ https://integratoronai.kz/"
    echo "→ https://integratoronai.kz/admin/activity"
    echo ""
    echo "✅ ПРОБЛЕМА РЕШЕНА!"
else
    echo "⚠️  НЕКОТОРЫЕ ПРОВЕРКИ НЕ ПРОШЛИ ($SUCCESS_CHECKS/$TOTAL_CHECKS)"
    echo ""
    echo "Проверь логи Nginx:"
    echo "tail -20 /var/log/nginx/error.log"
fi
echo "======================================"



