import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// GET /api/lessons?module_id=X - получить все уроки модуля (query параметр)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { module_id } = req.query;

    if (!module_id) {
      return res.status(400).json({ error: 'module_id обязателен' });
    }

    console.log('📚 Получение уроков для модуля:', module_id);

    const { data: lessons, error } = await supabase
      .from('lessons')
      .select(`
        *,
        video_content (*),
        lesson_materials (*)
      `)
      .eq('module_id', parseInt(module_id as string))
      .order('order_index', { ascending: true });

    if (error) {
      console.error('❌ Get lessons error:', error);
      return res.status(500).json({ error: 'Ошибка получения уроков' });
    }

    console.log(`✅ Найдено уроков: ${lessons?.length || 0}`);
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

    const { data: lessons, error } = await supabase
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

    const { data: lesson, error } = await supabase
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
    const { data: maxIdData } = await supabase
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
      const { data: lastLesson } = await supabase
        .from('lessons')
        .select('order_index')
        .eq('module_id', parseInt(module_id))
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      finalOrderIndex = lastLesson ? lastLesson.order_index + 1 : 0;
    }

    const { data: lesson, error } = await supabase
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

    const { data: lesson, error } = await supabase
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

// PUT /api/lessons/reorder - изменить порядок уроков
router.put('/reorder', async (req: Request, res: Response) => {
  try {
    const { lessons } = req.body; // [{ id: 1, order_index: 0 }, { id: 2, order_index: 1 }, ...]

    if (!Array.isArray(lessons)) {
      return res.status(400).json({ error: 'lessons должен быть массивом' });
    }

    const updates = lessons.map((lesson) =>
      supabase
        .from('lessons')
        .update({ order_index: lesson.order_index })
        .eq('id', parseInt(lesson.id))
    );

    await Promise.all(updates);

    res.json({ success: true, message: 'Порядок уроков обновлен' });
  } catch (error) {
    console.error('Reorder lessons error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// DELETE /api/lessons/:id - удалить урок
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Удаление урока:', id);
    
    // Получить данные урока
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id')
      .eq('id', id)
      .single();
    
    if (!lesson) {
      return res.status(404).json({ error: 'Урок не найден' });
    }
    
    // Удалить связанные данные
    // 1. Видео
    await supabase.from('video_content').delete().eq('lesson_id', id);
    
    // 2. Материалы (получить пути файлов для удаления из Storage)
    const { data: materials } = await supabase
      .from('lesson_materials')
      .select('storage_path')
      .eq('lesson_id', id);
    
    if (materials && materials.length > 0) {
      const paths = materials.map(m => m.storage_path);
      await supabase.storage.from('materials').remove(paths);
    }
    
    await supabase.from('lesson_materials').delete().eq('lesson_id', id);
    
    // 3. Аналитика
    await supabase.from('video_analytics').delete().eq('lesson_id', id);
    
    // 4. Удалить урок
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    console.log('✅ Урок удален');
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Ошибка удаления урока:', error);
    res.status(500).json({ error: 'Ошибка удаления урока' });
  }
});

// PUT /api/lessons/reorder - изменить порядок уроков (Drag & Drop)
router.put('/reorder', async (req: Request, res: Response) => {
  try {
    const { lessons } = req.body; // [{ id: 1, order_index: 0 }, { id: 2, order_index: 1 }, ...]

    if (!Array.isArray(lessons)) {
      return res.status(400).json({ error: 'lessons должен быть массивом' });
    }

    console.log('🔄 Изменение порядка уроков:', lessons);

    // Обновляем каждый урок
    const updates = lessons.map((lesson) =>
      supabase
        .from('lessons')
        .update({ order_index: lesson.order_index })
        .eq('id', parseInt(lesson.id.toString()))
    );

    await Promise.all(updates);

    console.log('✅ Порядок уроков обновлён');
    res.json({ success: true, message: 'Порядок уроков обновлен' });
  } catch (error) {
    console.error('❌ Reorder lessons error:', error);
    res.status(500).json({ error: 'Ошибка изменения порядка уроков' });
  }
});

export default router;
