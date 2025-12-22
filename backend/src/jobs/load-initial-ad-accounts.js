/**
 * Load Initial Ad Accounts from Facebook API
 * 
 * One-time script to load all ad accounts for each targetologist
 * Saves to traffic_targetologist_settings.fb_ad_accounts
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../env.env') });

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const FB_API_BASE = 'https://graph.facebook.com/v18.0';
const FB_TOKEN = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ADS_TOKEN;

// Initialize Supabase client
const trafficUrl = process.env.TRAFFIC_SUPABASE_URL;
const trafficServiceKey = process.env.TRAFFIC_SERVICE_ROLE_KEY;
const trafficAdminSupabase = createClient(trafficUrl, trafficServiceKey);

async function loadInitialAdAccounts() {
  console.log('⏳ Загружаем Facebook ad accounts для всех таргетологов...\n');

  // 1. Verify token
  if (!FB_TOKEN) {
    console.error('❌ FB_ACCESS_TOKEN не найден в переменных окружения!');
    console.error('   Добавьте FB_ACCESS_TOKEN в backend/env.env');
    process.exit(1);
  }

  console.log('✅ Facebook token найден');
  console.log(`   Token: ${FB_TOKEN.substring(0, 20)}...`);
  console.log('');

  // 2. Get all targetologists (using RPC to bypass schema cache)
  console.log('📋 Загружаем список таргетологов...');
  const { data: targetologists, error: targetologistsError } = await trafficAdminSupabase
    .rpc('get_all_targetologists');

  if (targetologistsError) {
    console.error('❌ Ошибка загрузки таргетологов:', targetologistsError);
    process.exit(1);
  }

  if (!targetologists || targetologists.length === 0) {
    console.log('❌ Таргетологи не найдены в БД');
    console.log('   Сначала примените migration 20251222_traffic_dashboard_tables');
    process.exit(1);
  }

  console.log(`✅ Найдено ${targetologists.length} таргетологов:`);
  targetologists.forEach(t => console.log(`   - ${t.team} (${t.email})`));
  console.log('');

  // 3. Fetch ad accounts from Facebook
  console.log('📱 Загружаем ad accounts из Facebook API...');
  let fbAdAccounts = [];
  
  try {
    const response = await axios.get(`${FB_API_BASE}/me/adaccounts`, {
      params: {
        access_token: FB_TOKEN,
        fields: 'id,name,account_status,currency,timezone_name',
        limit: 100
      },
      timeout: 15000
    });

    fbAdAccounts = response.data.data || [];
    console.log(`✅ Загружено ${fbAdAccounts.length} ad accounts из Facebook:`);
    fbAdAccounts.forEach(acc => {
      const status = acc.account_status === 1 ? '✅ active' : '⚠️ inactive';
      console.log(`   - ${acc.name} (${acc.id}) [${status}]`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Ошибка загрузки ad accounts из Facebook:');
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
      
      if (error.response.status === 190) {
        console.error('   → Facebook token expired или invalid');
        console.error('   → Обновите FB_ACCESS_TOKEN в backend/env.env');
      }
    } else {
      console.error('   Message:', error.message);
    }
    
    process.exit(1);
  }

  if (fbAdAccounts.length === 0) {
    console.log('⚠️ Не найдено ни одного ad account в Facebook');
    console.log('   Проверьте что token имеет доступ к ad accounts');
    process.exit(1);
  }

  // 4. Save to each targetologist's settings
  console.log('💾 Сохраняем ad accounts в БД для каждого таргетолога...\n');
  
  for (const targetologist of targetologists) {
    const { team } = targetologist;

    console.log(`📝 Обрабатываем ${team}...`);

    // Check if settings already exist
    const { data: existingSettings } = await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .select('*')
      .eq('user_id', team)
      .single();

    // Prepare ad accounts data
    const adAccountsData = fbAdAccounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      status: acc.account_status === 1 ? 'active' : 'inactive',
      currency: acc.currency,
      timezone: acc.timezone_name
    }));

    if (existingSettings) {
      // Update existing
      const { error: updateError } = await trafficAdminSupabase
        .from('traffic_targetologist_settings')
        .update({
          fb_ad_accounts: adAccountsData,
          facebook_connected: true,
          facebook_connected_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString()
        })
        .eq('user_id', team);

      if (updateError) {
        console.error(`   ❌ Ошибка обновления для ${team}:`, updateError);
      } else {
        console.log(`   ✅ Обновлены ad accounts для ${team} (${adAccountsData.length} шт)`);
      }
    } else {
      // Create new
      const { error: insertError } = await trafficAdminSupabase
        .from('traffic_targetologist_settings')
        .insert({
          user_id: team,
          fb_ad_accounts: adAccountsData,
          tracked_campaigns: [],
          facebook_connected: true,
          facebook_connected_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString()
        });

      if (insertError) {
        console.error(`   ❌ Ошибка создания для ${team}:`, insertError);
      } else {
        console.log(`   ✅ Созданы ad accounts для ${team} (${adAccountsData.length} шт)`);
      }
    }
  }

  console.log('');
  console.log('✨ ====================================');
  console.log('✨ ГОТОВО! Все таргетологи имеют доступ к ad accounts');
  console.log('✨ ====================================');
  console.log('');
  console.log('📋 Следующие шаги:');
  console.log('   1. Проверьте данные в Supabase Dashboard');
  console.log('   2. Обновите TrafficSettings.tsx (см. TRAFFIC_DASHBOARD_FIX_PLAN.md Этап 2)');
  console.log('   3. Обновите TrafficDetailedAnalytics.tsx (см. TRAFFIC_DASHBOARD_FIX_PLAN.md Этап 3)');
  console.log('   4. Тестируйте в браузере!');
  console.log('');
}

// Run
loadInitialAdAccounts()
  .then(() => {
    console.log('✅ Script завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
