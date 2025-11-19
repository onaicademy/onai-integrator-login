import { Router, Request, Response } from 'express';
import { adminSupabase } from '../config/supabase';  // ✅ Use admin client with Authorization header

const router = Router();

// GET /api/modules/:id - получить один модуль по ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const moduleId = parseInt(id);

    if (isNaN(moduleId)) {
      return res.status(400).json({ error: 'Invalid module ID' });
    }

    console.log('📌 Получение модуля ID:', moduleId);

    // Сначала получаем модуль
    const { data, error } = await adminSupabase
      .from('modules')
      .select('*')
      .eq('id', moduleId)
      .eq('is_archived', false)
      .single();

    if (error || !data) {
      console.error('❌ Ошибка получения модуля:', error);
      return res.status(404).json({ error: 'Module not found', details: error?.message });
    }

    // Затем получаем уроки отдельным запросом
    const { data: lessons, error: lessonsError } = await adminSupabase
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .eq('is_archived', false)
      .order('order_index', { ascending: true });

    if (lessonsError) {
      console.error('❌ Ошибка получения уроков:', lessonsError);
    }

    // Добавляем уроки к модулю
    data.lessons = lessons || [];

    // ✅ Фильтруем архивные уроки и сортируем по order_index
    if (data.lessons && Array.isArray(data.lessons)) {
      // Фильтруем архивные уроки
      data.lessons = data.lessons.filter((lesson: any) => !lesson.is_archived);
      // Сортируем по order_index
      data.lessons = data.lessons.sort((a: any, b: any) => {
        const orderA = a.order_index ?? a.id ?? 0;
        const orderB = b.order_index ?? b.id ?? 0;
        return orderA - orderB;
      });
    }

    console.log('✅ Модуль найден:', data.title);
    console.log('📊 Уроков:', data.lessons?.length || 0);

    res.json({ module: data });
  } catch (error: any) {
    console.error('❌ Ошибка в GET /api/modules/:id:', error);
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
});

// GET /api/modules/course/:courseId - получить все модули курса (альтернативный endpoint)
router.get('/course/:courseId', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const { data: modules, error } = await adminSupabase
      .from('modules')
      .select(`
        *,
        lessons!lessons_module_id_fkey(
          id,
          duration_minutes
        )
      `)
      .eq('course_id', parseInt(courseId))
      .eq('is_archived', false)
      .eq('lessons.is_archived', false)
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
    const { data: maxIdRow } = await adminSupabase
      .from('modules')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    
    const nextId = maxIdRow ? parseInt(maxIdRow.id.toString()) + 1 : 1;
    console.log('🆔 Следующий ID модуля:', nextId);
    
    // Получить максимальный order_index для этого курса
    const { data: maxOrder } = await adminSupabase
      .from('modules')
      .select('order_index')
      .eq('course_id', parseInt(course_id))
      .order('order_index', { ascending: false })
      .limit(1);
    
    const order_index = (maxOrder?.[0]?.order_index ?? -1) + 1;
    console.log('📊 Новый order_index:', order_index);
    
    // Создать модуль
    const { data: module, error } = await adminSupabase
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

// PUT /api/modules/reorder - изменить порядок модулей (Drag & Drop)
// ⚠️ ВАЖНО: Этот маршрут должен быть ПЕРЕД router.put('/:id'), иначе Express будет обрабатывать /reorder как /:id
router.put('/reorder', async (req: Request, res: Response) => {
  try {
    console.log('📥 Получен запрос PUT /api/modules/reorder');
    console.log('📦 req.body:', JSON.stringify(req.body, null, 2));
    
    const { modules } = req.body; // [{ id: 1, order_index: 0 }, { id: 2, order_index: 1 }, ...]

    if (!modules) {
      console.error('❌ modules отсутствует в req.body');
      return res.status(400).json({ error: 'modules обязателен в теле запроса' });
    }

    if (!Array.isArray(modules)) {
      console.error('❌ modules не является массивом:', typeof modules);
      return res.status(400).json({ error: 'modules должен быть массивом' });
    }

    if (modules.length === 0) {
      console.error('❌ modules пустой массив');
      return res.status(400).json({ error: 'modules не может быть пустым' });
    }

    console.log('🔄 Изменение порядка модулей:', JSON.stringify(modules, null, 2));

    // Обновляем каждый модуль с обработкой ошибок
    const updates = modules.map(async (module, index) => {
      console.log(`📝 Обработка модуля ${index + 1}/${modules.length}:`, module);
      
      if (!module || typeof module !== 'object') {
        throw new Error(`Invalid module object at index ${index}: ${JSON.stringify(module)}`);
      }
      
      const moduleId = parseInt(module.id?.toString() || '0');
      const orderIndex = parseInt(module.order_index?.toString() || '0');
      
      console.log(`  - moduleId: ${moduleId} (из ${module.id})`);
      console.log(`  - orderIndex: ${orderIndex} (из ${module.order_index})`);
      
      if (isNaN(moduleId) || moduleId === 0) {
        throw new Error(`Invalid module ID: ${module.id} (parsed as ${moduleId})`);
      }
      
      if (isNaN(orderIndex)) {
        throw new Error(`Invalid order_index for module ${moduleId}: ${module.order_index} (parsed as ${orderIndex})`);
      }
      
      console.log(`  - Обновление модуля ${moduleId} с order_index ${orderIndex}...`);
      
      const { data, error } = await adminSupabase
        .from('modules')
        .update({ order_index: orderIndex })
        .eq('id', moduleId)
        .select();
      
      if (error) {
        console.error(`❌ Ошибка обновления модуля ${moduleId}:`, error);
        console.error(`❌ Детали ошибки:`, JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log(`  ✅ Модуль ${moduleId} обновлён успешно`);
      return { id: moduleId, order_index: orderIndex };
    });

    const results = await Promise.all(updates);
    console.log('✅ Все модули обновлены:', results);

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

    const { data: module, error } = await adminSupabase
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

// DELETE /api/modules/:id - удалить модуль
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Удаление модуля:', id);
    
    // Проверить есть ли уроки в модуле
    const { data: lessons } = await adminSupabase
      .from('lessons')
      .select('id')
      .eq('module_id', id);
    
    if (lessons && lessons.length > 0) {
      return res.status(400).json({ 
        error: 'Нельзя удалить модуль с уроками. Сначала удалите все уроки.' 
      });
    }
    
    // Удалить модуль
    const { error } = await adminSupabase
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
