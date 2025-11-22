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
      .from('user_goals')
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
      .from('user_goals')
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
    const { user_id, title, description, status, due_date, priority, category } = req.body;

    if (!user_id || !title) {
      return res.status(400).json({ error: 'user_id and title are required' });
    }

    const { data: goal, error } = await adminSupabase
      .from('user_goals')
      .insert({
        user_id,
        title,
        description,
        status: status || 'todo',
        due_date,
        priority,
        category
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
    const { title, description, status, due_date, priority, category } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category;

    const { data: goal, error } = await adminSupabase
      .from('user_goals')
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
      .from('user_goals')
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

    const { data: goal, error } = await adminSupabase
      .from('user_goals')
      .update({ status: 'done' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Goal completed:', id);
    res.json({ success: true, goal });
  } catch (error: any) {
    console.error('❌ Error completing goal:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/uncomplete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: goal, error } = await adminSupabase
      .from('user_goals')
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
