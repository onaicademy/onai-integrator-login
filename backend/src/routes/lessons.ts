import { Router, Request, Response } from 'express';
import { adminSupabase } from '../config/supabase';  // ✅ Use admin client with Authorization header
import * as jwt from 'jsonwebtoken';

const router = Router();

// GET /api/lessons?module_id=X - получить все уроки модуля (query параметр)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { module_id } = req.query;

    if (!module_id) {
      return res.status(400).json({ error: 'module_id обязателен' });
    }

    console.log('\n📚 ===== ЗАПРОС УРОКОВ =====');
    console.log('📌 Module ID:', module_id);

    const { data: lessons, error } = await adminSupabase
      .from('lessons')
      .select(`
        *,
        video_content (*),
        lesson_materials (*)
      `)
      .eq('module_id', parseInt(module_id as string))
      .eq('is_archived', false)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('❌ Get lessons error:', error);
      return res.status(500).json({ error: 'Ошибка получения уроков' });
    }

    console.log('📦 Получено уроков из БД:', lessons?.length || 0);

    // ✅ Вычисляем duration_minutes из video_content, если не указано или равно 0
    if (lessons) {
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        console.log(`\n📘 Урок ${i + 1}: "${lesson.title}" (ID: ${lesson.id})`);
        console.log('   duration_minutes:', lesson.duration_minutes);
        
        // 🔥 FIX: video_content может быть object (one-to-one) или array (one-to-many)
        // Supabase возвращает object если есть UNIQUE constraint на lesson_id
        const videoContentArray = Array.isArray(lesson.video_content) 
          ? lesson.video_content 
          : (lesson.video_content ? [lesson.video_content] : []);
        
        console.log('   video_content:', videoContentArray.length, 'видео');

        const hasDuration = lesson.duration_minutes && lesson.duration_minutes > 0;
        const hasVideo = videoContentArray.length > 0;
        
        if (hasVideo) {
          videoContentArray.forEach((video: any, vIndex: number) => {
            console.log(`   📹 Видео ${vIndex + 1}:`, {
              id: video.id,
              duration_seconds: video.duration_seconds,
              filename: video.filename
            });
          });
        }
        
        // Если длительность не установлена или равна 0, пытаемся вычислить из видео
        if (!hasDuration && hasVideo) {
          const video = videoContentArray[0];
          
          if (video && video.duration_seconds && video.duration_seconds > 0) {
            // 🔥 FIX: Округляем ВВЕРХ (Math.ceil) чтобы даже короткие видео учитывались
            lesson.duration_minutes = Math.ceil(video.duration_seconds / 60);
            console.log(`   ✅ ВЫЧИСЛЕНО duration_minutes: ${lesson.duration_minutes} минут (из ${video.duration_seconds} секунд)`);
          } else {
            console.log(`   ⚠️ У видео нет duration_seconds!`);
          }
        } else if (!hasVideo) {
          console.log(`   ⚠️ У урока нет видео`);
        } else {
          console.log(`   ✅ Длительность уже установлена: ${lesson.duration_minutes} минут`);
        }
        
        // 🔥 FIX: Приводим video_content к массиву для frontend
        lesson.video_content = videoContentArray;
      }
    }

    console.log('📚 ===== КОНЕЦ ЗАПРОСА УРОКОВ =====\n');
    res.json({ lessons: lessons || [] });
  } catch (error) {
    console.error('❌ Get lessons error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// GET /api/lessons/:moduleId - получить все уроки модуля (path параметр, для обратной совместимости)
router.get('/:moduleId', async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;

      const { data: lessons, error } = await adminSupabase
      .from('lessons')
      .select(`
        *,
        video_content (*),
        lesson_materials (*)
      `)
      .eq('module_id', parseInt(moduleId))
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Get lessons error:', error);
      return res.status(500).json({ error: 'Ошибка получения уроков' });
    }

    res.json({ lessons });
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// GET /api/lessons/single/:id - получить один урок по ID
router.get('/single/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: lesson, error } = await adminSupabase
      .from('lessons')
      .select(`
        *,
        video_content (*),
        lesson_materials (*)
      `)
      .eq('id', parseInt(id))
      .single();

    if (error) {
      console.error('Get lesson error:', error);
      return res.status(404).json({ error: 'Урок не найден' });
    }

    res.json({ lesson });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/lessons - создать урок
router.post('/', async (req: Request, res: Response) => {
  try {
    const { module_id, title, content, lesson_type, duration_minutes, order_index, is_preview, description, tip } = req.body;

    console.log('📝 Создание урока:', { module_id, title, duration_minutes, tip });

    if (!module_id || !title) {
      return res.status(400).json({ error: 'module_id и title обязательны' });
    }

    // Получаем следующий ID вручную (если lessons.id не AUTO_INCREMENT)
    const { data: maxIdData } = await adminSupabase
      .from('lessons')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    
    const nextId = maxIdData ? maxIdData.id + 1 : 1;
    console.log('🔢 Следующий ID урока:', nextId);

    // Если order_index не указан, ставим в конец
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined) {
      const { data: lastLesson } = await adminSupabase
        .from('lessons')
        .select('order_index')
        .eq('module_id', parseInt(module_id))
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      finalOrderIndex = lastLesson ? lastLesson.order_index + 1 : 0;
    }

    const { data: lesson, error } = await adminSupabase
      .from('lessons')
      .insert({
        id: nextId, // Явно указываем ID
        module_id: parseInt(module_id),
        title,
        description: description || '',
        content,
        lesson_type: lesson_type || 'video',
        duration_minutes: duration_minutes || 0,
        order_index: finalOrderIndex,
        is_preview: is_preview || false,
        tip: tip || null, // ✅ Совет по уроку
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Create lesson error:', error);
      return res.status(500).json({ error: 'Ошибка создания урока', details: error.message });
    }

    console.log('✅ Урок создан:', lesson.id);
    res.status(201).json({ lesson });
  } catch (error: any) {
    console.error('❌ Create lesson error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error?.message });
  }
});

// PUT /api/lessons/reorder - изменить порядок уроков (Drag & Drop)
// ⚠️ ВАЖНО: Этот маршрут должен быть ПЕРЕД router.put('/:id'), иначе Express будет обрабатывать /reorder как /:id
router.put('/reorder', async (req: Request, res: Response) => {
  try {
    console.log('📥 Получен запрос PUT /api/lessons/reorder');
    console.log('📦 req.body:', JSON.stringify(req.body, null, 2));
    
    const { lessons } = req.body; // [{ id: 1, order_index: 0 }, { id: 2, order_index: 1 }, ...]

    if (!lessons) {
      console.error('❌ lessons отсутствует в req.body');
      return res.status(400).json({ error: 'lessons обязателен в теле запроса' });
    }

    if (!Array.isArray(lessons)) {
      console.error('❌ lessons не является массивом:', typeof lessons);
      return res.status(400).json({ error: 'lessons должен быть массивом' });
    }

    if (lessons.length === 0) {
      console.error('❌ lessons пустой массив');
      return res.status(400).json({ error: 'lessons не может быть пустым' });
    }

    console.log('🔄 Изменение порядка уроков:', JSON.stringify(lessons, null, 2));

    // Обновляем каждый урок с обработкой ошибок
    const updates = lessons.map(async (lesson, index) => {
      console.log(`📝 Обработка урока ${index + 1}/${lessons.length}:`, lesson);
      
      if (!lesson || typeof lesson !== 'object') {
        throw new Error(`Invalid lesson object at index ${index}: ${JSON.stringify(lesson)}`);
      }
      
      const lessonId = parseInt(lesson.id?.toString() || '0');
      const orderIndex = parseInt(lesson.order_index?.toString() || '0');
      
      console.log(`  - lessonId: ${lessonId} (из ${lesson.id})`);
      console.log(`  - orderIndex: ${orderIndex} (из ${lesson.order_index})`);
      
      if (isNaN(lessonId) || lessonId === 0) {
        throw new Error(`Invalid lesson ID: ${lesson.id} (parsed as ${lessonId})`);
      }
      
      if (isNaN(orderIndex)) {
        throw new Error(`Invalid order_index for lesson ${lessonId}: ${lesson.order_index} (parsed as ${orderIndex})`);
      }
      
      console.log(`  - Обновление урока ${lessonId} с order_index ${orderIndex}...`);
      
      const { data, error } = await adminSupabase
        .from('lessons')
        .update({ order_index: orderIndex })
        .eq('id', lessonId)
        .select();
      
      if (error) {
        console.error(`❌ Ошибка обновления урока ${lessonId}:`, error);
        console.error(`❌ Детали ошибки:`, JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log(`  ✅ Урок ${lessonId} обновлён успешно`);
      return { id: lessonId, order_index: orderIndex };
    });

    const results = await Promise.all(updates);
    console.log('✅ Все уроки обновлены:', results);

    console.log('✅ Порядок уроков обновлён');
    res.json({ success: true, message: 'Порядок уроков обновлен' });
  } catch (error: any) {
    console.error('❌ Reorder lessons error:', error);
    res.status(500).json({ 
      error: 'Ошибка изменения порядка уроков', 
      details: error?.message || 'Unknown error' 
    });
  }
});

// PUT /api/lessons/:id - обновить урок
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, content, lesson_type, duration_minutes, order_index, is_preview, tip } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;
    if (lesson_type !== undefined) updateData.lesson_type = lesson_type;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
    if (order_index !== undefined) updateData.order_index = order_index;
    if (is_preview !== undefined) updateData.is_preview = is_preview;
    if (tip !== undefined) updateData.tip = tip; // ✅ Совет по уроку
    
    // ✅ updated_at removed - column doesn't exist in lessons table

    const { data: lesson, error } = await adminSupabase
      .from('lessons')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('Update lesson error:', error);
      return res.status(500).json({ error: 'Ошибка обновления урока' });
    }

    res.json({ lesson });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// DELETE /api/lessons/:id - удалить урок
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lessonId = parseInt(id); // ✅ ИСПРАВЛЕНО: Преобразуем строку в число

    console.log('🗑️ Удаление урока:', lessonId, '(тип:', typeof lessonId, ')');
    
    // Проверка валидности ID
    if (isNaN(lessonId)) {
      return res.status(400).json({ error: 'Некорректный ID урока' });
    }
    
    // Получить данные урока
    const { data: lesson, error: fetchError } = await adminSupabase
      .from('lessons')
      .select('id')
      .eq('id', lessonId) // ✅ ИСПРАВЛЕНО: Используем число
      .single();
    
    if (fetchError || !lesson) {
      console.error('❌ Урок не найден:', fetchError);
      return res.status(404).json({ error: 'Урок не найден' });
    }
    
    console.log('✅ Урок найден, начинаем удаление связанных данных...');
    
    // Удалить связанные данные
    // 1. Видео
    await adminSupabase.from('video_content').delete().eq('lesson_id', lessonId); // ✅ ИСПРАВЛЕНО
    
    // 2. Материалы (получить пути файлов для удаления из Storage)
    const { data: materials } = await adminSupabase
      .from('lesson_materials')
      .select('storage_path')
      .eq('lesson_id', lessonId); // ✅ ИСПРАВЛЕНО
    
    if (materials && materials.length > 0) {
      const paths = materials.map(m => m.storage_path);
      await adminSupabase.storage.from('materials').remove(paths);
    }
    
    await adminSupabase.from('lesson_materials').delete().eq('lesson_id', lessonId); // ✅ ИСПРАВЛЕНО
    
    // 3. Аналитика
    await adminSupabase.from('video_analytics').delete().eq('lesson_id', lessonId); // ✅ ИСПРАВЛЕНО
    
    // 4. Удалить урок
    const { error: deleteError } = await adminSupabase
      .from('lessons')
      .delete()
      .eq('id', lessonId); // ✅ ИСПРАВЛЕНО

    if (deleteError) {
      console.error('❌ Ошибка удаления урока из БД:', deleteError);
      throw deleteError;
    }
    
    console.log('✅ Урок удален успешно');
    res.json({ success: true, message: 'Урок успешно удален' });
    
  } catch (error: any) {
    console.error('❌ Ошибка удаления урока:', error);
    res.status(500).json({ error: 'Ошибка удаления урока', details: error?.message });
  }
});

// GET /api/lessons/progress/:moduleId - получить прогресс пользователя по урокам модуля
router.get('/progress/:moduleId', async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;
    // Получаем userId из JWT токена (поле sub)
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    // Декодируем JWT токен для получения userId
    let userId: string | null = null;
    
    try {
      const decoded = jwt.decode(token) as any;
      userId = decoded?.sub || decoded?.user_id || null;
    } catch (error) {
      console.error('❌ Ошибка декодирования токена:', error);
      return res.status(401).json({ error: 'Неверный токен' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Пользователь не авторизован' });
    }

    console.log('📊 Получение прогресса для модуля:', moduleId, 'пользователя:', userId);

    // Получаем все уроки модуля
    const { data: lessons, error: lessonsError } = await adminSupabase
      .from('lessons')
      .select('id')
      .eq('module_id', parseInt(moduleId))
      .eq('is_archived', false);

    if (lessonsError) {
      console.error('❌ Ошибка получения уроков:', lessonsError);
      return res.status(500).json({ error: 'Ошибка получения уроков' });
    }

    if (!lessons || lessons.length === 0) {
      return res.json({ progress: [] });
    }

    const lessonIds = lessons.map(l => l.id);

    // Получаем прогресс пользователя по этим урокам
    const { data: progress, error: progressError } = await adminSupabase
      .from('student_progress')
      .select('lesson_id, is_completed, completed_at')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds);

    if (progressError) {
      console.error('❌ Ошибка получения прогресса:', progressError);
      return res.status(500).json({ error: 'Ошибка получения прогресса' });
    }

    // Формируем мапу прогресса
    const progressMap: Record<number, boolean> = {};
    (progress || []).forEach((p: any) => {
      progressMap[p.lesson_id] = p.is_completed || false;
    });

    res.json({ progress: progressMap });
  } catch (error: any) {
    console.error('❌ Get progress error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/lessons/:lessonId/complete - завершить урок (с проверкой домашнего задания)
router.post('/:lessonId/complete', async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    // Получаем userId из JWT токена (поле sub)
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    // Декодируем JWT токен для получения userId
    let userId: string | null = null;
    
    try {
      const decoded = jwt.decode(token) as any;
      userId = decoded?.sub || decoded?.user_id || null;
    } catch (error) {
      console.error('❌ Ошибка декодирования токена:', error);
      return res.status(401).json({ error: 'Неверный токен' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Пользователь не авторизован' });
    }

    console.log('✅ Завершение урока:', lessonId, 'пользователем:', userId);

    // 1. Проверяем, есть ли домашнее задание (lesson_materials с requires_completion = true)
        const { data: materials, error: materialsError } = await adminSupabase
      .from('lesson_materials')
      .select('id, requires_completion')
      .eq('lesson_id', parseInt(lessonId))
      .eq('requires_completion', true);

    if (materialsError) {
      console.error('❌ Ошибка проверки материалов:', materialsError);
      return res.status(500).json({ error: 'Ошибка проверки домашнего задания' });
    }

    // 2. Если есть домашнее задание, проверяем, выполнено ли оно
    if (materials && materials.length > 0) {
      // TODO: Добавить проверку выполнения домашнего задания
      // Пока что просто проверяем наличие
      console.log('📝 Найдено домашних заданий:', materials.length);
      // В будущем здесь будет проверка через таблицу homework_submissions или аналогичную
    }

    // 3. Обновляем прогресс
    const { data: existingProgress, error: checkError } = await adminSupabase
      .from('student_progress')
      .select('id, is_completed')
      .eq('user_id', userId)
      .eq('lesson_id', parseInt(lessonId))
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Ошибка проверки прогресса:', checkError);
      return res.status(500).json({ error: 'Ошибка проверки прогресса' });
    }

    if (existingProgress?.is_completed) {
      return res.json({ 
        success: true, 
        message: 'Урок уже завершен',
        already_completed: true 
      });
    }

    // 4. Создаем или обновляем запись прогресса
    const progressData: any = {
      user_id: userId,
      lesson_id: parseInt(lessonId),
      is_completed: true,
      completed_at: new Date().toISOString(),
    };

    if (existingProgress) {
      const { error: updateError } = await adminSupabase
        .from('student_progress')
        .update(progressData)
        .eq('id', existingProgress.id);

      if (updateError) {
        console.error('❌ Ошибка обновления прогресса:', updateError);
        return res.status(500).json({ error: 'Ошибка обновления прогресса' });
      }
    } else {
      const { error: insertError } = await adminSupabase
        .from('student_progress')
        .insert(progressData);

      if (insertError) {
        console.error('❌ Ошибка создания прогресса:', insertError);
        return res.status(500).json({ error: 'Ошибка создания прогресса' });
      }
    }

    console.log('✅ Урок завершен успешно');
    res.json({ 
      success: true, 
      message: 'Урок успешно завершен',
      already_completed: false 
    });
  } catch (error: any) {
    console.error('❌ Complete lesson error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
