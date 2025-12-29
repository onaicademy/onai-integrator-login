#!/bin/bash
# 🎯 КРАТКАЯ ИНСТРУКЦИЯ: Как проверить UTM-трекинг

clear
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🕵️‍♂️  ПЛАН-ПЕРЕХВАТ: Проверка UTM-трекинга"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Брат, доверие — это хорошо, но контроль — лучше."
echo "Робот может написать 'Success' хоть сто раз, но пока ты сам"
echo "не увидишь client_id в браузере и в CRM — считай, что ничего не работает."
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 ВЫБЕРИ ВАРИАНТ ПРОВЕРКИ:"
echo ""
echo "  1. 🚀 БЫСТРО (30 секунд)     → Автоматический тест"
echo "  2. 🔍 ПОДРОБНО (5 минут)     → Ручная проверка в браузере"
echo "  3. ⚡ ТОЛЬКО ЛОГИКА (5 сек)  → Проверка кода без API"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
read -p "Введи номер (1-3): " choice
echo ""

case $choice in
  1)
    echo "🚀 Запускаю автоматический тест..."
    echo ""
    node scripts/test-live-utm.cjs
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "📊 СЛЕДУЮЩИЕ ШАГИ:"
    echo ""
    echo "1. Если тест прошел (✅ All tests PASSED):"
    echo "   → Открой AmoCRM: https://onaiagencykz.amocrm.ru"
    echo "   → Найди сделку: 'Тест Брат (Автотест)'"
    echo "   → Проверь кастомные поля (Client ID, UTM Source, etc.)"
    echo ""
    echo "2. Если тест провалился (❌):"
    echo "   → Читай вывод выше (раздел TROUBLESHOOTING)"
    echo "   → Проверь что backend запущен: cd backend && npm run dev"
    echo ""
    echo "3. Подробная инструкция:"
    echo "   → Русский: ПРОВЕРКА_UTM_ТРЕКИНГА.md"
    echo "   → English: MANUAL_TEST_INSTRUCTIONS.md"
    echo ""
    ;;
  
  2)
    echo "🔍 РУЧНАЯ ПРОВЕРКА В БРАУЗЕРЕ"
    echo ""
    echo "ШАГ 1: Открой инкогнито (Cmd+Shift+N)"
    echo ""
    echo "ШАГ 2: Перейди по тестовой ссылке:"
    echo "https://expresscourse.onai.academy/expresscourse?utm_source=TEST_BRO_CHECK&utm_id=999999&fbclid=TEST_CLICK_ID"
    echo ""
    echo "ШАГ 3: Открой DevTools (F12 или Cmd+Option+I)"
    echo "  → Вкладка Application → Local Storage → https://onai.academy"
    echo "  → Проверь ключи:"
    echo "     ✅ onai_client_id → UUID (например: 550e8400-e29b...)"
    echo "     ✅ utm_params → JSON с UTM-метками"
    echo ""
    echo "ШАГ 4: Проверь Network Request"
    echo "  → Вкладка Network → Фильтр: 'submit'"
    echo "  → Заполни форму и отправь"
    echo "  → Кликни на запрос → Вкладка Payload"
    echo "  → Проверь: utmParams содержит client_id, utm_source, utm_id, fbclid"
    echo ""
    echo "ШАГ 5: Проверь AmoCRM"
    echo "  → Зайди: https://onaiagencykz.amocrm.ru"
    echo "  → Найди сделку: 'Тест Брат'"
    echo "  → Проверь кастомные поля (Client ID, UTM Source, Facebook Ad ID, etc.)"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "📖 ПОЛНАЯ ИНСТРУКЦИЯ:"
    echo "   Русский: MANUAL_TEST_INSTRUCTIONS.md"
    echo "   English: UTM_TRACKING_VERIFICATION_GUIDE.md"
    echo ""
    echo "Открыть инструкцию сейчас? (y/n)"
    read -p "> " open_guide
    if [ "$open_guide" = "y" ]; then
      if command -v open &> /dev/null; then
        open MANUAL_TEST_INSTRUCTIONS.md
      elif command -v xdg-open &> /dev/null; then
        xdg-open MANUAL_TEST_INSTRUCTIONS.md
      else
        echo "Открой файл вручную: MANUAL_TEST_INSTRUCTIONS.md"
      fi
    fi
    ;;
  
  3)
    echo "⚡ Запускаю проверку логики..."
    echo ""
    npm run test:utm
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "📊 РЕЗУЛЬТАТ:"
    echo ""
    echo "Этот тест проверяет только логику (без API):"
    echo "  ✅ Client ID генерируется корректно"
    echo "  ✅ UTM параметры захватываются из URL"
    echo "  ✅ Все данные собираются в правильную структуру"
    echo ""
    echo "Чтобы проверить полную цепочку (API + DB + CRM):"
    echo "  → Запусти: ./CHECK_UTM.sh и выбери вариант 1"
    echo ""
    ;;
  
  *)
    echo "❌ Неверный выбор. Запусти скрипт заново: ./CHECK_UTM.sh"
    exit 1
    ;;
esac

echo "════════════════════════════════════════════════════════════════"
echo "💡 ПОДСКАЗКА:"
echo ""
echo "Если всё работает (все 3 шага показывают данные):"
echo "  → Система готова к деплою ✅"
echo ""
echo "Если что-то не работает:"
echo "  → Сделай скриншот проблемного шага"
echo "  → Читай TROUBLESHOOTING в MANUAL_TEST_INSTRUCTIONS.md"
echo "  → Отправь скриншот разработчику"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
