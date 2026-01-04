#!/usr/bin/env node
/**
 * Landing DB → Traffic DB Migration Script
 * Migrates leads and journey stages from Landing DB to Traffic DB
 * Uses Supabase JS client for both databases
 */

import { createClient } from '@supabase/supabase-js';

// Landing DB (source)
const LANDING_URL = 'https://xikaiavwqinamgolmtcy.supabase.co';
const LANDING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1MzIyMSwiZXhwIjoyMDgwNDI5MjIxfQ.eP7ake2RkWqCaLTKv0jI3vWMkBjDySKsAdToKIgb7fA';

// Traffic DB (destination)  
const TRAFFIC_URL = 'https://oetodaexnjcunklkdlkv.supabase.co';
const TRAFFIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldG9kYWV4bmpjdW5rbGtkbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTg3MzYsImV4cCI6MjA1MDA5NDczNn0.bvl8tIXBwbPOZ5Ls3xHgCcCajcB06OyBEJqj_L7Vze8';

const landingDb = createClient(LANDING_URL, LANDING_KEY);
const trafficDb = createClient(TRAFFIC_URL, TRAFFIC_KEY);

// Phone normalization function (matches DB function)
function normalizePhone(phone) {
  if (!phone) return null;
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  // Handle Kazakhstan numbers
  if (digits.startsWith('8') && digits.length === 11) {
    digits = '7' + digits.slice(1);
  }
  // Remove leading + if present in original
  if (digits.length === 11 && digits.startsWith('7')) {
    return '+' + digits;
  }
  if (digits.length === 10) {
    return '+7' + digits;
  }
  return phone; // Return original if can't normalize
}

async function migrateLeads() {
  console.log('🚀 Starting Landing → Traffic migration...\n');
  
  // Step 1: Fetch all leads from Landing DB
  console.log('📥 Fetching leads from Landing DB...');
  const { data: landingLeads, error: fetchError } = await landingDb
    .from('landing_leads')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (fetchError) {
    console.error('❌ Failed to fetch landing leads:', fetchError.message);
    return;
  }
  
  console.log(`✅ Found ${landingLeads.length} leads in Landing DB\n`);
  
  // Step 2: Check existing leads in Traffic DB
  console.log('📊 Checking existing leads in Traffic DB...');
  const { data: existingLeads, error: existingError } = await trafficDb
    .from('traffic_leads')
    .select('id, landing_lead_id, phone_normalized')
    .not('landing_lead_id', 'is', null);
    
  if (existingError) {
    console.error('⚠️ Could not check existing leads:', existingError.message);
  }
  
  const existingLandingIds = new Set((existingLeads || []).map(l => l.landing_lead_id));
  const existingPhones = new Set((existingLeads || []).map(l => l.phone_normalized).filter(Boolean));
  
  console.log(`📈 Already migrated: ${existingLandingIds.size} leads\n`);
  
  // Step 3: Migrate each lead
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  const leadMapping = new Map(); // landing_id -> traffic_id
  
  for (const lead of landingLeads) {
    // Skip if already migrated
    if (existingLandingIds.has(lead.id)) {
      skipped++;
      continue;
    }
    
    const normalizedPhone = normalizePhone(lead.phone);
    
    // Check if lead with same phone exists (dedup by phone)
    if (normalizedPhone && existingPhones.has(normalizedPhone)) {
      // Find existing lead and update landing_lead_id
      const { data: existingLead } = await trafficDb
        .from('traffic_leads')
        .select('id')
        .eq('phone_normalized', normalizedPhone)
        .single();
        
      if (existingLead) {
        // Update existing lead with landing_lead_id reference
        await trafficDb
          .from('traffic_leads')
          .update({ 
            landing_lead_id: lead.id,
            landing_db_imported: true 
          })
          .eq('id', existingLead.id);
          
        leadMapping.set(lead.id, existingLead.id);
        skipped++;
        continue;
      }
    }
    
    // Insert new lead
    const trafficLead = {
      landing_lead_id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      source: lead.source || 'landing',
      utm_source: lead.utm_source,
      utm_medium: lead.utm_medium,
      utm_campaign: lead.utm_campaign,
      utm_content: lead.utm_content,
      utm_term: lead.utm_term,
      amocrm_lead_id: lead.amocrm_lead_id,
      metadata: lead.metadata,
      phone_normalized: normalizedPhone,
      email_sent: lead.email_sent || false,
      sms_sent: lead.sms_sent || false,
      email_clicked: lead.email_clicked || false,
      email_clicked_at: lead.email_clicked_at,
      sms_clicked: lead.sms_clicked || false,
      sms_clicked_at: lead.sms_clicked_at,
      click_count: lead.click_count || 0,
      lead_date: lead.created_at ? lead.created_at.split('T')[0] : null,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      landing_db_imported: true
    };
    
    const { data: insertedLead, error: insertError } = await trafficDb
      .from('traffic_leads')
      .insert(trafficLead)
      .select('id')
      .single();
      
    if (insertError) {
      console.error(`❌ Failed to insert lead ${lead.id}:`, insertError.message);
      errors++;
      continue;
    }
    
    leadMapping.set(lead.id, insertedLead.id);
    migrated++;
    
    if (migrated % 50 === 0) {
      console.log(`  ✓ Migrated ${migrated} leads...`);
    }
  }
  
  console.log(`\n📊 Lead migration complete:`);
  console.log(`  ✅ Migrated: ${migrated}`);
  console.log(`  ⏭️ Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}\n`);
  
  // Step 4: Migrate journey stages
  console.log('📥 Fetching journey stages from Landing DB...');
  const { data: journeyStages, error: journeyFetchError } = await landingDb
    .from('journey_stages')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (journeyFetchError) {
    console.error('❌ Failed to fetch journey stages:', journeyFetchError.message);
    return;
  }
  
  console.log(`✅ Found ${journeyStages.length} journey stages\n`);
  
  // Build lead ID mapping for existing leads
  const { data: allTrafficLeads } = await trafficDb
    .from('traffic_leads')
    .select('id, landing_lead_id')
    .not('landing_lead_id', 'is', null);
    
  for (const tl of (allTrafficLeads || [])) {
    if (tl.landing_lead_id) {
      leadMapping.set(tl.landing_lead_id, tl.id);
    }
  }
  
  let journeyMigrated = 0;
  let journeySkipped = 0;
  let journeyErrors = 0;
  
  for (const stage of journeyStages) {
    const trafficLeadId = leadMapping.get(stage.lead_id);
    
    if (!trafficLeadId) {
      journeySkipped++;
      continue;
    }
    
    const journeyEntry = {
      lead_id: trafficLeadId,
      stage_name: stage.stage || 'unknown',
      source: stage.source,
      event_type: stage.event_type || 'stage_change',
      metadata: stage.metadata,
      created_at: stage.created_at
    };
    
    const { error: journeyInsertError } = await trafficDb
      .from('traffic_lead_journey')
      .insert(journeyEntry);
      
    if (journeyInsertError) {
      // Skip duplicates silently
      if (!journeyInsertError.message.includes('duplicate')) {
        journeyErrors++;
      }
      continue;
    }
    
    journeyMigrated++;
    
    if (journeyMigrated % 50 === 0) {
      console.log(`  ✓ Migrated ${journeyMigrated} journey stages...`);
    }
  }
  
  console.log(`\n📊 Journey migration complete:`);
  console.log(`  ✅ Migrated: ${journeyMigrated}`);
  console.log(`  ⏭️ Skipped (no matching lead): ${journeySkipped}`);
  console.log(`  ❌ Errors: ${journeyErrors}\n`);
  
  console.log('🎉 Migration completed successfully!');
}

migrateLeads().catch(console.error);
