# 🗑️ Отчёт: Кнопки удаления модулей и уроков

**Дата:** 17 ноября 2025  
**Статус:** ✅ Готово к подключению API  
**Приоритет:** 🔴 Высокий

---

## 📋 Что было сделано

### 1. **Добавлены кнопки удаления модулей** ✅
- **Файл:** `src/pages/Course.tsx`
- **Строки:** 202-225 (функция), 579-609 (UI)
- **Дизайн:** Красная кнопка с иконкой корзины, появляется при наведении на модуль
- **Видимость:** Только для администраторов (`isAdmin === true`)

### 2. **Добавлены кнопки удаления уроков** ✅
- **Файл:** `src/pages/Module.tsx`
- **Строки:** 147-169 (функция), 568-598 (UI)
- **Дизайн:** Красная кнопка с иконкой корзины рядом с кнопкой "Начать"/"Повторить"
- **Видимость:** Только для администраторов (`isAdmin === true`)

### 3. **Улучшено логирование** ✅
- Добавлены детальные логи с эмодзи 🔥 для отладки
- Все события кнопок записываются в консоль
- Добавлены подтверждения с названием удаляемого элемента

---

## 🎨 Дизайн кнопок удаления

### Визуальный стиль:
```css
/* Цвет */
bg-red-500/10          - фон (красный, прозрачность 10%)
text-red-400           - текст/иконка
hover:bg-red-500/20    - при наведении фон становится ярче
hover:text-red-300     - при наведении текст светлее

/* Граница */
border border-red-500/30
hover:border-red-500/50

/* Анимация */
transition-all
hover:scale-110        - иконка увеличивается при наведении

/* Модули */
opacity-0              - скрыта по умолчанию
group-hover:opacity-100 - появляется при наведении на модуль
```

### Иконка корзины:
- SVG иконка (lucide-react style)
- Размер: 16×16px (уроки), 18×18px (модули)
- Анимация масштабирования при hover

---

## 📂 Навигация и расположение кнопок

### 1. Кнопка удаления МОДУЛЯ

**URL страницы:** `http://localhost:8080/course/:id`  
**Пример:** `http://localhost:8080/course/1`

**Расположение:**
- На странице курса "Интегратор 2.0"
- Справа вверху на каждой карточке модуля
- Появляется при наведении мыши на модуль

**Файл:** `src/pages/Course.tsx`

**Код функции (строки 202-225):**
```typescript
const handleDeleteModule = async (moduleId: number, moduleTitle: string) => {
  if (!confirm(`❌ Вы уверены, что хотите удалить модуль "${moduleTitle}"?\n\nВсе уроки, видео и материалы будут удалены. Это действие нельзя отменить.`)) {
    return;
  }
  
  try {
    console.log('=======================================');
    console.log('🗑️ Удаление модуля:', moduleId);
    console.log('🗑️ Название:', moduleTitle);
    console.log('=======================================');
    
    // TODO: Здесь будет API запрос для удаления модуля
    await api.delete(`/api/modules/${moduleId}`);
    
    alert(`✅ Модуль "${moduleTitle}" удалён!`);
    
    // Обновить список модулей
    await loadModulesFromAPI();
    
  } catch (error: any) {
    console.error('❌ Ошибка удаления модуля:', error);
    alert(error.response?.data?.error || `❌ Ошибка: ${error?.message || 'Не удалось удалить модуль'}`);
  }
};
```

**Код UI (строки 579-609):**
```tsx
{/* Admin: Delete Button (Overlay) */}
{isAdmin && (
  <Button
    size="sm"
    variant="ghost"
    onClick={(e) => {
      e.stopPropagation();
      handleDeleteModule(module.id, module.title);
    }}
    className="absolute top-4 right-4 z-[102] bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-xl px-3 py-2 transition-all opacity-0 group-hover:opacity-100"
    title="Удалить модуль"
  >
    <svg ...>
      {/* Trash icon */}
    </svg>
  </Button>
)}
```

---

### 2. Кнопка удаления УРОКА

**URL страницы:** `http://localhost:8080/course/:id/module/:moduleId`  
**Пример:** `http://localhost:8080/course/1/module/2`

**Расположение:**
- На странице модуля "Создание GPT-бота и CRM"
- Справа от кнопки "Начать"/"Повторить" на каждом уроке
- Видна всегда (не скрыта)

**Файл:** `src/pages/Module.tsx`

**Код функции (строки 147-169):**
```typescript
const handleDeleteLesson = async (lessonId: number, lessonTitle: string) => {
  if (!confirm(`❌ Вы уверены, что хотите удалить урок "${lessonTitle}"?\n\nВсе видео и материалы будут удалены. Это действие нельзя отменить.`)) {
    return;
  }

  try {
    console.log('=======================================');
    console.log('🗑️ Удаление урока:', lessonId);
    console.log('🗑️ Название:', lessonTitle);
    console.log('=======================================');
    
    // TODO: Здесь будет API запрос для удаления урока
    await api.delete(`/api/lessons/${lessonId}`);
    
    alert(`✅ Урок "${lessonTitle}" удалён!`);
    
    // Обновить список уроков
    await loadLessonsFromAPI();
  } catch (error: any) {
    console.error('❌ Ошибка удаления урока:', error);
    alert(error.response?.data?.error || `❌ Ошибка: ${error?.message || 'Не удалось удалить урок'}`);
  }
};
```

**Код UI (строки 568-598):**
```tsx
{/* Admin: Delete Button */}
{isAdmin && (
  <Button
    size="sm"
    variant="ghost"
    onClick={(e) => {
      e.stopPropagation();
      handleDeleteLesson(lesson.id, lesson.title);
    }}
    className="relative z-[102] bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-xl px-3 py-2 transition-all group"
    title="Удалить урок"
  >
    <svg ...>
      {/* Trash icon */}
    </svg>
  </Button>
)}
```

---

## 🔌 API Endpoints для подключения

### 1. Удаление модуля

**Endpoint:** `DELETE /api/modules/:moduleId`

**Параметры:**
- `moduleId` (number) - ID модуля

**Заголовки:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Успешный ответ (200):**
```json
{
  "success": true,
  "message": "Модуль успешно удалён"
}
```

**Ошибки:**
- `400` - Неверные данные
- `401` - Не авторизован
- `403` - Нет прав (не администратор)
- `404` - Модуль не найден
- `500` - Ошибка сервера

**Примечание:**
- При удалении модуля должны КАСКАДНО удаляться:
  - Все уроки модуля
  - Все видео уроков
  - Все материалы уроков
  - Весь прогресс студентов по модулю

**SQL (для справки):**
```sql
-- Включить каскадное удаление в миграции
ALTER TABLE lessons
ADD CONSTRAINT fk_module
FOREIGN KEY (module_id) REFERENCES modules(id)
ON DELETE CASCADE;
```

---

### 2. Удаление урока

**Endpoint:** `DELETE /api/lessons/:lessonId`

**Параметры:**
- `lessonId` (number) - ID урока

**Заголовки:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Успешный ответ (200):**
```json
{
  "success": true,
  "message": "Урок успешно удалён"
}
```

**Ошибки:**
- `400` - Неверные данные
- `401` - Не авторизован
- `403` - Нет прав (не администратор)
- `404` - Урок не найден
- `500` - Ошибка сервера

**Примечание:**
- При удалении урока должны КАСКАДНО удаляться:
  - Видео урока
  - Все материалы урока
  - Весь прогресс студентов по уроку
  - Аналитика просмотра видео

**SQL (для справки):**
```sql
-- Включить каскадное удаление в миграции
ALTER TABLE videos
ADD CONSTRAINT fk_lesson
FOREIGN KEY (lesson_id) REFERENCES lessons(id)
ON DELETE CASCADE;

ALTER TABLE lesson_materials
ADD CONSTRAINT fk_lesson
FOREIGN KEY (lesson_id) REFERENCES lessons(id)
ON DELETE CASCADE;
```

---

## 🔐 Проверка прав доступа

### Frontend (React)

Кнопки удаления видны ТОЛЬКО если:
```typescript
const { userRole } = useAuth();
const isAdmin = userRole === 'admin';

// В JSX:
{isAdmin && (
  <Button onClick={handleDelete}>Удалить</Button>
)}
```

### Backend (Node.js + Express)

**Middleware для проверки администратора:**
```javascript
// middleware/adminGuard.js
export const adminGuard = async (req, res, next) => {
  try {
    const user = req.user; // Из JWT токена
    
    if (!user) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора.' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Ошибка проверки прав' });
  }
};
```

**Применение в роутах:**
```javascript
// routes/modules.js
import { adminGuard } from '../middleware/adminGuard.js';

router.delete('/api/modules/:moduleId', adminGuard, async (req, res) => {
  const { moduleId } = req.params;
  
  try {
    // Удалить модуль
    await db.query('DELETE FROM modules WHERE id = $1', [moduleId]);
    
    res.json({ success: true, message: 'Модуль удалён' });
  } catch (error) {
    console.error('Ошибка удаления модуля:', error);
    res.status(500).json({ error: 'Не удалось удалить модуль' });
  }
});

router.delete('/api/lessons/:lessonId', adminGuard, async (req, res) => {
  const { lessonId } = req.params;
  
  try {
    // Удалить урок
    await db.query('DELETE FROM lessons WHERE id = $1', [lessonId]);
    
    res.json({ success: true, message: 'Урок удалён' });
  } catch (error) {
    console.error('Ошибка удаления урока:', error);
    res.status(500).json({ error: 'Не удалось удалить урок' });
  }
});
```

---

## 🧪 Тестирование

### Чек-лист для проверки:

#### Удаление модуля:
- [ ] Кнопка появляется только для администратора
- [ ] Кнопка появляется при наведении на модуль
- [ ] При клике появляется confirm с названием модуля
- [ ] При подтверждении отправляется DELETE запрос
- [ ] После удаления список модулей обновляется
- [ ] При ошибке показывается alert с текстом ошибки
- [ ] В консоли есть логи с эмодзи 🗑️

#### Удаление урока:
- [ ] Кнопка появляется только для администратора
- [ ] Кнопка видна рядом с "Начать"/"Повторить"
- [ ] При клике появляется confirm с названием урока
- [ ] При подтверждении отправляется DELETE запрос
- [ ] После удаления список уроков обновляется
- [ ] При ошибке показывается alert с текстом ошибки
- [ ] В консоли есть логи с эмодзи 🗑️

#### Безопасность:
- [ ] Кнопки НЕ видны для обычных пользователей
- [ ] Backend проверяет роль пользователя
- [ ] Невозможно удалить через API без прав администратора

---

## 📊 Логи для отладки

### При клике на "Удалить модуль":
```
=======================================
🗑️ Удаление модуля: 2
🗑️ Название: Создание GPT-бота и CRM
=======================================
```

### При клике на "Удалить урок":
```
=======================================
🗑️ Удаление урока: 3
🗑️ Название: Подключение Telegram-бота
=======================================
```

### При успешном удалении:
```
✅ Модуль "Создание GPT-бота и CRM" удалён!
```

### При ошибке:
```
❌ Ошибка удаления модуля: Error: ...
```

---

## 🚀 Следующие шаги для подключения

### Backend (Node.js + Express):

1. **Создать роуты:**
   ```bash
   # routes/modules.js
   DELETE /api/modules/:moduleId

   # routes/lessons.js
   DELETE /api/lessons/:lessonId
   ```

2. **Добавить middleware `adminGuard`:**
   ```javascript
   router.delete('/api/modules/:moduleId', adminGuard, deleteModule);
   router.delete('/api/lessons/:lessonId', adminGuard, deleteLesson);
   ```

3. **Реализовать каскадное удаление:**
   ```sql
   -- При удалении модуля удалить все связанные уроки
   DELETE FROM modules WHERE id = $1 CASCADE;
   
   -- При удалении урока удалить все связанные видео и материалы
   DELETE FROM lessons WHERE id = $1 CASCADE;
   ```

4. **Добавить логирование:**
   ```javascript
   console.log('Admin', user.email, 'deleted module', moduleId);
   ```

5. **Тестирование:**
   ```bash
   # Установить Postman или использовать curl
   curl -X DELETE http://localhost:3000/api/modules/2 \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### База данных (Supabase):

1. **Обновить миграции для каскадного удаления:**
   ```sql
   -- supabase/migrations/YYYYMMDD_add_cascade_delete.sql
   
   ALTER TABLE lessons
   DROP CONSTRAINT IF EXISTS fk_module,
   ADD CONSTRAINT fk_module
   FOREIGN KEY (module_id) REFERENCES modules(id)
   ON DELETE CASCADE;

   ALTER TABLE videos
   DROP CONSTRAINT IF EXISTS fk_lesson,
   ADD CONSTRAINT fk_lesson
   FOREIGN KEY (lesson_id) REFERENCES lessons(id)
   ON DELETE CASCADE;

   ALTER TABLE lesson_materials
   DROP CONSTRAINT IF EXISTS fk_lesson_materials,
   ADD CONSTRAINT fk_lesson_materials
   FOREIGN KEY (lesson_id) REFERENCES lessons(id)
   ON DELETE CASCADE;

   ALTER TABLE student_progress
   DROP CONSTRAINT IF EXISTS fk_progress_lesson,
   ADD CONSTRAINT fk_progress_lesson
   FOREIGN KEY (lesson_id) REFERENCES lessons(id)
   ON DELETE CASCADE;

   ALTER TABLE video_analytics
   DROP CONSTRAINT IF EXISTS fk_analytics_lesson,
   ADD CONSTRAINT fk_analytics_lesson
   FOREIGN KEY (lesson_id) REFERENCES lessons(id)
   ON DELETE CASCADE;
   ```

2. **Применить миграции:**
   ```bash
   supabase db push
   ```

3. **Обновить RLS политики:**
   ```sql
   -- Разрешить администраторам удалять модули
   CREATE POLICY "Admin can delete modules"
   ON modules FOR DELETE
   USING (auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin');

   -- Разрешить администраторам удалять уроки
   CREATE POLICY "Admin can delete lessons"
   ON lessons FOR DELETE
   USING (auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin');
   ```

---

## 📝 Краткая сводка для технического специалиста

### Что нужно подключить:

**1. API Endpoint:** `DELETE /api/modules/:moduleId`  
   - **Файл Frontend:** `src/pages/Course.tsx` (строка 214)
   - **Функция:** `handleDeleteModule`
   - **Проверка прав:** Администратор

**2. API Endpoint:** `DELETE /api/lessons/:lessonId`  
   - **Файл Frontend:** `src/pages/Module.tsx` (строка 159)
   - **Функция:** `handleDeleteLesson`
   - **Проверка прав:** Администратор

### Важно:
- ✅ UI кнопки уже готовы и работают
- ✅ Логирование добавлено
- ✅ Подтверждения (confirm) добавлены
- ⏳ Нужно создать API endpoints в бэкенде
- ⏳ Нужно настроить каскадное удаление в БД
- ⏳ Нужно добавить проверку прав администратора

### Логи для проверки:
```
🗑️ Удаление модуля: <ID>
🗑️ Название: <Название>
```

---

**Статус:** ✅ Frontend готов, Backend требуется  
**Приоритет:** 🔴 Высокий  
**Ответственный:** Backend разработчик

