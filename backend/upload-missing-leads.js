const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');

const AMOCRM_DOMAIN = 'onaiagencykz';
const AMOCRM_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjNhYTA0ZjQyZGQxMmUwYTJhNjc1NDdiMzljNzQxNmU1YmI0YzI5Yjk4Y2E1M2I4M2EzYzQ3MjJlYjcxZjAwNzM5NjVlY2JiMjU0ODlmYzNmIn0.eyJhdWQiOiIyOTQ0YWQ2Ni0zNmY2LTQ4MzMtOWJkYy05NDZlOGZlNWVmODciLCJqdGkiOiIzYWEwNGY0MmRkMTJlMGEyYTY3NTQ3YjM5Yzc0MTZlNWJiNGMyOWI5OGNhNTNiODNhM2M0NzIyZWI3MWYwMDczOTY1ZWNiYjI1NDg5ZmMzZiIsImlhdCI6MTc2NjQ5ODk1MSwibmJmIjoxNzY2NDk4OTUxLCJleHAiOjE4Mzg3NjQ4MDAsInN1YiI6IjExMjM5OTA2IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxODM0NTc4LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiM2RhODUzNjctNmQ2MS00ODc3LTkwNGItOGViNjY4MDlkZTAxIiwidXNlcl9mbGFncyI6MCwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.XR2ND4wGxOZjaewKvyNmefDA--Gz8-YHFO7ipqKz8nLr7cS1mMN7O6TjpTpRP8alYGTLkVu2jrqucZ6O0eURJlm1ZkRYllOyth9kjVpyZUQVircSUw0RJrHuJ-9rd9i7f5JQxUW6-LZJWSMx9OKyqQ7GrdpLeTOtbOx7nZWhddUCr-c6uev9oy6AdRDnL8NGa9L11esShUWdNdt5czxzj_BYXG9X1KjtvPfMWOZAo8jNShbzJBfjLMp4ioi1aeABZdgCsQPFvVQQyM_T_fm88zUEgYEGV16AuGeKqrOZxr1quZ9Ismab1Sudb8QGinkWg__S_DCKvQW8G6J27hlQSA';

const LANDING_URL = 'https://xikaiavwqinamgolmtcy.supabase.co';
const LANDING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1MzIyMSwiZXhwIjoyMDgwNDI5MjIxfQ.eP7ake2RkWqCaLTKv0jI3vWMkBjDySKsAdToKIgb7fA';

const landingDB = createClient(LANDING_URL, LANDING_KEY);

async function uploadLeadsToAmoCRM() {
  console.log('\n===============================================');
  console.log('UPLOADING MISSING LEADS TO AMOCRM');
  console.log('===============================================\n');
  
  // Load missing leads
  const missingLeads = JSON.parse(fs.readFileSync('missing-leads.json', 'utf-8'));
  console.log(`Found ${missingLeads.length} missing leads\n`);
  
  let uploaded = 0;
  let failed = 0;
  
  for (const lead of missingLeads) {
    const contact = lead.email || lead.phone || 'Unknown';
    console.log(`Uploading: ${contact}...`);
    
    try {
      // 1. Create or find contact
      let contactId = null;
      
      if (lead.email || lead.phone) {
        // Try to find existing contact
        const query = lead.email ? `query=${encodeURIComponent(lead.email)}` : `query=${encodeURIComponent(lead.phone)}`;
        const searchRes = await axios.get(
          `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/contacts?${query}`,
          {
            headers: {
              'Authorization': `Bearer ${AMOCRM_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (searchRes.data._embedded?.contacts?.length > 0) {
          contactId = searchRes.data._embedded.contacts[0].id;
          console.log(`   Found existing contact ID: ${contactId}`);
        } else {
          // Create new contact
          const contactData = {
            name: lead.name || contact,
            custom_fields_values: []
          };
          
          if (lead.email) {
            contactData.custom_fields_values.push({
              field_code: 'EMAIL',
              values: [{ value: lead.email, enum_code: 'WORK' }]
            });
          }
          
          if (lead.phone) {
            contactData.custom_fields_values.push({
              field_code: 'PHONE',
              values: [{ value: lead.phone, enum_code: 'WORK' }]
            });
          }
          
          const createRes = await axios.post(
            `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/contacts`,
            [contactData],
            {
              headers: {
                'Authorization': `Bearer ${AMOCRM_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          contactId = createRes.data._embedded.contacts[0].id;
          console.log(`   Created new contact ID: ${contactId}`);
        }
      }
      
      // 2. Create lead
      const leadName = lead.source.includes('proftest') 
        ? `ProfTest - ${contact}` 
        : `Express Course - ${contact}`;
      
      const leadData = [{
        name: leadName,
        price: lead.source.includes('expresscourse') ? 5000 : 0
      }];
      
      if (contactId) {
        leadData[0]._embedded = {
          contacts: [{ id: contactId }]
        };
      }
      
      const leadRes = await axios.post(
        `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads`,
        leadData,
        {
          headers: {
            'Authorization': `Bearer ${AMOCRM_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const amocrmLeadId = leadRes.data._embedded.leads[0].id;
      console.log(`   SUCCESS! Lead ID: ${amocrmLeadId}`);
      
      // 3. Update landing_leads table
      await landingDB
        .from('landing_leads')
        .update({
          amocrm_lead_id: amocrmLeadId,
          amocrm_contact_id: contactId,
          amocrm_synced: true,
          amocrm_sync_status: 'success',
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);
      
      uploaded++;
      
    } catch (error) {
      console.error(`   FAILED: ${error.response?.data?.title || error.message}`);
      failed++;
      
      // Mark as failed in DB
      await landingDB
        .from('landing_leads')
        .update({
          amocrm_sync_status: 'failed',
          amocrm_sync_last_error: error.message,
          amocrm_sync_attempts: (lead.amocrm_sync_attempts || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);
    }
    
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log(`\n===============================================`);
  console.log(`UPLOAD COMPLETE`);
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Failed: ${failed}`);
  console.log(`===============================================\n`);
}

uploadLeadsToAmoCRM().catch(console.error);
