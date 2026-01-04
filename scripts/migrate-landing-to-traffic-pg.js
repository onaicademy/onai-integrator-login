/**
 * Migration Script: Landing DB → Traffic DB Consolidation
 * Uses direct PostgreSQL connections for cross-database migration
 * 
 * Run with: node scripts/migrate-landing-to-traffic-pg.js
 */

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

// Landing DB via Supabase client (has proper JWT service key)
const LANDING_URL = 'https://xikaiavwqinamgolmtcy.supabase.co';
const LANDING_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY;
const TRAFFIC_DB_URL = process.env.TRAFFIC_DATABASE_URL;

if (!TRAFFIC_DB_URL) {
  console.error('❌ Missing TRAFFIC_DATABASE_URL in environment');
  process.exit(1);
}

// Create connection pools
const landingPool = new pg.Pool({ connectionString: LANDING_DB_URL });
const trafficPool = new pg.Pool({ connectionString: TRAFFIC_DB_URL });

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
  console.log('🚀 Starting Landing → Traffic migration via PostgreSQL...\n');

  try {
    // Test connections
    console.log('📡 Testing database connections...');
    await landingPool.query('SELECT 1');
    console.log('   ✅ Landing DB connected');
    await trafficPool.query('SELECT 1');
    console.log('   ✅ Traffic DB connected\n');

    // Step 1: Get all landing leads
    console.log('📥 Fetching leads from Landing DB...');
    const landingResult = await landingPool.query(`
      SELECT 
        id, email, name, phone, source, metadata,
        amocrm_lead_id, amocrm_contact_id, amocrm_synced,
        email_sent, sms_sent, email_clicked, email_clicked_at,
        sms_clicked, sms_clicked_at, click_count,
        utm_source, utm_campaign, utm_medium, utm_content, utm_term,
        created_at, updated_at
      FROM landing_leads
      ORDER BY created_at ASC
    `);
    const landingLeads = landingResult.rows;
    console.log(`   Found ${landingLeads.length} leads in Landing DB\n`);

    // Step 2: Get all journey stages
    console.log('📥 Fetching journey stages from Landing DB...');
    const journeyResult = await landingPool.query(`
      SELECT id, lead_id, stage, source, metadata, created_at
      FROM journey_stages
      ORDER BY created_at ASC
    `);
    const journeyStages = journeyResult.rows;
    console.log(`   Found ${journeyStages.length} journey stages\n`);

    // Step 3: Get existing traffic leads for deduplication
    console.log('📥 Fetching existing Traffic leads for deduplication...');
    const trafficResult = await trafficPool.query(`
      SELECT id, email, phone, phone_normalized, landing_lead_id
      FROM traffic_leads
    `);
    const trafficLeads = trafficResult.rows;
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
    let errors = 0;

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

      try {
        if (existingId) {
          // Update existing lead with landing_lead_id reference
          await trafficPool.query(`
            UPDATE traffic_leads SET
              landing_lead_id = $1,
              email_sent = COALESCE($2, email_sent),
              sms_sent = COALESCE($3, sms_sent),
              email_clicked = COALESCE($4, email_clicked),
              email_clicked_at = COALESCE($5, email_clicked_at),
              sms_clicked = COALESCE($6, sms_clicked),
              sms_clicked_at = COALESCE($7, sms_clicked_at),
              click_count = COALESCE($8, click_count),
              landing_db_imported = true,
              updated_at = NOW()
            WHERE id = $9
          `, [
            lead.id,
            lead.email_sent,
            lead.sms_sent,
            lead.email_clicked,
            lead.email_clicked_at,
            lead.sms_clicked,
            lead.sms_clicked_at,
            lead.click_count,
            existingId
          ]);
          landingToTrafficMap.set(lead.id, existingId);
          updated++;
        } else {
          // Insert new lead
          const source = lead.source === 'twland' ? 'direct' : (lead.source || 'direct');
          const funnelType = getFunnelType(lead.source);
          const amocrmLeadId = lead.amocrm_lead_id ? parseInt(lead.amocrm_lead_id) : null;
          const amocrmContactId = lead.amocrm_contact_id ? parseInt(lead.amocrm_contact_id) : null;

          const insertResult = await trafficPool.query(`
            INSERT INTO traffic_leads (
              landing_lead_id, email, name, phone, phone_normalized, source, metadata,
              amocrm_lead_id, amocrm_contact_id,
              email_sent, sms_sent, email_clicked, email_clicked_at,
              sms_clicked, sms_clicked_at, click_count,
              utm_source, utm_campaign, utm_medium, utm_content, utm_term,
              funnel_type, status, created_at, updated_at, landing_db_imported
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              $8, $9,
              $10, $11, $12, $13,
              $14, $15, $16,
              $17, $18, $19, $20, $21,
              $22, 'new', $23, $24, true
            ) RETURNING id
          `, [
            lead.id, lead.email, lead.name, lead.phone, phoneNormalized, source, lead.metadata,
            amocrmLeadId, amocrmContactId,
            lead.email_sent || false, lead.sms_sent || false, lead.email_clicked || false, lead.email_clicked_at,
            lead.sms_clicked || false, lead.sms_clicked_at, lead.click_count || 0,
            lead.utm_source, lead.utm_campaign, lead.utm_medium, lead.utm_content, lead.utm_term,
            funnelType, lead.created_at, lead.updated_at || lead.created_at
          ]);

          landingToTrafficMap.set(lead.id, insertResult.rows[0].id);
          inserted++;
        }
      } catch (err) {
        console.error(`   ❌ Error processing lead ${lead.id}: ${err.message}`);
        errors++;
      }
    }

    console.log(`\n📊 Lead Migration Summary:`);
    console.log(`   ✅ Inserted: ${inserted}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ⏭️ Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total mapped: ${landingToTrafficMap.size}\n`);

    // Step 5: Migrate journey stages
    console.log('🔄 Migrating journey stages...\n');
    let journeyInserted = 0;
    let journeySkipped = 0;
    let journeyErrors = 0;

    // Get existing journey IDs to avoid duplicates
    const existingJourneyResult = await trafficPool.query(`
      SELECT id FROM traffic_lead_journey
    `);
    const existingJourneyIds = new Set(existingJourneyResult.rows.map(j => j.id));

    for (const stage of journeyStages) {
      // Skip if already exists
      if (existingJourneyIds.has(stage.id)) {
        journeySkipped++;
        continue;
      }

      // Get the traffic lead ID for this journey stage
      const trafficLeadId = landingToTrafficMap.get(stage.lead_id);
      if (!trafficLeadId) {
        journeySkipped++;
        continue;
      }

      try {
        await trafficPool.query(`
          INSERT INTO traffic_lead_journey (id, lead_id, stage, source, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [
          stage.id,
          trafficLeadId,
          stage.stage,
          stage.source,
          stage.metadata || {},
          stage.created_at
        ]);
        journeyInserted++;
      } catch (err) {
        console.error(`   ❌ Error inserting journey ${stage.id}: ${err.message}`);
        journeyErrors++;
      }
    }

    console.log(`\n📊 Journey Migration Summary:`);
    console.log(`   ✅ Inserted: ${journeyInserted}`);
    console.log(`   ⏭️ Skipped: ${journeySkipped}`);
    console.log(`   ❌ Errors: ${journeyErrors}\n`);

    // Step 6: Verify final counts
    const finalLeadCount = await trafficPool.query('SELECT COUNT(*) FROM traffic_leads');
    const finalJourneyCount = await trafficPool.query('SELECT COUNT(*) FROM traffic_lead_journey');

    console.log('🎉 Migration Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Traffic DB total leads: ${finalLeadCount.rows[0].count}`);
    console.log(`   Traffic DB total journey stages: ${finalJourneyCount.rows[0].count}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await landingPool.end();
    await trafficPool.end();
  }
}

// Run the migration
migrateLeads().catch(console.error);
