import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// GET /api/modules/:courseId - получить все модули курса
router.get('/:courseId', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const { data: modules, error } = await supabase
      .from('modules')
      .select(`
        *,
        lessons (
          id,
          duration_minutes
        )
      `)
      .eq('course_id', parseInt(courseId))
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Get modules error:', error);
      return res.status(500).json({ error: 'Ошибка получения модулей' });
    }

    // 📊 Добавляем статистику для каждого модуля
    const modulesWithStats = (modules || []).map(module => {
      const lessons = module.lessons || [];
      const totalLessons = lessons.length;
      const totalMinutes = lessons.reduce((sum: number, l: any) => sum + (l.duration_minutes || 0), 0);
      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      return {
        ...module,
        stats: {
          total_lessons: totalLessons,
          total_minutes: totalMinutes,
          total_hours: totalHours,
          formatted_duration: totalHours > 0
            ? `${totalHours}ч ${remainingMinutes}мин`
            : `${totalMinutes}мин`,
        },
      };
    });

    res.json({ modules: modulesWithStats });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/modules - создать модуль
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, course_id } = req.body;
    
    console.log('📥 Создание модуля:', { title, description, course_id });
    
    if (!course_id || !title) {
      return res.status(400).json({ error: 'course_id и title обязательны' });
    }

    // ✅ ШАГЧИК 1: Получить следующий ID (manual auto-increment)
    const { data: maxIdRow } = await supabase
      .from('modules')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    
    const nextId = maxIdRow ? parseInt(maxIdRow.id.toString()) + 1 : 1;
    console.log('🆔 Следующий ID модуля:', nextId);
    
    // Получить максимальный order_index для этого курса
    const { data: maxOrder } = await supabase
      .from('modules')
      .select('order_index')
      .eq('course_id', parseInt(course_id))
      .order('order_index', { ascending: false })
      .limit(1);
    
    const order_index = (maxOrder?.[0]?.order_index ?? -1) + 1;
    console.log('📊 Новый order_index:', order_index);
    
    // Создать модуль
    const { data: module, error } = await supabase
      .from('modules')
      .insert({
        id: nextId, // ✅ Ручной ID (нет AUTO_INCREMENT)
        title,
        description: description || '',
        course_id: parseInt(course_id),
        order_index
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Ошибка Supabase:', error);
      throw error;
    }
    
    console.log('✅ Модуль создан:', module);
    res.status(201).json({ module });
    
  } catch (error: any) {
    console.error('❌ Ошибка создания модуля:', error);
    res.status(500).json({ 
      error: 'Ошибка создания модуля',
      details: error.message 
    });
  }
});

// PUT /api/modules/:id - обновить модуль
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, order_index } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (order_index !== undefined) updateData.order_index = order_index;
    
    // ✅ updated_at removed - column doesn't exist in modules table

    const { data: module, error } = await supabase
      .from('modules')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('Update module error:', error);
      return res.status(500).json({ error: 'Ошибка обновления модуля' });
    }

    res.json({ module });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PUT /api/modules/reorder - изменить порядок модулей (Drag & Drop)
router.put('/reorder', async (req: Request, res: Response) => {
  try {
    const { modules } = req.body; // [{ id: 1, order_index: 0 }, { id: 2, order_index: 1 }, ...]

    if (!Array.isArray(modules)) {
      return res.status(400).json({ error: 'modules должен быть массивом' });
    }

    console.log('🔄 Изменение порядка модулей:', modules);

    // Обновляем каждый модуль с обработкой ошибок
    const updates = modules.map(async (module) => {
      const moduleId = parseInt(module.id.toString()); // ✅ ИСПРАВЛЕНО: Преобразуем в число
      const { error } = await supabase
        .from('modules')
        .update({ order_index: module.order_index })
        .eq('id', moduleId);
      
      if (error) {
        console.error(`❌ Ошибка обновления модуля ${moduleId}:`, error);
        throw error;
      }
    });

    await Promise.all(updates);

    console.log('✅ Порядок модулей обновлён');
    res.json({ success: true, message: 'Порядок модулей обновлен' });
  } catch (error: any) {
    console.error('❌ Reorder modules error:', error);
    res.status(500).json({ 
      error: 'Ошибка изменения порядка модулей', 
      details: error?.message || 'Unknown error' 
    });
  }
});

// DELETE /api/modules/:id - удалить модуль
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Удаление модуля:', id);
    
    // Проверить есть ли уроки в модуле
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('module_id', id);
    
    if (lessons && lessons.length > 0) {
      return res.status(400).json({ 
        error: 'Нельзя удалить модуль с уроками. Сначала удалите все уроки.' 
      });
    }
    
    // Удалить модуль
    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', parseInt(id));
    
    if (error) throw error;
    
    console.log('✅ Модуль удален');
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Ошибка удаления модуля:', error);
    res.status(500).json({ error: 'Ошибка удаления модуля' });
  }
});

export default router;
