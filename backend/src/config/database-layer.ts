/**
 * 🎯 TRAFFIC DASHBOARD - Database Abstraction Layer
 * 
 * РЕШЕНИЕ SCHEMA CACHE ISSUE:
 * - Localhost: Mock Mode (static data)
 * - Production: Supabase RPC (real database)
 * 
 * @see TRAFFIC-FIXES-COMPLETE.md (FIX #1)
 */

import { trafficAdminSupabase } from './supabase-traffic.js';

type DatabaseMode = 'production' | 'mock';

const getMode = (): DatabaseMode => {
  // ✅ FIX: Explicit MOCK_MODE env var to enable mock
  if (process.env.MOCK_MODE === 'true') {
    return 'mock';
  }
  
  // ✅ PRODUCTION by default unless explicitly set to mock
  // This ensures settings are saved to database on production server
  return 'production';
};

const mode = getMode();
console.log(`[DB LAYER] Using ${mode} mode`);

const resolveTrafficUserId = async (candidateUserId: string): Promise<string> => {
  try {
    // ✅ Validate UUID format before querying (prevents PostgreSQL UUID syntax errors)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(candidateUserId)) {
      console.warn('⚠️ [resolveTrafficUserId] Invalid UUID format:', candidateUserId);
      return candidateUserId;
    }

    const { data: directUser, error: directError } = await trafficAdminSupabase
      .from('traffic_users')
      .select('id')
      .eq('id', candidateUserId)
      .maybeSingle();

    if (!directError && directUser?.id) {
      return directUser.id;
    }

    const { data: targetologist, error: targetologistError } = await trafficAdminSupabase
      .from('traffic_users')
      .select('id,email,full_name,team_name,role,password_hash,is_active')
      .eq('id', candidateUserId)
      .maybeSingle();

    if (targetologistError || !targetologist) {
      return candidateUserId;
    }

    const { data: byEmail, error: byEmailError } = await trafficAdminSupabase
      .from('traffic_users')
      .select('id')
      .eq('email', targetologist.email)
      .maybeSingle();

    if (!byEmailError && byEmail?.id) {
      return byEmail.id;
    }

    const insertPayload = {
      id: targetologist.id,
      email: targetologist.email,
      password_hash: targetologist.password_hash || 'disabled',
      full_name: targetologist.full_name || targetologist.email,
      team_name: targetologist.team_name,
      role: targetologist.role === 'admin' ? 'admin' : 'targetologist',
      is_active: targetologist.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error: insertError } = await trafficAdminSupabase
      .from('traffic_users')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      console.warn('⚠️ [DB] Failed to insert traffic_users record:', insertError);
      return candidateUserId;
    }

    console.log(`✅ [DB] Created traffic_users record for ${targetologist.email}`);
    return created.id;
  } catch (resolveError: any) {
    console.warn('⚠️ [DB] Could not resolve traffic_users id:', resolveError?.message || resolveError);
    return candidateUserId;
  }
};

// ========================================
// MOCK DATA - для localhost тестирования
// ========================================
const mockSettings: Record<string, any> = {
  'Kenesary': {
    user_id: 'Kenesary',
    fb_ad_accounts: [
      {
        id: 'act_123456789',
        name: 'OnAI Academy - Kenesary',
        status: 'active',
        currency: 'USD',
        timezone: 'Asia/Almaty',
        enabled: true,
        connectionStatus: 'connected'
      }
    ],
    tracked_campaigns: [],
    facebook_connected: true,
    personal_utm_source: 'fb_kenesary',
    last_sync_at: new Date().toISOString(),
  },
  'Arystan': {
    user_id: 'Arystan',
    fb_ad_accounts: [],
    tracked_campaigns: [],
    facebook_connected: false,
    personal_utm_source: 'fb_arystan',
  },
  'Traf4': {
    user_id: 'Traf4',
    fb_ad_accounts: [],
    tracked_campaigns: [],
    facebook_connected: false,
    personal_utm_source: 'fb_traf4',
  },
  'Muha': {
    user_id: 'Muha',
    fb_ad_accounts: [],
    tracked_campaigns: [],
    facebook_connected: false,
    personal_utm_source: 'fb_muha',
  },
  'Aidar': {
    user_id: 'Aidar',
    fb_ad_accounts: [],
    tracked_campaigns: [],
    facebook_connected: false,
    personal_utm_source: 'fb_aidar',
  },
  'Sasha': {
    user_id: 'Sasha',
    fb_ad_accounts: [],
    tracked_campaigns: [],
    facebook_connected: false,
    personal_utm_source: 'fb_sasha',
  },
  'Dias': {
    user_id: 'Dias',
    fb_ad_accounts: [],
    tracked_campaigns: [],
    facebook_connected: false,
    personal_utm_source: 'fb_dias',
  },
  'Admin': {
    user_id: 'Admin',
    fb_ad_accounts: [],
    tracked_campaigns: [],
    facebook_connected: false,
    personal_utm_source: 'fb_admin',
  },
};

const mockOnboardingStatus: Record<string, any> = {
  'Kenesary': {
    user_id: 'Kenesary',
    is_completed: false,
    tour_type: 'targetologist',
    current_step: 0,
    steps_completed: [],
  },
};

// ========================================
// DATABASE ABSTRACTION - используется везде
// ========================================

export const database = {
  /**
   * GET settings for user
   */
  async getSettings(userId: string) {
    console.log(`[DB] getSettings: ${userId} (${mode})`);

    if (mode === 'mock') {
      // MOCK MODE
      const settings = mockSettings[userId];
      if (!settings) {
        // Return empty settings if not found
        return {
          user_id: userId,
          fb_ad_accounts: [],
          tracked_campaigns: [],
          facebook_connected: false,
          personal_utm_source: `fb_${userId.toLowerCase()}`,
        };
      }
      return settings;
    }

    // PRODUCTION MODE
    // ✅ Validate UUID format before querying (prevents PostgreSQL UUID syntax errors)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.warn('⚠️ [DB getSettings] Invalid UUID format for userId:', userId, '- returning empty settings');
      return {
        user_id: userId,
        fb_ad_accounts: [],
        tracked_campaigns: [],
        facebook_connected: false,
        personal_utm_source: `fb_${userId.toLowerCase()}`,
      };
    }

    const { data, error } = await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      return data;
    }

    const resolvedUserId = await resolveTrafficUserId(userId);
    if (resolvedUserId !== userId) {
      const { data: resolvedData, error: resolvedError } = await trafficAdminSupabase
        .from('traffic_targetologist_settings')
        .select('*')
        .eq('user_id', resolvedUserId)
        .maybeSingle();

      if (resolvedError && resolvedError.code !== 'PGRST116') {
        throw resolvedError;
      }

      if (resolvedData) {
        return resolvedData;
      }
    }

    return {
      user_id: userId,
      fb_ad_accounts: [],
      tracked_campaigns: [],
      facebook_connected: false,
      personal_utm_source: `fb_${userId.toLowerCase()}`,
    };
  },

  /**
   * UPDATE settings
   */
  async updateSettings(userId: string, settings: any) {
    console.log(`[DB] updateSettings: ${userId} (${mode})`);

    if (mode === 'mock') {
      // MOCK MODE - update in memory
      mockSettings[userId] = {
        ...mockSettings[userId],
        ...settings,
        user_id: userId,
        updated_at: new Date().toISOString()
      };
      console.log(`✅ [MOCK] Updated settings for ${userId}:`, mockSettings[userId]);
      return mockSettings[userId];
    }

    // PRODUCTION MODE
    try {
      const { data: existingDirect } = await trafficAdminSupabase
        .from('traffic_targetologist_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const settingsUserId = existingDirect ? userId : await resolveTrafficUserId(userId);

      const existing = existingDirect
        ? existingDirect
        : (
          await trafficAdminSupabase
            .from('traffic_targetologist_settings')
            .select('*')
            .eq('user_id', settingsUserId)
            .maybeSingle()
        ).data;

      const payload = {
        user_id: settingsUserId,
        ...settings,
        updated_at: new Date().toISOString()
      };

      let data, error;

      if (existing) {
        // Update existing record
        const result = await trafficAdminSupabase
          .from('traffic_targetologist_settings')
          .update(payload)
          .eq('user_id', settingsUserId)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Insert new record
        const result = await trafficAdminSupabase
          .from('traffic_targetologist_settings')
          .insert(payload)
          .select()
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error(`❌ [DB] Error updating settings for ${userId}:`, error);
        throw error;
      }

      console.log(`✅ [DB] Updated settings for ${userId}`);
      return data;
    } catch (err: any) {
      console.error(`❌ [DB] updateSettings failed:`, err);
      throw new Error(`Failed to update settings: ${err.message}`);
    }
  },

  /**
   * GET onboarding status
   */
  async getOnboardingStatus(userId: string) {
    console.log(`[DB] getOnboardingStatus: ${userId} (${mode})`);

    if (mode === 'mock') {
      // MOCK MODE
      const status = mockOnboardingStatus[userId];
      if (!status) {
        return {
          user_id: userId,
          is_completed: false,
          tour_type: 'targetologist',
          current_step: 0,
          steps_completed: [],
        };
      }
      return status;
    }

    // PRODUCTION MODE
    const { data, error } = await trafficAdminSupabase
      .from('traffic_onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || {
      user_id: userId,
      is_completed: false,
      tour_type: 'targetologist',
      current_step: 0,
      steps_completed: [],
    };
  },

  /**
   * UPDATE onboarding status
   */
  async updateOnboardingStatus(userId: string, status: any) {
    console.log(`[DB] updateOnboardingStatus: ${userId} (${mode})`);

    if (mode === 'mock') {
      // MOCK MODE
      mockOnboardingStatus[userId] = {
        ...(mockOnboardingStatus[userId] || {}),
        ...status,
        user_id: userId,
      };
      return mockOnboardingStatus[userId];
    }

    // PRODUCTION MODE
    const { data, error } = await trafficAdminSupabase
      .from('traffic_onboarding_progress')
      .upsert(
        { user_id: userId, ...status, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },
};

export { trafficAdminSupabase };
