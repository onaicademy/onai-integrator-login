#!/usr/bin/env node

/**
 * ФИНАЛЬНЫЙ скрипт - получает ВСЕ Business Manager и ALL Ad Accounts
 * Использует новый токен с полными правами
 */

const NEW_TOKEN = 'EAAPVZCSfHj0YBQVquZClCxwS6vLHo5zvmt3hgMZAP4zoZAd0FiRk3vG2H9Ix4zrf8C0i7V7AihEZB4dTY3gaKBq3eIlZAa1ZAce6ljcj7jLg8OJM24FZAD2vD5M6B2OhZAhUaThnfApvhmHqi1ZCXEQPGFX1uepZAYI2hpDgOzU4UMwFZBd9fdLtOM2aozIayjuC1quHZBQFpRLvzZBqkkjyfZBxtRhpVXVbenXzJt656Kiz9bZBP8PDol2YV5dHwuzhoJq5j6lhplU3VL7UDLZBZBh8ApZBCAf4qru';

// Business Manager IDs которые мы нашли
const BUSINESS_IDS = [
  '1425104648731040',  // TOO Academy
  '1174363964568351',  // White Kimberly Flores
  '1166877195542037',  // labonte__1uwx25
  '1142153484339267',  // Onai academy
  '627807087089319',   // ONAI Academy, TOO
  '511415357787388',   // Дискурс Реклама
  '219720327894125',   // Nakama group
  '109908023605532'    // Residence Astana
];

async function makeGraphRequest(endpoint, params = {}) {
  try {
    const url = new URL(`https://graph.facebook.com/v19.0${endpoint}`);
    url.searchParams.set('access_token', NEW_TOKEN);
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

async function getBusinessInfo(businessId) {
  try {
    const response = await makeGraphRequest(`/${businessId}`, {
      fields: 'id,name'
    });
    
    if (response.error) {
      return null;
    }
    
    return response;
  } catch (error) {
    return null;
  }
}

async function getAdAccountsForBusiness(businessId) {
  try {
    const response = await makeGraphRequest(`/${businessId}/owned_ad_accounts`, {
      fields: 'id,name,account_status,currency,business'
    });
    
    if (response.error) {
      return [];
    }
    
    return response.data || [];
  } catch (error) {
    return [];
  }
}

async function main() {
  console.log('\n🚀 ПОЛНАЯ ИНФОРМАЦИЯ О ВСЕХ BUSINESS MANAGER И AD ACCOUNTS');
  console.log('═'.repeat(90));
  console.log(`\n📊 Анализирую ${BUSINESS_IDS.length} Business Manager`);
  console.log(`🔑 User: Ирина Викторовна Декскаймер`);
  console.log('\n═'.repeat(90) + '\n');
  
  try {
    const allResults = [];
    let totalAccounts = 0;
    let businessIndex = 1;
    
    for (const bizId of BUSINESS_IDS) {
      console.log(`${businessIndex}. 🏢 Сканирую Business Manager: ${bizId}`);
      
      // Получаем информацию о Business Manager
      const bizInfo = await getBusinessInfo(bizId);
      const bizName = bizInfo?.name || 'Неизвестно';
      
      console.log(`   ├─ Название: ${bizName}`);
      
      // Получаем все Ad Accounts для этого Business Manager
      const accounts = await getAdAccountsForBusiness(bizId);
      console.log(`   └─ Ad Accounts найдено: ${accounts.length}`);
      
      if (accounts.length > 0) {
        console.log('');
        accounts.forEach((acc, idx) => {
          const isLast = idx === accounts.length - 1;
          const prefix = isLast ? '      └─' : '      ├─';
          console.log(`${prefix} ${acc.name || 'Без названия'}`);
          console.log(`${prefix.replace('└', ' ').replace('├', ' ')}├─ ID: ${acc.id.replace('act_', '')}`);
          console.log(`${prefix.replace('└', ' ').replace('├', ' ')}├─ Status: ${acc.account_status || 'N/A'}`);
          console.log(`${prefix.replace('└', ' ').replace('├', ' ')}└─ Currency: ${acc.currency || 'N/A'}`);
        });
        console.log('');
      } else {
        console.log('');
      }
      
      totalAccounts += accounts.length;
      
      allResults.push({
        businessId: bizId,
        businessName: bizName,
        accountsCount: accounts.length,
        accounts: accounts.map(acc => ({
          accountId: acc.id.replace('act_', ''),
          fullId: acc.id,
          name: acc.name,
          status: acc.account_status,
          currency: acc.currency
        }))
      });
      
      businessIndex++;
    }
    
    // ИТОГОВАЯ СТАТИСТИКА
    console.log('═'.repeat(90));
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:\n');
    console.log(`✅ Business Managers всего: ${BUSINESS_IDS.length}`);
    console.log(`✅ Ad Accounts всего: ${totalAccounts}`);
    console.log(`📈 Средний Ad Accounts на Business Manager: ${(totalAccounts / BUSINESS_IDS.length).toFixed(1)}`);
    
    // Показываем Business Manager с наибольшим количеством аккаунтов
    const sorted = allResults.sort((a, b) => b.accountsCount - a.accountsCount);
    console.log('\n📈 TOP Business Manager по количеству аккаунтов:\n');
    sorted.slice(0, 5).forEach((biz, idx) => {
      console.log(`   ${idx + 1}. ${biz.businessName}: ${biz.accountsCount} аккаунтов`);
    });
    
    // ДЕТАЛЬНАЯ ТАБЛИЦА
    console.log('\n📋 ДЕТАЛЬНАЯ ТАБЛИЦА:\n');
    console.log('┌─ Бизнес Менеджер' + ' '.repeat(33) + '┬─ ID' + ' '.repeat(24) + '┬─ Accounts ┐');
    console.log('├' + '─'.repeat(47) + '┼' + '─'.repeat(27) + '┼' + '─'.repeat(10) + '┤');
    
    allResults.forEach(biz => {
      const name = (biz.businessName || 'Unknown').substring(0, 45);
      const id = (biz.businessId || '').substring(0, 25);
      const count = String(biz.accountsCount).padStart(9);
      console.log(`│ ${name.padEnd(45)} │ ${id.padEnd(25)} │${count} │`);
    });
    
    console.log('└' + '─'.repeat(47) + '┴' + '─'.repeat(27) + '┴' + '─'.repeat(10) + '┘');
    
    // JSON результаты
    console.log('\n📄 JSON РЕЗУЛЬТАТЫ:');
    console.log('─'.repeat(90));
    
    const results = {
      timestamp: new Date().toISOString(),
      user: {
        id: '122129868110710011',
        name: 'Ирина Викторовна Декскаймер'
      },
      summary: {
        businessManagersTotal: BUSINESS_IDS.length,
        adAccountsTotal: totalAccounts,
        averageAccountsPerBusiness: parseFloat((totalAccounts / BUSINESS_IDS.length).toFixed(2))
      },
      businesses: allResults
    };
    
    console.log(JSON.stringify(results, null, 2));
    
    // Сохраняем в файл
    const fs = await import('fs');
    const filename = `/Users/miso/onai-integrator-login/COMPLETE_FACEBOOK_STRUCTURE_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n✅ Результаты сохранены в файл:`);
    console.log(`   ${filename}`);
    
  } catch (error) {
    console.error('❌ ОШИБКА:', error.message);
    console.log(error.stack);
  }
}

main().catch(console.error);
