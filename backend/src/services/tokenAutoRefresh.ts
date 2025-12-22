import * as cron from 'node-cron';
import { refreshFacebookTokenIfNeeded, getTokenStatus as getFBTokenStatus, getValidFacebookToken } from './facebookTokenManager.js';
import { refreshAmoCRMTokenIfNeeded, getAmoCRMTokenStatus, initializeFromEnv, getValidAmoCRMToken } from './amocrmTokenManager.js';
import { initializeOpenAIKey, refreshOpenAITokenIfNeeded, getOpenAITokenStatus } from './openaiTokenManager.js';
import { startTokenHealthMonitoring, runTokenHealthCheck, getTokenHealthStatus } from './tokenHealthMonitor.js';

// 🔔 Alert sent tracking (prevent spam)
const alertsSent = new Set<string>();

// 📨 Send alert via console (can be extended to Telegram/Email)
function logAlert(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  const icon = level === 'error' ? '🚨' : level === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${icon} [Token Alert] ${message}`);
}

// 🔄 Combined token refresh check (runs every 2 hours)
export function scheduleTokenRefreshCheck() {
  // Every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    await runCombinedTokenCheck();
  });
  
  // Every 30 minutes - health monitoring
  cron.schedule('*/30 * * * *', async () => {
    try {
      await runTokenHealthCheck();
    } catch (error) {
      console.error('❌ [Token Health] Check failed:', error);
    }
  });
  
  console.log('✅ [Token Refresh] Scheduled: Every 2 hours (refresh) + Every 30 min (health)');
}

// 🔄 Run combined token check
async function runCombinedTokenCheck(): Promise<void> {
  const hour = new Date().toLocaleString('ru-RU', { 
    timeZone: 'Asia/Almaty',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  console.log(`\n🔄 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔄 [Token Refresh] Running check... (${hour})`);
  console.log(`🔄 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  // 1. Check and refresh Facebook Ads token
  try {
    await refreshFacebookTokenIfNeeded();
    const fbStatus = getFBTokenStatus();
    
    if (fbStatus.isValid) {
      console.log(`✅ [FB Token] Valid (${fbStatus.daysUntilExpire || 'N/A'} days)`);
    } else {
      console.error('❌ [FB Token] INVALID or EXPIRED!');
      logAlert('Facebook token is invalid or expired!', 'error');
    }
  } catch (error: any) {
    console.error('❌ [FB Token] Check error:', error.message);
    logAlert(`Facebook token check failed: ${error.message}`, 'error');
  }
  
  // 2. Check and refresh AmoCRM token
  try {
    await refreshAmoCRMTokenIfNeeded();
    const amocrmStatus = getAmoCRMTokenStatus();
    
    if (amocrmStatus.isValid) {
      console.log(`✅ [AmoCRM Token] Valid (${amocrmStatus.hoursUntilExpire || 'N/A'} hours)`);
    } else {
      console.error('❌ [AmoCRM Token] INVALID or EXPIRED!');
      logAlert('AmoCRM token is invalid or expired!', 'error');
    }
  } catch (error: any) {
    console.error('❌ [AmoCRM Token] Check error:', error.message);
    logAlert(`AmoCRM token check failed: ${error.message}`, 'error');
  }
  
  // 3. Check and validate OpenAI token
  try {
    await refreshOpenAITokenIfNeeded();
    const openaiStatus = getOpenAITokenStatus();
    
    if (openaiStatus.isValid) {
      console.log(`✅ [OpenAI Token] Valid (checked: ${openaiStatus.lastChecked?.toLocaleString() || 'N/A'})`);
    } else {
      console.error('❌ [OpenAI Token] INVALID!');
      logAlert(`OpenAI token is invalid: ${openaiStatus.errorMessage}`, 'error');
    }
  } catch (error: any) {
    console.error('❌ [OpenAI Token] Check error:', error.message);
    logAlert(`OpenAI token check failed: ${error.message}`, 'error');
  }
  
  console.log(`\n✅ [Token Refresh] Check complete\n`);
}

// 🚀 Start combined token refresh scheduler
export async function startTokenAutoRefresh() {
  console.log('\n🚀 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 [Token Auto-Refresh] Starting comprehensive token management...');
  console.log('🚀 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 1. Initialize AmoCRM from env if available
  await initializeFromEnv();
  
  // 1.5. Initialize OpenAI key from env
  initializeOpenAIKey();
  
  // 2. Schedule periodic checks
  scheduleTokenRefreshCheck();
  
  // 3. Start health monitoring (every 30 minutes)
  try {
    await startTokenHealthMonitoring();
  } catch (error) {
    console.warn('⚠️ [Token Health Monitor] Could not start:', error);
  }
  
  // 4. Run initial token validation
  console.log('🔍 [Token Auto-Refresh] Running initial validation...\n');
  
  let fbOk = false;
  let amocrmOk = false;
  
  // Validate Facebook token
  try {
    await refreshFacebookTokenIfNeeded();
    const fbStatus = getFBTokenStatus();
    fbOk = fbStatus.isValid;
    console.log(`   📘 Facebook Token: ${fbOk ? '✅' : '❌'} (${fbStatus.daysUntilExpire || 'N/A'} days)`);
    
    if (!fbOk) {
      console.log('      → Run: Get new token from Facebook Developer Console');
    }
  } catch (err: any) {
    console.log(`   📘 Facebook Token: ⚠️  ${err.message}`);
  }
  
  // Validate AmoCRM token
  try {
    await refreshAmoCRMTokenIfNeeded();
    const amocrmStatus = getAmoCRMTokenStatus();
    amocrmOk = amocrmStatus.isValid;
    console.log(`   📗 AmoCRM Token: ${amocrmOk ? '✅' : '❌'} (${amocrmStatus.hoursUntilExpire || 'N/A'} hours)`);
    
    if (!amocrmOk) {
      console.log('      → Check AMOCRM_REFRESH_TOKEN in .env');
    }
  } catch (err: any) {
    console.log(`   📗 AmoCRM Token: ⚠️  ${err.message}`);
  }
  
  // Summary
  const allOk = fbOk && amocrmOk;
  const statusIcon = allOk ? '✅' : '⚠️';
  
  console.log(`\n${statusIcon} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`${statusIcon} [Token Auto-Refresh] ${allOk ? 'All tokens healthy!' : 'Some tokens need attention'}`);
  console.log(`${statusIcon} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  console.log('📅 Schedule:');
  console.log('   🔄 Every 2 hours - Token refresh check');
  console.log('   🏥 Every 30 minutes - Health monitoring');
  console.log('   ⏰ Proactive refresh before expiration');
  console.log('   🔁 Auto-refresh on API calls');
  console.log('');
  
  return { facebook: fbOk, amocrm: amocrmOk };
}

// 📊 Get combined token status (enhanced)
export function getAllTokensStatus() {
  const fbStatus = getFBTokenStatus();
  const amocrmStatus = getAmoCRMTokenStatus();
  
  // Try to get health report
  let healthReport = null;
  try {
    healthReport = getTokenHealthStatus();
  } catch (e) {
    // Health monitor not initialized yet
  }
  
  return {
    facebook: {
      ...fbStatus,
      status: fbStatus.isValid ? 'healthy' : 'error'
    },
    amocrm: {
      ...amocrmStatus,
      status: amocrmStatus.isValid ? 'healthy' : 'error'
    },
    timestamp: new Date().toISOString(),
    overallHealth: (fbStatus.isValid && amocrmStatus.isValid) ? 'healthy' : 'degraded',
    healthReport: healthReport
  };
}

// 🔑 Get valid tokens (convenience functions for API calls)
export async function getTokens(): Promise<{ facebook: string | null; amocrm: string | null }> {
  let fbToken: string | null = null;
  let amocrmToken: string | null = null;
  
  try {
    fbToken = await getValidFacebookToken();
  } catch (e) {
    console.warn('⚠️ Could not get Facebook token');
  }
  
  try {
    amocrmToken = await getValidAmoCRMToken();
  } catch (e) {
    console.warn('⚠️ Could not get AmoCRM token');
  }
  
  return { facebook: fbToken, amocrm: amocrmToken };
}

console.log('✅ [Token Auto-Refresh] Module loaded');
