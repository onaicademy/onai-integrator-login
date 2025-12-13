/**
 * Скрипт восстановления потерянных лидов в AmoCRM
 * 
 * ИСПОЛЬЗОВАНИЕ: npx tsx src/scripts/recover-lost-leads.ts
 */

import '../load-env.js';
import { createOrUpdateLead } from '../lib/amocrm.js';
import { scheduleProftestNotifications } from '../services/scheduledNotifications.js';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization
let landingSupabase: any = null;

function getLandingSupabase() {
  if (!landingSupabase) {
    landingSupabase = createClient(
      process.env.LANDING_SUPABASE_URL || '',
      process.env.LANDING_SUPABASE_SERVICE_KEY || ''
    );
  }
  return landingSupabase;
}

async function recoverLostLeads() {
  console.log('🔄 Starting lost leads recovery...\n');

  try {
    // 1. Get lost leads from database
    const { data: lostLeads, error } = await getLandingSupabase()
      .from('landing_leads')
      .select('*')
      .gte('created_at', '2025-12-13 12:00:00')
      .is('amocrm_lead_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching leads:', error);
      process.exit(1);
    }

    if (!lostLeads || lostLeads.length === 0) {
      console.log('✅ No lost leads found!');
      process.exit(0);
    }

    console.log(`📊 Found ${lostLeads.length} lost leads to recover:\n`);

    // 2. Process each lead
    for (const lead of lostLeads) {
      console.log(`\n🔧 Processing: ${lead.name} (${lead.email})`);
      console.log(`   Phone: ${lead.phone}`);
      console.log(`   Source: ${lead.source}`);
      console.log(`   Created: ${new Date(lead.created_at).toLocaleString('ru-RU')}`);

      try {
        // 2a. Create in AmoCRM
        const amocrmResult = await createOrUpdateLead({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          utmParams: lead.metadata?.utmParams || {},
          proftestAnswers: lead.metadata?.proftestAnswers || lead.metadata?.answers || [],
          campaignSlug: lead.metadata?.campaignSlug,
        });

        if (amocrmResult) {
          console.log(`   ✅ AmoCRM: ${amocrmResult.action} (Lead ID: ${amocrmResult.leadId})`);

          // Update database with AmoCRM ID
          const { error: updateError } = await getLandingSupabase()
            .from('landing_leads')
            .update({ 
              amocrm_lead_id: amocrmResult.leadId.toString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', lead.id);

          if (updateError) {
            console.error(`   ⚠️ Failed to update amocrm_lead_id in DB:`, updateError);
          } else {
            console.log(`   ✅ Database updated`);
          }
        } else {
          console.error(`   ❌ AmoCRM: Failed to create/update lead`);
        }

        // 2b. Schedule Email/SMS notifications
        scheduleProftestNotifications({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          leadId: lead.id,
          sourceCampaign: lead.source || 'recovery',
        });
        console.log(`   ✅ Notifications scheduled (10 min delay)`);

        // Wait 2 seconds between leads to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (leadError: any) {
        console.error(`   ❌ Error processing lead:`, leadError.message);
        // Continue with next lead
      }
    }

    console.log(`\n\n✅ Recovery completed! Processed ${lostLeads.length} leads.`);
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run recovery
recoverLostLeads();
