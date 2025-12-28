/**
 * 🔄 AmoCRM Leads Fetcher Service
 * 
 * Сервис для получения лидов из AmoCRM:
 * - Express Course (pipeline_id: 10350882)
 * - Flagship Course (pipeline_id: 10418746)
 * 
 * Лиды получаются через AmoCRM API и синхронизируются с Traffic DB.
 */

import axios from 'axios';

// Конфигурация AmoCRM
const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_BASE_URL = `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4`;
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN || '';

// ID воронок
const EXPRESS_COURSE_PIPELINE_ID = 10350882;
const FLAGSHIP_COURSE_PIPELINE_ID = 10418746;

// ID статусов
const STATUS_SUCCESS = 142; // Успешно реализовано
const STATUS_NEW = 142; // Новый лид (может отличаться)

// Интерфейсы
export interface AmoCRMLead {
  id: number;
  name: string;
  price: number;
  pipeline_id: number;
  status_id: number;
  created_at: number;
  updated_at: number;
  custom_fields_values?: Array<{
    field_id: number;
    field_name: string;
    values: Array<{
      value: string;
    }>;
  }>;
}

export interface AmoCRMLeadResponse {
  _links: any;
  _embedded: {
    leads: AmoCRMLead[];
  };
}

export interface SyncedLead {
  lead_id: number;
  name: string;
  price: number;
  pipeline_id: number;
  status_id: number;
  pipeline_name: string;
  status_name: string;
  created_at: Date;
  updated_at: Date;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  targetologist: string;
  is_flagman: boolean;
}

export interface FetchLeadsOptions {
  pipeline_id?: number;
  status_id?: number;
  limit?: number;
  page?: number;
  date_from?: number;
  date_to?: number;
}

export class AmoCRMLeadsFetcher {
  private readonly headers: Record<string, string>;

  constructor() {
    if (!AMOCRM_ACCESS_TOKEN) {
      console.error('❌ [AmoCRM Leads Fetcher] AMOCRM_ACCESS_TOKEN not set');
      throw new Error('AMOCRM_ACCESS_TOKEN not set');
    }

    this.headers = {
      'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Получить лиды из AmoCRM
   */
  async fetchLeads(options: FetchLeadsOptions = {}): Promise<AmoCRMLead[]> {
    try {
      const params: any = {
        limit: options.limit || 50,
        page: options.page || 1,
        with: 'catalog_elements',
      };

      if (options.pipeline_id) {
        params.filter = {
          pipeline_id: [options.pipeline_id],
        };
      }

      if (options.status_id) {
        if (!params.filter) params.filter = {};
        params.filter.status_id = [options.status_id];
      }

      if (options.date_from) {
        params.filter = params.filter || {};
        params.filter.created_at = params.filter.created_at || {};
        params.filter.created_at.from = options.date_from;
      }

      if (options.date_to) {
        params.filter = params.filter || {};
        params.filter.created_at = params.filter.created_at || {};
        params.filter.created_at.to = options.date_to;
      }

      const response = await axios.get<AmoCRMLeadResponse>(
        `${AMOCRM_BASE_URL}/leads`,
        {
          headers: this.headers,
          params,
          timeout: 30000,
        }
      );

      console.log(`✅ [AmoCRM Leads Fetcher] Fetched ${response.data._embedded.leads.length} leads`);
      return response.data._embedded.leads;
    } catch (error: any) {
      console.error('❌ [AmoCRM Leads Fetcher] Error fetching leads:', error.message);
      throw error;
    }
  }

  /**
   * Получить лиды Express Course
   */
  async fetchExpressCourseLeads(options: Omit<FetchLeadsOptions, 'pipeline_id'> = {}): Promise<AmoCRMLead[]> {
    console.log('🔄 [AmoCRM Leads Fetcher] Fetching Express Course leads...');
    return this.fetchLeads({ ...options, pipeline_id: EXPRESS_COURSE_PIPELINE_ID });
  }

  /**
   * Получить лиды Flagship Course
   */
  async fetchFlagshipCourseLeads(options: Omit<FetchLeadsOptions, 'pipeline_id'> = {}): Promise<AmoCRMLead[]> {
    console.log('🔄 [AmoCRM Leads Fetcher] Fetching Flagship Course leads...');
    return this.fetchLeads({ ...options, pipeline_id: FLAGSHIP_COURSE_PIPELINE_ID });
  }

  /**
   * Получить все лиды (Express + Flagship)
   */
  async fetchAllLeads(options: FetchLeadsOptions = {}): Promise<{
    express: AmoCRMLead[];
    flagship: AmoCRMLead[];
    total: number;
  }> {
    const [express, flagship] = await Promise.all([
      this.fetchExpressCourseLeads(options),
      this.fetchFlagshipCourseLeads(options),
    ]);

    return {
      express,
      flagship,
      total: express.length + flagship.length,
    };
  }

  /**
   * Получить успешные продажи (статус: Успешно реализовано)
   */
  async fetchSuccessfulSales(options: Omit<FetchLeadsOptions, 'status_id'> = {}): Promise<{
    express: AmoCRMLead[];
    flagship: AmoCRMLead[];
    total: number;
    total_revenue: number;
  }> {
    const [express, flagship] = await Promise.all([
      this.fetchExpressCourseLeads({ ...options, status_id: STATUS_SUCCESS }),
      this.fetchFlagshipCourseLeads({ ...options, status_id: STATUS_SUCCESS }),
    ]);

    const totalRevenue = express.reduce((sum, lead) => sum + (lead.price || 0), 0) +
                       flagship.reduce((sum, lead) => sum + (lead.price || 0), 0);

    return {
      express,
      flagship,
      total: express.length + flagship.length,
      total_revenue: totalRevenue,
    };
  }

  /**
   * Получить лиды за период
   */
  async fetchLeadsByPeriod(dateFrom: Date, dateTo: Date, options: Omit<FetchLeadsOptions, 'date_from' | 'date_to'> = {}): Promise<{
    express: AmoCRMLead[];
    flagship: AmoCRMLead[];
    total: number;
  }> {
    const dateFromTimestamp = Math.floor(dateFrom.getTime() / 1000);
    const dateToTimestamp = Math.floor(dateTo.getTime() / 1000);

    return this.fetchAllLeads({
      ...options,
      date_from: dateFromTimestamp,
      date_to: dateToTimestamp,
    });
  }

  /**
   * Извлечь UTM теги из лидов
   */
  private extractUTMTags(lead: AmoCRMLead): {
    utm_source: string | null;
    utm_campaign: string | null;
    utm_medium: string | null;
    utm_content: string | null;
  } {
    if (!lead.custom_fields_values) {
      return {
        utm_source: null,
        utm_campaign: null,
        utm_medium: null,
        utm_content: null,
      };
    }

    const utmSourceField = lead.custom_fields_values.find(f => f.field_name === 'UTM Source');
    const utmCampaignField = lead.custom_fields_values.find(f => f.field_name === 'UTM Campaign');
    const utmMediumField = lead.custom_fields_values.find(f => f.field_name === 'UTM Medium');
    const utmContentField = lead.custom_fields_values.find(f => f.field_name === 'UTM Content');

    return {
      utm_source: utmSourceField?.values[0]?.value || null,
      utm_campaign: utmCampaignField?.values[0]?.value || null,
      utm_medium: utmMediumField?.values[0]?.value || null,
      utm_content: utmContentField?.values[0]?.value || null,
    };
  }

  /**
   * Определить название воронки
   */
  private getPipelineName(pipelineId: number): string {
    switch (pipelineId) {
      case EXPRESS_COURSE_PIPELINE_ID:
        return 'Express Course';
      case FLAGSHIP_COURSE_PIPELINE_ID:
        return 'Flagship Course';
      default:
        return 'Unknown';
    }
  }

  /**
   * Определить название статуса
   */
  private getStatusName(statusId: number): string {
    switch (statusId) {
      case STATUS_SUCCESS:
        return 'Успешно реализовано';
      default:
        return `Статус ${statusId}`;
    }
  }

  /**
   * Синхронизировать лиды с Traffic DB
   * 
   * Этот метод должен быть реализован в Traffic Sales Aggregator.
   * Здесь только подготовка данных.
   */
  async prepareLeadsForSync(leads: AmoCRMLead[]): Promise<SyncedLead[]> {
    const { determineTargetologist } = await import('./targetologist-mapper');

    return leads.map(lead => {
      const utmTags = this.extractUTMTags(lead);
      const targetologist = determineTargetologist(utmTags.utm_source, utmTags.utm_campaign);
      const isFlagman = lead.price >= 50000;

      return {
        lead_id: lead.id,
        name: lead.name,
        price: lead.price || 0,
        pipeline_id: lead.pipeline_id,
        status_id: lead.status_id,
        pipeline_name: this.getPipelineName(lead.pipeline_id),
        status_name: this.getStatusName(lead.status_id),
        created_at: new Date(lead.created_at * 1000),
        updated_at: new Date(lead.updated_at * 1000),
        utm_source: utmTags.utm_source,
        utm_campaign: utmTags.utm_campaign,
        utm_medium: utmTags.utm_medium,
        utm_content: utmTags.utm_content,
        targetologist,
        is_flagman: isFlagman,
      };
    });
  }

  /**
   * Получить статистику по лидам
   */
  async getLeadsStats(options: FetchLeadsOptions = {}): Promise<{
    total_leads: number;
    express_leads: number;
    flagship_leads: number;
    successful_sales: number;
    total_revenue: number;
    flagman_sales: number;
    express_sales: number;
  }> {
    const allLeads = await this.fetchAllLeads(options);
    const successfulSales = await this.fetchSuccessfulSales(options);

    const flagmanSales = successfulSales.flagship.filter(lead => lead.price >= 50000).length;
    const expressSales = successfulSales.express.length;

    return {
      total_leads: allLeads.total,
      express_leads: allLeads.express.length,
      flagship_leads: allLeads.flagship.length,
      successful_sales: successfulSales.total,
      total_revenue: successfulSales.total_revenue,
      flagman_sales: flagmanSales,
      express_sales: expressSales,
    };
  }
}

// Экспорт singleton
export const amocrmLeadsFetcher = new AmoCRMLeadsFetcher();
