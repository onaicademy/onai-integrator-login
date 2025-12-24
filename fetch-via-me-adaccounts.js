#!/usr/bin/env node

/**
 * Скрипт для получения всех доступных Business Manager через различные API endpoints
 */

const CONFIG = {
  ACCESS_TOKEN: 'EAAPVZCSfHj0YBQA2K9mVDXtta9gmiJu8vcnQ3S4yocYlBtYnhR275p9WuUSCgFV1yxBsxCRjZB36QoyQF6qsHBkRV6K1Pu3Y3gXrWiJQl7IEWy1jBurR8gPdTMOKh08Vh9o2MyjffmtYDf9keTvvL0UVUnXmtfZCnkDOT2pebxiVkAfL3fgxH31fsTQdW1gZCZBk4P0sc',
  BUSINESS_ID: '1425104648731040'
};

async function makeGraphRequest(endpoint, params = {}) {
  try {
    const url = new URL(`https://graph.facebook.com/v19.0${endpoint}`);
    url.searchParams.set('access_token', CONFIG.ACCESS_TOKEN);
    url.searchParams.set('limit', '100');
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    return data;
  } catch (error) {
    throw error;
  }
}

async function main() {
  console.log('\n🚀 Facebook Business Manager Hierarchy Explorer');
  console.log('═'.repeat(80));
  
  const allResults = [];
  
  try {
    // 1. Получаем текущего пользователя
    console.log('\n1️⃣ Получаю текущего пользователя...\n');
    const userResp = await makeGraphRequest('/me');
    console.log('📋 Текущий пользователь:');
    console.log(`   ID: ${userResp.id}`);
    console.log(`   Имя: ${userResp.name}`);
    console.log('');
    
    // 2. Получаем Business Manager через /me/adaccounts
    console.log('2️⃣ Получаю Ad Accounts через /me/adaccounts...\n');
    const adAccResp = await makeGraphRequest('/me/adaccounts', {
      fields: 'id,name,account_status,currency,business'
    });
    
    if (adAccResp.data && adAccResp.data.length > 0) {
      console.log(`📊 Найдено Ad Accounts: ${adAccResp.data.length}\n`);
      
      const businessMap = new Map();
      
      adAccResp.data.forEach(acc => {
        const businessId = acc.business?.id || 'unknown';
        const businessName = acc.business?.name || 'Неизвестно';
        
        if (!businessMap.has(businessId)) {
          businessMap.set(businessId, {
            id: businessId,
            name: businessName,
            accounts: []
          });
        }
        
        businessMap.get(businessId).accounts.push({
          accountId: acc.id.replace('act_', ''),
          fullId: acc.id,
          name: acc.name,
          status: acc.account_status,
          currency: acc.currency
        });
      });
      
      let bizIdx = 1;
      let totalAccounts = 0;
      
      for (const [bizId, bizData] of businessMap.entries()) {
        console.log(`${bizIdx}. 🏢 ${bizData.name}`);
        console.log(`   ID: ${bizId}`);
        console.log(`   Ad Accounts: ${bizData.accounts.length}\n`);
        
        bizData.accounts.forEach((acc, accIdx) => {
          console.log(`   ${bizIdx}.${accIdx + 1}. 📱 ${acc.name}`);
          console.log(`       ├─ Account ID: ${acc.accountId}`);
          console.log(`       ├─ Status: ${acc.status}`);
          console.log(`       └─ Currency: ${acc.currency}`);
        });
        
        console.log('');
        totalAccounts += bizData.accounts.length;
        
        allResults.push({
          businessId: bizId,
          businessName: bizData.name,
          accounts: bizData.accounts
        });
        
        bizIdx++;
      }
      
      // Итоги
      console.log('═'.repeat(80));
      console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
      console.log(`✅ Business Managers найдено: ${businessMap.size}`);
      console.log(`✅ Ad Accounts найдено: ${totalAccounts}`);
      
      // JSON
      const results = {
        timestamp: new Date().toISOString(),
        user: { id: userResp.id, name: userResp.name },
        summary: {
          businessManagersFound: businessMap.size,
          totalAdAccounts: totalAccounts
        },
        businesses: allResults
      };
      
      console.log('\n📄 JSON РЕЗУЛЬТАТЫ:');
      console.log('─'.repeat(80));
      console.log(JSON.stringify(results, null, 2));
      
      // Сохраняем в файл
      const fs = await import('fs');
      const filename = `/Users/miso/onai-integrator-login/facebook_all_businesses_${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(results, null, 2));
      console.log(`\n✅ Результаты сохранены в файл: ${filename}`);
      
    } else {
      console.log('⚠️ Ad Accounts не найдены');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

main().catch(console.error);
