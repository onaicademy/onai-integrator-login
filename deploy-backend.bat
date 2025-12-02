@echo off
chcp 65001 >nul
echo.
echo 🚀 DEPLOY BACKEND НА DIGITALOCEAN
echo ================================
echo.

ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install --production && npm run build && pm2 restart onai-backend && pm2 logs onai-backend --lines 20"

echo.
echo 🔍 Testing API...
timeout /t 3 /nobreak >nul

curl https://api.onai.academy/api/health

echo.
echo ✅ Deploy completed!
echo.
pause

