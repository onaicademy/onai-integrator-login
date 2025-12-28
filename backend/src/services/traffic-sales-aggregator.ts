/**
 * Traffic Sales Aggregator
 * 
 * Агрегирует продажи из AmoCRM в Traffic Dashboard
 * 
 * Data Flow:
 * 1. Landing DB (leads) → AmoCRM (deals)
 * 2. AmoCRM Webhook → Traffic Dashboard (all_sales_tracking)
 * 3. Sales Aggregator → traffic_sales_stats (агрегированная статистика)
 * 4. UTM Attribution → сопоставление UTM → Team
 */

import { createClient } from '@supabase/supabase-js';
// import { AmoCRMService } from './amocrm'; // TODO: Реализовать интеграцию с AmoCRM в Phase 2

// Traffic Dashboard Supabase client (публичный для доступа из routes)
// Используем service_role_key для backend-операций (полные права)
export const trafficSupabase = createClient(
  process.env.TRAFFIC_SUPABASE_URL!,
  process.env.TRAFFIC_SERVICE_ROLE_KEY!
);

interface AmoCRMDeal {
  id: number;
  name: string;
  price: number;
  created_at: number;
  closed_at: number | null;
  status_id: number;
  custom_fields_values: any[];
}

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

interface AggregatedStats {
  date: Date;
  period_type: 'daily' | 'weekly' | 'monthly';
  team_name: string;
  team_id: string | null;
  utm_source: string | null;
  utm_medium: string;
  total_sales: number;
  total_revenue: number;
  average_order_value: number;
  flagman_sales: number;
  flagman_revenue: number;
  express_sales: number;
  express_revenue: number;
  leads_count: number;
  conversion_rate: number;
  fb_spend: number;
  fb_impressions: number;
  fb_clicks: number;
  fb_ctr: number;
  fb_cpc: number;
  fb_cpm: number;
  roi: number;
  roas: number;
  cpa: number;
}

export class TrafficSalesAggregator {
  // private amocrmService: AmoCRMService; // TODO: Реализовать интеграцию с AmoCRM в Phase 2

  constructor() {
    // this.amocrmService = new AmoCRMService(); // TODO: Реализовать интеграцию с AmoCRM в Phase 2
  }

  /**
   * Главная функция агрегации
   * 
   * @param startDate - Начальная дата для агрегации
   * @param endDate - Конечная дата для агрегации
   * @param periodType - Тип периода (daily, weekly, monthly)
   */
  async aggregateSales(
    startDate: Date,
    endDate: Date,
    periodType: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<void> {
    console.log(`🔄 Starting sales aggregation from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    try {
      // 1. Получаем все команды из Traffic Dashboard
      const { data: teams, error: teamsError } = await trafficSupabase
        .from('traffic_teams')
        .select('id, name, utm_source, utm_medium');

      if (teamsError) {
        console.error('❌ Error fetching teams:', teamsError);
        throw teamsError;
      }

      if (!teams || teams.length === 0) {
        console.warn('⚠️ No teams found in Traffic Dashboard');
        return;
      }

      console.log(`✅ Found ${teams.length} teams`);

      // 2. Для каждой команды агрегируем продажи
      for (const team of teams) {
        await this.aggregateTeamSales(team, startDate, endDate, periodType);
      }

      console.log('✅ Sales aggregation completed');
    } catch (error) {
      console.error('❌ Error in aggregateSales:', error);
      throw error;
    }
  }

  /**
   * Агрегирует продажи для конкретной команды
   */
  private async aggregateTeamSales(
    team: any,
    startDate: Date,
    endDate: Date,
    periodType: 'daily' | 'weekly' | 'monthly'
  ): Promise<void> {
    console.log(`🔄 Aggregating sales for team: ${team.name}`);

    try {
      // 1. Получаем продажи из AmoCRM по UTM тегам команды
      const deals = await this.fetchDealsByUTM(
        team.utm_source,
        team.utm_medium,
        startDate,
        endDate
      );

      console.log(`✅ Found ${deals.length} deals for team ${team.name}`);

      // 2. Агрегируем статистику по периодам
      const periods = this.generatePeriods(startDate, endDate, periodType);

      for (const period of periods) {
        const periodDeals = deals.filter(deal => {
          const dealDate = new Date(deal.created_at * 1000);
          return dealDate >= period.start && dealDate < period.end;
        });

        const stats = this.calculateStats(periodDeals, team);

        // 3. Сохраняем агрегированную статистику в Traffic Dashboard
        await this.saveAggregatedStats(stats);
      }

      console.log(`✅ Aggregation completed for team: ${team.name}`);
    } catch (error) {
      console.error(`❌ Error aggregating sales for team ${team.name}:`, error);
      throw error;
    }
  }

  /**
   * Получает сделки из AmoCRM по UTM тегам
   * TODO: Реализовать интеграцию с AmoCRM в Phase 2
   */
  private async fetchDealsByUTM(
    utmSource: string,
    utmMedium: string,
    startDate: Date,
    endDate: Date
  ): Promise<AmoCRMDeal[]> {
    try {
      // TODO: Реализовать получение сделок из AmoCRM API
      // Временно возвращаем пустой массив
      console.log(`⚠️ fetchDealsByUTM не реализован (Phase 2)`);
      console.log(`   UTM Source: ${utmSource}, UTM Medium: ${utmMedium}`);
      console.log(`   Date range: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      
      return [];
      
      /* TODO: Раскомментировать в Phase 2
      // Получаем сделки из AmoCRM с фильтрацией по UTM тегам
      const deals = await this.amocrmService.getDeals({
        filter: {
          created_at: {
            from: Math.floor(startDate.getTime() / 1000),
            to: Math.floor(endDate.getTime() / 1000)
          }
        },
        with: ['contacts', 'leads']
      });

      // Фильтруем сделки по UTM тегам
      const filteredDeals = deals.filter(deal => {
        const utmParams = this.extractUTMFromDeal(deal);
        return utmParams.utm_source === utmSource && utmParams.utm_medium === utmMedium;
      });

      return filteredDeals;
      */
    } catch (error) {
      console.error('❌ Error fetching deals from AmoCRM:', error);
      throw error;
    }
  }

  /**
   * Извлекает UTM параметры из сделки AmoCRM
   */
  private extractUTMFromDeal(deal: AmoCRMDeal): UTMParams {
    const utmParams: UTMParams = {};

    // Ищем UTM параметры в custom_fields_values
    if (deal.custom_fields_values) {
      for (const field of deal.custom_fields_values) {
        switch (field.field_code) {
          case 'UTM_SOURCE':
            utmParams.utm_source = field.values[0]?.value;
            break;
          case 'UTM_MEDIUM':
            utmParams.utm_medium = field.values[0]?.value;
            break;
          case 'UTM_CAMPAIGN':
            utmParams.utm_campaign = field.values[0]?.value;
            break;
          case 'UTM_CONTENT':
            utmParams.utm_content = field.values[0]?.value;
            break;
          case 'UTM_TERM':
            utmParams.utm_term = field.values[0]?.value;
            break;
        }
      }
    }

    return utmParams;
  }

  /**
   * Генерирует периоды для агрегации
   */
  private generatePeriods(
    startDate: Date,
    endDate: Date,
    periodType: 'daily' | 'weekly' | 'monthly'
  ): Array<{ start: Date; end: Date }> {
    const periods: Array<{ start: Date; end: Date }> = [];
    let current = new Date(startDate);

    while (current < endDate) {
      const start = new Date(current);
      let end: Date;

      switch (periodType) {
        case 'daily':
          end = new Date(current);
          end.setDate(end.getDate() + 1);
          break;
        case 'weekly':
          end = new Date(current);
          end.setDate(end.getDate() + 7);
          break;
        case 'monthly':
          end = new Date(current);
          end.setMonth(end.getMonth() + 1);
          break;
      }

      periods.push({ start, end });
      current = end;
    }

    return periods;
  }

  /**
   * Рассчитывает статистику по сделкам
   */
  private calculateStats(deals: AmoCRMDeal[], team: any): AggregatedStats {
    const totalSales = deals.length;
    const totalRevenue = deals.reduce((sum, deal) => sum + deal.price, 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Flagman: продажи >= 50,000 KZT
    // Express: продажи < 50,000 KZT
    const flagmanDeals = deals.filter(deal => deal.price >= 50000);
    const expressDeals = deals.filter(deal => deal.price < 50000);

    const flagmanSales = flagmanDeals.length;
    const flagmanRevenue = flagmanDeals.reduce((sum, deal) => sum + deal.price, 0);
    const expressSales = expressDeals.length;
    const expressRevenue = expressDeals.reduce((sum, deal) => sum + deal.price, 0);

    // TODO: Получить количество лидов из Landing DB по UTM тегам
    const leadsCount = 0; // Будет реализовано позже
    const conversionRate = leadsCount > 0 ? (totalSales / leadsCount) * 100 : 0;

    // TODO: Получить Facebook Ads данные
    const fbSpend = 0;
    const fbImpressions = 0;
    const fbClicks = 0;
    const fbCtr = fbImpressions > 0 ? (fbClicks / fbImpressions) * 100 : 0;
    const fbCpc = fbClicks > 0 ? fbSpend / fbClicks : 0;
    const fbCpm = fbImpressions > 0 ? (fbSpend / fbImpressions) * 1000 : 0;

    const roi = fbSpend > 0 ? ((totalRevenue - fbSpend) / fbSpend) * 100 : 0;
    const roas = fbSpend > 0 ? totalRevenue / fbSpend : 0;
    const cpa = totalSales > 0 ? fbSpend / totalSales : 0;

    return {
      date: new Date(),
      period_type: 'daily',
      team_name: team.name,
      team_id: team.id,
      utm_source: team.utm_source,
      utm_medium: team.utm_medium || 'cpc',
      total_sales: totalSales,
      total_revenue: totalRevenue,
      average_order_value: averageOrderValue,
      flagman_sales: flagmanSales,
      flagman_revenue: flagmanRevenue,
      express_sales: expressSales,
      express_revenue: expressRevenue,
      leads_count: leadsCount,
      conversion_rate: conversionRate,
      fb_spend: fbSpend,
      fb_impressions: fbImpressions,
      fb_clicks: fbClicks,
      fb_ctr: fbCtr,
      fb_cpc: fbCpc,
      fb_cpm: fbCpm,
      roi: roi,
      roas: roas,
      cpa: cpa
    };
  }

  /**
   * Сохраняет агрегированную статистику в Traffic Dashboard
   */
  private async saveAggregatedStats(stats: AggregatedStats): Promise<void> {
    try {
      const { error } = await trafficSupabase
        .from('traffic_sales_stats')
        .upsert({
          date: stats.date.toISOString().split('T')[0],
          period_type: stats.period_type,
          team_name: stats.team_name,
          team_id: stats.team_id,
          utm_source: stats.utm_source,
          utm_medium: stats.utm_medium,
          total_sales: stats.total_sales,
          total_revenue: stats.total_revenue,
          average_order_value: stats.average_order_value,
          flagman_sales: stats.flagman_sales,
          flagman_revenue: stats.flagman_revenue,
          express_sales: stats.express_sales,
          express_revenue: stats.express_revenue,
          leads_count: stats.leads_count,
          conversion_rate: stats.conversion_rate,
          fb_spend: stats.fb_spend,
          fb_impressions: stats.fb_impressions,
          fb_clicks: stats.fb_clicks,
          fb_ctr: stats.fb_ctr,
          fb_cpc: stats.fb_cpc,
          fb_cpm: stats.fb_cpm,
          roi: stats.roi,
          roas: stats.roas,
          cpa: stats.cpa,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'date,period_type,team_name'
        });

      if (error) {
        console.error('❌ Error saving aggregated stats:', error);
        throw error;
      }

      console.log(`✅ Saved stats for team ${stats.team_name} on ${stats.date.toISOString().split('T')[0]}`);
    } catch (error) {
      console.error('❌ Error in saveAggregatedStats:', error);
      throw error;
    }
  }

  /**
   * Запускает полную агрегацию за последние 30 дней
   */
  async aggregateLast30Days(): Promise<void> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    await this.aggregateSales(startDate, endDate, 'daily');
  }

  /**
   * Запускает агрегацию за сегодня
   */
  async aggregateToday(): Promise<void> {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();

    await this.aggregateSales(startDate, endDate, 'daily');
  }
}

export default TrafficSalesAggregator;
