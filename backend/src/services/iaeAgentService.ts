import axios from 'axios';
import { tripwireAdminSupabase as tripwireSupabase } from '../config/supabase-tripwire.js';

// Configuration
const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const FB_ACCESS_TOKEN = process.env.FACEBOOK_ADS_TOKEN;
const FB_API_VERSION = 'v21.0';
const API_URL = process.env.API_URL || 'http://localhost:3000';

// 🔧 Types
export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export interface Issue {
  source: 'amocrm' | 'facebook_ads' | 'database' | 'system';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details?: any;
}

export interface Anomaly {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  metric: string;
  description: string;
  value: any;
  threshold?: any;
}

export interface DataQuality {
  completeness: number; // 0-100%
  accuracy: number;     // 0-100%
  consistency: number;  // 0-100%
}

export interface ValidationResult {
  healthy: boolean;
  issues: Issue[];
  dataQuality: DataQuality;
  anomalies: Anomaly[];
  amocrm_status: {
    healthy: boolean;
    token_valid: boolean;
    last_sync: string;
    issues: string[];
  };
  facebook_ads_status: {
    healthy: boolean;
    token_valid: boolean;
    last_sync: string;
    issues: string[];
  };
  database_status: {
    healthy: boolean;
    last_sync: string;
    issues: string[];
  };
}

export interface AIAnalysis {
  healthScore: number;
  summary: string;
  insights: string;
  recommendations: string[];
  risks: string[];
}

export interface IAEAgentResult {
  validation: ValidationResult;
  aiAnalysis: AIAnalysis;
  metrics: any;
  telegramReport: string;
  reportData: any;
}

// 📊 Data Collector
export async function collectData(dateRange: DateRange) {
  console.log(`🔍 [IAE] Collecting data for ${dateRange.start} to ${dateRange.end}...`);
  
  const results = await Promise.allSettled([
    fetchAmoCRMData(dateRange),
    fetchFacebookAdsData(dateRange),
    fetchDatabaseReports(dateRange)
  ]);
  
  return {
    amocrm: results[0].status === 'fulfilled' ? results[0].value : null,
    fbads: results[1].status === 'fulfilled' ? results[1].value : null,
    database: results[2].status === 'fulfilled' ? results[2].value : null,
    errors: results.map((r, i) => 
      r.status === 'rejected' ? { source: ['amocrm', 'fbads', 'database'][i], error: r.reason } : null
    ).filter(Boolean)
  };
}

async function fetchAmoCRMData(dateRange: DateRange) {
  if (!AMOCRM_TOKEN) {
    throw new Error('AMOCRM_TOKEN not configured');
  }
  
  try {
    const response = await axios.get(`https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads`, {
      headers: {
        'Authorization': `Bearer ${AMOCRM_TOKEN}`
      },
      params: {
        limit: 250,
        'filter[created_at][from]': new Date(dateRange.start).getTime() / 1000,
        'filter[created_at][to]': new Date(dateRange.end).getTime() / 1000
      },
      timeout: 10000
    });
    
    return {
      healthy: true,
      token_valid: true,
      deals: response.data._embedded?.leads || [],
      count: response.data._embedded?.leads?.length || 0,
      last_sync: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('❌ [IAE] AmoCRM fetch error:', error.message);
    
    if (error.response?.status === 401) {
      return {
        healthy: false,
        token_valid: false,
        deals: [],
        count: 0,
        error: 'Invalid token',
        last_sync: new Date().toISOString()
      };
    }
    
    throw error;
  }
}

async function fetchFacebookAdsData(dateRange: DateRange) {
  if (!FB_ACCESS_TOKEN) {
    throw new Error('FACEBOOK_ADS_TOKEN not configured');
  }
  
  try {
    // Test token validity with a simple account request
    const response = await axios.get(
      `https://graph.facebook.com/${FB_API_VERSION}/me/adaccounts`,
      {
        params: {
          access_token: FB_ACCESS_TOKEN,
          fields: 'id,name'
        },
        timeout: 10000
      }
    );
    
    return {
      healthy: true,
      token_valid: true,
      accounts: response.data.data || [],
      count: response.data.data?.length || 0,
      last_sync: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('❌ [IAE] Facebook Ads fetch error:', error.message);
    
    if (error.response?.status === 401 || error.response?.status === 190) {
      return {
        healthy: false,
        token_valid: false,
        accounts: [],
        count: 0,
        error: 'Invalid token',
        last_sync: new Date().toISOString()
      };
    }
    
    throw error;
  }
}

async function fetchDatabaseReports(dateRange: DateRange) {
  try {
    const { data, error } = await tripwireSupabase
      .from('daily_traffic_reports')
      .select('*')
      .gte('report_date', dateRange.start)
      .lte('report_date', dateRange.end)
      .order('report_date', { ascending: false });
    
    if (error) throw error;
    
    return {
      healthy: true,
      reports: data || [],
      count: data?.length || 0,
      last_sync: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('❌ [IAE] Database fetch error:', error.message);
    throw error;
  }
}

// ✅ Data Validator
export async function validateData(collectedData: any): Promise<ValidationResult> {
  console.log('🔍 [IAE] Validating collected data...');
  
  const issues: Issue[] = [];
  const anomalies: Anomaly[] = [];
  
  // 1. Check AmoCRM status
  const amocrmStatus = {
    healthy: collectedData.amocrm?.healthy ?? false,
    token_valid: collectedData.amocrm?.token_valid ?? false,
    last_sync: collectedData.amocrm?.last_sync || new Date().toISOString(),
    issues: [] as string[]
  };
  
  if (!collectedData.amocrm || !amocrmStatus.healthy) {
    issues.push({
      source: 'amocrm',
      severity: 'critical',
      message: 'AmoCRM API недоступен или токен невалиден',
      details: collectedData.amocrm?.error
    });
    amocrmStatus.issues.push('API недоступен');
  }
  
  // 2. Check Facebook Ads status
  const facebookStatus = {
    healthy: collectedData.fbads?.healthy ?? false,
    token_valid: collectedData.fbads?.token_valid ?? false,
    last_sync: collectedData.fbads?.last_sync || new Date().toISOString(),
    issues: [] as string[]
  };
  
  if (!collectedData.fbads || !facebookStatus.healthy) {
    issues.push({
      source: 'facebook_ads',
      severity: 'critical',
      message: 'Facebook Ads API недоступен или токен невалиден',
      details: collectedData.fbads?.error
    });
    facebookStatus.issues.push('API недоступен');
  }
  
  // 3. Check Database status
  const databaseStatus = {
    healthy: collectedData.database?.healthy ?? false,
    last_sync: collectedData.database?.last_sync || new Date().toISOString(),
    issues: [] as string[]
  };
  
  if (!collectedData.database || !databaseStatus.healthy) {
    issues.push({
      source: 'database',
      severity: 'warning',
      message: 'База данных недоступна или данные отсутствуют',
      details: collectedData.database?.error
    });
    databaseStatus.issues.push('Нет данных');
  }
  
  // 4. Check data completeness
  const hasAmocrmData = collectedData.amocrm?.deals?.length > 0;
  const hasFbadsData = collectedData.fbads?.accounts?.length > 0;
  const hasDbData = collectedData.database?.reports?.length > 0;
  
  if (!hasAmocrmData && !hasFbadsData && !hasDbData) {
    anomalies.push({
      type: 'missing_data',
      severity: 'critical',
      metric: 'data_availability',
      description: 'Отсутствуют данные из всех источников',
      value: 0
    });
  }
  
  // 5. Calculate data quality
  const dataQuality = calculateDataQuality(collectedData);
  
  // 6. Check for anomalies in metrics (if database data available)
  if (hasDbData && collectedData.database.reports.length > 0) {
    const latestReport = collectedData.database.reports[0];
    
    // Check ROAS
    if (latestReport.total_roas < 1.0) {
      anomalies.push({
        type: 'low_roas',
        severity: 'warning',
        metric: 'roas',
        description: `Низкий ROAS: ${latestReport.total_roas.toFixed(2)}x (ниже 1.0)`,
        value: latestReport.total_roas,
        threshold: 1.0
      });
    }
    
    // Check spend without sales
    if (latestReport.total_spend > 0 && latestReport.total_sales === 0) {
      anomalies.push({
        type: 'spend_no_sales',
        severity: 'critical',
        metric: 'sales',
        description: `Есть траты ($${latestReport.total_spend}), но нет продаж`,
        value: 0,
        threshold: 1
      });
    }
    
    // Check CTR
    if (latestReport.total_ctr < 0.5) {
      anomalies.push({
        type: 'low_ctr',
        severity: 'info',
        metric: 'ctr',
        description: `Низкий CTR: ${latestReport.total_ctr.toFixed(2)}% (ниже 0.5%)`,
        value: latestReport.total_ctr,
        threshold: 0.5
      });
    }
  }
  
  // Determine overall health
  const criticalIssues = issues.filter(i => i.severity === 'critical').length;
  const healthy = criticalIssues === 0;
  
  return {
    healthy,
    issues,
    dataQuality,
    anomalies,
    amocrm_status: amocrmStatus,
    facebook_ads_status: facebookStatus,
    database_status: databaseStatus
  };
}

function calculateDataQuality(collectedData: any): DataQuality {
  let completeness = 0;
  let accuracy = 100;
  let consistency = 100;
  
  // Completeness: процент доступных источников
  const sources = 3;
  let availableSources = 0;
  
  if (collectedData.amocrm?.healthy) availableSources++;
  if (collectedData.fbads?.healthy) availableSources++;
  if (collectedData.database?.healthy) availableSources++;
  
  completeness = (availableSources / sources) * 100;
  
  // Accuracy: снижается если есть ошибки
  if (collectedData.errors && collectedData.errors.length > 0) {
    accuracy = Math.max(0, 100 - (collectedData.errors.length * 20));
  }
  
  // Consistency: проверяем наличие данных
  if (collectedData.amocrm?.count === 0) consistency -= 20;
  if (collectedData.fbads?.count === 0) consistency -= 20;
  if (collectedData.database?.count === 0) consistency -= 20;
  
  return {
    completeness: Math.round(completeness),
    accuracy: Math.round(accuracy),
    consistency: Math.round(Math.max(0, consistency))
  };
}

// 📊 Get metrics summary
export async function getMetricsSummary(dateRange: DateRange): Promise<any> {
  try {
    // Fetch from existing traffic-stats endpoint
    const response = await axios.get(`${API_URL}/api/traffic/combined-analytics`, {
      params: {
        preset: '7d' // Can be adjusted based on dateRange
      },
      timeout: 30000
    });
    
    const data = response.data;
    
    return {
      spend: data.totals?.spend || 0,
      revenue: data.totals?.revenue || 0,
      sales: data.totals?.sales || 0,
      roas: data.totalRoas || 0,
      impressions: data.totals?.impressions || 0,
      clicks: data.totals?.clicks || 0,
      ctr: data.totalCtr || 0
    };
  } catch (error) {
    console.error('❌ [IAE] Error fetching metrics:', error);
    return {
      spend: 0,
      revenue: 0,
      sales: 0,
      roas: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0
    };
  }
}

// 📝 Generate Telegram Report
export function generateTelegramReport(
  reportType: 'daily' | 'current' | 'monthly' | 'health_check' | 'manual',
  validation: ValidationResult,
  aiAnalysis: AIAnalysis,
  metrics: any
): string {
  const statusEmoji = validation.healthy ? '✅' : '❌';
  const healthBar = '█'.repeat(Math.floor(aiAnalysis.healthScore / 10));
  const healthBarEmpty = '░'.repeat(10 - Math.floor(aiAnalysis.healthScore / 10));
  
  let reportTitle = '';
  switch (reportType) {
    case 'daily': reportTitle = '📅 За вчера'; break;
    case 'current': reportTitle = '⏰ Текущий статус'; break;
    case 'monthly': reportTitle = '📊 За месяц'; break;
    case 'health_check': reportTitle = '🔍 Health Check'; break;
    case 'manual': reportTitle = '🔘 Ручная проверка'; break;
  }
  
  let report = `🤖 *IAE AGENT REPORT* ${statusEmoji}
${reportTitle}

━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *ОБЩЕЕ СОСТОЯНИЕ*

Health Score: ${healthBar}${healthBarEmpty} ${aiAnalysis.healthScore}/100

${aiAnalysis.summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *МЕТРИКИ*

💵 Траты: $${metrics.spend.toFixed(2)}
💰 Доход: ₸${metrics.revenue.toLocaleString()}
🛒 Продажи: ${metrics.sales} шт
📈 ROAS: ${metrics.roas.toFixed(2)}x
👁 Показы: ${metrics.impressions.toLocaleString()}
🖱 Клики: ${metrics.clicks.toLocaleString()}
📊 CTR: ${metrics.ctr.toFixed(2)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 *СТАТУС СИСТЕМ*

AmoCRM: ${validation.amocrm_status.healthy ? '✅ Работает' : '❌ Недоступен'}
Facebook Ads: ${validation.facebook_ads_status.healthy ? '✅ Работает' : '❌ Недоступен'}
Database: ${validation.database_status.healthy ? '✅ Работает' : '❌ Недоступен'}

📊 Качество данных:
• Полнота: ${validation.dataQuality.completeness}%
• Точность: ${validation.dataQuality.accuracy}%
• Консистентность: ${validation.dataQuality.consistency}%`;

  if (validation.issues.length > 0) {
    report += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *ПРОБЛЕМЫ:*

${validation.issues.map(i => {
  const emoji = i.severity === 'critical' ? '🔴' : i.severity === 'warning' ? '🟡' : '🔵';
  return `${emoji} ${i.message}`;
}).join('\n')}`;
  }

  if (validation.anomalies.length > 0) {
    report += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 *АНОМАЛИИ:*

${validation.anomalies.map(a => {
  const emoji = a.severity === 'critical' ? '🔴' : a.severity === 'warning' ? '🟡' : '🔵';
  return `${emoji} ${a.description}`;
}).join('\n')}`;
  }

  if (aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0) {
    report += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 *AI РЕКОМЕНДАЦИИ*

${aiAnalysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
  }

  if (aiAnalysis.risks && aiAnalysis.risks.length > 0 && !validation.healthy) {
    report += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡️ *РИСКИ*

${aiAnalysis.risks.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
  }

  report += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 Powered by Groq AI • IAE Agent v1.0
⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}`;

  return report;
}

// 💾 Save report to database
export async function saveReportToDatabase(
  reportType: string,
  reportDate: string,
  validation: ValidationResult,
  aiAnalysis: AIAnalysis,
  metrics: any,
  telegramReport: string
): Promise<string> {
  try {
    const { data, error } = await tripwireSupabase
      .from('iae_agent_reports')
      .insert({
        report_date: reportDate,
        report_type: reportType,
        status: validation.healthy ? 'healthy' : 
                validation.issues.some(i => i.severity === 'critical') ? 'critical' : 'warning',
        overall_health_score: aiAnalysis.healthScore,
        amocrm_status: validation.amocrm_status,
        facebook_ads_status: validation.facebook_ads_status,
        database_status: validation.database_status,
        data_quality: validation.dataQuality,
        anomalies: validation.anomalies,
        metrics_summary: metrics,
        ai_insights: aiAnalysis.insights,
        ai_recommendations: aiAnalysis.recommendations,
        ai_risks: aiAnalysis.risks || [],
        telegram_sent: false
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`💾 [IAE] Report saved to database: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('❌ [IAE] Error saving report:', error);
    throw error;
  }
}

// 🤖 Main IAE Agent execution function
export async function runIAEAgent(
  reportType: 'daily' | 'current' | 'monthly' | 'health_check' | 'manual',
  period: string
): Promise<IAEAgentResult> {
  console.log(`\n🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🤖 [IAE] Starting ${reportType} analysis (${period})`);
  console.log(`🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  // Import Groq analyzer
  const { runIAEAnalysis } = await import('./iaeGroqAnalyzer.js');
  
  // 1. Get date range
  const dateRange = getDateRange(reportType, period);
  console.log(`📅 [IAE] Date range: ${dateRange.start} to ${dateRange.end}`);
  
  // 2. Collect data
  const collectedData = await collectData(dateRange);
  console.log(`📦 [IAE] Data collected from ${Object.keys(collectedData).length} sources`);
  
  // 3. Validate data
  const validation = await validateData(collectedData);
  console.log(`✅ [IAE] Validation complete. Healthy: ${validation.healthy}`);
  console.log(`   Issues: ${validation.issues.length}, Anomalies: ${validation.anomalies.length}`);
  
  // 4. Get metrics summary
  const metrics = await getMetricsSummary(dateRange);
  console.log(`📊 [IAE] Metrics: $${metrics.spend} spend, ₸${metrics.revenue} revenue, ${metrics.sales} sales`);
  
  // 5. Run AI analysis
  const aiAnalysis = await runIAEAnalysis(validation, metrics, reportType);
  console.log(`🤖 [IAE] AI Analysis: Health Score ${aiAnalysis.healthScore}/100`);
  
  // 6. Generate Telegram report
  const telegramReport = generateTelegramReport(reportType, validation, aiAnalysis, metrics);
  
  // 7. Save to database
  const reportDate = period === 'yesterday' 
    ? new Date(Date.now() - 86400000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  
  const reportId = await saveReportToDatabase(
    reportType,
    reportDate,
    validation,
    aiAnalysis,
    metrics,
    telegramReport
  );
  
  console.log(`💾 [IAE] Report saved: ${reportId}`);
  console.log(`\n🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🤖 [IAE] ${reportType} analysis complete!`);
  console.log(`🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  return {
    validation,
    aiAnalysis,
    metrics,
    telegramReport,
    reportData: {
      id: reportId,
      type: reportType,
      date: reportDate,
      status: validation.healthy ? 'healthy' : 'warning'
    }
  };
}

// 🎯 Get date range based on report type
export function getDateRange(reportType: string, period: string): DateRange {
  const now = new Date();
  let start: Date;
  let end: Date;
  
  switch (period) {
    case 'yesterday':
      start = new Date(now);
      start.setDate(start.getDate() - 1);
      end = new Date(start);
      break;
      
    case 'today':
      start = new Date(now);
      end = new Date(now);
      break;
      
    case 'current':
      start = new Date(now);
      end = new Date(now);
      break;
      
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
      
    case 'last_7_days':
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      end = new Date(now);
      break;
  }
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}
