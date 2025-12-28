/**
 * Traffic UTM Attribution Engine
 * 
 * Сопоставляет UTM параметры с командами в Traffic Dashboard
 * 
 * UTM Attribution Logic:
 * - fb_teamname → team_name в traffic_teams
 * - utm_source должен соответствовать формату fb_<team_name>
 * - utm_medium обычно 'cpc' (Facebook Ads)
 */

import { createClient } from '@supabase/supabase-js';

// Traffic Dashboard Supabase client
const trafficSupabase = createClient(
  process.env.TRAFFIC_SUPABASE_URL!,
  process.env.TRAFFIC_SERVICE_ROLE_KEY!
);

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

interface TeamInfo {
  id: string;
  name: string;
  utm_source: string;
  utm_medium: string;
}

interface AttributionResult {
  team_name: string | null;
  team_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export class TrafficUTMAttribution {
  private teamsCache: Map<string, TeamInfo> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 минут

  /**
   * Атрибутирует UTM параметры к команде
   * 
   * @param utmParams - UTM параметры из лида или продажи
   * @returns Результат атрибуции
   */
  async attribute(utmParams: UTMParams): Promise<AttributionResult> {
    // 1. Проверяем кэш команд
    await this.loadTeamsIfNeeded();

    // 2. Если нет utm_source, возвращаем null
    if (!utmParams.utm_source) {
      return {
        team_name: null,
        team_id: null,
        utm_source: null,
        utm_medium: null,
        confidence: 'low'
      };
    }

    // 3. Пытаемся найти команду по utm_source
    const team = this.findTeamByUTMSource(utmParams.utm_source);

    if (team) {
      return {
        team_name: team.name,
        team_id: team.id,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium || 'cpc',
        confidence: 'high'
      };
    }

    // 4. Если не нашли по точному совпадению, пробуем fuzzy matching
    const fuzzyTeam = this.findTeamByFuzzyMatch(utmParams.utm_source);

    if (fuzzyTeam) {
      return {
        team_name: fuzzyTeam.name,
        team_id: fuzzyTeam.id,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium || 'cpc',
        confidence: 'medium'
      };
    }

    // 5. Если ничего не нашли, возвращаем null
    return {
      team_name: null,
      team_id: null,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium || null,
      confidence: 'low'
    };
  }

  /**
   * Загружает команды из Traffic Dashboard (с кэшированием)
   */
  private async loadTeamsIfNeeded(): Promise<void> {
    const now = Date.now();

    if (this.teamsCache.size > 0 && now < this.cacheExpiry) {
      return; // Кэш актуален
    }

    try {
      const { data: teams, error } = await trafficSupabase
        .from('traffic_teams')
        .select('id, name, utm_source, utm_medium');

      if (error) {
        console.error('❌ Error loading teams:', error);
        throw error;
      }

      if (!teams || teams.length === 0) {
        console.warn('⚠️ No teams found in Traffic Dashboard');
        return;
      }

      // Обновляем кэш
      this.teamsCache.clear();
      for (const team of teams) {
        this.teamsCache.set(team.name.toLowerCase(), team);
      }

      this.cacheExpiry = now + this.CACHE_TTL;
      console.log(`✅ Loaded ${teams.length} teams into cache`);
    } catch (error) {
      console.error('❌ Error in loadTeamsIfNeeded:', error);
      throw error;
    }
  }

  /**
   * Ищет команду по точному совпадению utm_source
   */
  private findTeamByUTMSource(utmSource: string): TeamInfo | null {
    for (const team of this.teamsCache.values()) {
      if (team.utm_source === utmSource) {
        return team;
      }
    }
    return null;
  }

  /**
   * Ищет команду по нечеткому совпадению (fuzzy matching)
   */
  private findTeamByFuzzyMatch(utmSource: string): TeamInfo | null {
    // Пробуем извлечь имя команды из utm_source
    // Формат: fb_<team_name>
    const match = utmSource.match(/^fb_(.+)$/i);

    if (match) {
      const teamName = match[1].toLowerCase();

      // Ищем команду по имени
      for (const team of this.teamsCache.values()) {
        if (team.name.toLowerCase() === teamName) {
          return team;
        }
      }
    }

    return null;
  }

  /**
   * Пакетная атрибуция для нескольких UTM параметров
   * 
   * @param utmParamsArray - Массив UTM параметров
   * @returns Массив результатов атрибуции
   */
  async attributeBatch(utmParamsArray: UTMParams[]): Promise<AttributionResult[]> {
    const results: AttributionResult[] = [];

    for (const utmParams of utmParamsArray) {
      const result = await this.attribute(utmParams);
      results.push(result);
    }

    return results;
  }

  /**
   * Получает статистику атрибуции
   * 
   * @returns Статистика по атрибуции
   */
  async getAttributionStats(): Promise<{
    total_teams: number;
    attributed_sources: number;
    unattributed_sources: number;
    attribution_rate: number;
  }> {
    await this.loadTeamsIfNeeded();

    const totalTeams = this.teamsCache.size;

    // Получаем все уникальные utm_source из traffic_sales_stats
    const { data: stats, error } = await trafficSupabase
      .from('traffic_sales_stats')
      .select('utm_source, team_name');

    if (error) {
      console.error('❌ Error getting attribution stats:', error);
      throw error;
    }

    if (!stats || stats.length === 0) {
      return {
        total_teams: totalTeams,
        attributed_sources: 0,
        unattributed_sources: 0,
        attribution_rate: 0
      };
    }

    const uniqueSources = new Set(stats.map(s => s.utm_source));
    const attributedSources = stats.filter(s => s.team_name !== null).length;
    const unattributedSources = stats.filter(s => s.team_name === null).length;
    const attributionRate = uniqueSources.size > 0 
      ? (attributedSources / stats.length) * 100 
      : 0;

    return {
      total_teams: totalTeams,
      attributed_sources: attributedSources,
      unattributed_sources: unattributedSources,
      attribution_rate: attributionRate
    };
  }

  /**
   * Очищает кэш команд
   */
  clearCache(): void {
    this.teamsCache.clear();
    this.cacheExpiry = 0;
    console.log('✅ Teams cache cleared');
  }
}

export default TrafficUTMAttribution;
