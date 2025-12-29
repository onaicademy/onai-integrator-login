#!/bin/bash
set -e
echo "🚀 ДЕПЛОЙ BACKEND FIX"
git push origin main 2>/dev/null || echo "✅ Already pushed"
ssh root@164.90.164.107 << 'ENDSSH'
cd /root/onai-integrator-login
git fetch origin && git reset --hard origin/main
cd backend && npm install
pm2 restart backend
pm2 logs backend --lines 20 --nostream
ENDSSH
echo "✅ ГОТОВО! Проверь: https://expresscourse.onai.academy/admin/students"
