import { Router, Request, Response } from 'express';
import { adminSupabase } from '../config/supabase';  // ✅ Use admin client with Authorization header

const router = Router();

// GET /api/courses - получить все курсы
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: courses, error } = await adminSupabase
      .from('courses')
      .select(`
        *,
        modules (
          id,
          title,
          order_index,
          lessons (
            id,
            title,
            order_index
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get courses error:', error);
      return res.status(500).json({ error: 'Ошибка получения курсов' });
    }

    res.json({ courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// GET /api/courses/:id - получить курс по ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Сначала получаем курс
    const { data: course, error: courseError } = await adminSupabase
      .from('courses')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (courseError || !course) {
      console.error('Get course error:', courseError);
      return res.status(404).json({ error: 'Курс не найден' });
    }

    // Затем получаем модули отдельным запросом
    const { data: modules, error: modulesError } = await adminSupabase
      .from('modules')
      .select(`
        *,
        lessons!lessons_module_id_fkey(
          *,
          video_content (*),
          lesson_materials (*)
        )
      `)
      .eq('course_id', parseInt(id))
      .eq('is_archived', false)
      .order('order_index', { ascending: true });

    if (modulesError) {
      console.error('Get modules error:', modulesError);
    }

    // Добавляем модули к курсу
    course.modules = modules || [];

    // ✅ Фильтруем архивные модули и уроки
    if (course.modules && Array.isArray(course.modules)) {
      // Фильтруем архивные модули
      course.modules = course.modules.filter((module: any) => !module.is_archived);
      
      // Сортируем модули по order_index
      course.modules = course.modules.sort((a: any, b: any) => {
        const orderA = a.order_index ?? a.id ?? 0;
        const orderB = b.order_index ?? b.id ?? 0;
        return orderA - orderB;
      });
      
      // Фильтруем и сортируем уроки внутри каждого модуля
      course.modules.forEach((module: any) => {
        if (module.lessons && Array.isArray(module.lessons)) {
          // Фильтруем архивные уроки
          module.lessons = module.lessons.filter((lesson: any) => !lesson.is_archived);
          // Сортируем по order_index
          module.lessons = module.lessons.sort((a: any, b: any) => {
            const orderA = a.order_index ?? a.id ?? 0;
            const orderB = b.order_index ?? b.id ?? 0;
            return orderA - orderB;
          });
          
          console.log(`📚 Модуль "${module.title}": ${module.lessons.length} уроков`);
          module.lessons.forEach((lesson: any) => {
            console.log(`  ⏱️ Урок "${lesson.title}": ${lesson.duration_minutes || 0} минут`);
          });
        } else {
          console.log(`📚 Модуль "${module.title}": 0 уроков`);
        }
      });
      
      console.log('✅ Модули отсортированы по order_index:', course.modules.map((m: any) => ({ 
        id: m.id, 
        order_index: m.order_index, 
        title: m.title,
        lessons_count: m.lessons?.length || 0
      })));
    }

    res.json({ course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/courses - создать курс
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, category, difficulty_level, is_published, thumbnail_url, price } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Название курса обязательно' });
    }

    const { data: course, error } = await adminSupabase
      .from('courses')
      .insert({
        title,
        description,
        category,
        difficulty_level: difficulty_level || 'beginner',
        is_published: is_published || false,
        thumbnail_url,
        price: price || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Create course error:', error);
      return res.status(500).json({ error: 'Ошибка создания курса' });
    }

    res.status(201).json({ course });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// PUT /api/courses/:id - обновить курс
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, category, difficulty_level, is_published, thumbnail_url, price } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (difficulty_level !== undefined) updateData.difficulty_level = difficulty_level;
    if (is_published !== undefined) updateData.is_published = is_published;
    if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url;
    if (price !== undefined) updateData.price = price;
    
    // ✅ updated_at removed - column doesn't exist in courses table

    const { data: course, error } = await adminSupabase
      .from('courses')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('Update course error:', error);
      return res.status(500).json({ error: 'Ошибка обновления курса' });
    }

    res.json({ course });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// DELETE /api/courses/:id - удалить курс
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await adminSupabase
      .from('courses')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('Delete course error:', error);
      return res.status(500).json({ error: 'Ошибка удаления курса' });
    }

    res.json({ success: true, message: 'Курс удален' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
