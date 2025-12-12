# 🔧 REFACTORING PLAN - tripwire-lessons.ts

## 📊 Current State

**Файл:** `backend/src/routes/tripwire-lessons.ts`  
**Размер:** 853 строки  
**Проблема:** Нарушение Single Responsibility Principle

## 🎯 Цель рефакторинга

Разбить монолитный роут на логические модули по доменам.

## 📋 Предлагаемая структура

```
backend/src/routes/tripwire/
├── lessons.ts          (CRUD для уроков)
├── videos.ts           (GET видео)
├── materials.ts        (✅ УЖЕ СУЩЕСТВУЕТ!)
├── progress.ts         (прогресс, completion)
├── achievements.ts     (геймификация, unlock)
└── admin.ts            (✅ УЖЕ СУЩЕСТВУЕТ!)
```

## 📝 Детальный план

### Phase 1: Preparation (1 день)
- [x] ✅ Создан `config/tripwire-mappings.ts` для хардкод значений
- [ ] Создать `controllers/tripwire/` для business logic
- [ ] Написать unit тесты для критичной логики (completion, achievements)

### Phase 2: Extract Lessons CRUD (2 дня)
Вынести из `tripwire-lessons.ts` в новый `tripwire/lessons.ts`:
- `GET /lessons` (строка 16)
- `GET /lessons/:id` (строка 44)
- `POST /lessons` (строка 655)
- `PUT /lessons/:id` (строка 705)

### Phase 3: Extract Videos (1 день)
Вынести в `tripwire/videos.ts`:
- `GET /videos/:lessonId` (строка 68)

### Phase 4: Extract Progress & Completion (3 дня)
Вынести в `tripwire/progress.ts`:
- `GET /progress/:lessonId` (строка 131)
- `POST /progress` (строка 421)
- `POST /complete` (строка 163) - **КРИТИЧНАЯ ЛОГИКА!**
- `GET /module-progress/:moduleId` (строка 457)

**⚠️ Внимание:** `/complete` endpoint содержит:
- ACID транзакции
- AmoCRM интеграцию
- Module unlock logic
- Achievement creation
Нужно тщательно протестировать!

### Phase 5: Extract Achievements (2 дня)
Вынести в `tripwire/achievements.ts`:
- `POST /unlock-achievement` (строка 510)

### Phase 6: Cleanup Materials (1 день)
В `tripwire-lessons.ts` остались старые material endpoints:
- `POST /materials/upload` (строка 752) - **УДАЛИТЬ** (уже есть в tripwire/materials.ts)
- `DELETE /materials/:id` (строка 818) - **УДАЛИТЬ**

### Phase 7: Update Server.ts (1 час)
Обновить импорты в `server.ts`:
```typescript
// Было:
app.use('/api/tripwire', tripwireLessonsRouter);

// Станет:
app.use('/api/tripwire/lessons', tripwireLessonsRouter);
app.use('/api/tripwire/videos', tripwireVideosRouter);
app.use('/api/tripwire/progress', tripwireProgressRouter);
app.use('/api/tripwire/achievements', tripwireAchievementsRouter);
```

## ⚠️ Риски

1. **Breaking changes** - изменятся URL'ы endpoints
   - **Решение:** Оставить старые routes как deprecated с редиректом
   
2. **Регрессия в логике completion**
   - **Решение:** Добавить integration тесты перед рефакторингом

3. **AmoCRM интеграция может сломаться**
   - **Решение:** Сначала покрыть тестами

## 📅 Timeline

**Общее время:** ~2 недели (при 4 часах/день)

**Приоритет:** 🟡 Medium (не критично, но улучшит maintainability)

## ✅ Критерии успеха

- [ ] Каждый файл < 300 строк
- [ ] Endpoints сгруппированы по доменам
- [ ] Integration тесты проходят
- [ ] Zero breaking changes для frontend
- [ ] Documentation обновлена

## 🚀 Alternative: Keep As Is

**Если рефакторинг не критичен:**
- Текущая структура работает стабильно
- Можно отложить до появления новых фич
- Фокус на новом функционале вместо рефакторинга

**Рекомендация:** Оставить как техдолг, сфокусироваться на новых фичах.
