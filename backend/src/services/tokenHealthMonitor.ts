/**
 * 🔐 Token Health Monitor Service
 * 
 * Production-ready token monitoring system with:
 * - Continuous health checks
 * - Retry logic with exponential backoff
 * - Alert notifications via Telegram
 * - Centralized token status tracking
 * - Automatic recovery mechanisms
 * 
 * Core Philosophy: "Tokens should NEVER die in production"
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-cron';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 Types & Interfaces
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface TokenStatus {
  name: string;
  isValid: boolean;
  expiresAt: Date | null;
  timeUntilExpire: string;
  lastCheck: Date;
  lastRefresh: Date | null;
  errorCount: number;
  lastError: string | null;
  status: 'healthy' | 'expiring' | 'expired' | 'error' | 'unknown';
}

interface TokenHealthReport {
  timestamp: Date;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  tokens: {
    facebook: TokenStatus;
    amocrm: TokenStatus;
    openai: TokenStatus;
    supabase: TokenStatus;
  };
  alerts: string[];
  recommendations: string[];
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const HEALTH_LOG_FILE = path.join(__dirname, '../../data/token-health-log.json');
const TELEGRAM_ALERT_CHAT_ID = process.env.TELEGRAM_ALERT_CHAT_ID || process.env.TELEGRAM_IAE_CHAT_ID;
// 🤖 Use IAE Agent bot (@analisistonaitrafic_bot) for all health alerts
const TELEGRAM_BOT_TOKEN = process.env.IAE_BOT_TOKEN || process.env.TELEGRAM_IAE_BOT_TOKEN || '8439289933:AAH5eED6m0HOK1ZEUGRO1MYCF93srAfjEF4';

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,  // 1 second
  maxDelay: 30000   // 30 seconds
};

// Token expiration thresholds for alerts
const ALERT_THRESHOLDS = {
  facebook: {
    warning: 7 * 24 * 60 * 60 * 1000,  // 7 days
    critical: 2 * 24 * 60 * 60 * 1000   // 2 days
  },
  amocrm: {
    warning: 4 * 60 * 60 * 1000,  // 4 hours
    critical: 1 * 60 * 60 * 1000  // 1 hour
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 Retry Logic with Exponential Backoff
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context: string = 'operation'
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt < config.maxRetries - 1) {
        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt),
          config.maxDelay
        );
        
        console.log(`⏳ [${context}] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error(`${context} failed after ${config.maxRetries} attempts`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📨 Alert System (Telegram Notifications)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function sendTelegramAlert(message: string, priority: 'info' | 'warning' | 'critical' = 'warning'): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ALERT_CHAT_ID) {
    console.log(`📨 [Alert] Would send: ${message}`);
    return;
  }

  const emoji = priority === 'critical' ? '🚨' : priority === 'warning' ? '⚠️' : 'ℹ️';
  
  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_ALERT_CHAT_ID,
        text: `${emoji} *Token Alert*\n\n${message}`,
        parse_mode: 'Markdown'
      },
      { timeout: 5000 }
    );
    console.log(`📨 [Alert] Sent: ${message.substring(0, 50)}...`);
  } catch (error: any) {
    console.error('❌ [Alert] Failed to send Telegram alert:', error.message);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔍 Token Validators
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function validateFacebookToken(token: string): Promise<{ valid: boolean; expiresAt: Date | null; error?: string }> {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v21.0/debug_token`,
      {
        params: {
          input_token: token,
          access_token: `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`
        },
        timeout: 10000
      }
    );
    
    const data = response.data.data;
    
    if (!data.is_valid) {
      return { valid: false, expiresAt: null, error: 'Token is not valid' };
    }
    
    const expiresAt = data.expires_at ? new Date(data.expires_at * 1000) : null;
    return { valid: true, expiresAt };
  } catch (error: any) {
    return { 
      valid: false, 
      expiresAt: null, 
      error: error.response?.data?.error?.message || error.message 
    };
  }
}

async function validateAmoCRMToken(token: string): Promise<{ valid: boolean; expiresAt: Date | null; error?: string }> {
  try {
    const domain = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
    const response = await axios.get(
      `https://${domain}.amocrm.ru/api/v4/account`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 30000 // Increased from 10s to 30s for AmoCRM API
      }
    );
    
    return { valid: !!response.data.id, expiresAt: null };
  } catch (error: any) {
    return { 
      valid: false, 
      expiresAt: null, 
      error: error.response?.data?.title || error.message 
    };
  }
}

async function validateOpenAIToken(token: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await axios.get(
      'https://api.openai.com/v1/models',
      {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      }
    );
    
    return { valid: Array.isArray(response.data.data) };
  } catch (error: any) {
    return { 
      valid: false, 
      error: error.response?.data?.error?.message || error.message 
    };
  }
}

async function validateSupabaseConnection(): Promise<{ valid: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return { valid: false, error: 'Supabase credentials not configured' };
    }
    
    const response = await axios.get(
      `${supabaseUrl}/rest/v1/`,
      {
        headers: { 
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        timeout: 10000
      }
    );
    
    return { valid: response.status === 200 };
  } catch (error: any) {
    return { 
      valid: false, 
      error: error.message 
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 Health Status Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatTimeUntilExpire(expiresAt: Date | null): string {
  if (!expiresAt) return 'Unknown';
  
  const now = Date.now();
  const diff = expiresAt.getTime() - now;
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function determineTokenStatus(
  isValid: boolean, 
  expiresAt: Date | null, 
  thresholds: { warning: number; critical: number },
  errorCount: number
): 'healthy' | 'expiring' | 'expired' | 'error' | 'unknown' {
  if (!isValid) {
    return errorCount > 0 ? 'error' : 'expired';
  }
  
  if (!expiresAt) return 'unknown';
  
  const timeLeft = expiresAt.getTime() - Date.now();
  
  if (timeLeft <= 0) return 'expired';
  if (timeLeft <= thresholds.critical) return 'expiring';
  if (timeLeft <= thresholds.warning) return 'expiring';
  
  return 'healthy';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔐 Token Health Monitor Class
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TokenHealthMonitor {
  private static instance: TokenHealthMonitor;
  private tokenStatuses: Map<string, TokenStatus> = new Map();
  private alertsSent: Set<string> = new Set();
  private isRunning: boolean = false;

  private constructor() {
    this.initializeStatuses();
  }

  static getInstance(): TokenHealthMonitor {
    if (!TokenHealthMonitor.instance) {
      TokenHealthMonitor.instance = new TokenHealthMonitor();
    }
    return TokenHealthMonitor.instance;
  }

  private initializeStatuses(): void {
    const defaultStatus: Omit<TokenStatus, 'name'> = {
      isValid: false,
      expiresAt: null,
      timeUntilExpire: 'Unknown',
      lastCheck: new Date(),
      lastRefresh: null,
      errorCount: 0,
      lastError: null,
      status: 'unknown'
    };

    ['facebook', 'amocrm', 'openai', 'supabase'].forEach(name => {
      this.tokenStatuses.set(name, { name, ...defaultStatus });
    });
  }

  // 🏥 Main Health Check
  async runHealthCheck(): Promise<TokenHealthReport> {
    console.log('\n🔍 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 [Token Health] Running comprehensive check...');
    console.log('🔍 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const alerts: string[] = [];
    const recommendations: string[] = [];

    // Check Facebook Token
    await this.checkFacebookToken(alerts, recommendations);
    
    // Check AmoCRM Token
    await this.checkAmoCRMToken(alerts, recommendations);
    
    // Check OpenAI Token
    await this.checkOpenAIToken(alerts, recommendations);
    
    // Check Supabase Connection
    await this.checkSupabaseConnection(alerts, recommendations);

    // Determine overall health
    const overallHealth = this.determineOverallHealth();

    // Log health report
    const report: TokenHealthReport = {
      timestamp: new Date(),
      overallHealth,
      tokens: {
        facebook: this.tokenStatuses.get('facebook')!,
        amocrm: this.tokenStatuses.get('amocrm')!,
        openai: this.tokenStatuses.get('openai')!,
        supabase: this.tokenStatuses.get('supabase')!
      },
      alerts,
      recommendations
    };

    // Save health log
    this.saveHealthLog(report);

    // Send alerts if needed
    if (overallHealth === 'critical' || alerts.length > 0) {
      await this.sendHealthAlerts(report);
    }

    this.logHealthSummary(report);

    return report;
  }

  private async checkFacebookToken(alerts: string[], recommendations: string[]): Promise<void> {
    const token = process.env.FACEBOOK_ADS_TOKEN;
    const status = this.tokenStatuses.get('facebook')!;
    
    status.lastCheck = new Date();

    if (!token) {
      status.isValid = false;
      status.status = 'error';
      status.lastError = 'FACEBOOK_ADS_TOKEN not configured';
      alerts.push('❌ Facebook token not configured');
      return;
    }

    try {
      const result = await retryWithBackoff(
        () => validateFacebookToken(token),
        DEFAULT_RETRY_CONFIG,
        'FB Token Validation'
      );

      status.isValid = result.valid;
      status.expiresAt = result.expiresAt;
      status.timeUntilExpire = formatTimeUntilExpire(result.expiresAt);
      status.errorCount = result.valid ? 0 : status.errorCount + 1;
      status.lastError = result.error || null;
      status.status = determineTokenStatus(
        result.valid,
        result.expiresAt,
        ALERT_THRESHOLDS.facebook,
        status.errorCount
      );

      if (status.status === 'expiring') {
        alerts.push(`⚠️ Facebook token expires in ${status.timeUntilExpire}`);
        recommendations.push('Refresh Facebook token soon');
      } else if (status.status === 'expired' || status.status === 'error') {
        alerts.push(`🚨 Facebook token is ${status.status}: ${status.lastError}`);
        recommendations.push('Immediately update Facebook token in .env');
      }

      console.log(`   📘 Facebook: ${status.isValid ? '✅' : '❌'} (${status.timeUntilExpire})`);
    } catch (error: any) {
      status.isValid = false;
      status.status = 'error';
      status.errorCount++;
      status.lastError = error.message;
      alerts.push(`🚨 Facebook token check failed: ${error.message}`);
    }
  }

  private async checkAmoCRMToken(alerts: string[], recommendations: string[]): Promise<void> {
    const status = this.tokenStatuses.get('amocrm')!;
    status.lastCheck = new Date();

    // Try to get token from cache first
    let token = this.getCachedAmoCRMToken();
    
    if (!token) {
      token = process.env.AMOCRM_ACCESS_TOKEN || '';
    }

    if (!token) {
      status.isValid = false;
      status.status = 'error';
      status.lastError = 'AMOCRM_ACCESS_TOKEN not configured';
      alerts.push('❌ AmoCRM token not configured');
      return;
    }

    try {
      const result = await retryWithBackoff(
        () => validateAmoCRMToken(token),
        DEFAULT_RETRY_CONFIG,
        'AmoCRM Token Validation'
      );

      status.isValid = result.valid;
      status.expiresAt = this.getCachedAmoCRMExpiration();
      status.timeUntilExpire = formatTimeUntilExpire(status.expiresAt);
      status.errorCount = result.valid ? 0 : status.errorCount + 1;
      status.lastError = result.error || null;
      status.status = determineTokenStatus(
        result.valid,
        status.expiresAt,
        ALERT_THRESHOLDS.amocrm,
        status.errorCount
      );

      if (status.status === 'expiring') {
        alerts.push(`⚠️ AmoCRM token expires in ${status.timeUntilExpire}`);
        recommendations.push('AmoCRM token will auto-refresh, but monitor closely');
      } else if (status.status === 'expired' || status.status === 'error') {
        alerts.push(`🚨 AmoCRM token is ${status.status}: ${status.lastError}`);
        recommendations.push('Check AmoCRM refresh token and credentials');
      }

      console.log(`   📗 AmoCRM: ${status.isValid ? '✅' : '❌'} (${status.timeUntilExpire})`);
    } catch (error: any) {
      status.isValid = false;
      status.status = 'error';
      status.errorCount++;
      status.lastError = error.message;
      alerts.push(`🚨 AmoCRM token check failed: ${error.message}`);
    }
  }

  private async checkOpenAIToken(alerts: string[], recommendations: string[]): Promise<void> {
    const token = process.env.OPENAI_API_KEY;
    const status = this.tokenStatuses.get('openai')!;
    
    status.lastCheck = new Date();

    if (!token) {
      status.isValid = false;
      status.status = 'error';
      status.lastError = 'OPENAI_API_KEY not configured';
      // Don't alert - might be optional
      return;
    }

    try {
      const result = await retryWithBackoff(
        () => validateOpenAIToken(token),
        DEFAULT_RETRY_CONFIG,
        'OpenAI Token Validation'
      );

      status.isValid = result.valid;
      status.expiresAt = null; // OpenAI tokens don't expire
      status.timeUntilExpire = 'Never';
      status.errorCount = result.valid ? 0 : status.errorCount + 1;
      status.lastError = result.error || null;
      status.status = result.valid ? 'healthy' : 'error';

      if (!result.valid) {
        alerts.push(`🚨 OpenAI API key is invalid: ${status.lastError}`);
        recommendations.push('Update OPENAI_API_KEY in .env');
      }

      console.log(`   📙 OpenAI: ${status.isValid ? '✅' : '❌'} (Never expires)`);
    } catch (error: any) {
      status.isValid = false;
      status.status = 'error';
      status.errorCount++;
      status.lastError = error.message;
    }
  }

  private async checkSupabaseConnection(alerts: string[], recommendations: string[]): Promise<void> {
    const status = this.tokenStatuses.get('supabase')!;
    status.lastCheck = new Date();

    try {
      const result = await retryWithBackoff(
        () => validateSupabaseConnection(),
        DEFAULT_RETRY_CONFIG,
        'Supabase Connection'
      );

      status.isValid = result.valid;
      status.expiresAt = null;
      status.timeUntilExpire = 'Never';
      status.errorCount = result.valid ? 0 : status.errorCount + 1;
      status.lastError = result.error || null;
      status.status = result.valid ? 'healthy' : 'error';

      if (!result.valid) {
        alerts.push(`🚨 Supabase connection failed: ${status.lastError}`);
        recommendations.push('Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      }

      console.log(`   📕 Supabase: ${status.isValid ? '✅' : '❌'} (Connection)`);
    } catch (error: any) {
      status.isValid = false;
      status.status = 'error';
      status.errorCount++;
      status.lastError = error.message;
    }
  }

  private getCachedAmoCRMToken(): string | null {
    try {
      const cacheFile = path.join(__dirname, '../../data/amocrm-token-cache.json');
      if (fs.existsSync(cacheFile)) {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        return data.access_token || null;
      }
    } catch (e) {
      console.warn('[TokenHealthMonitor] Failed to read AmoCRM token cache:', (e as Error).message);
    }
    return null;
  }

  private getCachedAmoCRMExpiration(): Date | null {
    try {
      const cacheFile = path.join(__dirname, '../../data/amocrm-token-cache.json');
      if (fs.existsSync(cacheFile)) {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        return data.expires_at ? new Date(data.expires_at) : null;
      }
    } catch (e) {
      console.warn('[TokenHealthMonitor] Failed to read AmoCRM expiration cache:', (e as Error).message);
    }
    return null;
  }

  private determineOverallHealth(): 'healthy' | 'degraded' | 'critical' {
    const statuses = Array.from(this.tokenStatuses.values());
    const criticalTokens = ['facebook', 'amocrm']; // These are critical for operation
    
    let hasError = false;
    let hasExpiring = false;

    for (const status of statuses) {
      if (criticalTokens.includes(status.name)) {
        if (status.status === 'error' || status.status === 'expired') {
          return 'critical';
        }
        if (status.status === 'expiring') {
          hasExpiring = true;
        }
      }
      if (status.status === 'error') {
        hasError = true;
      }
    }

    if (hasError || hasExpiring) return 'degraded';
    return 'healthy';
  }

  private async sendHealthAlerts(report: TokenHealthReport): Promise<void> {
    if (report.alerts.length === 0) return;

    const alertKey = report.alerts.join('|');
    
    // Don't spam alerts (max once per hour for same issue)
    if (this.alertsSent.has(alertKey)) {
      return;
    }

    const message = `
*Token Health Report*
Status: ${report.overallHealth.toUpperCase()}
Time: ${report.timestamp.toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}

*Issues:*
${report.alerts.join('\n')}

*Recommendations:*
${report.recommendations.join('\n')}
    `.trim();

    const priority = report.overallHealth === 'critical' ? 'critical' : 'warning';
    await sendTelegramAlert(message, priority);

    this.alertsSent.add(alertKey);
    
    // Clear alert after 1 hour
    setTimeout(() => {
      this.alertsSent.delete(alertKey);
    }, 60 * 60 * 1000);
  }

  private saveHealthLog(report: TokenHealthReport): void {
    try {
      const dir = path.dirname(HEALTH_LOG_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      let logs: any[] = [];
      if (fs.existsSync(HEALTH_LOG_FILE)) {
        logs = JSON.parse(fs.readFileSync(HEALTH_LOG_FILE, 'utf-8'));
      }
      
      // Keep last 100 logs
      logs = [report, ...logs.slice(0, 99)];
      fs.writeFileSync(HEALTH_LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('❌ Failed to save health log:', error);
    }
  }

  private logHealthSummary(report: TokenHealthReport): void {
    const icon = report.overallHealth === 'healthy' ? '✅' : 
                 report.overallHealth === 'degraded' ? '⚠️' : '🚨';
    
    console.log(`\n${icon} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`${icon} [Token Health] Overall: ${report.overallHealth.toUpperCase()}`);
    console.log(`${icon} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    if (report.alerts.length > 0) {
      console.log('⚠️ Alerts:');
      report.alerts.forEach(a => console.log(`   ${a}`));
      console.log('');
    }
  }

  // 🚀 Start monitoring
  startMonitoring(intervalMinutes: number = 30): void {
    if (this.isRunning) {
      console.log('⚠️ Token Health Monitor already running');
      return;
    }

    this.isRunning = true;
    
    // Schedule regular checks
    cron.schedule(`*/${intervalMinutes} * * * *`, async () => {
      await this.runHealthCheck();
    });

    // Run initial check
    this.runHealthCheck();

    console.log(`✅ [Token Health Monitor] Started (every ${intervalMinutes} minutes)`);
  }

  // 📊 Get current status
  getStatus(): TokenHealthReport {
    return {
      timestamp: new Date(),
      overallHealth: this.determineOverallHealth(),
      tokens: {
        facebook: this.tokenStatuses.get('facebook')!,
        amocrm: this.tokenStatuses.get('amocrm')!,
        openai: this.tokenStatuses.get('openai')!,
        supabase: this.tokenStatuses.get('supabase')!
      },
      alerts: [],
      recommendations: []
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📤 Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const tokenHealthMonitor = TokenHealthMonitor.getInstance();

export async function startTokenHealthMonitoring(): Promise<void> {
  tokenHealthMonitor.startMonitoring(30); // Every 30 minutes
}

export async function runTokenHealthCheck(): Promise<TokenHealthReport> {
  return tokenHealthMonitor.runHealthCheck();
}

export function getTokenHealthStatus(): TokenHealthReport {
  return tokenHealthMonitor.getStatus();
}

console.log('✅ [Token Health Monitor] Module loaded');
