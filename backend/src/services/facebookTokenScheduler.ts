import cron from 'node-cron';
import { refreshFacebookTokenIfNeeded, getTokenStatus } from './facebookTokenManager.js';

// 🔄 Auto-refresh Facebook token daily (proactive refresh 7 days before expiration)
export function scheduleFacebookTokenRefresh() {
  // Every day at 03:00 AM (low traffic time)
  cron.schedule('0 3 * * *', async () => {
    console.log('\n🔄 [FB Token Scheduler] Running daily token refresh check...');
    
    try {
      await refreshFacebookTokenIfNeeded();
      
      const status = getTokenStatus();
      console.log('📊 [FB Token Scheduler] Status:', status);
      
      if (status.isValid) {
        console.log(`✅ [FB Token Scheduler] Token is valid (${status.daysUntilExpire} days until expire)`);
      } else {
        console.error('❌ [FB Token Scheduler] Token is INVALID or EXPIRED!');
      }
    } catch (error: any) {
      console.error('❌ [FB Token Scheduler] Refresh error:', error.message);
    }
  }, {
    timezone: 'Asia/Almaty'
  });
  
  console.log('✅ [FB Token Scheduler] Daily refresh check scheduled (03:00 AM)');
}

// 🚀 Start token refresh scheduler
export function startFacebookTokenScheduler() {
  console.log('\n🚀 [FB Token Scheduler] Starting...');
  scheduleFacebookTokenRefresh();
  console.log('✅ [FB Token Scheduler] Started successfully\n');
}
