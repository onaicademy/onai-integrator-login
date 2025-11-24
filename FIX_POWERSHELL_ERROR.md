# 🚨 FIX: PowerShell Terminal Error

## Проблема
```
The terminal process "C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe" 
failed to launch (exit code: 1)
```

## Причины:
1. Политика выполнения скриптов заблокирована
2. Конфликт с другими процессами PowerShell
3. Проблемы с правами доступа

---

## ✅ РЕШЕНИЕ #1: Изменить политику выполнения

### Шаг 1: Открой PowerShell как Администратор
1. Нажми `Win + X`
2. Выбери "Windows PowerShell (Администратор)" или "Terminal (Admin)"

### Шаг 2: Выполни команду:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Шаг 3: Подтверди изменения
Нажми `Y` (Yes) и Enter

### Шаг 4: Перезапусти VS Code / Cursor

---

## ✅ РЕШЕНИЕ #2: Использовать CMD вместо PowerShell

### В Cursor/VS Code:
1. Нажми `Ctrl + Shift + P`
2. Найди: `Terminal: Select Default Profile`
3. Выбери: `Command Prompt` (cmd.exe)

### Или измени настройки:
1. Открой Settings (Ctrl + ,)
2. Найди: `terminal.integrated.defaultProfile.windows`
3. Поставь: `"cmd"`

---

## ✅ РЕШЕНИЕ #3: Очистить конфликтующие процессы

### В PowerShell (если открывается):
```powershell
# Останови все фоновые процессы node
taskkill /F /IM node.exe

# Перезапусти терминал
```

---

## ✅ РЕШЕНИЕ #4: Переустановить PowerShell Core

### Если ничего не помогло:
1. Скачай PowerShell 7: https://github.com/PowerShell/PowerShell/releases
2. Установи
3. В Cursor настрой на новый PowerShell:
   - Settings → Terminal → Default Profile → PowerShell 7

---

## 🎯 БЫСТРОЕ РЕШЕНИЕ ДЛЯ ТЕБЯ:

### Вариант A: Используй CMD (проще всего)
1. В Cursor нажми `Ctrl + Shift + P`
2. Найди `Terminal: Select Default Profile`
3. Выбери `Command Prompt`
4. Создай новый терминал (Ctrl + Shift + `)

### Вариант B: Исправь PowerShell
1. Открой PowerShell как Admin
2. Выполни: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Перезапусти Cursor

---

## 🧪 Проверка:

После исправления попробуй:
```bash
# В новом терминале:
cd backend
npm run dev
```

И в другом терминале:
```bash
npm run dev
```

---

## 📝 Если ошибка повторяется:

Отправь мне вывод команды:
```powershell
Get-ExecutionPolicy -List
```

И я помогу дальше!

