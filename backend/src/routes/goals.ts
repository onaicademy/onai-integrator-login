import { Router, Request, Response } from 'express';
import { adminSupabase } from '../config/supabase';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data: goals, error } = await adminSupabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ goals });
  } catch (error: any) {
    console.error('❌ Error fetching goals:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: goal, error } = await adminSupabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ goal });
  } catch (error: any) {
    console.error('❌ Error fetching goal:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { user_id, title, description, status, due_date, priority, category, telegram_reminder, reminder_before } = req.body;

    if (!user_id || !title) {
      return res.status(400).json({ error: 'user_id and title are required' });
    }

    const { data: goal, error } = await adminSupabase
      .from('goals')
      .insert({
        user_id,
        title,
        description,
        status: status || 'todo',
        due_date,
        priority,
        telegram_reminder: telegram_reminder || false,
        reminder_before: reminder_before || 30
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Goal created:', goal.id);
    res.json({ success: true, goal });
  } catch (error: any) {
    console.error('❌ Error creating goal:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, status, due_date, priority, category, telegram_reminder, reminder_before } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category;
    if (telegram_reminder !== undefined) updateData.telegram_reminder = telegram_reminder;
    if (reminder_before !== undefined) updateData.reminder_before = reminder_before;

    const { data: goal, error } = await adminSupabase
      .from('goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Goal updated:', id);
    res.json({ success: true, goal });
  } catch (error: any) {
    console.error('❌ Error updating goal:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await adminSupabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Goal deleted:', id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting goal:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Получаем goal чтобы узнать user_id
    const { data: existingGoal, error: goalError } = await adminSupabase
      .from('goals')
      .select('user_id')
      .eq('id', id)
      .single();

    if (goalError) throw goalError;
    if (!existingGoal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // 2. Обновляем статус goal на 'done'
    const { data: goal, error } = await adminSupabase
      .from('goals')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 3. Проверяем, получал ли пользователь бонус за первое использование Kanban
    const { data: userStats, error: statsError } = await adminSupabase
      .from('user_statistics')
      .select('kanban_first_use_bonus_claimed, total_xp')
      .eq('user_id', existingGoal.user_id)
      .single();

    let xpAwarded = 0;
    let isFirstUseBonus = false;

    if (!statsError && userStats && !userStats.kanban_first_use_bonus_claimed) {
      // 4. ЭТО ПЕРВАЯ ЗАВЕРШЁННАЯ ЗАДАЧА! Даём +20 XP!
      xpAwarded = 20;
      isFirstUseBonus = true;

      const { error: updateError } = await adminSupabase
        .from('user_statistics')
        .update({
          kanban_first_use_bonus_claimed: true,
          total_xp: (userStats.total_xp || 0) + xpAwarded
        })
        .eq('user_id', existingGoal.user_id);

      if (updateError) {
        console.error('❌ Error updating user stats:', updateError);
      } else {
        console.log('🎉 First Kanban use bonus awarded! +20 XP to user:', existingGoal.user_id);
      }
    }

    console.log('✅ Goal completed:', id, isFirstUseBonus ? `(+${xpAwarded} XP бонус за первое использование!)` : '');
    res.json({ 
      success: true, 
      goal,
      xp_awarded: xpAwarded,
      is_first_use_bonus: isFirstUseBonus
    });
  } catch (error: any) {
    console.error('❌ Error completing goal:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/uncomplete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: goal, error } = await adminSupabase
      .from('goals')
      .update({ status: 'todo', completed_at: null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Goal uncompleted:', id);
    res.json({ success: true, goal });
  } catch (error: any) {
    console.error('❌ Error uncompleting goal:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/statistics/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: stats, error } = await adminSupabase.rpc('analyze_user_goals', {
      p_user_id: userId
    });

    if (error) throw error;

    res.json({ statistics: stats });
  } catch (error: any) {
    console.error('❌ Error fetching goal statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/report/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: reports, error } = await adminSupabase
      .from('weekly_goal_reports')
      .select('*')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({ reports });
  } catch (error: any) {
    console.error('❌ Error fetching goal reports:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
