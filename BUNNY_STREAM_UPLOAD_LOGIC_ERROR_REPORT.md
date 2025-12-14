# 🔥 КРИТИЧЕСКИЙ БАГ: Bunny Stream Upload Logic Broken

**Дата:** 29 ноября 2025  
**Приоритет:** CRITICAL  
**Статус:** Требует немедленного исправления

---

## 📋 SUMMARY

При миграции с Bunny Storage на Bunny Stream была СЛОМАНА логика загрузки видео в админ-панели. Видео начинает загружаться **сразу** при выборе файла, а не при нажатии кнопки "Сохранить изменения". Это приводит к:
- ❌ Потере контроля над процессом загрузки
- ❌ Отсутствию прогресс-бара
- ❌ Преждевременному закрытию диалога
- ❌ Несохранённым изменениям

---

## 🎯 ОЖИДАЕМОЕ ПОВЕДЕНИЕ (КАК БЫЛО РАНЬШЕ)

### Правильный UX Flow:
```
1. Пользователь открывает диалог "Редактировать урок"
2. Переходит на вкладку "Видео"
3. Нажимает "Загрузить видео" → открывается file picker
4. ВЫБИРАЕТ файл → файл сохраняется в state (локально)
5. Видит preview/название файла
6. Может выбрать материалы
7. Нажимает "💾 Сохранить изменения"
   ├─ 🔄 Показывается прогресс-бар загрузки
   ├─ 📊 Отображается процент: "Загрузка... 34%"
   └─ ✅ После успешной загрузки → закрывается диалог
```

### Ключевой момент:
**ЗАГРУЗКА НА СЕРВЕР** должна начинаться **ТОЛЬКО** при клике на **"💾 Сохранить изменения"**, а НЕ сразу при выборе файла!

---

## ❌ ТЕКУЩЕЕ (СЛОМАННОЕ) ПОВЕДЕНИЕ

### Broken UX Flow:
```
1. Пользователь открывает диалог "Редактировать урок"
2. Переходит на вкладку "Видео"
3. Нажимает "Загрузить видео" → открывается file picker
4. ВЫБИРАЕТ файл → ❌ СРАЗУ НАЧИНАЕТСЯ ЗАГРУЗКА НА СЕРВЕР!
   ├─ ❌ Нет прогресс-бара
   ├─ ❌ Пользователь не видит процент загрузки
   ├─ ❌ Не может отменить
   └─ ❌ Диалог закрывается до завершения загрузки
5. ❌ Изменения не сохраняются
6. ❌ Видео загружается, но урок не обновляется
```

---

## 🐛 ПРИЧИНА ПРОБЛЕМЫ

### Файл: `src/components/tripwire/TripwireLessonEditDialog.tsx`

**Проблемный код (строки ~280-320):**
```typescript
const handleVideoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  console.log('📹 Видео выбрано:', file.name);
  setIsUploadingVideo(true);

  try {
    const formData = new FormData();
    formData.append('lessonId', savedLessonId.toString());
    formData.append('title', lesson.title);
    formData.append('duration_seconds', '826');
    formData.append('video', file);

    // ❌ ПРОБЛЕМА: Загрузка начинается СРАЗУ!
    const response = await apiClient.post('/stream/upload', formData);
    
    toast.success('✅ Видео загружено в Bunny Stream');
    await loadLessonData(); // Перезагружаем данные урока
  } catch (error) {
    console.error('❌ Ошибка загрузки видео:', error);
    toast.error('Не удалось загрузить видео');
  } finally {
    setIsUploadingVideo(false);
  }
};
```

**Ошибка:** `handleVideoSelect` запускается при `onChange` на `<input type="file">`, что означает загрузка начинается **мгновенно** после выбора файла.

---

## 🔧 НЕОБХОДИМЫЕ ИСПРАВЛЕНИЯ

### 1. Разделить логику на 2 функции:

#### A. `handleVideoSelect` - только сохраняет файл в state:
```typescript
const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);

const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  console.log('📹 Видео выбрано (в памяти):', file.name);
  setSelectedVideoFile(file); // ✅ Только сохраняем в state
  toast.info(`Выбрано: ${file.name}`);
};
```

#### B. `uploadVideo` - загружает видео на сервер:
```typescript
const uploadVideo = async () => {
  if (!selectedVideoFile) return;

  setIsUploadingVideo(true);
  const toastId = toast.loading('Загрузка видео... 0%');

  try {
    const formData = new FormData();
    formData.append('lessonId', savedLessonId.toString());
    formData.append('title', lesson.title);
    formData.append('duration_seconds', '826');
    formData.append('video', selectedVideoFile);

    // ✅ Используем XMLHttpRequest для прогресс-бара
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          toast.loading(`Загрузка видео... ${percent}%`, { id: toastId });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error('Upload failed'));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error')));
      
      xhr.open('POST', 'http://localhost:3000/api/stream/upload');
      xhr.send(formData);
    });

    toast.success('✅ Видео загружено!', { id: toastId });
    await loadLessonData();
  } catch (error) {
    console.error('❌ Ошибка загрузки видео:', error);
    toast.error('Не удалось загрузить видео', { id: toastId });
  } finally {
    setIsUploadingVideo(false);
    setSelectedVideoFile(null);
  }
};
```

#### C. Кнопка "Сохранить изменения" вызывает `uploadVideo`:
```typescript
const handleSaveChanges = async () => {
  setIsUpdating(true);

  try {
    // 1. Обновляем текстовые данные урока
    await apiClient.put(`/tripwire/lessons/${savedLessonId}`, {
      title: lesson.title,
      description: lesson.description,
      tip: lesson.tip,
    });

    // 2. Загружаем видео (если выбрано)
    if (selectedVideoFile) {
      await uploadVideo();
    }

    // 3. Загружаем материалы (если выбраны)
    // ...

    toast.success('✅ Изменения сохранены');
    onClose();
  } catch (error) {
    toast.error('❌ Ошибка сохранения');
  } finally {
    setIsUpdating(false);
  }
};
```

---

## 🗑️ ПРОБЛЕМА 2: DELETE Роут не работает

### Ошибка в логах:
```
DELETE http://localhost:3000/api/tripwire/videos/29 404 (Not Found)
```

### Причина:
В файле `backend/src/routes/tripwire-lessons.ts` старый DELETE роут был **закомментирован/удалён**, но новый DELETE не был добавлен в `/api/stream/`.

### Решение:
Добавить DELETE роут в `backend/src/routes/streamUpload.ts`:

```typescript
// DELETE /api/stream/video/:lessonId
router.delete('/video/:lessonId', async (req: Request, res: Response) => {
  const { lessonId } = req.params;

  try {
    console.log(`🗑️ [DELETE] Удаление видео для урока ${lessonId}`);

    // 1. Получаем bunny_video_id из базы
    const { data: lesson, error: fetchError } = await supabaseAdmin
      .from('lessons')
      .select('bunny_video_id')
      .eq('id', lessonId)
      .single();

    if (fetchError || !lesson?.bunny_video_id) {
      console.log('⚠️ Видео не найдено в базе');
      return res.status(404).json({ error: 'Video not found' });
    }

    const videoId = lesson.bunny_video_id;

    // 2. Удаляем видео из Bunny Stream
    const response = await axios.delete(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: {
          AccessKey: BUNNY_STREAM_API_KEY,
        },
      }
    );

    console.log('✅ Видео удалено из Bunny Stream:', response.data);

    // 3. Удаляем bunny_video_id из базы
    const { error: updateError } = await supabaseAdmin
      .from('lessons')
      .update({ bunny_video_id: null })
      .eq('id', lessonId);

    if (updateError) throw updateError;

    // 4. Удаляем запись из video_content
    await supabaseAdmin
      .from('video_content')
      .delete()
      .eq('lesson_id', lessonId);

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error: any) {
    console.error('❌ [DELETE] Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});
```

### Обновить Frontend для использования нового роута:
```typescript
// В TripwireLessonEditDialog.tsx
const handleDeleteVideo = async () => {
  try {
    await apiClient.delete(`/stream/video/${savedLessonId}`); // ✅ Новый роут
    toast.success('Видео удалено');
    await loadLessonData();
  } catch (error) {
    toast.error('Не удалось удалить видео');
  }
};
```

---

## 📁 ЗАТРОНУТЫЕ ФАЙЛЫ

### Frontend:
1. ✅ `src/components/tripwire/TripwireLessonEditDialog.tsx` - **ТРЕБУЕТ ПОЛНОЙ ПЕРЕРАБОТКИ**
2. ✅ `src/components/admin/LessonEditDialog.tsx` - **ТРЕБУЕТ ТЕХ ЖЕ ИЗМЕНЕНИЙ**

### Backend:
1. ✅ `backend/src/routes/streamUpload.ts` - **ДОБАВИТЬ DELETE РОУТ**
2. ❌ `backend/src/routes/tripwire-lessons.ts` - Старые роуты закомментированы (правильно)

---

## 🧪 ТЕСТИРОВАНИЕ

### После исправления проверить:
1. ✅ Выбор видео НЕ запускает загрузку
2. ✅ Видно название выбранного файла
3. ✅ При клике "Сохранить изменения" → начинается загрузка
4. ✅ Показывается прогресс-бар: "Загрузка... 47%"
5. ✅ После 100% → диалог закрывается
6. ✅ Видео отображается на странице урока
7. ✅ DELETE работает корректно

---

## 🎯 ПРИОРИТЕТ ЗАДАЧ

1. **CRITICAL**: Исправить логику загрузки (разделить выбор файла и upload)
2. **HIGH**: Добавить прогресс-бар с XMLHttpRequest
3. **MEDIUM**: Добавить DELETE роут в streamUpload.ts
4. **LOW**: Применить те же изменения к `LessonEditDialog.tsx` (Main Platform)

---

## 📝 ДОПОЛНИТЕЛЬНЫЕ ЗАМЕЧАНИЯ

- Старые видео Bunny Storage всё ещё остались в базе (нужен отдельный cleanup)
- После загрузки видео нужно дождаться обработки (status: 'processing' → 'finished')
- Рассмотреть добавление polling для проверки статуса видео после загрузки

---

**Prepared for:** Next AI Assistant  
**Context:** Full Bunny Stream Migration Project  
**Last Updated:** 2025-11-29


