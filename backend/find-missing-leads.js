const { createClient } = require('@supabase/supabase-js');

const LANDING_URL = 'https://xikaiavwqinamgolmtcy.supabase.co';
const LANDING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1MzIyMSwiZXhwIjoyMDgwNDI5MjIxfQ.eP7ake2RkWqCaLTKv0jI3vWMkBjDySKsAdToKIgb7fA';

const landingDB = createClient(LANDING_URL, LANDING_KEY);

async function findMissingLeads() {
  console.log('\n===============================================');
  console.log('FINDING MISSING AMOCRM LEADS');
  console.log('===============================================\n');
  
  try {
    const { data: missingLeads, error } = await landingDB
      .from('landing_leads')
      .select('*')
      .is('amocrm_lead_id', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`Leads NOT uploaded to AmoCRM: ${missingLeads.length}\n`);
    
    if (missingLeads.length === 0) {
      console.log('All leads are uploaded! Nothing to do.');
      return;
    }
    
    const bySource = {};
    missingLeads.forEach(lead => {
      const source = lead.source || 'unknown';
      bySource[source] = (bySource[source] || 0) + 1;
    });
    
    console.log('Missing leads by source:');
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`   ${source}: ${count} leads`);
    });
    
    const syncFailed = missingLeads.filter(l => l.amocrm_sync_status === 'failed');
    const syncPending = missingLeads.filter(l => l.amocrm_sync_status === 'pending');
    const noStatus = missingLeads.filter(l => !l.amocrm_sync_status);
    
    console.log(`\nSync status:`);
    console.log(`   Failed: ${syncFailed.length}`);
    console.log(`   Pending: ${syncPending.length}`);
    console.log(`   No status: ${noStatus.length}`);
    
    if (syncFailed.length > 0) {
      console.log(`\nFailed to sync (last 10):`);
      syncFailed.slice(0, 10).forEach((lead, i) => {
        const contact = lead.email || lead.phone || 'no-contact';
        const error = lead.amocrm_sync_last_error || 'no error message';
        console.log(`${i+1}. ${contact} | ${lead.source} | Error: ${error.substring(0, 60)}`);
      });
    }
    
    console.log(`\nALL missing leads (need to upload):`);
    missingLeads.forEach((lead, i) => {
      const contact = lead.email || lead.phone || lead.telegram_username || 'no-contact';
      const created = new Date(lead.created_at).toISOString().split('T')[0];
      console.log(`${i+1}. ID: ${lead.id} | ${contact} | ${lead.source} | ${created}`);
    });
    
    const fs = require('fs');
    fs.writeFileSync(
      'missing-leads.json',
      JSON.stringify(missingLeads, null, 2)
    );
    console.log(`\nSaved to missing-leads.json (${missingLeads.length} leads)`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findMissingLeads().catch(console.error);
