// @ts-nocheck
/**
 * Traffic Dashboard Admin Settings Routes
 * 
 * Admin-only routes for managing system settings and users
 */

import express from 'express';
import { authenticateToken } from './traffic-auth.js';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';

const router = express.Router();

// 🔒 Middleware: Admin only access
function adminOnly(req: any, res: any, next: any) {
  if (req.user.role !== 'admin') {
    console.log(`⛔ Access denied: ${req.user.email} is not admin`);
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ⚙️ GET /api/traffic-admin/settings
// Get all system settings
router.get('/settings', authenticateToken, adminOnly, async (req, res) => {
  try {
    console.log('⚙️ Fetching admin settings');
    
    const { data: settings, error } = await trafficAdminSupabase
      .from('traffic_admin_settings')
      .select('*')
      .order('setting_key');
    
    if (error) {
      console.error('❌ Error fetching settings:', error);
      throw error;
    }
    
    console.log(`✅ Found ${settings?.length || 0} settings`);
    
    res.json({ settings: settings || [] });
  } catch (error) {
    console.error('❌ Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// 📝 PUT /api/traffic-admin/settings/:key
// Update a specific setting
router.put('/settings/:key', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (!value) {
      return res.status(400).json({ error: 'Value is required' });
    }
    
    console.log(`📝 Updating setting: ${key}`);
    
    const { data, error } = await trafficAdminSupabase
      .from('traffic_admin_settings')
      .update({ 
        setting_value: value,
        updated_by: req.user.userId,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', key)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error updating setting:', error);
      throw error;
    }
    
    console.log(`✅ Setting updated: ${key}`);
    
    res.json({ success: true, setting: data });
  } catch (error) {
    console.error('❌ Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// 📋 POST /api/traffic-admin/settings
// Create a new setting
router.post('/settings', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { setting_key, setting_value, description } = req.body;
    
    if (!setting_key || !setting_value) {
      return res.status(400).json({ error: 'setting_key and setting_value are required' });
    }
    
    console.log(`📋 Creating new setting: ${setting_key}`);
    
    const { data, error } = await trafficAdminSupabase
      .from('traffic_admin_settings')
      .insert({
        setting_key,
        setting_value,
        description,
        updated_by: req.user.userId
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating setting:', error);
      throw error;
    }
    
    console.log(`✅ Setting created: ${setting_key}`);
    
    res.json({ success: true, setting: data });
  } catch (error) {
    console.error('❌ Create setting error:', error);
    res.status(500).json({ error: 'Failed to create setting' });
  }
});

// 👥 GET /api/traffic-admin/users
// Get all traffic users
router.get('/users', authenticateToken, adminOnly, async (req, res) => {
  try {
    console.log('👥 Fetching all traffic users');
    
    const { data: users, error } = await trafficAdminSupabase
      .from('traffic_users')
      .select('id, email, full_name, team_name, role, is_active, last_login_at, created_at')
      .order('team_name')
      .order('full_name');
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      throw error;
    }
    
    console.log(`✅ Found ${users?.length || 0} users`);
    
    res.json({ users: users || [] });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// 👤 PUT /api/traffic-admin/users/:id
// Update user details (admin can change role, activate/deactivate)
router.put('/users/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, team_name, role, is_active } = req.body;
    
    console.log(`👤 Updating user: ${id}`);
    
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (full_name !== undefined) updateData.full_name = full_name;
    if (team_name !== undefined) updateData.team_name = team_name;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const { data, error } = await trafficAdminSupabase
      .from('traffic_users')
      .update(updateData)
      .eq('id', id)
      .select('id, email, full_name, team_name, role, is_active')
      .single();
    
    if (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
    
    console.log(`✅ User updated: ${data.email}`);
    
    res.json({ success: true, user: data });
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// 📊 GET /api/traffic-admin/dashboard-stats
// Get overall dashboard statistics for admin
router.get('/dashboard-stats', authenticateToken, adminOnly, async (req, res) => {
  try {
    console.log('📊 Fetching dashboard stats');
    
    // Get user counts
    const { data: users } = await trafficAdminSupabase
      .from('traffic_users')
      .select('role, is_active');
    
    // Get plan counts
    const { data: plans } = await trafficAdminSupabase
      .from('traffic_weekly_plans')
      .select('status, completion_percentage');
    
    // Get teams count
    const { data: teams } = await trafficAdminSupabase
      .from('traffic_teams')
      .select('id, name');
    
    // Get settings count
    const { data: settings } = await trafficAdminSupabase
      .from('traffic_admin_settings')
      .select('id');
    
    const stats = {
      users: {
        total: users?.length || 0,
        active: users?.filter(u => u.is_active).length || 0,
        admins: users?.filter(u => u.role === 'admin').length || 0,
        targetologists: users?.filter(u => u.role === 'targetologist').length || 0
      },
      plans: {
        total: plans?.length || 0,
        inProgress: plans?.filter(p => p.status === 'in_progress').length || 0,
        completed: plans?.filter(p => p.status === 'completed').length || 0,
        failed: plans?.filter(p => p.status === 'failed').length || 0,
        averageCompletion: plans?.length 
          ? Math.round(plans.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / plans.length)
          : 0
      },
      teams: {
        total: teams?.length || 0
      },
      settings: {
        total: settings?.length || 0
      }
    };
    
    console.log(`✅ Dashboard stats: ${stats.users.total} users, ${stats.plans.total} plans`);
    
    res.json({ stats });
  } catch (error) {
    console.error('❌ Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
});

// 🔄 POST /api/traffic-admin/generate-all-plans
// Generate weekly plans for all teams (DYNAMIC from DB)
router.post('/generate-all-plans', authenticateToken, adminOnly, async (req, res) => {
  try {
    console.log('🔄 Generating plans for all teams (dynamic from DB)');

    // Get teams dynamically from database
    const { data: teamsData, error: teamsError } = await trafficAdminSupabase
      .from('traffic_teams')
      .select('name')
      .eq('is_active', true)
      .order('name');

    if (teamsError) {
      console.error('❌ Error fetching teams:', teamsError);
      // Fallback: get unique team_name from traffic_users
      const { data: usersTeams } = await trafficAdminSupabase
        .from('traffic_users')
        .select('team_name')
        .eq('is_active', true)
        .not('team_name', 'is', null);

      const uniqueTeams = [...new Set(usersTeams?.map(u => u.team_name).filter(Boolean) || [])];
      console.log(`📋 Fallback: found ${uniqueTeams.length} teams from users`);
      var teams = uniqueTeams;
    } else {
      var teams = teamsData?.map(t => t.name) || [];
    }

    if (teams.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active teams found in database. Please add teams first.'
      });
    }

    console.log(`📋 Found ${teams.length} teams: ${teams.join(', ')}`);

    const results: any[] = [];

    // Import dynamically
    const { calculateWeeklyPlan } = await import('../services/trafficPlanService.js');

    for (const team of teams) {
      try {
        const plan = await calculateWeeklyPlan(team);
        results.push({ team, success: true, plan });
        console.log(`✅ Plan generated for ${team}`);
      } catch (error: any) {
        console.error(`❌ Failed to generate plan for ${team}:`, error);
        results.push({ team, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Generated ${successCount}/${teams.length} plans`);

    res.json({
      success: true,
      results,
      summary: {
        total: teams.length,
        successful: successCount,
        failed: teams.length - successCount
      }
    });
  } catch (error) {
    console.error('❌ Generate all plans error:', error);
    res.status(500).json({ error: 'Failed to generate plans' });
  }
});

// 📋 GET /api/traffic-admin/teams
// Get all teams (dynamic)
router.get('/teams', authenticateToken, adminOnly, async (req, res) => {
  try {
    console.log('📋 Fetching all teams');

    // Try to get from traffic_teams table first
    const { data: teams, error } = await trafficAdminSupabase
      .from('v_teams_with_stats')
      .select('*');

    if (error) {
      // Fallback: aggregate from traffic_users
      console.warn('⚠️ v_teams_with_stats not available, using fallback');
      const { data: users } = await trafficAdminSupabase
        .from('traffic_users')
        .select('team_name, role, is_active, last_login_at')
        .eq('is_active', true)
        .not('team_name', 'is', null);

      const teamMap: Record<string, any> = {};
      users?.forEach(u => {
        if (!teamMap[u.team_name]) {
          teamMap[u.team_name] = {
            name: u.team_name,
            display_name: u.team_name,
            user_count: 0,
            targetologist_count: 0,
            is_active: true
          };
        }
        teamMap[u.team_name].user_count++;
        if (u.role === 'targetologist') {
          teamMap[u.team_name].targetologist_count++;
        }
      });

      return res.json({ teams: Object.values(teamMap) });
    }

    res.json({ teams: teams || [] });
  } catch (error) {
    console.error('❌ Get teams error:', error);
    res.status(500).json({ error: 'Failed to get teams' });
  }
});

// 📝 POST /api/traffic-admin/teams
// Create a new team
router.post('/teams', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { name, display_name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    console.log(`📝 Creating team: ${name}`);

    const { data, error } = await trafficAdminSupabase
      .from('traffic_teams')
      .insert({
        name,
        display_name: display_name || name,
        description,
        color: color || '#00FF88',
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating team:', error);
      throw error;
    }

    res.json({ success: true, team: data });
  } catch (error) {
    console.error('❌ Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// 🔗 GET /api/traffic-admin/ad-account-bindings
// Get all ad account bindings
router.get('/ad-account-bindings', authenticateToken, adminOnly, async (req, res) => {
  try {
    console.log('🔗 Fetching ad account bindings');

    const { data, error } = await trafficAdminSupabase
      .from('v_ad_account_bindings')
      .select('*');

    if (error) {
      // Fallback if view doesn't exist
      const { data: bindings } = await trafficAdminSupabase
        .from('traffic_ad_account_bindings')
        .select('*')
        .eq('is_active', true);

      return res.json({ bindings: bindings || [] });
    }

    res.json({ bindings: data || [] });
  } catch (error) {
    console.error('❌ Get ad account bindings error:', error);
    res.status(500).json({ error: 'Failed to get ad account bindings' });
  }
});

// 🔗 POST /api/traffic-admin/ad-account-bindings
// Create ad account binding
router.post('/ad-account-bindings', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { ad_account_id, team_name, ad_platform = 'facebook', notes } = req.body;

    if (!ad_account_id || !team_name) {
      return res.status(400).json({
        error: 'ad_account_id and team_name are required',
        hint: 'ad_account_id format: act_123456789'
      });
    }

    // Validate ad_account_id format
    if (!ad_account_id.startsWith('act_')) {
      return res.status(400).json({
        error: 'Invalid ad_account_id format',
        hint: 'Facebook Ad Account ID should start with "act_" (e.g., act_123456789)'
      });
    }

    console.log(`🔗 Creating ad account binding: ${ad_account_id} -> ${team_name}`);

    const { data, error } = await trafficAdminSupabase
      .from('traffic_ad_account_bindings')
      .insert({
        ad_account_id,
        team_name,
        ad_platform,
        notes,
        created_by: req.user.userId,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({
          error: 'This ad account is already bound to a team',
          hint: 'Each ad account can only be bound to one team'
        });
      }
      throw error;
    }

    res.json({ success: true, binding: data });
  } catch (error) {
    console.error('❌ Create ad account binding error:', error);
    res.status(500).json({ error: 'Failed to create ad account binding' });
  }
});

// 🗑️ DELETE /api/traffic-admin/ad-account-bindings/:id
// Remove ad account binding
router.delete('/ad-account-bindings/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Removing ad account binding: ${id}`);

    const { error } = await trafficAdminSupabase
      .from('traffic_ad_account_bindings')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Remove ad account binding error:', error);
    res.status(500).json({ error: 'Failed to remove ad account binding' });
  }
});

export default router;


