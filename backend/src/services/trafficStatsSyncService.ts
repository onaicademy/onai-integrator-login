import axios from 'axios';
import { landingSupabase } from '../config/supabase-landing.js';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import { database } from '../config/database-layer.js';
import { getAlmatyDate, getYesterdayAlmaty } from '../utils/timezone.js';
import { getAverageExchangeRate, getExchangeRateMap } from './exchangeRateService.js';

const FB_API_VERSION = 'v21.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;
const SYNC_LOOKBACK_DAYS = 2;
const DEFAULT_DAYS_BACK = 14;
const SYNC_LOCK = new Set<string>();

const normalizeAccountId = (id?: string | null) => {
  if (!id) return '';
  return id.startsWith('act_') ? id : `act_${id}`;
};

const normalizeCampaigns = (campaigns: any[] = []) => {
  const map = new Map<string, any>();
  campaigns.forEach((campaign) => {
    if (!campaign?.id) return;
    const normalizedAccountId = normalizeAccountId(String(campaign.ad_account_id || ''));
    const normalized = { ...campaign, ad_account_id: normalizedAccountId };
    const existing = map.get(campaign.id);
    if (!existing) {
      map.set(campaign.id, normalized);
      return;
    }
    const existingAccountId = existing.ad_account_id || '';
    const preferCandidate = normalizedAccountId.startsWith('act_') && !existingAccountId.startsWith('act_');
    map.set(campaign.id, preferCandidate ? normalized : { ...normalized, ...existing });
  });
  return Array.from(map.values());
};

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00+06:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const isDateBefore = (a: string, b: string) => new Date(a) < new Date(b);

async function getUserTeamName(userId: string): Promise<string> {
  try {
    const { data } = await trafficAdminSupabase
      .from('traffic_users')
      .select('team_name, username, full_name, email')
      .eq('id', userId)
      .maybeSingle();

    return data?.team_name || data?.username || data?.full_name || data?.email || userId.slice(0, 8);
  } catch {
    return userId.slice(0, 8);
  }
}

async function fetchAccountInsightsDaily(
  accountId: string,
  campaignIds: string[],
  since: string,
  until: string,
  accessToken: string
) {
  const rows: any[] = [];
  for (const chunk of chunkArray(Array.from(new Set(campaignIds)), 50)) {
    const response = await axios.get(`${FB_BASE_URL}/${accountId}/insights`, {
      params: {
        access_token: accessToken,
        fields: 'campaign_id,campaign_name,spend,impressions,clicks,reach,cpc,cpm,frequency,date_start,date_stop',
        time_range: JSON.stringify({ since, until }),
        time_increment: 1,
        level: 'campaign',
        filtering: JSON.stringify([
          {
            field: 'campaign.id',
            operator: 'IN',
            value: chunk,
          },
        ]),
        limit: 1000,
      },
      timeout: 20000,
    });

    rows.push(...(response.data?.data || []));
  }

  return rows;
}

async function getLatestCampaignDates(userId: string, campaignIds: string[]) {
  if (!campaignIds.length) return new Map<string, string>();

  const { data } = await landingSupabase
    .from('traffic_stats')
    .select('campaign_id, stat_date')
    .eq('user_id', userId)
    .in('campaign_id', campaignIds)
    .order('stat_date', { ascending: false });

  const map = new Map<string, string>();
  (data || []).forEach((row: any) => {
    if (!map.has(row.campaign_id)) {
      map.set(row.campaign_id, row.stat_date);
    }
  });
  return map;
}

async function upsertStatsRows(rows: any[]) {
  if (!rows.length) return;
  for (const chunk of chunkArray(rows, 500)) {
    const { error } = await landingSupabase
      .from('traffic_stats')
      .upsert(chunk, { onConflict: 'stat_date,user_id,campaign_id' });
    if (error) {
      throw error;
    }
  }
}

async function updateSyncState(userId: string, rows: any[], endDate: string) {
  const uniqueCampaigns = new Map<string, { ad_account_id: string }>();
  rows.forEach((row) => {
    if (!row.campaign_id) return;
    uniqueCampaigns.set(row.campaign_id, { ad_account_id: row.ad_account_id });
  });

  const payload = Array.from(uniqueCampaigns.entries()).map(([campaignId, meta]) => ({
    scope: 'campaign_insights',
    user_id: userId,
    ad_account_id: meta.ad_account_id,
    campaign_id: campaignId,
    last_synced_date: endDate,
    updated_at: new Date().toISOString(),
  }));

  if (!payload.length) return;

  await landingSupabase
    .from('traffic_sync_state')
    .upsert(payload, { onConflict: 'scope,user_id,ad_account_id,campaign_id' });
}

async function warmUserCaches(userId: string) {
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  const presets = ['7d', '14d', '30d'];

  await Promise.all(
    presets.map(async (preset) => {
      try {
        await axios.get(`${apiUrl}/api/traffic/combined-analytics`, {
          params: { preset, userId },
          timeout: 15000,
        });
        await axios.get(`${apiUrl}/api/traffic-dashboard/funnel`, {
          params: { preset, userId },
          timeout: 15000,
        });
      } catch (error: any) {
        console.warn(`[Traffic Sync] Cache warm failed for ${userId} (${preset}):`, error.message);
      }
    })
  );
}

export async function syncUserTrafficStats(
  userId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    daysBack?: number;
    includeToday?: boolean;
    warmCache?: boolean;
    reason?: string;
  }
) {
  const settings = await database.getSettings(userId);
  const selectedCampaigns = normalizeCampaigns(settings?.tracked_campaigns || [])
    .filter((campaign: any) => campaign.enabled !== false);

  if (!selectedCampaigns.length) {
    return { userId, synced: 0, message: 'No campaigns selected' };
  }

  const accessToken = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ADS_TOKEN;
  if (!accessToken) {
    return { userId, synced: 0, error: 'Facebook token not configured' };
  }

  const today = getAlmatyDate();
  const endDate = options?.endDate || (options?.includeToday ? today : getYesterdayAlmaty());
  const startDate = options?.startDate || addDays(endDate, -((options?.daysBack || DEFAULT_DAYS_BACK) - 1));

  const campaignIds = selectedCampaigns.map((campaign) => campaign.id);
  const latestDates = await getLatestCampaignDates(userId, campaignIds);

  let globalStart = startDate;
  latestDates.forEach((lastDate) => {
    const refreshStart = addDays(lastDate, -(SYNC_LOOKBACK_DAYS - 1));
    const candidate = isDateBefore(refreshStart, startDate) ? startDate : refreshStart;
    if (isDateBefore(candidate, globalStart)) {
      globalStart = candidate;
    }
  });

  if (isDateBefore(endDate, globalStart)) {
    return { userId, synced: 0, message: 'Already up to date' };
  }

  const campaignsByAccount = new Map<string, any[]>();
  selectedCampaigns.forEach((campaign) => {
    const accountId = normalizeAccountId(campaign.ad_account_id);
    if (!accountId) return;
    const list = campaignsByAccount.get(accountId) || [];
    list.push(campaign);
    campaignsByAccount.set(accountId, list);
  });

  const rateMap = await getExchangeRateMap(globalStart, endDate);
  const fallbackRate = await getAverageExchangeRate(globalStart, endDate);
  const teamName = await getUserTeamName(userId);

  const rows: any[] = [];

  for (const [accountId, campaigns] of campaignsByAccount.entries()) {
    const insights = await fetchAccountInsightsDaily(
      accountId,
      campaigns.map((c) => c.id),
      globalStart,
      endDate,
      accessToken
    );

    insights.forEach((row: any) => {
      const statDate = row.date_start || globalStart;
      const spendUsd = parseFloat(row.spend || '0');
      const impressions = parseInt(row.impressions || '0', 10);
      const clicks = parseInt(row.clicks || '0', 10);
      const reach = parseInt(row.reach || '0', 10);
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = row.cpc ? parseFloat(row.cpc || '0') : clicks > 0 ? spendUsd / clicks : 0;
      const cpm = row.cpm ? parseFloat(row.cpm || '0') : impressions > 0 ? (spendUsd / impressions) * 1000 : 0;
      const frequency = row.frequency ? parseFloat(row.frequency || '0') : 0;
      const rate = rateMap[statDate] || fallbackRate;

      rows.push({
        date: statDate,  // Production DB uses 'date' column
        stat_date: statDate,  // Keep for backwards compatibility
        user_id: userId,
        team: teamName,
        ad_account_id: accountId,
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name || campaigns.find((c) => c.id === row.campaign_id)?.name,
        spend_usd: Number(spendUsd.toFixed(4)),
        spend_kzt: Number((spendUsd * rate).toFixed(4)),
        impressions,
        clicks,
        reach,
        ctr: Number(ctr.toFixed(6)),
        cpc_usd: Number(cpc.toFixed(6)),
        cpm_usd: Number(cpm.toFixed(6)),
        frequency: Number(frequency.toFixed(6)),
        usd_to_kzt_rate: Number(rate.toFixed(4)),
        updated_at: new Date().toISOString(),
      });
    });
  }

  await upsertStatsRows(rows);
  await updateSyncState(userId, rows, endDate);

  if (options?.warmCache) {
    await warmUserCaches(userId);
  }

  return { userId, synced: rows.length, startDate: globalStart, endDate, reason: options?.reason };
}

export function scheduleUserTrafficStatsSync(
  userId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    daysBack?: number;
    includeToday?: boolean;
    warmCache?: boolean;
    reason?: string;
  }
) {
  if (SYNC_LOCK.has(userId)) {
    return;
  }

  SYNC_LOCK.add(userId);
  setImmediate(async () => {
    try {
      await syncUserTrafficStats(userId, options);
    } catch (error: any) {
      console.error(`[Traffic Sync] Failed for ${userId}:`, error.message);
    } finally {
      SYNC_LOCK.delete(userId);
    }
  });
}

export async function syncAllTargetologists(options?: {
  daysBack?: number;
  includeToday?: boolean;
  reason?: string;
}) {
  const { data: settings } = await trafficAdminSupabase
    .from('traffic_targetologist_settings')
    .select('user_id, tracked_campaigns');

  if (!settings || settings.length === 0) {
    return;
  }

  for (const row of settings) {
    await syncUserTrafficStats(row.user_id, {
      daysBack: options?.daysBack,
      includeToday: options?.includeToday,
      reason: options?.reason || 'daily_sync',
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
