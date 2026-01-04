/**
 * Migration Script: Landing DB → Traffic DB Consolidation
 * 
 * This script migrates leads and journey stages from Landing DB to Traffic DB.
 * Run with: node scripts/migrate-landing-to-traffic.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

// Database connections
const LANDING_URL = 'https://xikaiavwqinamgolmtcy.supabase.co';
const LANDING_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY;

const TRAFFIC_URL = 'https://oetodaexnjcunklkdlkv.supabase.co';
// Use SUPABASE_SERVICE_ROLE_KEY from Main Platform for Traffic as fallback
const TRAFFIC_KEY = process.env.TRAFFIC_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldG9kYWV4bmpjdW5rbGtkbGt2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDUxODczNiwiZXhwIjoyMDUwMDk0NzM2fQ.PLACEHOLDER';

if (!LANDING_KEY || !TRAFFIC_KEY) {
  console.error('❌ Missing service keys. Set LANDING_SUPABASE_SERVICE_KEY and TRAFFIC_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const landingDb = createClient(LANDING_URL, LANDING_KEY);
const trafficDb = createClient(TRAFFIC_URL, TRAFFIC_KEY);

// Helper: Normalize phone number
function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/[^0-9+]/g, '');
}

// Helper: Determine funnel type from source
function getFunnelType(source) {
  if (!source) return 'express';
  if (source.toLowerCase().includes('challenge')) return 'challenge3d';
  if (source.toLowerCase().includes('intensive')) return 'intensive1d';
  return 'express';
}

async function migrateLeads() {
  console.log('🚀 Starting Landing → Traffic migration...\n');

  // Step 1: Get all landing leads
  console.log('📥 Fetching leads from Landing DB...');
  const { data: landingLeads, error: fetchError } = await landingDb
    .from('landing_leads')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching landing leads:', fetchError);
    return;
  }
  console.log(`   Found ${landingLeads.length} leads in Landing DB\n`);

  // Step 2: Get all journey stages
  console.log('📥 Fetching journey stages from Landing DB...');
  const { data: journeyStages, error: journeyError } = await landingDb
    .from('journey_stages')
    .select('*')
    .order('created_at', { ascending: true });

  if (journeyError) {
    console.error('❌ Error fetching journey stages:', journeyError);
    return;
  }
  console.log(`   Found ${journeyStages.length} journey stages\n`);

  // Step 3: Get existing traffic leads for deduplication
  console.log('📥 Fetching existing Traffic leads for deduplication...');
  const { data: trafficLeads, error: trafficError } = await trafficDb
    .from('traffic_leads')
    .select('id, email, phone, phone_normalized, landing_lead_id');

  if (trafficError) {
    console.error('❌ Error fetching traffic leads:', trafficError);
    return;
  }
  console.log(`   Found ${trafficLeads.length} existing leads in Traffic DB\n`);

  // Create lookup maps for deduplication
  const emailMap = new Map();
  const phoneMap = new Map();
  const landingIdMap = new Map();

  trafficLeads.forEach(lead => {
    if (lead.email) emailMap.set(lead.email.toLowerCase(), lead.id);
    if (lead.phone_normalized) phoneMap.set(lead.phone_normalized, lead.id);
    if (lead.landing_lead_id) landingIdMap.set(lead.landing_lead_id, lead.id);
  });

  // Step 4: Process landing leads
  console.log('🔄 Processing landing leads...\n');
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const landingToTrafficMap = new Map(); // Maps landing_lead_id → traffic_lead_id

  for (const lead of landingLeads) {
    const phoneNormalized = normalizePhone(lead.phone);
    
    // Check if already migrated
    if (landingIdMap.has(lead.id)) {
      landingToTrafficMap.set(lead.id, landingIdMap.get(lead.id));
      skipped++;
      continue;
    }

    // Check for existing lead by phone or email
    let existingId = null;
    if (phoneNormalized && phoneMap.has(phoneNormalized)) {
      existingId = phoneMap.get(phoneNormalized);
    } else if (lead.email && emailMap.has(lead.email.toLowerCase())) {
      existingId = emailMap.get(lead.email.toLowerCase());
    }

    if (existingId) {
      // Update existing lead with landing_lead_id reference
      const { error: updateError } = await trafficDb
        .from('traffic_leads')
        .update({
          landing_lead_id: lead.id,
          email_sent: lead.email_sent || false,
          sms_sent: lead.sms_sent || false,
          email_clicked: lead.email_clicked || false,
          email_clicked_at: lead.email_clicked_at,
          sms_clicked: lead.sms_clicked || false,
          sms_clicked_at: lead.sms_clicked_at,
          click_count: lead.click_count || 0,
          landing_db_imported: true
        })
        .eq('id', existingId);

      if (updateError) {
        console.error(`   ❌ Error updating lead ${lead.id}:`, updateError.message);
      } else {
        landingToTrafficMap.set(lead.id, existingId);
        updated++;
      }
    } else {
      // Insert new lead
      const newLead = {
        landing_lead_id: lead.id,
        email: lead.email,
        name: lead.name,
        phone: lead.phone,
        phone_normalized: phoneNormalized,
        source: lead.source === 'twland' ? 'direct' : (lead.source || 'direct'),
        metadata: lead.metadata || {},
        amocrm_lead_id: lead.amocrm_lead_id ? parseInt(lead.amocrm_lead_id) : null,
        amocrm_contact_id: lead.amocrm_contact_id ? parseInt(lead.amocrm_contact_id) : null,
        email_sent: lead.email_sent || false,
        sms_sent: lead.sms_sent || false,
        email_clicked: lead.email_clicked || false,
        email_clicked_at: lead.email_clicked_at,
        sms_clicked: lead.sms_clicked || false,
        sms_clicked_at: lead.sms_clicked_at,
        click_count: lead.click_count || 0,
        utm_source: lead.utm_source,
        utm_campaign: lead.utm_campaign,
        utm_medium: lead.utm_medium,
        utm_content: lead.utm_content,
        utm_term: lead.utm_term,
        funnel_type: getFunnelType(lead.source),
        status: 'new',
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        landing_db_imported: true
      };

      const { data: insertedLead, error: insertError } = await trafficDb
        .from('traffic_leads')
        .insert(newLead)
        .select('id')
        .single();

      if (insertError) {
        console.error(`   ❌ Error inserting lead ${lead.id}:`, insertError.message);
      } else {
        landingToTrafficMap.set(lead.id, insertedLead.id);
        inserted++;
      }
    }
  }

  console.log(`\n📊 Lead Migration Summary:`);
  console.log(`   ✅ Inserted: ${inserted}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ⏭️ Skipped: ${skipped}`);
  console.log(`   📝 Total mapped: ${landingToTrafficMap.size}\n`);

  // Step 5: Migrate journey stages
  console.log('🔄 Migrating journey stages...\n');
  let journeyInserted = 0;
  let journeySkipped = 0;

  // Get existing journey IDs to avoid duplicates
  const { data: existingJourney } = await trafficDb
    .from('traffic_lead_journey')
    .select('id');
  
  const existingJourneyIds = new Set((existingJourney || []).map(j => j.id));

  for (const stage of journeyStages) {
    // Skip if already exists
    if (existingJourneyIds.has(stage.id)) {
      journeySkipped++;
      continue;
    }

    // Get the traffic lead ID for this journey stage
    const trafficLeadId = landingToTrafficMap.get(stage.lead_id);
    if (!trafficLeadId) {
      console.log(`   ⚠️ No traffic lead found for landing lead ${stage.lead_id}`);
      journeySkipped++;
      continue;
    }

    const journeyEntry = {
      id: stage.id,
      lead_id: trafficLeadId,
      stage: stage.stage,
      source: stage.source,
      metadata: stage.metadata || {},
      created_at: stage.created_at
    };

    const { error: journeyInsertError } = await trafficDb
      .from('traffic_lead_journey')
      .insert(journeyEntry);

    if (journeyInsertError) {
      if (journeyInsertError.code === '23503') {
        // Foreign key violation - lead doesn't exist
        console.log(`   ⚠️ Lead ${trafficLeadId} not found for journey ${stage.id}`);
      } else {
        console.error(`   ❌ Error inserting journey ${stage.id}:`, journeyInsertError.message);
      }
      journeySkipped++;
    } else {
      journeyInserted++;
    }
  }

  console.log(`\n📊 Journey Migration Summary:`);
  console.log(`   ✅ Inserted: ${journeyInserted}`);
  console.log(`   ⏭️ Skipped: ${journeySkipped}\n`);

  // Step 6: Verify final counts
  const { count: finalLeadCount } = await trafficDb
    .from('traffic_leads')
    .select('*', { count: 'exact', head: true });

  const { count: finalJourneyCount } = await trafficDb
    .from('traffic_lead_journey')
    .select('*', { count: 'exact', head: true });

  console.log('🎉 Migration Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Traffic DB total leads: ${finalLeadCount}`);
  console.log(`   Traffic DB total journey stages: ${finalJourneyCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run the migration
migrateLeads().catch(console.error);
