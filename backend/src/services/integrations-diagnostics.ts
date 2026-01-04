/**
 * Интеграционные Диагностики
 *
 * Проверяет состояние всех интеграций лидов:
 * - Express Course webhook (10350882)
 * - Flagship Course webhook (10418746)
 * - Landing BD синхронизация
 * - Tripwire BD интеграция
 * - ProofTest интеграция
 */

import { trafficAdminSupabase } from '../config/supabase-traffic';
import { trafficSupabase } from '../config/supabase-traffic';
import { AMOCRM_CONFIG } from '../config/amocrm-config';
// TODO: Временно отключены из-за отсутствия переменных окружения на продакшене
// import { tripwireBDIntegration } from './tripwire-bd-integration';
// import { prooftestIntegration } from './prooftest-integration';

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const AMOCRM_TIMEOUT = 30000; // 30 секунд

// Helper: fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AMOCRM_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

interface DiagnosticResult {
  name: string;
  status: 'ok' | 'error' | 'warning';
  message: string;
  details?: any;
}

export class IntegrationsDiagnostics {
  /**
   * Запускает полную диагностику всех интеграций
   */
  async runFullDiagnostics(): Promise<{
    overall_status: 'ok' | 'partial' | 'error';
    diagnostics: DiagnosticResult[];
    summary: {
      total: number;
      ok: number;
      warning: number;
      error: number;
    };
  }> {
    console.log('🔍 Starting full integrations diagnostics...\n');
    
    const diagnostics: DiagnosticResult[] = [];
    
    // 1. Проверить Express Course webhook
    diagnostics.push(await this.checkExpressCourseWebhook());
    
    // 2. Проверить Flagship Course webhook
    diagnostics.push(await this.checkFlagshipCourseWebhook());
    
    // 3. Проверить Landing BD синхронизацию
    diagnostics.push(await this.checkLandingBDSync());
    
    // TODO: Временно отключены из-за отсутствия переменных окружения на продакшене
    // // 4. Проверить Tripwire BD интеграцию
    // diagnostics.push(await this.checkTripwireBDIntegration());
    //
    // // 5. Проверить ProofTest интеграцию
    // diagnostics.push(await this.checkProofTestIntegration());
    
    // 6. Проверить Express Course продажи в Landing BD
    diagnostics.push(await this.checkExpressCourseSales());
    
    // 7. Проверить Flagship Course продажи в Landing BD
    diagnostics.push(await this.checkFlagshipCourseSales());
    
    // 8. Проверить all_sales_tracking в Traffic DB
    diagnostics.push(await this.checkAllSalesTracking());
    
    // Подсчет статистики
    const summary = {
      total: diagnostics.length,
      ok: diagnostics.filter(d => d.status === 'ok').length,
      warning: diagnostics.filter(d => d.status === 'warning').length,
      error: diagnostics.filter(d => d.status === 'error').length,
    };
    
    // Определение общего статуса
    let overall_status: 'ok' | 'partial' | 'error';
    if (summary.error === 0 && summary.warning === 0) {
      overall_status = 'ok';
    } else if (summary.error > 0) {
      overall_status = 'error';
    } else {
      overall_status = 'partial';
    }
    
    console.log('\n📊 Diagnostics Summary:');
    console.log(`   Total: ${summary.total}`);
    console.log(`   ✅ OK: ${summary.ok}`);
    console.log(`   ⚠️ Warning: ${summary.warning}`);
    console.log(`   ❌ Error: ${summary.error}`);
    console.log(`   Overall Status: ${overall_status.toUpperCase()}\n`);
    
    return {
      overall_status,
      diagnostics,
      summary,
    };
  }
  
  /**
   * Проверить Express Course webhook (10350882)
   */
  private async checkExpressCourseWebhook(): Promise<DiagnosticResult> {
    console.log('🔍 Checking Express Course webhook (10350882)...');
    
    try {
      // Проверить наличие продаж в express_course_sales
      const { data: sales, error: salesError } = await trafficAdminSupabase
        .from('express_course_sales')
        .select('id, deal_id, pipeline_id, status_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (salesError) {
        return {
          name: 'Express Course Webhook',
          status: 'error',
          message: `Database error: ${salesError.message}`,
          details: { error: salesError },
        };
      }
      
      if (!sales || sales.length === 0) {
        return {
          name: 'Express Course Webhook',
          status: 'warning',
          message: 'No sales found in express_course_sales table',
          details: { count: 0 },
        };
      }
      
      // Проверить что все продажи из pipeline 10350882
      const correctPipeline = sales.filter(s => s.pipeline_id === 10350882);
      
      if (correctPipeline.length === 0) {
        return {
          name: 'Express Course Webhook',
          status: 'error',
          message: 'No sales from pipeline 10350882 found',
          details: { total: sales.length, correctPipeline: 0 },
        };
      }
      
      console.log(`   ✅ Found ${sales.length} sales, ${correctPipeline.length} from pipeline 10350882`);
      
      return {
        name: 'Express Course Webhook',
        status: 'ok',
        message: `Webhook working: ${sales.length} sales found`,
        details: {
          total_sales: sales.length,
          correct_pipeline: correctPipeline.length,
          latest_sale: sales[0]?.created_at,
        },
      };
    } catch (error: any) {
      return {
        name: 'Express Course Webhook',
        status: 'error',
        message: `Exception: ${error.message}`,
        details: { error },
      };
    }
  }
  
  /**
   * Проверить Flagship Course webhook (10418746)
   */
  private async checkFlagshipCourseWebhook(): Promise<DiagnosticResult> {
    console.log('🔍 Checking Flagship Course webhook (10418746)...');
    
    try {
      // Проверить наличие продаж в main_product_sales
      const { data: sales, error: salesError } = await trafficAdminSupabase
        .from('main_product_sales')
        .select('id, deal_id, pipeline_id, status_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (salesError) {
        return {
          name: 'Flagship Course Webhook',
          status: 'error',
          message: `Database error: ${salesError.message}`,
          details: { error: salesError },
        };
      }
      
      if (!sales || sales.length === 0) {
        return {
          name: 'Flagship Course Webhook',
          status: 'warning',
          message: 'No sales found in main_product_sales table',
          details: { count: 0 },
        };
      }
      
      // Проверить что все продажи из pipeline 10418746
      const correctPipeline = sales.filter(s => s.pipeline_id === 10418746);
      
      if (correctPipeline.length === 0) {
        return {
          name: 'Flagship Course Webhook',
          status: 'error',
          message: 'No sales from pipeline 10418746 found',
          details: { total: sales.length, correctPipeline: 0 },
        };
      }
      
      console.log(`   ✅ Found ${sales.length} sales, ${correctPipeline.length} from pipeline 10418746`);
      
      return {
        name: 'Flagship Course Webhook',
        status: 'ok',
        message: `Webhook working: ${sales.length} sales found`,
        details: {
          total_sales: sales.length,
          correct_pipeline: correctPipeline.length,
          latest_sale: sales[0]?.created_at,
        },
      };
    } catch (error: any) {
      return {
        name: 'Flagship Course Webhook',
        status: 'error',
        message: `Exception: ${error.message}`,
        details: { error },
      };
    }
  }
  
  /**
   * Проверить Landing BD синхронизацию
   */
  private async checkLandingBDSync(): Promise<DiagnosticResult> {
    console.log('🔍 Checking Landing BD sync...');
    
    try {
      // Проверить наличие лидов в landing_leads
      const { data: leads, error: leadsError } = await trafficAdminSupabase
        .from('traffic_leads')
        .select('id, email, phone, amocrm_lead_id, amocrm_synced, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (leadsError) {
        return {
          name: 'Landing BD Sync',
          status: 'error',
          message: `Database error: ${leadsError.message}`,
          details: { error: leadsError },
        };
      }
      
      if (!leads || leads.length === 0) {
        return {
          name: 'Landing BD Sync',
          status: 'warning',
          message: 'No leads found in landing_leads table',
          details: { count: 0 },
        };
      }
      
      // Проверить статус синхронизации
      const synced = leads.filter(l => l.amocrm_synced);
      const notSynced = leads.filter(l => !l.amocrm_synced);
      
      console.log(`   ✅ Found ${leads.length} leads, ${synced.length} synced, ${notSynced.length} not synced`);
      
      return {
        name: 'Landing BD Sync',
        status: 'ok',
        message: `Sync working: ${leads.length} leads, ${synced.length} synced`,
        details: {
          total_leads: leads.length,
          synced: synced.length,
          not_synced: notSynced.length,
          latest_lead: leads[0]?.created_at,
        },
      };
    } catch (error: any) {
      return {
        name: 'Landing BD Sync',
        status: 'error',
        message: `Exception: ${error.message}`,
        details: { error },
      };
    }
  }
  
  /**
   * Проверить Tripwire BD интеграцию
   * TODO: Временно отключен из-за отсутствия переменных окружения на продакшене
   */
  // private async checkTripwireBDIntegration(): Promise<DiagnosticResult> {
  //   console.log('🔍 Checking Tripwire BD integration...');
  //
  //   try {
  //     const health = await tripwireBDIntegration.healthCheck();
  //
  //     if (health.status === 'healthy') {
  //       console.log(`   ✅ Tripwire BD is healthy: ${health.message}`);
  //       return {
  //         name: 'Tripwire BD Integration',
  //         status: 'ok',
  //         message: health.message,
  //         details: health.details,
  //       };
  //     } else {
  //       console.log(`   ❌ Tripwire BD is unhealthy: ${health.message}`);
  //       return {
  //         name: 'Tripwire BD Integration',
  //         status: 'error',
  //         message: health.message,
  //         details: health.details,
  //       };
  //     }
  //   } catch (error: any) {
  //     return {
  //       name: 'Tripwire BD Integration',
  //       status: 'error',
  //       message: `Exception: ${error.message}`,
  //       details: { error },
  //     };
  //   }
  // }
  
  /**
   * Проверить ProofTest интеграцию
   * TODO: Временно отключен из-за отсутствия переменных окружения на продакшене
   */
  // private async checkProofTestIntegration(): Promise<DiagnosticResult> {
  //   console.log('🔍 Checking ProofTest integration...');
  //
  //   try {
  //     const health = await prooftestIntegration.healthCheck();
  //
  //     if (health.status === 'healthy') {
  //       console.log(`   ✅ ProofTest is healthy: ${health.message}`);
  //       return {
  //         name: 'ProofTest Integration',
  //         status: 'ok',
  //         message: health.message,
  //         details: health.details,
  //       };
  //     } else {
  //       console.log(`   ❌ ProofTest is unhealthy: ${health.message}`);
  //       return {
  //         name: 'ProofTest Integration',
  //         status: 'error',
  //         message: health.message,
  //         details: health.details,
  //       };
  //     }
  //   } catch (error: any) {
  //     return {
  //       name: 'ProofTest Integration',
  //       status: 'error',
  //       message: `Exception: ${error.message}`,
  //       details: { error },
  //     };
  //   }
  // }
  
  /**
   * Проверить Express Course продажи в Landing BD
   */
  private async checkExpressCourseSales(): Promise<DiagnosticResult> {
    console.log('🔍 Checking Express Course sales...');
    
    try {
      const { data: sales, error: salesError } = await trafficAdminSupabase
        .from('express_course_sales')
        .select('id, deal_id, utm_source, utm_campaign, sale_date')
        .order('sale_date', { ascending: false })
        .limit(10);
      
      if (salesError) {
        return {
          name: 'Express Course Sales',
          status: 'error',
          message: `Database error: ${salesError.message}`,
          details: { error: salesError },
        };
      }
      
      // Проверить UTM метки
      const withUTM = sales.filter(s => s.utm_source || s.utm_campaign);
      const withoutUTM = sales.filter(s => !s.utm_source && !s.utm_campaign);
      
      console.log(`   ✅ Found ${sales.length} sales, ${withUTM.length} with UTM, ${withoutUTM.length} without UTM`);
      
      return {
        name: 'Express Course Sales',
        status: 'ok',
        message: `${sales.length} sales found`,
        details: {
          total_sales: sales.length,
          with_utm: withUTM.length,
          without_utm: withoutUTM.length,
          latest_sale: sales[0]?.sale_date,
        },
      };
    } catch (error: any) {
      return {
        name: 'Express Course Sales',
        status: 'error',
        message: `Exception: ${error.message}`,
        details: { error },
      };
    }
  }
  
  /**
   * Проверить Flagship Course продажи в Landing BD
   */
  private async checkFlagshipCourseSales(): Promise<DiagnosticResult> {
    console.log('🔍 Checking Flagship Course sales...');
    
    try {
      const { data: sales, error: salesError } = await trafficAdminSupabase
        .from('main_product_sales')
        .select('id, deal_id, utm_source, utm_campaign, sale_date')
        .order('sale_date', { ascending: false })
        .limit(10);
      
      if (salesError) {
        return {
          name: 'Flagship Course Sales',
          status: 'error',
          message: `Database error: ${salesError.message}`,
          details: { error: salesError },
        };
      }
      
      // Проверить UTM метки
      const withUTM = sales.filter(s => s.utm_source || s.utm_campaign);
      const withoutUTM = sales.filter(s => !s.utm_source && !s.utm_campaign);
      
      console.log(`   ✅ Found ${sales.length} sales, ${withUTM.length} with UTM, ${withoutUTM.length} without UTM`);
      
      return {
        name: 'Flagship Course Sales',
        status: 'ok',
        message: `${sales.length} sales found`,
        details: {
          total_sales: sales.length,
          with_utm: withUTM.length,
          without_utm: withoutUTM.length,
          latest_sale: sales[0]?.sale_date,
        },
      };
    } catch (error: any) {
      return {
        name: 'Flagship Course Sales',
        status: 'error',
        message: `Exception: ${error.message}`,
        details: { error },
      };
    }
  }
  
  /**
   * Проверить all_sales_tracking в Traffic DB
   */
  private async checkAllSalesTracking(): Promise<DiagnosticResult> {
    console.log('🔍 Checking all_sales_tracking in Traffic DB...');
    
    try {
      const { data: sales, error: salesError } = await trafficSupabase
        .from('all_sales_tracking')
        .select('id, lead_id, targetologist, utm_source, utm_campaign, sale_date')
        .order('sale_date', { ascending: false })
        .limit(10);
      
      if (salesError) {
        return {
          name: 'All Sales Tracking',
          status: 'error',
          message: `Database error: ${salesError.message}`,
          details: { error: salesError },
        };
      }
      
      if (!sales || sales.length === 0) {
        return {
          name: 'All Sales Tracking',
          status: 'warning',
          message: 'No sales found in all_sales_tracking table',
          details: { count: 0 },
        };
      }
      
      // Проверить таргетологов
      const targetologists = [...new Set(sales.map(s => s.targetologist).filter(Boolean))];
      const withTargetologist = sales.filter(s => s.targetologist);
      const withoutTargetologist = sales.filter(s => !s.targetologist);
      
      console.log(`   ✅ Found ${sales.length} sales, ${targetologists.length} targetologists`);
      console.log(`      With targetologist: ${withTargetologist.length}, Without: ${withoutTargetologist.length}`);
      
      return {
        name: 'All Sales Tracking',
        status: 'ok',
        message: `${sales.length} sales found`,
        details: {
          total_sales: sales.length,
          targetologists: targetologists,
          with_targetologist: withTargetologist.length,
          without_targetologist: withoutTargetologist.length,
          latest_sale: sales[0]?.sale_date,
        },
      };
    } catch (error: any) {
      return {
        name: 'All Sales Tracking',
        status: 'error',
        message: `Exception: ${error.message}`,
        details: { error },
      };
    }
  }
}

export default IntegrationsDiagnostics;
