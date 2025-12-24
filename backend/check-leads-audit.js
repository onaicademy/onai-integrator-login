const { createClient } = require('@supabase/supabase-js');

// AmoCRM Config
const AMOCRM_DOMAIN = 'onaiagencykz';
const AMOCRM_ACCESS_TOKEN = '6lWsVDGSnKgchENRlW8XnblX2lQO0BCqLMTyDysBMXMpfXoNlczXuKkNkIGhaTjv';

// Landing DB
const LANDING_URL = 'https://xikaiavwqinamgolmtcy.supabase.co';
const LANDING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1MzIyMSwiZXhwIjoyMDgwNDI5MjIxfQ.eP7ake2RkWqCaLTKv0jI3vWMkBjDySKsAdToKIgb7fA';

const landingDB = createClient(LANDING_URL, LANDING_KEY);

async function getAmoCRMLeads() {
  console.log('🔍 Fetching leads from AmoCRM...\n');
  
  try {
    const response = await fetch(`https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads?limit=250&with=contacts`, {
      headers: {
        'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`AmoCRM Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ AmoCRM: Found ${data._embedded?.leads?.length || 0} leads`);
    
    // Show recent leads
    const leads = data._embedded?.leads || [];
    const recent = leads.slice(0, 10);
    console.log('\n📋 Recent 10 leads in AmoCRM:');
    recent.forEach((lead, i) => {
      const created = new Date(lead.created_at * 1000).toISOString();
      console.log(`${i+1}. ID: ${lead.id} | ${lead.name} | Created: ${created}`);
    });
    
    return leads;
  } catch (error) {
    console.error('❌ AmoCRM Error:', error.message);
    return [];
  }
}

async function getLandingLeads() {
  console.log('\n�� Fetching leads from Landing DB...\n');
  
  try {
    const { data, error } = await landingDB
      .from('landing_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(250);
    
    if (error) throw error;
    
    console.log(`✅ Landing DB: Found ${data.length} leads`);
    
    // Show recent proftest leads
    const proftest = data.filter(l => l.source?.includes('proftest'));
    const expresscourse = data.filter(l => l.source?.includes('expresscourse'));
    
    console.log(`   - ProfTest leads: ${proftest.length}`);
    console.log(`   - ExpressCourse leads: ${expresscourse.length}`);
    
    console.log('\n📋 Recent 10 ProfTest leads:');
    proftest.slice(0, 10).forEach((lead, i) => {
      console.log(`${i+1}. ID: ${lead.id} | ${lead.email || lead.phone} | ${lead.created_at}`);
    });
    
    return data;
  } catch (error) {
    console.error('❌ Landing DB Error:', error.message);
    return [];
  }
}

async function compareLeads() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 LEADS AUDIT: AmoCRM vs Landing DB');
  console.log('═══════════════════════════════════════════════\n');
  
  const amoLeads = await getAmoCRMLeads();
  const landingLeads = await getLandingLeads();
  
  console.log('\n📈 SUMMARY:');
  console.log(`   AmoCRM: ${amoLeads.length} leads`);
  console.log(`   Landing DB: ${landingLeads.length} leads`);
  console.log(`   Difference: ${Math.abs(amoLeads.length - landingLeads.length)}`);
  
  console.log('\n💡 TIP: To find missing leads, need to:');
  console.log('   1. Match by email/phone between systems');
  console.log('   2. Check ProfTest leads that didn\'t create AmoCRM lead');
  console.log('   3. Re-upload missing leads via webhook');
}

compareLeads().catch(console.error);
