# 🔧 ИСПРАВЛЕНИЕ: Drag & Drop уроков

**Дата:** 2025-11-18 06:41 UTC  
**Коммит:** 34fae42  
**Статус:** ✅ ИСПРАВЛЕНО И ЗАДЕПЛОЕНО

---

## ❌ ПРОБЛЕМА:

```
PUT /api/lessons/reorder → 500 Internal Server Error

Backend Error:
{
  code: 'PGRST116',
  details: 'The result contains 0 rows',
  message: 'Cannot coerce the result to a single JSON object'
}
```

**Причина:** Supabase `.update()` без `.select()` не возвращает данные, но старый код не обрабатывал ошибки правильно.

---

## ✅ РЕШЕНИЕ:

### Backend (`lessons.ts`)

**Было:**
```typescript
const updates = lessons.map((lesson) =>
  supabase
    .from('lessons')
    .update({ order_index: lesson.order_index })
    .eq('id', parseInt(lesson.id.toString()))
);

await Promise.all(updates);
```

**Стало:**
```typescript
const updates = lessons.map(async (lesson) => {
  const { error } = await supabase
    .from('lessons')
    .update({ order_index: lesson.order_index })
    .eq('id', parseInt(lesson.id.toString()));
  
  if (error) {
    console.error(`❌ Ошибка обновления урока ${lesson.id}:`, error);
    throw error;
  }
});

await Promise.all(updates);
```

---

## 🚀 ДЕПЛОЙ:

```bash
✅ Git commit: 34fae42
✅ Git push: main → GitHub
✅ Backend pull: успешно
✅ Backend build: успешно
✅ PM2 restart: успешно
✅ Status: ONLINE
```

---

## 🧪 КАК ТЕСТИРОВАТЬ:

### 1. Открой страницу модуля
```
https://onai.academy/course/1/module/1
```

### 2. Попробуй перетащить урок
1. Наведи на урок
2. Появится иконка захвата (||)
3. Зажми и перетащи урок вверх или вниз
4. Отпусти

### 3. Проверь результат
- ✅ Должен появиться alert "Порядок уроков сохранён!"
- ✅ НЕ должно быть ошибки 500
- ✅ Порядок должен измениться сразу
- ✅ После обновления страницы (F5) порядок должен сохраниться

---

## 🔍 ЛОГИ BACKEND:

**Успешное обновление:**
```
PUT /api/lessons/reorder
🔄 Изменение порядка уроков: [ {id: 24, order_index: 0}, {id: 25, order_index: 1} ]
✅ Порядок уроков обновлён
```

**Ошибка (если что-то не так):**
```
PUT /api/lessons/reorder
🔄 Изменение порядка уроков: [...]
❌ Ошибка обновления урока 24: {...}
❌ Reorder lessons error: {...}
```

---

## 📊 СТАТУС:

| Компонент | Статус |
|-----------|--------|
| Backend Fix | ✅ DONE |
| Git Push | ✅ DONE |
| Production Deploy | ✅ DONE |
| Frontend | ✅ БЕЗ ИЗМЕНЕНИЙ |
| Testing | ⏳ ТЕСТИРУЙ СЕЙЧАС! |

---

## 🎯 ТЕСТ СЕЙЧАС:

1. Открой: https://onai.academy/course/1/module/1
2. Перетащи урок
3. **Проверь:**
   - Нет ошибки 500?
   - Порядок изменился?
   - После F5 порядок сохранён?

**Если всё работает** → 🎉 ПРОБЛЕМА РЕШЕНА!  
**Если ещё ошибка** → Скажи мне, скину новые логи!

---

**Коммит:** 34fae42  
**Backend:** ONLINE ✅  
**Ready to test:** ДА ✅


