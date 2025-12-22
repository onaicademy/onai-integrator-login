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
  // ✅ FIX: Используем MOCK_MODE env var для явного указания
  if (process.env.MOCK_MODE === 'true') {
    return 'mock';
  }
  
  // Или если NODE_ENV = development
  if (process.env.NODE_ENV === 'development') {
    return 'mock';
  }
  
  // Или если мы на localhost (проверка через hostname)
  if (process.env.API_URL?.includes('localhost') || process.env.API_URL?.includes('127.0.0.1')) {
    return 'mock';
  }
  
  return 'production';
};

const mode = getMode();
console.log(`[DB LAYER] Using ${mode} mode`);

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
    const { data, error } = await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || {
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
    const { data, error } = await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .upsert(
        { user_id: userId, ...settings, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
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
