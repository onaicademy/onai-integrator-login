#!/bin/bash

echo "🔍 Проверка текущих переменных в .env..."
echo ""

if grep -q "LANDING_SUPABASE_URL" .env; then
  echo "✅ LANDING_SUPABASE_URL уже существует в .env"
else
  echo "❌ LANDING_SUPABASE_URL НЕ НАЙДЕН - добавляю..."
  echo "" >> .env
  echo "# ============================================" >> .env
  echo "# LANDING PAGE DATABASE (New Supabase Project)" >> .env
  echo "# ============================================" >> .env
  echo "LANDING_SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co" >> .env
  echo "LANDING_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1MzIyMSwiZXhwIjoyMDgwNDI5MjIxfQ.eP7ake2RkWqCaLTKv0jI3vWMkBjDySKsAdToKIgb7fA" >> .env
  echo "" >> .env
  echo "✅ Переменные добавлены!"
fi

if grep -q "AMOCRM_DOMAIN" .env; then
  echo "✅ AMOCRM_DOMAIN уже существует в .env"
else
  echo "❌ AMOCRM не настроен - добавляю..."
  echo "# ============================================" >> .env
  echo "# AMOCRM INTEGRATION" >> .env
  echo "# ============================================" >> .env
  echo "AMOCRM_DOMAIN=onaiagencykz.amocrm.ru" >> .env
  echo "AMOCRM_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjFjMDQ0M2VlMDg3ZGNmN2JlODk2ZTRhNDg1MTk1YjkwODdiZTJkZDlkMmY3ODE0Y2JlMzA4NDMzYWFmN2JiNGQ1OWMwNTg1ZTZlNGNhZGI0In0.eyJhdWQiOiIyOTQ0YWQ2Ni0zNmY2LTQ4MzMtOWJkYy05NDZlOGZlNWVmODciLCJqdGkiOiIxYzA0NDNlZTA4N2RjZjdiZTg5NmU0YTQ4NTE5NWI5MDg3YmUyZGQ5ZDJmNzgxNGNiZTMwODQzM2FhZjdiYjRkNTljMDU4NWU2ZTRjYWRiNCIsImlhdCI6MTc2NTE4NDAxOCwibmJmIjoxNzY1MTg0MDE4LCJleHAiOjE4NTY2NDk2MDAsInN1YiI6IjExMjM5OTA2IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxODM0NTc4LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiNzUxMWRkMGItZTk3Yi00MmExLTkzYzQtNGM2ODMyYmM3NDA0IiwidXNlcl9mbGFncyI6MCwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.ey_ktAElbXEQePgL5_IEKbq7zGbHNs4R1nX114SgQoeQFk_eEx-lDcCpJ2gnluGUGK9xdkN1u5G-8zwcpDGZQLPSBgIJAxkUPcC87ipUj9ESeop6I3hj-irj7dtzNnJaNj4X5-WWARY3ebBnFNJNq40JRV1k03twhTnMSuIf1GRMc9Yo3WZvuX4KYaKHYBJNjg5cN5Kp1Vx2-Hz8uAcNT-n7ewfmJ6yFuJLRE8C-2ww9H1BoXat1VSHB5iTJc4_V0NFx1iufcivqFUSm4MOs_B0Uq6pKLA0Oa7C2jkLdkhZOTMMyCXiitEt2GkvNTPoSJ1PjoY35jlQpV00qh3T5bA" >> .env
  echo "AMOCRM_PIPELINE_ID=10350882" >> .env
  echo "AMOCRM_STATUS_ID=" >> .env
  echo "" >> .env
  echo "✅ AmoCRM переменные добавлены!"
fi

echo ""
echo "🎯 Текущие LANDING переменные:"
grep "LANDING_" .env || echo "❌ Не найдено!"
echo ""
echo "🎯 Текущие AMOCRM переменные:"
grep "AMOCRM_" .env || echo "❌ Не найдено!"
echo ""
echo "✅ Готово! Теперь перезапусти backend: npm run dev"
