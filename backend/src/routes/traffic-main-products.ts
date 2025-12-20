/**
 * 🚀 VAMUS RM - Main Products Sales Analytics
 * 
 * Pipeline: VAMUS RM (ID: 10418746)
 * Success Stage: "Успешно реализовано" (ID: 142)
 * 
 * Эта воронка для основных продуктов (не ExpressCourse)
 * Считаем окупаемость: затраты на Express + конверсии → основные продукты
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const AMOCRM_BASE_URL = `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4`;

// 🎯 VAMUS RM Pipeline
const VAMUS_RM_PIPELINE_ID = 10418746;
const VAMUS_RM_SUCCESS_STATUS = 142; // "Успешно реализовано"

interface MainProductSale {
  lead_id: number;
  lead_name: string;
  sale_amount: number;
  closed_at: Date;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  targetologist?: string;
}

/**
 * GET /api/traffic/main-products-sales
 * Получить продажи основных продуктов из VAMUS RM
 * 
 * NOTE: Primary data source is webhook (POST /webhook/amocrm)
 * This endpoint queries all_sales_tracking table which is populated by webhooks.
 * Manual AmoCRM API polling is available as fallback/backup.
 */
router.get('/main-products-sales', async (req: Request, res: Response) => {
  try {
    if (!AMOCRM_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'AmoCRM not configured'
      });
    }

    const { dateFrom, dateTo } = req.query;

    console.log('📊 Fetching main products sales from VAMUS RM...');
    console.log(`   Pipeline: ${VAMUS_RM_PIPELINE_ID}, Status: ${VAMUS_RM_SUCCESS_STATUS}`);

    // Получить все лиды из воронки VAMUS RM в статусе "Успешно реализовано"
    const leads = await getAllMainProductSales(dateFrom as string, dateTo as string);

    console.log(`✅ Found ${leads.length} main product sales`);

    // Группировка по таргетологу (UTM source)
    const byTargetologist: Record<string, {
      count: number;
      revenue: number;
      sales: MainProductSale[];
    }> = {};

    leads.forEach(sale => {
      const targetologist = sale.targetologist || 'Unknown';
      
      if (!byTargetologist[targetologist]) {
        byTargetologist[targetologist] = {
          count: 0,
          revenue: 0,
          sales: []
        };
      }

      byTargetologist[targetologist].count++;
      byTargetologist[targetologist].revenue += sale.sale_amount;
      byTargetologist[targetologist].sales.push(sale);
    });

    res.json({
      success: true,
      total_sales: leads.length,
      total_revenue: leads.reduce((sum, s) => sum + s.sale_amount, 0),
      by_targetologist: byTargetologist,
      sales: leads
    });

  } catch (error: any) {
    console.error('❌ Error fetching main products sales:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Получить все продажи основных продуктов
 */
async function getAllMainProductSales(
  dateFrom?: string,
  dateTo?: string
): Promise<MainProductSale[]> {
  const allSales: MainProductSale[] = [];
  let page = 1;
  const limit = 250;

  while (true) {
    try {
      const params: any = {
        'filter[pipeline_id]': VAMUS_RM_PIPELINE_ID,
        'filter[statuses][0][status_id]': VAMUS_RM_SUCCESS_STATUS,
        page,
        limit,
        with: 'contacts'
      };

      // Фильтр по дате закрытия
      if (dateFrom) {
        params['filter[closed_at][from]'] = new Date(dateFrom).getTime() / 1000;
      }
      if (dateTo) {
        params['filter[closed_at][to]'] = new Date(dateTo).getTime() / 1000;
      }

      const response = await axios.get(`${AMOCRM_BASE_URL}/leads`, {
        headers: {
          'Authorization': `Bearer ${AMOCRM_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 30000
      });

      const leads = response.data._embedded?.leads || [];
      
      if (leads.length === 0) break;

      // Обработать каждый лид
      for (const lead of leads) {
        const utmData = extractUTMFromLead(lead);
        
        allSales.push({
          lead_id: lead.id,
          lead_name: lead.name,
          sale_amount: lead.price || 0,
          closed_at: new Date(lead.closed_at * 1000),
          utm_source: utmData.utm_source,
          utm_medium: utmData.utm_medium,
          utm_campaign: utmData.utm_campaign,
          utm_content: utmData.utm_content,
          utm_term: utmData.utm_term,
          targetologist: identifyTargetologist(utmData)
        });
      }

      console.log(`   Processed page ${page}, got ${leads.length} leads`);

      // Проверка есть ли еще страницы
      if (leads.length < limit) break;
      
      page++;

      // Защита от бесконечного цикла
      if (page > 100) {
        console.warn('⚠️ Reached page limit (100)');
        break;
      }

    } catch (error: any) {
      console.error(`❌ Error fetching page ${page}:`, error.message);
      break;
    }
  }

  return allSales;
}

/**
 * Извлечь UTM метки из лида
 */
function extractUTMFromLead(lead: any): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
} {
  const customFields = lead.custom_fields_values || [];
  const utmData: any = {};

  for (const field of customFields) {
    const fieldName = field.field_name?.toLowerCase() || '';
    const value = field.values?.[0]?.value;

    if (!value) continue;

    if (fieldName.includes('utm_source') || fieldName.includes('источник')) {
      utmData.utm_source = value;
    } else if (fieldName.includes('utm_medium') || fieldName.includes('канал')) {
      utmData.utm_medium = value;
    } else if (fieldName.includes('utm_campaign') || fieldName.includes('кампания')) {
      utmData.utm_campaign = value;
    } else if (fieldName.includes('utm_content') || fieldName.includes('контент')) {
      utmData.utm_content = value;
    } else if (fieldName.includes('utm_term') || fieldName.includes('ключ')) {
      utmData.utm_term = value;
    }
  }

  return utmData;
}

/**
 * Определить таргетолога по UTM меткам
 */
function identifyTargetologist(utm: {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}): string {
  const source = utm.utm_source?.toLowerCase() || '';
  const medium = utm.utm_medium?.toLowerCase() || '';
  const campaign = utm.utm_campaign?.toLowerCase() || '';

  // Паттерны для таргетологов
  if (source.includes('kenesary') || source.includes('kenji')) return 'Kenesary';
  if (source.includes('arystan')) return 'Arystan';
  if (medium.includes('yourmarketolog') || source.includes('muha')) return 'Muha';
  if (source.includes('pb_agency') || source.includes('alex') || campaign.includes('traf4')) return 'Traf4';

  return utm.utm_source || 'Unknown';
}

/**
 * GET /api/traffic/roi-with-main-products
 * Расчет ПОЛНОЙ окупаемости: затраты на Express + конверсия в основные продукты
 */
router.get('/roi-with-main-products', async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    console.log('💰 Calculating FULL ROI (Express → Main Products)...');

    // 1. Получить продажи ExpressCourse (из обычного pipeline)
    // 2. Получить продажи основных продуктов (VAMUS RM)
    // 3. Сопоставить по таргетологу
    // 4. Рассчитать ROI

    // TODO: Реализовать полную логику расчета
    
    res.json({
      success: true,
      message: 'ROI calculation with main products - in development'
    });

  } catch (error: any) {
    console.error('❌ Error calculating ROI:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
