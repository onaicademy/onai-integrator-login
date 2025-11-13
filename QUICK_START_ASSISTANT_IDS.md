# ⚡ БЫСТРЫЙ СТАРТ: НАСТРОЙКА ASSISTANT IDs

---

## 🎯 ЧТО НУЖНО СДЕЛАТЬ (5 минут)

### 1️⃣ Откройте файл

```
C:\onai-integrator-login\backend\.env
```

### 2️⃣ Добавьте В КОНЕЦ файла:

```env
# OpenAI Assistants
OPENAI_ASSISTANT_CURATOR_ID=asst_yXgYOFAyVKkuc3XETz2IKxh8
OPENAI_ASSISTANT_MENTOR_ID=asst_ВАШ_ID_НАСТАВНИКА
OPENAI_ASSISTANT_ANALYST_ID=asst_ВАШ_ID_АНАЛИТИКА
```

### 3️⃣ Замените ID наставника и аналитика

Откройте: https://platform.openai.com/assistants  
Скопируйте ID каждого ассистента

### 4️⃣ Сохраните (`Ctrl+S`)

### 5️⃣ Перезапустите Backend

```powershell
# Остановите (Ctrl+C)
# Или:
taskkill /IM node.exe /F

# Запустите:
cd C:\onai-integrator-login\backend
npm run dev
```

**Должно быть**:
```
✅ Assistants config module loaded
🚀 Backend API запущен на http://localhost:3000
```

---

## ✅ ГОТОВО!

Теперь можно тестировать AI-ассистентов.

---

**Полная инструкция**: `ASSISTANT_IDS_SETUP.md`  
**Отчёт о миграции**: `ASSISTANT_IDS_MIGRATION_REPORT.md`

