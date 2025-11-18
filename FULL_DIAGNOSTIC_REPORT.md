# 🔍 ПОЛНАЯ ДИАГНОСТИКА: Логи не показываются на странице Module

**Дата:** 16 ноября 2025  
**Проблема:** Логи вообще не появляются на странице `/course/1/module/2`  
**Статус:** 🔴 Требует проверки

---

## ✅ ЧТО УЖЕ ПРОВЕРЕНО:

### 1. Dialog установлен
```bash
@radix-ui/react-dialog: ^1.1.15 ✅
```

### 2. Логи добавлены в код Module.tsx
```typescript
// Строка 44-47
console.log('🔍 Module.tsx - userRole:', userRole);
console.log('🔍 Module.tsx - isAdmin:', isAdmin);
console.log('🔍 Module.tsx - courseId (id):', id);
console.log('🔍 Module.tsx - moduleId:', moduleId);
```

### 3. Нет ошибок линтера
```
No linter errors found ✅
```

---

## 🚨 ВОЗМОЖНЫЕ ПРИЧИНЫ:

### Причина 1: Страница не загружается вообще
**Признаки:**
- Белый экран
- Нет контента
- Спиннер бесконечно крутится

**Проверка:**
1. Откройте `http://localhost:8080/course/1/module/2`
2. Смотрите загружается ли страница
3. Откройте F12 → Console
4. Есть ли ОШИБКИ (красные строки)?

### Причина 2: useAuth hook падает с ошибкой
**Признак:**
- Ошибка `useAuth must be used within AuthProvider`

**Проверка:**
```javascript
// В консоли браузера:
const authContext = React.useContext(AuthContext);
console.log('Auth:', authContext);
```

### Причина 3: Консоль фильтрует логи
**Проверка:**
1. Откройте F12 → Console
2. Проверьте фильтр (правый верхний угол)
3. Должны быть включены: `Verbose`, `Info`, `Warnings`, `Errors`
4. Не должно быть фильтра по тексту

### Причина 4: JavaScript не выполняется
**Проверка:**
```javascript
// Введите в консоли:
console.log('TEST');
// Должно появиться: TEST
```

### Причина 5: React DevTools блокирует логи
**Проверка:**
- Отключите React DevTools
- Перезагрузите страницу
- Проверьте логи

### Причина 6: Ошибка рендера до логов
**Признак:**
- Компонент падает ДО того как дошёл до console.log

**Проверка:**
1. Откройте F12 → Console
2. Смотрите на ошибки
3. Проверьте есть ли:
   - `Cannot read property ... of undefined`
   - `... is not a function`
   - `React error boundary`

---

## 🔧 БЫСТРЫЕ ИСПРАВЛЕНИЯ:

### Исправление 1: Добавить console.log В НАЧАЛО файла

**Файл:** `src/pages/Module.tsx`

**САМАЯ ПЕРВАЯ СТРОКА в компоненте:**

```typescript
const Module = () => {
  console.log('🚀 MODULE.TSX ЗАГРУЗИЛСЯ!'); // ← ЭТО ПЕРВОЕ
  
  const { id, moduleId } = useParams();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  // ...
```

**Если этот лог НЕ появляется →** компонент вообще не рендерится!

### Исправление 2: Обернуть useAuth в try-catch

```typescript
const Module = () => {
  console.log('🚀 MODULE START');
  
  const { id, moduleId } = useParams();
  const navigate = useNavigate();
  
  let userRole, isAdmin;
  try {
    const auth = useAuth();
    userRole = auth.userRole;
    isAdmin = userRole === 'admin';
    console.log('✅ useAuth работает:', { userRole, isAdmin });
  } catch (error) {
    console.error('❌ useAuth упал:', error);
    userRole = null;
    isAdmin = false;
  }
  
  // ...
```

### Исправление 3: Добавить ErrorBoundary

**Создать файл:** `src/components/ErrorBoundary.tsx`

```typescript
import React from 'react';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    console.error('🚨 ErrorBoundary caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('🚨 Error details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white p-8">
          <h1 className="text-2xl font-bold mb-4">⚠️ Ошибка загрузки страницы</h1>
          <pre className="bg-gray-900 p-4 rounded">
            {JSON.stringify(this.state.error, null, 2)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Обернуть Module в App.tsx:**

```typescript
import ErrorBoundary from '@/components/ErrorBoundary';

// В роутах:
<Route 
  path="/course/:id/module/:moduleId" 
  element={
    <ErrorBoundary>
      <Module />
    </ErrorBoundary>
  } 
/>
```

---

## 📋 ЧЕК-ЛИСТ ДЛЯ ПОЛЬЗОВАТЕЛЯ:

### Шаг 1: Проверьте что Frontend запущен
```bash
# В терминале должно быть:
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:8080/
```

Если НЕТ → перезапустите:
```bash
npm run dev
```

### Шаг 2: Откройте страницу
```
http://localhost:8080/course/1/module/2
```

### Шаг 3: Откройте консоль
- Нажмите `F12`
- Перейдите на вкладку `Console`
- Нажмите `Ctrl+L` чтобы очистить

### Шаг 4: Перезагрузите страницу
- Нажмите `Ctrl+Shift+R` (жесткая перезагрузка без кэша)

### Шаг 5: Смотрите консоль
**Что ДОЛЖНО быть:**
```
🔍 Module.tsx - userRole: admin
🔍 Module.tsx - isAdmin: true
🔍 Module.tsx - courseId (id): 1
🔍 Module.tsx - moduleId: 2
```

**Если ПУСТО:**
1. Проверьте фильтр консоли (должен быть ALL)
2. Проверьте нет ли красных ошибок ВЫШЕ
3. Введите в консоли: `console.log('TEST')` - работает ли консоль?

### Шаг 6: Проверьте Network
- Откройте F12 → Network
- Перезагрузите страницу
- Смотрите:
  - Есть ли запрос к `http://localhost:8080/course/1/module/2`?
  - Какой статус код? (должен быть 200)
  - Есть ли запросы к API `http://localhost:3000/api/lessons?module_id=2`?

---

## 🚨 КРИТИЧНЫЕ ПРОВЕРКИ:

### 1. Backend работает?
```bash
curl http://localhost:3000/api/health
# Должно вернуть: {"status":"ok"}
```

Если НЕТ → запустите Backend:
```bash
cd backend
npm run dev
```

### 2. Frontend работает?
```bash
curl http://localhost:8080
# Должно вернуть HTML
```

Если НЕТ → запустите Frontend:
```bash
npm run dev
```

### 3. useAuth импортирован правильно?

**Файл:** `src/pages/Module.tsx`

**Строка 6:**
```typescript
import { useAuth } from "@/hooks/useAuth";  // ✅ Правильно
```

**НЕ должно быть:**
```typescript
import { useAuth } from "@/contexts/AuthContext";  // ❌ Старый путь
```

### 4. AuthProvider обернул App?

**Файл:** `src/App.tsx`

**Должно быть:**
```typescript
function App() {
  return (
    <AuthProvider>  {/* ← Должно быть! */}
      <Router>
        <Routes>
          <Route path="/course/:id/module/:moduleId" element={<Module />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
```

---

## 💉 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ:

Если НИЧЕГО не помогает, добавьте в **самое начало** `Module.tsx`:

```typescript
const Module = () => {
  // 🚨 ЭКСТРЕННАЯ ДИАГНОСТИКА
  try {
    console.log('='.repeat(50));
    console.log('🚨 MODULE.TSX НАЧАЛ ВЫПОЛНЕНИЕ');
    console.log('Window location:', window.location.href);
    console.log('Document ready:', document.readyState);
    console.log('='.repeat(50));
  } catch (e) {
    alert('КРИТИЧЕСКАЯ ОШИБКА В MODULE.TSX: ' + e);
  }
  
  // Остальной код...
```

Если даже ЭТОТ лог не появляется → проблема в роутинге или App.tsx!

---

## 📞 ЧТО ОТПРАВИТЬ МНЕ:

1. **Скриншот консоли** (F12 → Console) ВЕСЬ экран
2. **Скриншот Network tab** (F12 → Network) после перезагрузки
3. **Вывод команды:**
   ```bash
   npm run dev
   ```
4. **Результат:**
   ```bash
   curl http://localhost:8080
   curl http://localhost:3000/api/health
   ```

---

**Приоритет:** 🔴 КРИТИЧНЫЙ  
**Статус:** Требует немедленной проверки  
**Время:** 5-10 минут на диагностику



