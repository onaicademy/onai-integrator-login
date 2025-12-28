/**
 * 🔄 ProofTest Integration Service
 * 
 * Сервис для интеграции с ProofTest (тестовые лиды).
 * ProofTest - это система для тестовых лидов.
 * 
 * Проект Supabase: oetodaexnjcunklkdlkv (Traffic DB)
 * Таблица: prooftest_leads
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Конфигурация Supabase
const SUPABASE_URL = process.env.SUPABASE_TRAFFIC_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_TRAFFIC_ANON_KEY || '';

// Интерфейсы
export interface ProofTestLead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  price: number;
  status: string;
  created_at: string;
  updated_at: string;
  targetologist: string | null;
  is_flagman: boolean;
}

export interface ProofTestStats {
  total_leads: number;
  successful_sales: number;
  total_revenue: number;
  by_targetologist: Record<string, {
    leads: number;
    sales: number;
    revenue: number;
  }>;
}

export class ProofTestIntegration {
  private readonly supabase: SupabaseClient;

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('❌ [ProofTest Integration] Supabase credentials not set');
      throw new Error('Supabase credentials not set');
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  /**
   * Получить все тестовые лиды
   */
  async fetchAllLeads(options: {
    limit?: number;
    offset?: number;
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
  } = {}): Promise<ProofTestLead[]> {
    try {
      let query = this.supabase
        .from('prooftest_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      if (options.dateFrom) {
        query = query.gte('created_at', options.dateFrom.toISOString());
      }

      if (options.dateTo) {
        query = query.lte('created_at', options.dateTo.toISOString());
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [ProofTest Integration] Error fetching leads:', error);
        throw error;
      }

      console.log(`✅ [ProofTest Integration] Fetched ${data?.length || 0} leads`);
      return data || [];
    } catch (error: any) {
      console.error('❌ [ProofTest Integration] Error in fetchAllLeads:', error.message);
      throw error;
    }
  }

  /**
   * Получить успешные продажи (статус: 'success')
   */
  async fetchSuccessfulSales(options: {
    limit?: number;
    offset?: number;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}): Promise<ProofTestLead[]> {
    return this.fetchAllLeads({
      ...options,
      status: 'success',
    });
  }

  /**
   * Получить лиды за период
   */
  async fetchLeadsByPeriod(
    dateFrom: Date,
    dateTo: Date,
    options: Omit<{
      limit?: number;
      offset?: number;
      status?: string;
    }, 'dateFrom' | 'dateTo'> = {}
  ): Promise<ProofTestLead[]> {
    return this.fetchAllLeads({
      ...options,
      dateFrom,
      dateTo,
    });
  }

  /**
   * Получить статистику по ProofTest
   */
  async getStats(options: {
    dateFrom?: Date;
    dateTo?: Date;
  } = {}): Promise<ProofTestStats> {
    try {
      const allLeads = await this.fetchAllLeads(options);
      const successfulSales = await this.fetchSuccessfulSales(options);

      const totalRevenue = successfulSales.reduce((sum, lead) => sum + (lead.price || 0), 0);

      // Группируем по таргетологам
      const byTargetologist: Record<string, { leads: number; sales: number; revenue: number }> = {};

      allLeads.forEach(lead => {
        const targetologist = lead.targetologist || 'Unknown';
        if (!byTargetologist[targetologist]) {
          byTargetologist[targetologist] = { leads: 0, sales: 0, revenue: 0 };
        }
        byTargetologist[targetologist].leads++;

        if (lead.status === 'success') {
          byTargetologist[targetologist].sales++;
          byTargetologist[targetologist].revenue += lead.price || 0;
        }
      });

      return {
        total_leads: allLeads.length,
        successful_sales: successfulSales.length,
        total_revenue: totalRevenue,
        by_targetologist: byTargetologist,
      };
    } catch (error: any) {
      console.error('❌ [ProofTest Integration] Error in getStats:', error.message);
      throw error;
    }
  }

  /**
   * Создать новый тестовый лид
   */
  async createLead(lead: Omit<ProofTestLead, 'id' | 'created_at' | 'updated_at'>): Promise<ProofTestLead> {
    try {
      const { data, error } = await this.supabase
        .from('prooftest_leads')
        .insert({
          ...lead,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [ProofTest Integration] Error creating lead:', error);
        throw error;
      }

      console.log(`✅ [ProofTest Integration] Created lead: ${data.id}`);
      return data;
    } catch (error: any) {
      console.error('❌ [ProofTest Integration] Error in createLead:', error.message);
      throw error;
    }
  }

  /**
   * Обновить статус тестового лида
   */
  async updateLeadStatus(leadId: number, status: string): Promise<ProofTestLead> {
    try {
      const { data, error } = await this.supabase
        .from('prooftest_leads')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .select()
        .single();

      if (error) {
        console.error('❌ [ProofTest Integration] Error updating lead status:', error);
        throw error;
      }

      console.log(`✅ [ProofTest Integration] Updated lead ${leadId} status to ${status}`);
      return data;
    } catch (error: any) {
      console.error('❌ [ProofTest Integration] Error in updateLeadStatus:', error.message);
      throw error;
    }
  }

  /**
   * Синхронизировать тестовые лиды с Traffic DB
   * 
   * Этот метод синхронизирует ProofTest лиды с traffic_sales таблицей.
   */
  async syncWithTrafficDB(): Promise<{
    synced: number;
    skipped: number;
    errors: number;
  }> {
    try {
      const leads = await this.fetchAllLeads({ limit: 100 });
      let synced = 0;
      let skipped = 0;
      let errors = 0;

      for (const lead of leads) {
        try {
          // Проверяем, существует ли лид в traffic_sales
          const { data: existing } = await this.supabase
            .from('traffic_sales')
            .select('id')
            .eq('lead_id', lead.id)
            .eq('source', 'prooftest')
            .single();

          if (existing) {
            skipped++;
            continue;
          }

          // Создаем запись в traffic_sales
          await this.supabase
            .from('traffic_sales')
            .insert({
              lead_id: lead.id,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              price: lead.price,
              pipeline_id: null, // ProofTest не имеет pipeline
              status_id: lead.status === 'success' ? 142 : null,
              created_at: lead.created_at,
              updated_at: lead.updated_at,
              utm_source: lead.utm_source,
              utm_campaign: lead.utm_campaign,
              utm_medium: lead.utm_medium,
              utm_content: lead.utm_content,
              targetologist: lead.targetologist,
              is_flagman: lead.is_flagman,
              source: 'prooftest',
            });

          synced++;
        } catch (error) {
          console.error(`❌ [ProofTest Integration] Error syncing lead ${lead.id}:`, error);
          errors++;
        }
      }

      console.log(`✅ [ProofTest Integration] Sync completed: ${synced} synced, ${skipped} skipped, ${errors} errors`);

      return { synced, skipped, errors };
    } catch (error: any) {
      console.error('❌ [ProofTest Integration] Error in syncWithTrafficDB:', error.message);
      throw error;
    }
  }

  /**
   * Проверить здоровье интеграции
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    details?: any;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('prooftest_leads')
        .select('id')
        .limit(1);

      if (error) {
        throw error;
      }

      return {
        status: 'healthy',
        message: 'ProofTest integration is working',
        details: {
          leadsCount: data?.length || 0,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: 'ProofTest integration failed',
        details: error.message,
      };
    }
  }
}

// Экспорт singleton
export const prooftestIntegration = new ProofTestIntegration();
