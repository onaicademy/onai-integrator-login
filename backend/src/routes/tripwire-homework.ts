/**
 * Tripwire Homework Routes
 * API для работы с домашними заданиями учеников
 */

import { Router } from 'express';
import { tripwireAdminSupabase } from '../config/supabase-tripwire';

const router = Router();

/**
 * GET /api/tripwire/homework/:lessonId
 * Получить домашнее задание ученика для урока
 */
router.get('/homework/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { user_id } = req.query; // UUID из users таблицы

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    console.log('📚 [Homework] Получаем ДЗ для урока:', lessonId, 'ученик:', user_id);

    const { data, error } = await tripwireAdminSupabase
      .from('lesson_homework')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('user_id', user_id)
      .single();

    if (error) {
      // Если ДЗ не найдено - это нормально (ученик еще не сдавал)
      if (error.code === 'PGRST116') {
        return res.json({ homework: null });
      }
      console.error('❌ [Homework] Ошибка:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ [Homework] ДЗ найдено:', data?.id);
    res.json({ homework: data });
  } catch (error: any) {
    console.error('❌ [Homework] Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tripwire/homework/:lessonId
 * Сдать/обновить домашнее задание
 */
router.post('/homework/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { user_id, homework_text } = req.body;

    if (!user_id || !homework_text) {
      return res.status(400).json({ error: 'user_id and homework_text are required' });
    }

    console.log('📚 [Homework] Сохраняем ДЗ для урока:', lessonId, 'ученик:', user_id);

    // Проверяем существует ли уже ДЗ (для обновления)
    const { data: existing } = await tripwireAdminSupabase
      .from('lesson_homework')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('user_id', user_id)
      .single();

    if (existing) {
      // Обновляем существующее ДЗ
      const { data, error } = await tripwireAdminSupabase
        .from('lesson_homework')
        .update({
          homework_text,
          status: 'submitted',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('❌ [Homework] Ошибка обновления:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('✅ [Homework] ДЗ обновлено:', data.id);
      return res.json({ success: true, homework: data });
    } else {
      // Создаем новое ДЗ
      const { data, error } = await tripwireAdminSupabase
        .from('lesson_homework')
        .insert({
          user_id,
          lesson_id: parseInt(lessonId),
          homework_text,
          status: 'submitted'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [Homework] Ошибка создания:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('✅ [Homework] ДЗ создано:', data.id);
      return res.json({ success: true, homework: data });
    }
  } catch (error: any) {
    console.error('❌ [Homework] Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tripwire/homework/student/:userId
 * Получить все домашние задания ученика (для админа)
 */
router.get('/homework/student/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('📚 [Homework] Получаем все ДЗ ученика:', userId);

    const { data, error } = await tripwireAdminSupabase
      .from('lesson_homework')
      .select(`
        *,
        lessons:lesson_id (
          id,
          title,
          module_id
        )
      `)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('❌ [Homework] Ошибка:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ [Homework] Найдено ДЗ: ${data?.length || 0}`);
    res.json({ homeworks: data || [] });
  } catch (error: any) {
    console.error('❌ [Homework] Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
