/**
 * 🏥 BOT HEALTH MONITOR - Comprehensive Monitoring System
 * 
 * Features:
 * 1. Tracks all scheduled reports (delivery status)
 * 2. Monitors bot connectivity (Telegram API)
 * 3. Validates external API keys (Groq, Facebook, AmoCRM)
 * 4. Sends alerts when systems fail
 * 5. Provides E2E testing capabilities
 * 
 * Schedule: Runs every hour + on-demand
 */

import axios from 'axios';
import cron from 'node-cron';
import Groq from 'groq-sdk';

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface HealthStatus {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'critical';
  services: ServiceStatus[];
  scheduledReports: ReportStatus[];
  lastAlertSent?: string;
}

export interface ServiceStatus {
  name: string;
  status: 'ok' | 'warning' | 'error';
  lastCheck: string;
  message?: string;
  responseTime?: number;
}

export interface ReportStatus {
  name: string;
  scheduledTime: string;
  lastDelivery?: string;
  lastAttempt?: string;
  status: 'delivered' | 'failed' | 'pending' | 'never_run';
  errorMessage?: string;
  consecutiveFailures: number;
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY TRACKING (with persistence capability)
// ═══════════════════════════════════════════════════════════════

class BotHealthMonitor {
  private healthData: HealthStatus;
  private reportTracker: Map<string, ReportStatus>;
  private alertCooldown: Map<string, number>; // Prevent alert spam
  
  // Bot tokens for validation
  private readonly BOTS = {
    traffic: process.env.TELEGRAM_TRAFFIC_ANALYTICS_BOT_TOKEN, // ✅ Traffic bot (for reports)
    iae: process.env.IAE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TRAFFIC_ANALYTICS_BOT_TOKEN,
    debugger: process.env.TELEGRAM_ANALYTICS_BOT_TOKEN, // ✅ @oapdbugger_bot
  };
  
  // Admin chat for critical alerts
  private readonly ADMIN_CHAT_ID = process.env.TELEGRAM_ANALYTICS_CHAT_ID || '789638302';

  constructor() {
    this.healthData = this.initHealthData();
    this.reportTracker = new Map();
    this.alertCooldown = new Map();
    this.initReportTracking();
  }

  private initHealthData(): HealthStatus {
    return {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      services: [],
      scheduledReports: [],
    };
  }

  private initReportTracking() {
    // Traffic Bot scheduled reports
    const reports: ReportStatus[] = [
      {
        name: '10:00 Yesterday AI Report',
        scheduledTime: '10:00 Asia/Almaty',
        status: 'never_run',
        consecutiveFailures: 0,
      },
      {
        name: '16:00 Current Status AI',
        scheduledTime: '16:00 Asia/Almaty',
        status: 'never_run',
        consecutiveFailures: 0,
      },
      {
        name: '22:00 Daily AI Summary',
        scheduledTime: '22:00 Asia/Almaty',
        status: 'never_run',
        consecutiveFailures: 0,
      },
      {
        name: 'Monday 10:00 Weekly Report',
        scheduledTime: 'Monday 10:00 Asia/Almaty',
        status: 'never_run',
        consecutiveFailures: 0,
      },
      {
        name: '08:05 Daily Traffic KZT Report',
        scheduledTime: '08:05 Asia/Almaty',
        status: 'never_run',
        consecutiveFailures: 0,
      },
      {
        name: 'Monday 08:10 Weekly Traffic KZT',
        scheduledTime: 'Monday 08:10 Asia/Almaty',
        status: 'never_run',
        consecutiveFailures: 0,
      },
    ];

    reports.forEach(r => this.reportTracker.set(r.name, r));
  }

  // ═══════════════════════════════════════════════════════════════
  // HEALTH CHECK METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check Telegram Bot connectivity
   */
  async checkTelegramBot(botName: string, token?: string): Promise<ServiceStatus> {
    const startTime = Date.now();
    try {
      if (!token) {
        return {
          name: `Telegram ${botName} Bot`,
          status: 'error',
          lastCheck: new Date().toISOString(),
          message: 'Token not configured',
        };
      }

      const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`, {
        timeout: 10000,
      });

      return {
        name: `Telegram ${botName} Bot`,
        status: 'ok',
        lastCheck: new Date().toISOString(),
        message: `@${response.data.result.username} connected`,
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        name: `Telegram ${botName} Bot`,
        status: 'error',
        lastCheck: new Date().toISOString(),
        message: error.response?.data?.description || error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check Groq API connectivity
   */
  async checkGroqAPI(): Promise<ServiceStatus> {
    const startTime = Date.now();
    try {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        return {
          name: 'Groq AI API',
          status: 'warning', // ⚠️ WARNING not ERROR (we have backup keys)
          lastCheck: new Date().toISOString(),
          message: 'GROQ_API_KEY not configured (using fallback keys)',
        };
      }

      const response = await axios.get('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000,
      });

      return {
        name: 'Groq AI API',
        status: 'ok',
        lastCheck: new Date().toISOString(),
        message: `${response.data.data?.length || 0} models available`,
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      // Check if we have backup keys
      const hasBackupKeys = !!(process.env.GROQ_DEBUGGER_API_KEY || process.env.GROQ_CAMPAIGN_ANALYZER_KEY);
      
      return {
        name: 'Groq AI API',
        status: hasBackupKeys ? 'warning' : 'error',
        lastCheck: new Date().toISOString(),
        message: `Primary key failed${hasBackupKeys ? ' (backup keys available)' : ''}: ${error.response?.data?.error?.message || error.message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check Facebook Ads API
   */
  async checkFacebookAPI(): Promise<ServiceStatus> {
    const startTime = Date.now();
    try {
      const token = process.env.FB_ACCESS_TOKEN;
      const adAccountId = process.env.FB_AD_ACCOUNT_ID;
      
      if (!token || !adAccountId) {
        return {
          name: 'Facebook Ads API',
          status: 'warning',
          lastCheck: new Date().toISOString(),
          message: 'Token or Ad Account not configured',
        };
      }

      const response = await axios.get(
        `https://graph.facebook.com/v21.0/${adAccountId}?access_token=${token}&fields=name,account_status`,
        { timeout: 10000 }
      );

      const statusMap: Record<number, string> = {
        1: 'Active',
        2: 'Disabled',
        3: 'Unsettled',
        7: 'Pending Risk Review',
        8: 'Pending Settlement',
        9: 'In Grace Period',
        100: 'Pending Closure',
        101: 'Closed',
        201: 'Any Active',
        202: 'Any Closed',
      };

      return {
        name: 'Facebook Ads API',
        status: response.data.account_status === 1 ? 'ok' : 'warning',
        lastCheck: new Date().toISOString(),
        message: `${response.data.name} - ${statusMap[response.data.account_status] || 'Unknown'}`,
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        name: 'Facebook Ads API',
        status: 'error',
        lastCheck: new Date().toISOString(),
        message: error.response?.data?.error?.message || error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check AmoCRM API
   */
  async checkAmoCRMAPI(): Promise<ServiceStatus> {
    const startTime = Date.now();
    try {
      const token = process.env.AMOCRM_ACCESS_TOKEN;
      const subdomain = process.env.AMOCRM_SUBDOMAIN || 'onaiagencykz';
      
      if (!token) {
        return {
          name: 'AmoCRM API',
          status: 'warning',
          lastCheck: new Date().toISOString(),
          message: 'Token not configured',
        };
      }

      const response = await axios.get(
        `https://${subdomain}.amocrm.ru/api/v4/account`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );

      return {
        name: 'AmoCRM API',
        status: 'ok',
        lastCheck: new Date().toISOString(),
        message: `${response.data.name} (${response.data.subdomain})`,
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        name: 'AmoCRM API',
        status: 'error',
        lastCheck: new Date().toISOString(),
        message: error.response?.data?.detail || error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check Supabase connectivity
   */
  async checkSupabase(): Promise<ServiceStatus> {
    const startTime = Date.now();
    try {
      const url = process.env.TRAFFIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.TRAFFIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
      
      if (!url || !key) {
        return {
          name: 'Supabase Database',
          status: 'error',
          lastCheck: new Date().toISOString(),
          message: 'URL or Key not configured',
        };
      }

      // Simple health check via REST API
      const response = await axios.get(`${url}/rest/v1/`, {
        headers: { 
          apikey: key,
          Authorization: `Bearer ${key}` // ✅ Add authorization header
        },
        timeout: 5000,
      });

      return {
        name: 'Supabase Database',
        status: 'ok',
        lastCheck: new Date().toISOString(),
        message: 'Connected',
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      // 404 is expected for root endpoint (means API is working)
      if (error.response?.status === 404) {
        return {
          name: 'Supabase Database',
          status: 'ok',
          lastCheck: new Date().toISOString(),
          message: 'Connected (404 expected)',
          responseTime: Date.now() - startTime,
        };
      }
      
      // 401 means auth issue but API is reachable
      if (error.response?.status === 401) {
        return {
          name: 'Supabase Database',
          status: 'warning', // ⚠️ WARNING not ERROR
          lastCheck: new Date().toISOString(),
          message: 'Auth issue but API reachable (check anon key)',
          responseTime: Date.now() - startTime,
        };
      }
      
      return {
        name: 'Supabase Database',
        status: 'error',
        lastCheck: new Date().toISOString(),
        message: `${error.response?.status || 'Network error'}: ${error.message}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // REPORT TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Record report delivery attempt
   */
  recordReportDelivery(reportName: string, success: boolean, errorMessage?: string) {
    const report = this.reportTracker.get(reportName);
    if (report) {
      report.lastAttempt = new Date().toISOString();
      if (success) {
        report.lastDelivery = new Date().toISOString();
        report.status = 'delivered';
        report.consecutiveFailures = 0;
        report.errorMessage = undefined;
      } else {
        report.status = 'failed';
        report.consecutiveFailures++;
        report.errorMessage = errorMessage;
        
        // Alert after 2 consecutive failures
        if (report.consecutiveFailures >= 2) {
          this.sendFailureAlert(reportName, report.consecutiveFailures, errorMessage);
        }
      }
    }
    console.log(`📊 [Monitor] Report "${reportName}" - ${success ? '✅ delivered' : '❌ failed'}`);
  }

  /**
   * Get all report statuses
   */
  getReportStatuses(): ReportStatus[] {
    return Array.from(this.reportTracker.values());
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPREHENSIVE HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════

  /**
   * Run full health check on all systems
   */
  async runFullHealthCheck(): Promise<HealthStatus> {
    console.log('🏥 [Monitor] Running full health check...');
    
    const startTime = Date.now();
    
    // Run all checks in parallel
    const [
      trafficBot,
      iaeBot,
      debuggerBot,
      groqApi,
      facebookApi,
      amoCrmApi,
      supabase,
    ] = await Promise.all([
      this.checkTelegramBot('Traffic', this.BOTS.traffic),
      this.checkTelegramBot('IAE', this.BOTS.iae),
      this.checkTelegramBot('Debugger', this.BOTS.debugger),
      this.checkGroqAPI(),
      this.checkFacebookAPI(),
      this.checkAmoCRMAPI(),
      this.checkSupabase(),
    ]);

    const services = [trafficBot, iaeBot, debuggerBot, groqApi, facebookApi, amoCrmApi, supabase];
    
    // Determine overall status
    const hasError = services.some(s => s.status === 'error');
    const hasWarning = services.some(s => s.status === 'warning');
    
    this.healthData = {
      timestamp: new Date().toISOString(),
      overall: hasError ? 'critical' : hasWarning ? 'degraded' : 'healthy',
      services,
      scheduledReports: this.getReportStatuses(),
    };

    console.log(`🏥 [Monitor] Health check completed in ${Date.now() - startTime}ms`);
    console.log(`📊 [Monitor] Overall status: ${this.healthData.overall.toUpperCase()}`);
    
    // Alert if critical
    if (this.healthData.overall === 'critical') {
      await this.sendCriticalAlert(services.filter(s => s.status === 'error'));
    }

    return this.healthData;
  }

  /**
   * Get current health status (cached)
   */
  getHealthStatus(): HealthStatus {
    return this.healthData;
  }

  // ═══════════════════════════════════════════════════════════════
  // ALERTING
  // ═══════════════════════════════════════════════════════════════

  private async sendCriticalAlert(failedServices: ServiceStatus[]) {
    // Use AlertQueue instead of direct sending!
    const { alertQueue } = await import('./alertQueue.js');
    
    for (const service of failedServices) {
      const message = `
🚨 *CRITICAL SYSTEM ALERT*

❌ *${service.name}*: ${service.message}

⏰ Time: ${new Date().toLocaleString('ru-KZ', { timeZone: 'Asia/Almaty' })}
🔧 Action Required: Check API keys and service status
`.trim();

      const botToken = this.BOTS.debugger || this.BOTS.traffic;
      if (!botToken) continue;
      
      const result = await alertQueue.enqueue(
        message,
        this.ADMIN_CHAT_ID,
        botToken,
        service.name,
        'critical'
      );
      
      if (result.queued) {
        console.log(`✅ [Monitor] Alert queued for ${service.name}`);
      } else {
        console.log(`⏸️ [Monitor] Alert skipped for ${service.name}: ${result.reason}`);
      }
    }
  }

  private async sendFailureAlert(reportName: string, failures: number, error?: string) {
    // Use AlertQueue instead of direct sending!
    const { alertQueue } = await import('./alertQueue.js');

    const message = `
⚠️ *REPORT DELIVERY FAILED*

📊 Report: ${reportName}
❌ Consecutive Failures: ${failures}
📝 Error: ${error || 'Unknown'}

⏰ Time: ${new Date().toLocaleString('ru-KZ', { timeZone: 'Asia/Almaty' })}
`.trim();

    const botToken = this.BOTS.debugger || this.BOTS.traffic;
    if (!botToken) return;
    
    const result = await alertQueue.enqueue(
      message,
      this.ADMIN_CHAT_ID,
      botToken,
      `report:${reportName}`,
      'high'
    );
    
    if (result.queued) {
      console.log(`✅ [Monitor] Report failure alert queued: ${reportName}`);
    } else {
      console.log(`⏸️ [Monitor] Report failure alert skipped: ${result.reason}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // E2E TESTING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Run E2E test for a specific bot
   */
  async runE2ETest(botName: 'traffic' | 'iae' | 'debugger'): Promise<{
    success: boolean;
    steps: { name: string; passed: boolean; message: string }[];
  }> {
    const steps: { name: string; passed: boolean; message: string }[] = [];
    
    // Step 1: Check bot token
    const token = this.BOTS[botName];
    steps.push({
      name: 'Token Configuration',
      passed: !!token,
      message: token ? 'Token is configured' : 'Token is missing',
    });
    
    if (!token) {
      return { success: false, steps };
    }

    // Step 2: Verify bot connectivity
    const botStatus = await this.checkTelegramBot(botName, token);
    steps.push({
      name: 'Bot Connectivity',
      passed: botStatus.status === 'ok',
      message: botStatus.message || 'Unknown',
    });

    // Step 3: Check Groq (for AI reports)
    if (botName === 'traffic' || botName === 'iae') {
      const groqStatus = await this.checkGroqAPI();
      steps.push({
        name: 'Groq AI API',
        passed: groqStatus.status === 'ok',
        message: groqStatus.message || 'Unknown',
      });
    }

    // Step 4: Check Facebook (for traffic data)
    if (botName === 'traffic') {
      const fbStatus = await this.checkFacebookAPI();
      steps.push({
        name: 'Facebook Ads API',
        passed: fbStatus.status !== 'error',
        message: fbStatus.message || 'Unknown',
      });
    }

    const success = steps.every(s => s.passed);
    return { success, steps };
  }

  /**
   * Send test message to verify delivery
   */
  async sendTestMessage(botName: 'traffic' | 'iae' | 'debugger', chatId?: string): Promise<boolean> {
    const token = this.BOTS[botName];
    if (!token) {
      console.error(`❌ [E2E] No token for bot: ${botName}`);
      return false;
    }

    const targetChat = chatId || this.ADMIN_CHAT_ID;
    const testMessage = `
✅ *E2E Test - ${new Date().toISOString()}*

🤖 Bot: ${botName}
📨 Delivery: Success
⏰ Time: ${new Date().toLocaleString('ru-KZ', { timeZone: 'Asia/Almaty' })}
`.trim();

    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: targetChat,
        text: testMessage,
        parse_mode: 'Markdown',
      });
      console.log(`✅ [E2E] Test message sent via ${botName} bot`);
      return true;
    } catch (error: any) {
      console.error(`❌ [E2E] Failed to send test message:`, error.response?.data || error.message);
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

export const botHealthMonitor = new BotHealthMonitor();

// ═══════════════════════════════════════════════════════════════
// SCHEDULED MONITORING
// ═══════════════════════════════════════════════════════════════

export function startHealthMonitorScheduler() {
  // Run health check every hour
  cron.schedule('0 * * * *', async () => {
    console.log('🏥 [Scheduler] Running hourly health check...');
    await botHealthMonitor.runFullHealthCheck();
  }, {
    timezone: 'Asia/Almaty',
  });
  
  // Run initial check
  setTimeout(() => {
    botHealthMonitor.runFullHealthCheck();
  }, 5000);

  console.log('✅ [Monitor] Health monitor scheduler started (hourly)');
}

export default botHealthMonitor;
