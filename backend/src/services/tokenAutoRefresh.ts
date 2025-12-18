import cron from 'node-cron';
import { refreshFacebookTokenIfNeeded, getTokenStatus as getFBTokenStatus } from './facebookTokenManager.js';
import { refreshAmoCRMTokenIfNeeded, getAmoCRMTokenStatus, initializeFromEnv } from './amocrmTokenManager.js';

// 🔄 Combined token refresh check (runs every 2 hours)
export function scheduleTokenRefreshCheck() {
  // Every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    const hour = new Date().toLocaleString('ru-RU', { 
      timeZone: 'Asia/Almaty',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    console.log(`\n🔄 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔄 [Token Refresh] Running check... (${hour})`);
    console.log(`🔄 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // 1. Check Facebook Ads token
    try {
      await refreshFacebookTokenIfNeeded();
      const fbStatus = getFBTokenStatus();
      
      if (fbStatus.isValid) {
        console.log(`✅ [FB Token] Valid (${fbStatus.daysUntilExpire || 'N/A'} days)`);
      } else {
        console.error('❌ [FB Token] INVALID or EXPIRED!');
      }
    } catch (error: any) {
      console.error('❌ [FB Token] Check error:', error.message);
    }
    
    // 2. Check AmoCRM token
    try {
      await refreshAmoCRMTokenIfNeeded();
      const amocrmStatus = getAmoCRMTokenStatus();
      
      if (amocrmStatus.isValid) {
        console.log(`✅ [AmoCRM Token] Valid (${amocrmStatus.hoursUntilExpire || 'N/A'} hours)`);
      } else {
        console.error('❌ [AmoCRM Token] INVALID or EXPIRED!');
      }
    } catch (error: any) {
      console.error('❌ [AmoCRM Token] Check error:', error.message);
    }
    
    console.log(`\n✅ [Token Refresh] Check complete\n`);
  });
  
  console.log('✅ [Token Refresh] Every 2 hours refresh check scheduled');
}

// 🚀 Start combined token refresh scheduler
export async function startTokenAutoRefresh() {
  console.log('\n🚀 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 [Token Auto-Refresh] Starting...');
  console.log('🚀 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Initialize AmoCRM from env if available
  await initializeFromEnv();
  
  // Schedule periodic checks
  scheduleTokenRefreshCheck();
  
  // Run initial check
  console.log('🔍 [Token Auto-Refresh] Running initial check...\n');
  
  try {
    // Facebook token
    try {
      await refreshFacebookTokenIfNeeded();
      const fbStatus = getFBTokenStatus();
      console.log(`   FB Token: ${fbStatus.isValid ? '✅' : '❌'} (${fbStatus.daysUntilExpire || 'N/A'} days)`);
    } catch (err: any) {
      console.log(`   FB Token: ⚠️  ${err.message}`);
    }
    
    // AmoCRM token
    try {
      await refreshAmoCRMTokenIfNeeded();
      const amocrmStatus = getAmoCRMTokenStatus();
      console.log(`   AmoCRM Token: ${amocrmStatus.isValid ? '✅' : '❌'} (${amocrmStatus.hoursUntilExpire || 'N/A'} hours)`);
    } catch (err: any) {
      console.log(`   AmoCRM Token: ⚠️  ${err.message}`);
    }
  } catch (error) {
    console.error('❌ [Token Auto-Refresh] Initial check error:', error);
  }
  
  console.log('\n✅ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ [Token Auto-Refresh] Started successfully!');
  console.log('✅ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📅 Schedule:');
  console.log('   🔄 Every 2 hours - Token refresh check');
  console.log('   ⏰ 2 hours before expire - Proactive refresh');
  console.log('   🔁 Auto-refresh on API calls');
  console.log('');
}

// 📊 Get combined token status
export function getAllTokensStatus() {
  return {
    facebook: getFBTokenStatus(),
    amocrm: getAmoCRMTokenStatus(),
    timestamp: new Date().toISOString()
  };
}
