/**
 * Traffic Team Constructor API
 * 
 * CRUD operations для управления командами и пользователями
 */

import { Router, Request, Response } from 'express';
import { tripwireSupabase } from '../config/supabase-tripwire.js';
import bcrypt from 'bcrypt';

const router = Router();

// ============================================
// TEAMS
// ============================================

/**
 * GET /api/traffic-constructor/teams
 * Получить все команды
 */
router.get('/teams', async (req: Request, res: Response) => {
  try {
    const { data: teams, error } = await tripwireSupabase
      .from('traffic_teams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      teams: teams || []
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch teams:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/traffic-constructor/teams
 * Создать новую команду
 */
router.post('/teams', async (req: Request, res: Response) => {
  try {
    const { name, company, direction, fbAdAccountId, color, emoji } = req.body;

    if (!name || !company || !direction) {
      return res.status(400).json({
        success: false,
        error: 'name, company, direction are required'
      });
    }

    // Проверить что команда с таким именем не существует
    const { data: existing } = await tripwireSupabase
      .from('traffic_teams')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Команда с именем "${name}" уже существует`
      });
    }

    // Создать команду
    const { data, error } = await tripwireSupabase
      .from('traffic_teams')
      .insert({
        name,
        company,
        direction,
        fb_ad_account_id: fbAdAccountId,
        color: color || '#00FF88',
        emoji: emoji || '📊'
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Team "${name}" created`);

    res.json({
      success: true,
      team: data
    });
  } catch (error: any) {
    console.error('❌ Failed to create team:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/traffic-constructor/teams/:id
 * Удалить команду
 */
router.delete('/teams/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Проверить что в команде нет пользователей
    const { data: users } = await tripwireSupabase
      .from('traffic_users')
      .select('id')
      .eq('team_id', id);

    if (users && users.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Невозможно удалить команду с пользователями. Сначала удалите всех пользователей.'
      });
    }

    // Удалить команду
    const { error } = await tripwireSupabase
      .from('traffic_teams')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log(`✅ Team ${id} deleted`);

    res.json({
      success: true
    });
  } catch (error: any) {
    console.error('❌ Failed to delete team:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// USERS
// ============================================

/**
 * GET /api/traffic-constructor/users
 * Получить всех пользователей
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { data: users, error } = await tripwireSupabase
      .from('traffic_users')
      .select('id, email, full_name, team_name, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Rename fields
    const formattedUsers = (users || []).map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      team: user.team_name,
      role: user.role,
      created_at: user.created_at
    }));

    res.json({
      success: true,
      users: formattedUsers
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch users:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/traffic-constructor/users
 * Создать нового пользователя
 */
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { email, fullName, team, password, role } = req.body;

    if (!email || !fullName || !team || !password) {
      return res.status(400).json({
        success: false,
        error: 'email, fullName, team, password are required'
      });
    }

    // Проверить что email уникален
    const { data: existing } = await tripwireSupabase
      .from('traffic_users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Пользователь с email "${email}" уже существует`
      });
    }

    // Хешировать пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создать пользователя
    const { data, error } = await tripwireSupabase
      .from('traffic_users')
      .insert({
        email: email.trim().toLowerCase(),
        full_name: fullName,
        team_name: team,
        password_hash: hashedPassword,
        role: role || 'targetologist'
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ User "${email}" created`);

    res.json({
      success: true,
      user: {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        team: data.team_name,
        role: data.role
      }
    });
  } catch (error: any) {
    console.error('❌ Failed to create user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/traffic-constructor/users/:id
 * Удалить пользователя
 */
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Удалить пользователя
    const { error } = await tripwireSupabase
      .from('traffic_users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log(`✅ User ${id} deleted`);

    res.json({
      success: true
    });
  } catch (error: any) {
    console.error('❌ Failed to delete user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
