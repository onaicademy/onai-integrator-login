/**
 * Traffic Team Constructor API
 *
 * CRUD operations для управления командами и пользователями
 *
 * ENHANCED: Supports utm_medium, analyst role, extended user info
 */

import { Router, Request, Response } from 'express';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';
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
    const { data: teams, error } = await trafficAdminSupabase
      .from('traffic_teams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      teams: teams || []
    });
  } catch (error: any) {
    console.error('Failed to fetch teams:', error);
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
    const { data: existing } = await trafficAdminSupabase
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
    const { data, error } = await trafficAdminSupabase
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

    console.log(`Team "${name}" created`);

    res.json({
      success: true,
      team: data
    });
  } catch (error: any) {
    console.error('Failed to create team:', error);
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
    const { data: users } = await trafficAdminSupabase
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
    const { error } = await trafficAdminSupabase
      .from('traffic_teams')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log(`Team ${id} deleted`);

    res.json({
      success: true
    });
  } catch (error: any) {
    console.error('Failed to delete team:', error);
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
 * Получить всех пользователей с полной информацией
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    // Basic user fields (guaranteed to exist)
    const { data: users, error } = await trafficAdminSupabase
      .from('traffic_users')
      .select('id, email, full_name, team_name, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch settings for each user to get UTM info
    const userIds = (users || []).map(u => u.id);
    let settingsMap = new Map<string, any>();

    if (userIds.length > 0) {
      const { data: settings } = await trafficAdminSupabase
        .from('traffic_targetologist_settings')
        .select('user_id, utm_source, utm_medium, tracking_by, fb_ad_accounts, tracked_campaigns')
        .in('user_id', userIds);

      settingsMap = new Map((settings || []).map(s => [s.user_id, s]));
    }

    // Rename fields and merge with settings
    const formattedUsers = (users || []).map(user => {
      const userSettings = settingsMap.get(user.id);
      return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        team: user.team_name,
        role: user.role,
        utmSource: userSettings?.utm_source || null,
        utmMedium: userSettings?.utm_medium || 'cpc',
        trackingBy: userSettings?.tracking_by || 'utm_source',
        funnelType: 'express', // Default, can be extended later
        autoSyncEnabled: true,
        fbAdAccountsCount: userSettings?.fb_ad_accounts?.length || 0,
        trackedCampaignsCount: userSettings?.tracked_campaigns?.length || 0,
        created_at: user.created_at
      };
    });

    res.json({
      success: true,
      users: formattedUsers
    });
  } catch (error: any) {
    console.error('Failed to fetch users:', error);
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
 * AUTO-CREATES entries in:
 *   - traffic_users
 *   - traffic_targetologist_settings
 *
 * ENHANCED: Supports utm_medium, analyst role
 */
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { email, fullName, team, password, role, utm_source, utm_medium, tracking_by, funnel_type } = req.body;

    if (!email || !fullName || !team || !password) {
      return res.status(400).json({
        success: false,
        error: 'email, fullName, team, password are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Support for analyst role
    const validRoles = ['targetologist', 'analyst', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'targetologist';

    // AUTO-GENERATE UTM SOURCE if not provided
    const finalUtmSource = utm_source || `fb_${team.toLowerCase()}`;
    const finalUtmMedium = utm_medium || 'cpc'; // Support for utm_medium
    const finalTrackingBy = tracking_by === 'utm_medium' ? 'utm_medium' : 'utm_source'; // Default to utm_source
    const finalFunnelType = funnel_type || 'express'; // Default to express

    console.log(`UTM source: ${finalUtmSource}, Medium: ${finalUtmMedium}, Tracking by: ${finalTrackingBy}, Funnel: ${finalFunnelType}`);

    // Проверить что email уникален в traffic_users
    const { data: existing } = await trafficAdminSupabase
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

    // 1. Создать пользователя в traffic_users с UTM и funnel_type
    const { data, error } = await trafficAdminSupabase
      .from('traffic_users')
      .insert({
        email: normalizedEmail,
        full_name: fullName,
        team_name: team,
        password_hash: hashedPassword,
        role: userRole,
        utm_source: finalUtmSource,
        funnel_type: finalFunnelType
        // NOTE: auto_sync_enabled removed - column doesn't exist yet
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`User "${normalizedEmail}" created with UTM "${finalUtmSource}" and funnel "${finalFunnelType}"`);

    // 2. AUTO-CREATE entry in traffic_targetologist_settings with LOCKED UTM
    try {
      const { error: settingsError } = await trafficAdminSupabase
        .from('traffic_targetologist_settings')
        .upsert({
          user_id: data.id,
          fb_ad_accounts: [],
          tracked_campaigns: [],
          utm_source: finalUtmSource,
          utm_medium: finalUtmMedium,
          tracking_by: finalTrackingBy, // По какому полю трекаем (utm_source/utm_medium)
          utm_templates: {
            utm_source: finalUtmSource,
            utm_medium: finalUtmMedium,
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
        console.warn(`Failed to auto-create traffic_targetologist_settings entry:`, settingsError.message);
      } else {
        console.log(`Auto-created traffic_targetologist_settings with UTM: ${finalUtmSource}, Medium: ${finalUtmMedium}, Tracking by: ${finalTrackingBy}`);
      }
    } catch (sErr: any) {
      console.warn(`Error auto-creating traffic_targetologist_settings:`, sErr.message);
    }

    // 3. TRIGGER RETROACTIVE SYNC (Time Machine)
    console.log(`Triggering retroactive sync for ${finalUtmSource}...`);
    const syncResult = await syncHistoricalData(data.id, finalUtmSource);

    if (syncResult.success) {
      console.log(`Retroactive sync completed: ${syncResult.trafficStatsUpdated} stats updated`);
    } else {
      console.warn(`Retroactive sync failed: ${syncResult.error}`);
    }

    res.json({
      success: true,
      user: {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        team: data.team_name,
        role: data.role,
        utmSource: finalUtmSource,
        utmMedium: finalUtmMedium,
        trackingBy: finalTrackingBy,
        funnelType: finalFunnelType
      },
      autoCreated: {
        traffic_users: true,
        traffic_targetologist_settings: true
      },
      utmSource: finalUtmSource,
      utmMedium: finalUtmMedium,
      trackingBy: finalTrackingBy,
      funnelType: finalFunnelType,
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
    console.error('Failed to create user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/traffic-constructor/users/:id
 * Обновить пользователя (для analyst роли - можно менять UTM)
 */
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { utm_source, utm_medium, funnel_type, role, team } = req.body;

    // Собрать обновления для traffic_users
    const userUpdates: Record<string, any> = {};
    if (utm_source !== undefined) userUpdates.utm_source = utm_source;
    if (funnel_type !== undefined) userUpdates.funnel_type = funnel_type;
    if (role !== undefined) userUpdates.role = role;
    if (team !== undefined) userUpdates.team_name = team;

    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await trafficAdminSupabase
        .from('traffic_users')
        .update(userUpdates)
        .eq('id', id);

      if (userError) throw userError;
    }

    // Собрать обновления для traffic_targetologist_settings
    const settingsUpdates: Record<string, any> = {};
    if (utm_source !== undefined) settingsUpdates.utm_source = utm_source;
    if (utm_medium !== undefined) settingsUpdates.utm_medium = utm_medium;

    if (Object.keys(settingsUpdates).length > 0) {
      settingsUpdates.updated_at = new Date().toISOString();

      const { error: settingsError } = await trafficAdminSupabase
        .from('traffic_targetologist_settings')
        .update(settingsUpdates)
        .eq('user_id', id);

      if (settingsError) {
        console.warn(`Failed to update settings:`, settingsError.message);
      }
    }

    console.log(`User ${id} updated`);

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error: any) {
    console.error('Failed to update user:', error);
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
    const { error } = await trafficAdminSupabase
      .from('traffic_users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log(`User ${id} deleted`);

    res.json({
      success: true
    });
  } catch (error: any) {
    console.error('Failed to delete user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/traffic-constructor/roles
 * Получить список доступных ролей
 */
router.get('/roles', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    roles: [
      { value: 'targetologist', label: 'Таргетолог', description: 'Работает с рекламными кампаниями' },
      { value: 'analyst', label: 'Аналитик', description: 'Может редактировать UTM метки' },
      { value: 'admin', label: 'Администратор', description: 'Полный доступ к системе' }
    ]
  });
});

export default router;
