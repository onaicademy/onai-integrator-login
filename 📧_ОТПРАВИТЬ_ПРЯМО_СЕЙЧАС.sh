#!/bin/bash

# 📧 ОТПРАВКА EMAIL ЧЕРЕЗ RESEND API
# Самый простой способ - один curl запрос

echo "═══════════════════════════════════════════════════════════════"
echo "📧 ОТПРАВКА EMAIL ВСЕМ СТУДЕНТАМ ЧЕРЕЗ RESEND"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ⚠️ ПОЛУЧИ ТОКЕН АДМИНА:
# 1. Открой https://onai.academy/integrator/admin
# 2. F12 → Application → Local Storage → tripwire_supabase_token
# 3. Скопируй значение токена
# 4. Вставь ниже вместо "ВСТАВЬ_СЮДА_ТОКЕН"

ADMIN_TOKEN="ВСТАВЬ_СЮДА_ТОКЕН"

if [ "$ADMIN_TOKEN" = "ВСТАВЬ_СЮДА_ТОКЕН" ]; then
  echo "❌ ОШИБКА: Токен не указан!"
  echo ""
  echo "📝 КАК ПОЛУЧИТЬ ТОКЕН:"
  echo "1. Открой https://onai.academy/integrator/admin (залогинься)"
  echo "2. Нажми F12 (DevTools)"
  echo "3. Application → Local Storage → tripwire_supabase_token"
  echo "4. Скопируй значение (начинается с eyJ...)"
  echo "5. Вставь в этот скрипт на строке 15"
  echo "6. Запусти снова: ./📧_ОТПРАВИТЬ_ПРЯМО_СЕЙЧАС.sh"
  echo ""
  exit 1
fi

echo "🔑 Токен админа: ${ADMIN_TOKEN:0:20}..."
echo "📨 Тема: ✅ Технические работы завершены"
echo "📤 API: https://api.onai.academy/api/tripwire/admin/mass-broadcast"
echo ""
read -p "▶️  Отправить email ВСЕМ студентам? (y/n): " -n 1 -r
echo ""
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Отменено пользователем"
  exit 0
fi

echo "📧 Отправляю через Resend..."
echo ""

# Текст письма
MESSAGE='Привет!

Хотим сообщить вам важную информацию. 

🔧 Что произошло:
В первые дни запуска платформа испытывала технические сложности из-за большого наплыва учеников. Мы рады такому интересу к курсу!

✅ Что сделано:
Наша команда оперативно устранила все технические проблемы. Сейчас платформа работает стабильно и все функции доступны.

🎓 Что дальше:
Вы можете с комфортом продолжать обучение:
- Смотреть видео-уроки
- Выполнять домашние задания
- Отслеживать свой прогресс

Если у вас возникнут какие-либо вопросы или сложности — пишите в поддержку, мы всегда на связи!

Приятного обучения! 🚀

---
Команда OnAI Academy'

# Отправка через API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://api.onai.academy/api/tripwire/admin/mass-broadcast" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"channel\": \"email\",
    \"subject\": \"✅ Технические работы завершены - Платформа работает стабильно\",
    \"message\": $(echo "$MESSAGE" | jq -Rs .),
    \"testMode\": false
  }")

# Разделяем ответ и код статуса
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo "═══════════════════════════════════════════════════════════════"
echo "📊 РЕЗУЛЬТАТ:"
echo "═══════════════════════════════════════════════════════════════"
echo "HTTP Code: $HTTP_CODE"
echo ""

# Проверяем успех
if [ "$HTTP_CODE" = "200" ]; then
  echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"
  echo ""
  
  # Извлекаем статистику
  SUCCESS=$(echo "$HTTP_BODY" | jq -r '.success // false' 2>/dev/null)
  
  if [ "$SUCCESS" = "true" ]; then
    SENT=$(echo "$HTTP_BODY" | jq -r '.emailsSent // .emailResults.sent // 0' 2>/dev/null)
    TOTAL=$(echo "$HTTP_BODY" | jq -r '.totalRecipients // 0' 2>/dev/null)
    
    echo "✅ УСПЕХ! Email отправлены через Resend!"
    echo ""
    echo "📧 Отправлено: $SENT"
    echo "📧 Всего студентов: $TOTAL"
    echo ""
    echo "🎉 Все студенты получат письмо в течение нескольких минут!"
  else
    echo "❌ API вернул ошибку:"
    echo "$HTTP_BODY" | jq -r '.error // .message // "Unknown error"' 2>/dev/null
  fi
else
  echo "❌ ОШИБКА HTTP $HTTP_CODE"
  echo ""
  echo "Response:"
  echo "$HTTP_BODY"
  echo ""
  
  if [ "$HTTP_CODE" = "401" ]; then
    echo "💡 Причина: Неверный или устаревший токен"
    echo "   Решение: Получи новый токен (см. инструкцию выше)"
  elif [ "$HTTP_CODE" = "403" ]; then
    echo "💡 Причина: Нет прав админа"
    echo "   Решение: Залогинься как админ"
  elif [ "$HTTP_CODE" = "500" ]; then
    echo "💡 Причина: Ошибка сервера"
    echo "   Решение: Проверь логи backend: ssh root@onai.academy 'pm2 logs tripwire-backend'"
  fi
fi

echo "═══════════════════════════════════════════════════════════════"





