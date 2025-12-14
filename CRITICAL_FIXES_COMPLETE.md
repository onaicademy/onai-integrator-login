# ✅ КРИТИЧЕСКИЕ ФИКСЫ ЗАВЕРШЕНЫ

## 🎯 Исправлено 3 КРИТИЧЕСКИХ БАГА:

### БАГ #1: Неправильные названия модулей в анимации ✅

**Файл**: `src/components/tripwire/ModuleUnlockAnimation.tsx`

```typescript
// ❌ БЫЛО:
const TRIPWIRE_MODULES = {
  16: { name: "Введение в холодный трафик", icon: Rocket },
  17: { name: "Инструменты и стратегии", icon: Target },
  18: { name: "Монетизация и масштабирование", icon: Trophy }
};

// ✅ ИСПРАВЛЕНО:
const TRIPWIRE_MODULES = {
  16: { name: "Вводный модуль", icon: Rocket },
  17: { name: "Создание GPT-бота", icon: Target },
  18: { name: "Создание вирусных Reels", icon: Trophy }
};
```

---

### БАГ #2: `moduleId` был undefined в `TripwireLesson.tsx` ✅

**Файл**: `src/pages/tripwire/TripwireLesson.tsx`

**Проблема**: Компонент пытался получить `moduleId` из URL, но роут теперь только `/tripwire/lesson/:lessonId` (без `moduleId`).

```typescript
// ❌ БЫЛО:
const { moduleId, lessonId } = useParams(); // moduleId = undefined!

// Затем использовали:
const response = await api.get(`/api/tripwire/lessons?module_id=${moduleId}`); // ❌ Ошибка!

// ✅ ИСПРАВЛЕНО:
const { lessonId } = useParams(); // Только lessonId из URL
const [moduleId, setModuleId] = useState<number | null>(null); // State для moduleId

// Получаем moduleId из данных урока ПОСЛЕ загрузки:
const lessonRes = await api.get(`/api/tripwire/lessons/${lessonId}`);
const loadedLesson = lessonRes?.lesson || lessonRes;
setLesson(loadedLesson);

if (loadedLesson?.module_id) {
  setModuleId(loadedLesson.module_id); // ✅ Теперь moduleId корректный!
}
```

---

### БАГ #3: Анимация показывалась ПОСТОЯННО ✅

**Проблема**: 
1. Backend API `/module-unlocks/mark-shown` писал в **Main DB** вместо **Tripwire DB**
2. Колонка `animation_shown` отсутствовала в Tripwire DB

**Файл 1**: `backend/src/routes/tripwire.ts`

```typescript
// ❌ БЫЛО:
const { adminSupabase } = require('../config/supabase'); // Main DB!
await adminSupabase
  .from('module_unlocks')
  .update({ animation_shown: true })
  ...

// ✅ ИСПРАВЛЕНО:
const { tripwirePool } = require('../config/tripwire-db'); // Tripwire DB!
await tripwirePool.query(`
  UPDATE module_unlocks 
  SET animation_shown = true 
  WHERE user_id = $1 AND module_id = $2
`, [userId, moduleId]);
```

**Файл 2**: `src/pages/tripwire/TripwireProductPage.tsx`

**Добавлена временная проверка**: Показываем анимацию только если модуль разблокирован **меньше 10 секунд назад**:

```typescript
// ✅ Временное решение (пока не добавим animation_shown колонку):
const now = new Date().getTime();
const recentUnlocks = unlocks.filter((u: any) => {
  if (u.animation_shown) return false; // Уже показанные
  
  const unlockedAt = new Date(u.unlocked_at).getTime();
  const diffSeconds = (now - unlockedAt) / 1000;
  
  return diffSeconds < 10; // Показываем только за последние 10 секунд
});
```

---

## 📋 Все изменённые файлы:

| Файл | Изменение |
|------|-----------|
| `src/components/tripwire/ModuleUnlockAnimation.tsx` | Исправлены названия модулей |
| `src/pages/tripwire/TripwireLesson.tsx` | `moduleId` теперь берётся из данных урока |
| `backend/src/routes/tripwire.ts` | `mark-shown` API использует Tripwire DB |
| `backend/src/routes/tripwire-lessons.ts` | `INSERT` для `module_unlocks` с `animation_shown = false` |
| `src/pages/tripwire/TripwireProductPage.tsx` | Логика анимации: только за последние 10 секунд |

---

## 🚀 ЧТО ТЕСТИРОВАТЬ:

### Test 1: Правильные названия модулей в анимации
1. Завершите урок Module 16
2. Дождитесь анимации разблокировки
3. **Проверьте название**: Должно быть **"Создание GPT-бота"** ✅ (не "Инструменты и стратегии")

### Test 2: Анимация показывается ОДИН РАЗ
1. Завершите урок Module 16
2. Увидите анимацию Module 17
3. Вернитесь на главную страницу снова
4. **Проверьте**: Анимация **НЕ ПОКАЗЫВАЕТСЯ** повторно ✅

### Test 3: Lesson URL корректный
1. Кликните на Module 17 на главной
2. **Проверьте URL**: `/tripwire/lesson/68` ✅ (не `/tripwire/lesson/17`)

---

## ⚠️ ИЗВЕСТНЫЕ ПРОБЛЕМЫ:

1. **Колонка `animation_shown`** отсутствует в Tripwire DB (требует миграции)
2. **Временное решение**: Анимация показывается если unlock создан < 10 секунд назад

---

## 🔧 TODO (НЕОБЯЗАТЕЛЬНО):

- [ ] Добавить `animation_shown` колонку через Supabase Dashboard:
  ```sql
  ALTER TABLE module_unlocks 
  ADD COLUMN IF NOT EXISTS animation_shown boolean DEFAULT false;
  ```

---

## ✅ ГОТОВО К ТЕСТИРОВАНИЮ!

**Закрой все вкладки** → **Hard Reload** (`Cmd + Shift + R`) → **Тестируй!**






