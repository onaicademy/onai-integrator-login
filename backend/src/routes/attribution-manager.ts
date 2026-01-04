/**
 * Attribution Manager API Routes
 * Manages unassigned traffic and ad account mappings
 */

import express from 'express';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import { authenticateTrafficJWT } from '../middleware/traffic-auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateTrafficJWT);

/**
 * GET /api/attribution/unassigned
 * Fetch traffic stats where team is 'Unassigned'
 */
router.get('/unassigned', async (req, res) => {
  try {
    const { startDate, endDate, limit = 100, offset = 0 } = req.query;

    let query = trafficAdminSupabase
      .from('traffic_stats')
      .select('stat_date, campaign_id, campaign_name, ad_account_id, spend_usd, spend_kzt, impressions, clicks, team, user_id')
      .eq('team', 'Unassigned')
      .order('stat_date', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (startDate) {
      query = query.gte('stat_date', startDate);
    }
    if (endDate) {
      query = query.lte('stat_date', endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Attribution API] Error fetching unassigned:', error);
      return res.status(500).json({ error: 'Failed to fetch unassigned traffic' });
    }

    // Aggregate by campaign
    const campaignMap = new Map<string, any>();
    data?.forEach((row) => {
      const key = row.campaign_id;
      if (!campaignMap.has(key)) {
        campaignMap.set(key, {
          campaign_id: row.campaign_id,
          campaign_name: row.campaign_name,
          ad_account_id: row.ad_account_id,
          user_id: row.user_id,
          total_spend_usd: 0,
          total_spend_kzt: 0,
          total_impressions: 0,
          total_clicks: 0,
          first_date: row.stat_date,
          last_date: row.stat_date,
          record_count: 0,
        });
      }
      const agg = campaignMap.get(key);
      agg.total_spend_usd += row.spend_usd || 0;
      agg.total_spend_kzt += row.spend_kzt || 0;
      agg.total_impressions += row.impressions || 0;
      agg.total_clicks += row.clicks || 0;
      agg.record_count += 1;
      if (row.stat_date < agg.first_date) agg.first_date = row.stat_date;
      if (row.stat_date > agg.last_date) agg.last_date = row.stat_date;
    });

    const aggregated = Array.from(campaignMap.values());

    res.json({
      success: true,
      data: aggregated,
      total: count || data?.length || 0,
    });
  } catch (error: any) {
    console.error('[Attribution API] Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/attribution/assign
 * Manually assign unassigned traffic to a team
 * Body: { campaignId: string, teamName: string, userId?: string, reason?: string }
 */
router.post('/assign', async (req, res) => {
  try {
    const { campaignId, teamName, userId, reason } = req.body;
    const adminEmail = (req as any).user?.email || 'unknown';
    const adminUserId = (req as any).user?.userId;

    if (!campaignId || !teamName) {
      return res.status(400).json({ error: 'campaignId and teamName are required' });
    }

    // Fetch current records with team='Unassigned' for this campaign
    const { data: oldRecords, error: fetchError } = await trafficAdminSupabase
      .from('traffic_stats')
      .select('stat_date, campaign_id, team, user_id')
      .eq('campaign_id', campaignId)
      .eq('team', 'Unassigned');

    if (fetchError) {
      console.error('[Attribution API] Error fetching records:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch records' });
    }

    if (!oldRecords || oldRecords.length === 0) {
      return res.status(404).json({ error: 'No unassigned records found for this campaign' });
    }

    // Update team for all matching records
    const { error: updateError } = await trafficAdminSupabase
      .from('traffic_stats')
      .update({ team: teamName, updated_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)
      .eq('team', 'Unassigned');

    if (updateError) {
      console.error('[Attribution API] Error updating records:', updateError);
      return res.status(500).json({ error: 'Failed to update records' });
    }

    // Log the manual attribution
    const logEntries = oldRecords.map((record) => ({
      admin_user_id: adminUserId,
      admin_email: adminEmail,
      stat_date: record.stat_date,
      campaign_id: record.campaign_id,
      old_team: record.team,
      new_team: teamName,
      reason: reason || 'Manual assignment from Attribution Manager',
    }));

    const { error: logError } = await trafficAdminSupabase
      .from('manual_attribution_log')
      .insert(logEntries);

    if (logError) {
      console.warn('[Attribution API] Failed to log attribution:', logError);
      // Don't fail the request if logging fails
    }

    res.json({
      success: true,
      message: `Assigned ${oldRecords.length} records to team '${teamName}'`,
      updated: oldRecords.length,
    });
  } catch (error: any) {
    console.error('[Attribution API] Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/attribution/ad-accounts
 * Get list of ad accounts and their team mappings
 */
router.get('/ad-accounts', async (req, res) => {
  try {
    const { data, error } = await trafficAdminSupabase
      .from('integration_ad_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Attribution API] Error fetching ad accounts:', error);
      return res.status(500).json({ error: 'Failed to fetch ad accounts' });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[Attribution API] Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/attribution/ad-accounts
 * Map an ad account to a team
 * Body: { accountId: string, teamName: string }
 */
router.post('/ad-accounts', async (req, res) => {
  try {
    const { accountId, teamName } = req.body;

    if (!accountId || !teamName) {
      return res.status(400).json({ error: 'accountId and teamName are required' });
    }

    const { data, error } = await trafficAdminSupabase
      .from('integration_ad_accounts')
      .upsert(
        {
          account_id: accountId,
          team_name: teamName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id' }
      )
      .select();

    if (error) {
      console.error('[Attribution API] Error upserting ad account:', error);
      return res.status(500).json({ error: 'Failed to save ad account mapping' });
    }

    res.json({
      success: true,
      message: `Ad Account ${accountId} mapped to team '${teamName}'`,
      data: data?.[0],
    });
  } catch (error: any) {
    console.error('[Attribution API] Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/attribution/ad-accounts/:accountId
 * Remove ad account mapping
 */
router.delete('/ad-accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    const { error } = await trafficAdminSupabase
      .from('integration_ad_accounts')
      .delete()
      .eq('account_id', accountId);

    if (error) {
      console.error('[Attribution API] Error deleting ad account:', error);
      return res.status(500).json({ error: 'Failed to delete ad account mapping' });
    }

    res.json({ success: true, message: `Ad Account ${accountId} mapping removed` });
  } catch (error: any) {
    console.error('[Attribution API] Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/attribution/stats
 * Get attribution statistics (total assigned vs unassigned)
 */
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let baseQuery = trafficAdminSupabase
      .from('traffic_stats')
      .select('team, spend_usd, spend_kzt', { count: 'exact' });

    if (startDate) {
      baseQuery = baseQuery.gte('stat_date', startDate);
    }
    if (endDate) {
      baseQuery = baseQuery.lte('stat_date', endDate);
    }

    const { data, error } = await baseQuery;

    if (error) {
      console.error('[Attribution API] Error fetching stats:', error);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    const stats = {
      total_records: data?.length || 0,
      unassigned_records: 0,
      assigned_records: 0,
      unassigned_spend_usd: 0,
      assigned_spend_usd: 0,
      teams: {} as Record<string, { records: number; spend_usd: number }>,
    };

    data?.forEach((row) => {
      const isUnassigned = row.team === 'Unassigned';
      if (isUnassigned) {
        stats.unassigned_records += 1;
        stats.unassigned_spend_usd += row.spend_usd || 0;
      } else {
        stats.assigned_records += 1;
        stats.assigned_spend_usd += row.spend_usd || 0;

        if (!stats.teams[row.team]) {
          stats.teams[row.team] = { records: 0, spend_usd: 0 };
        }
        stats.teams[row.team].records += 1;
        stats.teams[row.team].spend_usd += row.spend_usd || 0;
      }
    });

    res.json({ success: true, stats });
  } catch (error: any) {
    console.error('[Attribution API] Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
