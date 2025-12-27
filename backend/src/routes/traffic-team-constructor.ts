/**
 * Traffic Team Constructor API
 * 
 * CRUD operations для управления командами и пользователями
 */

import { Router, Request, Response } from 'express';
import { trafficSupabase } from '../config/supabase-traffic.js';
import bcrypt from 'bcrypt';
import { syncHistoricalData } from '../services/retroactiveSyncService.js';

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
    const { data: teams, error } = await trafficSupabase
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
    const { name, direction, color, emoji } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'name is required'
      });
    }

    // Проверить что команда с таким именем не существует
    const { data: existing } = await trafficSupabase
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
    const { data, error } = await trafficSupabase
      .from('traffic_teams')
      .insert({
        name,
        direction: direction || null,
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
    const { data: users } = await trafficSupabase
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
    const { error } = await trafficSupabase
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
    const { data: users, error } = await trafficSupabase
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
 * 
 * ✅ AUTO-CREATES entries in:
 *   - traffic_users
 *   - traffic_targetologists  
 *   - traffic_targetologist_settings
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

    const normalizedEmail = email.trim().toLowerCase();
    const userRole = role || 'targetologist';

    // 🔥 AUTO-GENERATE UTM SOURCE
    const utmSource = `fb_${team.toLowerCase()}`;
    console.log(`🎯 Auto-generated UTM source: ${utmSource}`);

    // Проверить что email уникален в traffic_users
    const { data: existing } = await trafficSupabase
      .from('traffic_users')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Пользователь с email "${email}" уже существует`
      });
    }

    // Хешировать пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1️⃣ Создать пользователя в traffic_users
    const { data, error } = await trafficSupabase
      .from('traffic_users')
      .insert({
        email: normalizedEmail,
        full_name: fullName,
        team_name: team,
        password_hash: hashedPassword,
        role: userRole
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ User "${normalizedEmail}" created in traffic_users`);

    // 2️⃣ AUTO-CREATE entry in traffic_targetologist_settings with LOCKED UTM
    try {
      const { error: settingsError } = await trafficSupabase
        .from('traffic_targetologist_settings')
        .upsert({
          user_id: data.id,
          fb_ad_accounts: [],
          tracked_campaigns: [],
          utm_source: utmSource, // 🔐 Auto-generated UTM source
          utm_medium: 'cpc',
          utm_templates: {
            utm_source: utmSource,
            utm_medium: 'cpc',
            utm_campaign: '{campaign_name}',
            utm_content: '{ad_set_name}',
            utm_term: '{ad_name}'
          },
          notification_email: null,
          notification_telegram: null,
          report_frequency: 'daily',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (settingsError) {
        console.warn(`⚠️ Failed to auto-create traffic_targetologist_settings entry:`, settingsError.message);
      } else {
        console.log(`✅ Auto-created traffic_targetologist_settings with locked UTM: ${utmSource}`);
      }
    } catch (sErr: any) {
      console.warn(`⚠️ Error auto-creating traffic_targetologist_settings:`, sErr.message);
    }

    // 4️⃣ TRIGGER RETROACTIVE SYNC (Time Machine)
    console.log(`🕐 Triggering retroactive sync for ${utmSource}...`);
    const syncResult = await syncHistoricalData(data.id, utmSource);
    
    if (syncResult.success) {
      console.log(`✅ Retroactive sync completed: ${syncResult.trafficStatsUpdated} stats updated`);
    } else {
      console.warn(`⚠️ Retroactive sync failed: ${syncResult.error}`);
    }

    res.json({
      success: true,
      user: {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        team: data.team_name,
        role: data.role
      },
      autoCreated: {
        traffic_users: true,
        traffic_targetologist_settings: true
      },
      utmSource: utmSource,
      retroactiveSync: {
        triggered: true,
        success: syncResult.success,
        trafficStatsUpdated: syncResult.trafficStatsUpdated,
        salesUpdated: syncResult.salesUpdated,
        leadsUpdated: syncResult.leadsUpdated,
        syncDurationMs: syncResult.syncDurationMs,
        error: syncResult.error
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
    const { error } = await trafficSupabase
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
