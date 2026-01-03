/**
 * ════════════════════════════════════════════════════════════════════════
 * 📊 UTM MAPPING SERVICE - Dynamic UTM Attribution
 * ════════════════════════════════════════════════════════════════════════
 *
 * Заменяет хардкод TEAM_UTM_MAPPING на динамическое чтение из БД.
 *
 * Архитектура:
 * - traffic_user_utm_sources: хранит связь user_id -> utm_source -> funnel_type
 * - traffic_users.enabled_funnels: какие продукты запускает таргетолог
 *
 * Использование:
 * - getUtmRuleForUser(userId) - получить все utm_source пользователя
 * - getUserByUtmSource(utmSource, funnelType) - найти пользователя по utm_source
 * - matchesUserUtm(lead, userId) - проверить принадлежит ли лид пользователю
 */

import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import { getCachedOrFresh } from './cache-service.js';

// ════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════

export interface UtmSourceConfig {
  id: string;
  user_id: string;
  utm_source: string;
  utm_medium: string | null;
  funnel_type: 'express' | 'challenge3d' | 'intensive1d';
  fb_ad_account_id: string | null;
  is_active: boolean;
}

export interface UserUtmRule {
  user_id: string;
  email: string;
  full_name: string;
  team_name: string;
  enabled_funnels: string[];
  sources: UtmSourceConfig[];
}

export interface DynamicTeamUtmRule {
  sources: string[];
  medium?: string;
  matchMode: 'source_only' | 'source_and_medium';
}

// ════════════════════════════════════════════════════════════════════════
// CACHE KEYS
// ════════════════════════════════════════════════════════════════════════
const CACHE_TTL = 300; // 5 минут
const CACHE_KEY_ALL_MAPPINGS = 'utm:all_mappings';
const CACHE_KEY_USER_PREFIX = 'utm:user:';

// ════════════════════════════════════════════════════════════════════════
// GET ALL UTM MAPPINGS
// ════════════════════════════════════════════════════════════════════════
/**
 * Получить все активные UTM mappings из БД
 * Кэшируется на 5 минут
 */
export async function getAllUtmMappings(): Promise<UtmSourceConfig[]> {
  return getCachedOrFresh(CACHE_KEY_ALL_MAPPINGS, async () => {
    try {
      const { data, error } = await trafficAdminSupabase
        .from('traffic_user_utm_sources')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('[UTM Service] Error fetching UTM mappings:', error.message);
        return [];
      }

      console.log(`[UTM Service] Loaded ${data?.length || 0} UTM mappings from DB`);
      return data || [];
    } catch (err: any) {
      console.error('[UTM Service] Exception:', err.message);
      return [];
    }
  }, CACHE_TTL);
}

// ════════════════════════════════════════════════════════════════════════
// GET UTM RULE FOR USER
// ════════════════════════════════════════════════════════════════════════
/**
 * Получить все utm_source для конкретного пользователя
 */
export async function getUtmRuleForUser(userId: string): Promise<UserUtmRule | null> {
  const cacheKey = `${CACHE_KEY_USER_PREFIX}${userId}`;

  return getCachedOrFresh(cacheKey, async () => {
    try {
      // Получаем пользователя
      const { data: user, error: userError } = await trafficAdminSupabase
        .from('traffic_users')
        .select('id, email, full_name, team_name, enabled_funnels')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.warn(`[UTM Service] User not found: ${userId}`);
        return null;
      }

      // Получаем все utm_source пользователя
      const { data: sources, error: sourcesError } = await trafficAdminSupabase
        .from('traffic_user_utm_sources')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (sourcesError) {
        console.error('[UTM Service] Error fetching user UTM sources:', sourcesError.message);
      }

      return {
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        team_name: user.team_name,
        enabled_funnels: user.enabled_funnels || ['express'],
        sources: sources || []
      };
    } catch (err: any) {
      console.error('[UTM Service] Exception in getUtmRuleForUser:', err.message);
      return null;
    }
  }, CACHE_TTL);
}

// ════════════════════════════════════════════════════════════════════════
// GET USER BY UTM SOURCE
// ════════════════════════════════════════════════════════════════════════
/**
 * Найти пользователя по utm_source и опционально funnel_type
 */
export async function getUserByUtmSource(
  utmSource: string,
  funnelType?: 'express' | 'challenge3d' | 'intensive1d'
): Promise<string | null> {
  const allMappings = await getAllUtmMappings();

  const matching = allMappings.find(m => {
    const sourceMatch = m.utm_source.toLowerCase() === utmSource.toLowerCase();
    if (!sourceMatch) return false;
    if (funnelType && m.funnel_type !== funnelType) return false;
    return true;
  });

  return matching?.user_id || null;
}

// ════════════════════════════════════════════════════════════════════════
// GET DYNAMIC TEAM UTM RULE
// ════════════════════════════════════════════════════════════════════════
/**
 * Получить DynamicTeamUtmRule для пользователя (совместимость с существующим кодом)
 * Используется в funnel-service.ts для фильтрации лидов
 */
export async function getDynamicTeamUtmRule(
  userId?: string,
  teamName?: string
): Promise<DynamicTeamUtmRule | null> {
  if (!userId && !teamName) return null;

  let userRule: UserUtmRule | null = null;

  if (userId) {
    userRule = await getUtmRuleForUser(userId);
  } else if (teamName) {
    // Поиск по team_name
    const { data: user } = await trafficAdminSupabase
      .from('traffic_users')
      .select('id')
      .ilike('team_name', `%${teamName}%`)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (user) {
      userRule = await getUtmRuleForUser(user.id);
    }
  }

  if (!userRule || userRule.sources.length === 0) {
    console.log(`[UTM Service] No UTM sources found for user/team: ${userId || teamName}`);
    return null;
  }

  // Собираем все utm_source в массив
  const sources = userRule.sources.map(s => s.utm_source);

  // Проверяем есть ли utm_medium для source_and_medium режима
  const sourceWithMedium = userRule.sources.find(s => s.utm_medium);

  return {
    sources,
    medium: sourceWithMedium?.utm_medium || undefined,
    matchMode: sourceWithMedium ? 'source_and_medium' : 'source_only'
  };
}

// ════════════════════════════════════════════════════════════════════════
// MATCH FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

/**
 * Проверить соответствует ли лид UTM правилам пользователя
 */
export async function matchesUserUtm(
  lead: { utm_source?: string; utm_medium?: string; metadata?: any },
  userId: string
): Promise<boolean> {
  const rule = await getDynamicTeamUtmRule(userId);
  if (!rule) return false;

  const utmSource = lead.utm_source || lead.metadata?.utmParams?.utm_source || lead.metadata?.utm_source;
  const utmMedium = lead.utm_medium || lead.metadata?.utmParams?.utm_medium || lead.metadata?.utm_medium;

  if (!utmSource) return false;

  const sourceMatches = rule.sources.some(s =>
    utmSource.toLowerCase() === s.toLowerCase()
  );

  if (rule.matchMode === 'source_only') {
    return sourceMatches;
  }

  // source_and_medium mode
  if (!rule.medium) return sourceMatches;
  const mediumMatches = utmMedium?.toLowerCase() === rule.medium.toLowerCase();
  return sourceMatches && mediumMatches;
}

/**
 * Динамическая версия matchesTeamUtm для использования в funnel-service
 * (Совместимость с существующим интерфейсом)
 */
export function matchesTeamUtmDynamic(
  lead: { utm_source?: string; utm_medium?: string; metadata?: any },
  rule: DynamicTeamUtmRule
): boolean {
  const utmSource = lead.utm_source || lead.metadata?.utmParams?.utm_source || lead.metadata?.utm_source;
  const utmMedium = lead.utm_medium || lead.metadata?.utmParams?.utm_medium || lead.metadata?.utm_medium;

  if (!utmSource) return false;

  const sourceMatches = rule.sources.some(s =>
    utmSource.toLowerCase() === s.toLowerCase()
  );

  if (rule.matchMode === 'source_only') {
    return sourceMatches;
  }

  // source_and_medium mode
  if (!rule.medium) return sourceMatches;
  const mediumMatches = utmMedium?.toLowerCase() === rule.medium.toLowerCase();
  return sourceMatches && mediumMatches;
}

// ════════════════════════════════════════════════════════════════════════
// ADD UTM SOURCE
// ════════════════════════════════════════════════════════════════════════
/**
 * Добавить новый utm_source для пользователя
 * Вызывается при подключении рекламного кабинета
 */
export async function addUtmSource(
  userId: string,
  utmSource: string,
  funnelType: 'express' | 'challenge3d' | 'intensive1d',
  options?: {
    utmMedium?: string;
    fbAdAccountId?: string;
    fbCampaignIds?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await trafficAdminSupabase
      .from('traffic_user_utm_sources')
      .upsert({
        user_id: userId,
        utm_source: utmSource,
        utm_medium: options?.utmMedium || null,
        funnel_type: funnelType,
        fb_ad_account_id: options?.fbAdAccountId || null,
        fb_campaign_ids: options?.fbCampaignIds || null,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'utm_source,funnel_type'
      });

    if (error) {
      console.error('[UTM Service] Error adding UTM source:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`[UTM Service] ✅ Added UTM source: ${utmSource} for user ${userId} (${funnelType})`);
    return { success: true };
  } catch (err: any) {
    console.error('[UTM Service] Exception in addUtmSource:', err.message);
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════
// UPDATE USER ENABLED FUNNELS
// ════════════════════════════════════════════════════════════════════════
/**
 * Обновить список включенных продуктов для пользователя (чекбоксы)
 */
export async function updateEnabledFunnels(
  userId: string,
  enabledFunnels: ('express' | 'challenge3d' | 'intensive1d')[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await trafficAdminSupabase
      .from('traffic_users')
      .update({
        enabled_funnels: enabledFunnels,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('[UTM Service] Error updating enabled funnels:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`[UTM Service] ✅ Updated enabled funnels for user ${userId}: [${enabledFunnels.join(', ')}]`);
    return { success: true };
  } catch (err: any) {
    console.error('[UTM Service] Exception in updateEnabledFunnels:', err.message);
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════
export default {
  getAllUtmMappings,
  getUtmRuleForUser,
  getUserByUtmSource,
  getDynamicTeamUtmRule,
  matchesUserUtm,
  matchesTeamUtmDynamic,
  addUtmSource,
  updateEnabledFunnels
};
