import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// GET /api/courses - получить все курсы
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: courses, error } = await supabase
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

    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        *,
        modules (
          *,
          lessons (
            *,
            video_content (*),
            lesson_materials (*)
          )
        )
      `)
      .eq('id', parseInt(id))
      .single();

    if (error) {
      console.error('Get course error:', error);
      return res.status(404).json({ error: 'Курс не найден' });
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

    const { data: course, error } = await supabase
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

    const { data: course, error } = await supabase
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

    const { error } = await supabase
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
