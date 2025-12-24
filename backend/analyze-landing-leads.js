const { createClient } = require('@supabase/supabase-js');

// Landing DB
const LANDING_URL = 'https://xikaiavwqinamgolmtcy.supabase.co';
const LANDING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1MzIyMSwiZXhwIjoyMDgwNDI5MjIxfQ.eP7ake2RkWqCaLTKv0jI3vWMkBjDySKsAdToKIgb7fA';

const landingDB = createClient(LANDING_URL, LANDING_KEY);

async function analyzeLandingLeads() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 LANDING DB LEADS ANALYSIS');
  console.log('═══════════════════════════════════════════════\n');
  
  try {
    // Get all leads
    const { data: allLeads, error } = await landingDB
      .from('landing_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (error) throw error;
    
    console.log(`✅ Total leads in Landing DB: ${allLeads.length}\n`);
    
    // Group by source
    const bySource = {};
    allLeads.forEach(lead => {
      const source = lead.source || 'unknown';
      bySource[source] = (bySource[source] || 0) + 1;
    });
    
    console.log('📈 Breakdown by source:');
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`   ${source}: ${count} leads`);
    });
    
    // ProfTest leads details
    const proftestLeads = allLeads.filter(l => l.source?.includes('proftest'));
    console.log(`\n🧪 ProfTest leads: ${proftestLeads.length}`);
    
    // ExpressCourse leads
    const expressLeads = allLeads.filter(l => l.source?.includes('expresscourse'));
    console.log(`📚 ExpressCourse leads: ${expressLeads.length}`);
    
    // Check if uploaded_to_amocrm field exists
    const withAmoCRMField = allLeads.filter(l => l.uploaded_to_amocrm !== undefined);
    console.log(`\n�� Leads with uploaded_to_amocrm field: ${withAmoCRMField.length}`);
    
    const uploaded = allLeads.filter(l => l.uploaded_to_amocrm === true);
    const notUploaded = allLeads.filter(l => l.uploaded_to_amocrm === false || l.uploaded_to_amocrm === null);
    
    console.log(`   ✅ Uploaded to AmoCRM: ${uploaded.length}`);
    console.log(`   ❌ NOT uploaded to AmoCRM: ${notUploaded.length}`);
    
    // Show recent not uploaded
    if (notUploaded.length > 0) {
      console.log(`\n📋 Recent 20 leads NOT uploaded to AmoCRM:`);
      notUploaded.slice(0, 20).forEach((lead, i) => {
        const email = lead.email || lead.phone || lead.telegram_username || 'no-contact';
        const source = lead.source || 'unknown';
        console.log(`${i+1}. ${email} | ${source} | ${lead.created_at}`);
      });
    }
    
    // Check amocrm_lead_id field
    const withAmoCRMId = allLeads.filter(l => l.amocrm_lead_id);
    console.log(`\n🆔 Leads with amocrm_lead_id: ${withAmoCRMId.length}`);
    
    // Schema check
    if (allLeads.length > 0) {
      console.log('\n🔍 Sample lead fields:');
      const sample = allLeads[0];
      const fields = Object.keys(sample).sort();
      console.log(`   Available fields: ${fields.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

analyzeLandingLeads().catch(console.error);
