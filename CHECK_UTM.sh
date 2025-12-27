#!/bin/bash
# 🚀 БЫСТРАЯ ПРОВЕРКА UTM-ТРЕКИНГА (30 секунд)

echo "🕵️‍♂️ ПРОВЕРКА UTM-ТРЕКИНГА"
echo "════════════════════════════════════════════"
echo ""

# ШАГ 1: Запуск live теста
echo "📡 ШАГ 1: Запуск API теста..."
echo ""
node scripts/test-live-utm.cjs

echo ""
echo "════════════════════════════════════════════"
echo "📋 СЛЕДУЮЩИЕ ШАГИ:"
echo ""
echo "1. ✅ Если тест прошел → проверь в AmoCRM:"
echo "   https://onaiagencykz.amocrm.ru"
echo "   Найди сделку: \"Тест Брат (Автотест)\""
echo ""
echo "2. ❌ Если тест провалился → читай вывод выше"
echo "   и проверь раздел TROUBLESHOOTING"
echo ""
echo "3. 📖 Подробная инструкция:"
echo "   MANUAL_TEST_INSTRUCTIONS.md (русский)"
echo "   UTM_TRACKING_VERIFICATION_GUIDE.md (english)"
echo ""
echo "════════════════════════════════════════════"
