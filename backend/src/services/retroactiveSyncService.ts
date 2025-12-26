/**
 * Retroactive Sync Service (Time Machine)
 * 
 * Syncs historical data when assigning UTM sources to users
 * Updates traffic_stats and logs the sync operation
 */

import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import { landingSupabase } from '../config/supabase-landing.js';

interface SyncResult {
  success: boolean;
  userId: string;
  utmSource: string;
  trafficStatsUpdated: number;
  salesUpdated: number;
  leadsUpdated: number;
  syncDurationMs: number;
  error?: string;
}

/**
 * Sync historical data to assign to a specific user
 * 
 * @param userId - User UUID from traffic_users
 * @param utmSource - UTM source to match (e.g., "fb_arystan", "fb_kenesary")
 * @param adminUserId - Admin who triggered the sync (for audit)
 * @returns Sync result with counts
 */
export async function syncHistoricalData(
  userId: string,
  utmSource: string,
  adminUserId?: string
): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    console.log(`🕐 [Time Machine] Starting retroactive sync for user ${userId} with UTM: ${utmSource}`);

    // Get user's team name for traffic_stats update
    const { data: user } = await trafficAdminSupabase
      .from('traffic_users')
      .select('team_name, email')
      .eq('id', userId)
      .single();

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const teamName = user.team_name || 'Unknown';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. UPDATE TRAFFIC_STATS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    // Find all traffic_stats matching the UTM source pattern
    // Note: traffic_stats uses 'team' field (TEXT), not targetologist_id
    const { data: matchingStats, error: statsError } = await landingSupabase
      .from('traffic_stats')
      .select('id, team, campaign_name')
      .or(`team.eq.${utmSource},campaign_name.ilike.%${utmSource}%`);

    if (statsError) {
      console.error('❌ Error querying traffic_stats:', statsError);
      throw statsError;
    }

    let trafficStatsUpdated = 0;

    if (matchingStats && matchingStats.length > 0) {
      // Update team field to user's team_name
      const { error: updateError } = await landingSupabase
        .from('traffic_stats')
        .update({ 
          team: teamName,
          updated_at: new Date().toISOString()
        })
        .in('id', matchingStats.map((s: any) => s.id));

      if (updateError) {
        console.error('❌ Error updating traffic_stats:', updateError);
        throw updateError;
      }

      trafficStatsUpdated = matchingStats.length;
      console.log(`✅ Updated ${trafficStatsUpdated} traffic_stats records to team: ${teamName}`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. UPDATE SALES (if sales tracking exists)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    let salesUpdated = 0;
    // TODO: Implement sales update when sales table schema is confirmed
    // For now, skip sales update

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. UPDATE LEADS (if leads tracking exists)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    let leadsUpdated = 0;
    // TODO: Implement leads update when leads table schema is confirmed
    // For now, skip leads update

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. LOG TO retroactive_sync_logs
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const syncDurationMs = Date.now() - startTime;

    const { error: logError } = await trafficAdminSupabase
      .from('retroactive_sync_logs')
      .insert({
        user_id: userId,
        utm_source: utmSource,
        traffic_stats_updated: trafficStatsUpdated,
        sales_updated: salesUpdated,
        leads_updated: leadsUpdated,
        synced_at: new Date().toISOString(),
        sync_duration_ms: syncDurationMs,
        metadata: {
          team_name: teamName,
          admin_user_id: adminUserId,
          triggered_by: 'constructor'
        }
      });

    if (logError) {
      console.error('❌ Error logging to retroactive_sync_logs:', logError);
      // Don't throw - logging failure shouldn't break the sync
    } else {
      console.log(`✅ Logged retroactive sync to database`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. UPDATE last_synced_at in settings
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const { error: settingsError } = await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (settingsError) {
      console.warn('⚠️ Failed to update last_synced_at:', settingsError);
    }

    console.log(`✅ [Time Machine] Sync completed in ${syncDurationMs}ms`);
    console.log(`📊 Stats: ${trafficStatsUpdated} traffic_stats, ${salesUpdated} sales, ${leadsUpdated} leads`);

    return {
      success: true,
      userId,
      utmSource,
      trafficStatsUpdated,
      salesUpdated,
      leadsUpdated,
      syncDurationMs
    };

  } catch (error: any) {
    const syncDurationMs = Date.now() - startTime;
    console.error(`❌ [Time Machine] Sync failed after ${syncDurationMs}ms:`, error);

    return {
      success: false,
      userId,
      utmSource,
      trafficStatsUpdated: 0,
      salesUpdated: 0,
      leadsUpdated: 0,
      syncDurationMs,
      error: error.message
    };
  }
}

/**
 * Get sync history for a user
 */
export async function getSyncHistory(userId: string) {
  try {
    const { data, error } = await trafficAdminSupabase
      .from('retroactive_sync_logs')
      .select('*')
      .eq('user_id', userId)
      .order('synced_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return { success: true, logs: data || [] };
  } catch (error: any) {
    console.error('❌ Failed to get sync history:', error);
    return { success: false, error: error.message, logs: [] };
  }
}
