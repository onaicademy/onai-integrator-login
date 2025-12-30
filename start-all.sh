#!/bin/bash

echo "🧹 Убиваю все процессы..."
pkill -9 vite
pkill -9 node
pkill -9 tsx  
pkill -9 nodemon

echo "⏳ Ждём 2 секунды..."
sleep 2

echo "✅ Очищаю Vite cache..."
rm -rf node_modules/.vite
rm -rf .vite

echo ""
echo "🚀 Запускаю Frontend на порту 8080..."
nohup npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "⏳ Ждём 5 секунд..."
sleep 5

echo ""
echo "🚀 Запускаю Backend на порту 3000..."
cd backend
nohup npx tsx src/server.ts > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
cd ..

echo ""
echo "⏳ Ждём 10 секунд для запуска..."
sleep 10

echo ""
echo "════════════════════════════════════════════════"
echo "✅ СЕРВЕРЫ ЗАПУЩЕНЫ!"
echo "════════════════════════════════════════════════"
echo ""
echo "📱 Frontend: http://localhost:8080"
echo "🔧 Backend:  http://localhost:3000"
echo ""
echo "🧪 Тестовые страницы:"
echo "   • http://localhost:8080/expresscourse"
echo "   • http://localhost:8080/proftest/muha"
echo "   • http://localhost:8080/proftest/arystan"
echo "   • http://localhost:8080/proftest/kenesary"
echo ""
echo "📝 Логи:"
echo "   • Frontend: tail -f /tmp/frontend.log"
echo "   • Backend:  tail -f /tmp/backend.log"
echo ""
echo "════════════════════════════════════════════════"
echo ""
echo "Backend лог (последние 30 строк):"
tail -30 /tmp/backend.log
echo ""
echo "════════════════════════════════════════════════"
