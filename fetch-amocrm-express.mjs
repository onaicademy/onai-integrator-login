/**
 * Fetch Express Course sales from AmoCRM
 */

const AMOCRM_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjNhYTA0ZjQyZGQxMmUwYTJhNjc1NDdiMzljNzQxNmU1YmI0YzI5Yjk4Y2E1M2I4M2EzYzQ3MjJlYjcxZjAwNzM5NjVlY2JiMjU0ODlmYzNmIn0.eyJhdWQiOiIyOTQ0YWQ2Ni0zNmY2LTQ4MzMtOWJkYy05NDZlOGZlNWVmODciLCJqdGkiOiIzYWEwNGY0MmRkMTJlMGEyYTY3NTQ3YjM5Yzc0MTZlNWJiNGMyOWI5OGNhNTNiODNhM2M0NzIyZWI3MWYwMDczOTY1ZWNiYjI1NDg5ZmMzZiIsImlhdCI6MTc2NjQ5ODk1MSwibmJmIjoxNzY2NDk4OTUxLCJleHAiOjE4Mzg3NjQ4MDAsInN1YiI6IjExMjM5OTA2IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxODM0NTc4LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiM2RhODUzNjctNmQ2MS00ODc3LTkwNGItOGViNjY4MDlkZTAxIiwidXNlcl9mbGFncyI6MCwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.XR2ND4wGxOZjaewKvyNmefDA--Gz8-YHFO7ipqKz8nLr7cS1mMN7O6TjpTpRP8alYGTLkVu2jrqucZ6O0eURJlm1ZkRYllOyth9kjVpyZUQVircSUw0RJrHuJ-9rd9i7f5JQxUW6-LZJWSMx9OKyqQ7GrdpLeTOtbOx7nZWhddUCr-c6uev9oy6AdRDnL8NGa9L11esShUWdNdt5czxzj_BYXG9X1KjtvPfMWOZAo8jNShbzJBfjLMp4ioi1aeABZdgCsQPFvVQQyM_T_fm88zUEgYEGV16AuGeKqrOZxr1quZ9Ismab1Sudb8QGinkWg__S_DCKvQW8G6J27hlQSA';

const PIPELINE_ID = 10350882;
const STATUS_SUCCESS = 142; // Успешно реализовано

// UTM field IDs in AmoCRM
const UTM_FIELD_IDS = {
  UTM_SOURCE: 434731,
  UTM_MEDIUM: 434727,
  UTM_CAMPAIGN: 434729,
};

async function fetchLeads() {
  // Try the account-specific subdomain
  const url = new URL('https://onaiagencykz.amocrm.ru/api/v4/leads');
  url.searchParams.set('filter[pipeline_id]', PIPELINE_ID);
  url.searchParams.set('filter[statuses][0][status_id]', STATUS_SUCCESS);
  url.searchParams.set('filter[statuses][0][pipeline_id]', PIPELINE_ID);
  url.searchParams.set('limit', '250');
  url.searchParams.set('with', 'contacts');

  console.log('🔍 Fetching Express Course sales from AmoCRM...');
  console.log(`   URL: ${url.toString()}`);
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${AMOCRM_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.log(`❌ Error: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(text);
    return;
  }
  
  const data = await response.json();
  const leads = data._embedded?.leads || [];
  
  console.log(`\n✅ Found ${leads.length} sales in AmoCRM\n`);
  
  // Extract UTM data from custom fields
  const salesByTeam = {};
  
  for (const lead of leads) {
    let utmSource = null;
    let utmCampaign = null;
    
    // Get UTM from custom fields
    if (lead.custom_fields_values) {
      for (const field of lead.custom_fields_values) {
        if (field.field_id === UTM_FIELD_IDS.UTM_SOURCE) {
          utmSource = field.values[0]?.value || null;
        }
        if (field.field_id === UTM_FIELD_IDS.UTM_CAMPAIGN) {
          utmCampaign = field.values[0]?.value || null;
        }
      }
    }
    
    // Categorize by team
    let team = 'Органика';
    if (utmSource) {
      if (utmSource.includes('kenesary') || utmSource.includes('kenji') || utmSource.includes('kenjifb') || utmSource.includes('fb_ken')) {
        team = 'Кенесары';
      } else if (utmSource.includes('arystan') || utmSource.includes('fbarystan')) {
        team = 'Арыстан';
      } else if (utmSource.includes('alex') || utmSource.includes('muha')) {
        team = 'Муха/Alex';
      } else if (utmSource.includes('youtube')) {
        team = 'YouTube';
      } else if (utmSource === 'sms' || utmSource === 'email' || utmSource.includes('email')) {
        team = 'Ретаргетинг';
      } else if (utmSource === 'facebook') {
        team = 'Facebook (неизв.)';
      } else {
        team = `Другое: ${utmSource}`;
      }
    }
    
    if (!salesByTeam[team]) {
      salesByTeam[team] = { count: 0, leads: [] };
    }
    salesByTeam[team].count++;
    salesByTeam[team].leads.push({
      id: lead.id,
      name: lead.name,
      price: lead.price,
      utm_source: utmSource,
      utm_campaign: utmCampaign,
    });
  }
  
  console.log('📊 ПРОДАЖИ EXPRESS COURSE ПО КОМАНДАМ:');
  console.log('═══════════════════════════════════════════════');
  
  let total = 0;
  const sorted = Object.entries(salesByTeam).sort((a, b) => b[1].count - a[1].count);
  
  for (const [team, data] of sorted) {
    const revenue = data.count * 5000;
    console.log(`${team}: ${data.count} продаж = ${revenue.toLocaleString()}₸`);
    total += data.count;
  }
  
  console.log('═══════════════════════════════════════════════');
  console.log(`ИТОГО: ${total} продаж = ${(total * 5000).toLocaleString()}₸`);
  
  // Save full data to file
  const fs = await import('fs');
  fs.writeFileSync('/tmp/amocrm_express_full.json', JSON.stringify({ leads, salesByTeam }, null, 2));
  console.log('\n💾 Full data saved to /tmp/amocrm_express_full.json');
}

fetchLeads().catch(console.error);
