import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { sendProftestResultSMS } from './mobizon.js';

// Lazy initialization of Supabase clients (to ensure env vars are loaded)
let landingSupabase: SupabaseClient | null = null;
let tripwireSupabase: SupabaseClient | null = null;

function getLandingSupabase() {
  if (!landingSupabase) {
    landingSupabase = createClient(
      process.env.LANDING_SUPABASE_URL || '',
      process.env.LANDING_SUPABASE_SERVICE_KEY || ''
    );
  }
  return landingSupabase;
}

function getTripwireSupabase() {
  if (!tripwireSupabase) {
    tripwireSupabase = createClient(
      process.env.TRIPWIRE_SUPABASE_URL || '',
      process.env.TRIPWIRE_SUPABASE_SERVICE_KEY || ''
    );
  }
  return tripwireSupabase;
}

const resend = new Resend(process.env.RESEND_API_KEY);

// Constants
const NOTIFICATION_DELAY_MS = 10 * 60 * 1000; // 10 minutes
const PRODUCT_URL = process.env.PRODUCT_URL || 'https://onai.academy';

// In-memory storage for scheduled notifications
const scheduledNotifications = new Map<string, NodeJS.Timeout>();

interface ScheduledNotification {
  leadId: string;
  name: string;
  email: string;
  phone: string;
  sourceCampaign: string;
}

/**
 * Send proftest Email and update tracking
 */
async function sendProftestEmailWithTracking(
  name: string,
  email: string,
  leadId: string
): Promise<boolean> {
  try {
    console.log(`\n📧 [Lead ${leadId}] Sending Email to ${email}...`);

    // Validate email
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email format');
    }

    // Generate HTML content
    const htmlContent = `
      <h1>Привет, ${name}!</h1>
      <p>Поздравляем с завершением теста!</p>
      <p><a href="${PRODUCT_URL}/integrator/expresscourse?email=${encodeURIComponent(email)}&utm_source=email&utm_campaign=proftest">Получи доступ →</a></p>
    `;

    // Send via Resend
    const result = await resend.emails.send({
      from: 'OnAI Academy <noreply@onai.academy>',
      to: email,
      subject: 'Тест пройден. Получить продукт',
      html: htmlContent,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    // ✅ UPDATE landing_leads (with error handling)
    try {
      await getLandingSupabase()
        .from('landing_leads')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', leadId);
    } catch (err) {
      console.warn(`⚠️ Failed to update landing_leads: ${err}`);
    }

    // ✅ UPDATE unified_lead_tracking (with error handling)
    try {
      await getTripwireSupabase()
        .from('unified_lead_tracking')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          email_sent_campaign: 'proftest_welcome',
        })
        .eq('source_lead_id', leadId);
    } catch (err) {
      console.warn(`⚠️ Failed to update unified_lead_tracking: ${err}`);
    }

    console.log(
      `✅ [Lead ${leadId}] Email sent successfully (ID: ${result.data?.id})`
    );
    return true;
  } catch (error: any) {
    console.error(`❌ [Lead ${leadId}] Email ERROR:`, error.message);

    // ✅ UPDATE landing_leads with error (with error handling)
    try {
      await getLandingSupabase()
        .from('landing_leads')
        .update({
          email_error: error.message,
        })
        .eq('id', leadId);
    } catch (err) {
      console.warn(`⚠️ Failed to log email error: ${err}`);
    }

    // ✅ UPDATE unified_lead_tracking with error (with error handling)
    try {
      await getTripwireSupabase()
        .from('unified_lead_tracking')
        .update({
          email_failed: true,
          email_failed_reason: error.message,
        })
        .eq('source_lead_id', leadId);
    } catch (err) {
      console.warn(`⚠️ Failed to log email error in unified table: ${err}`);
    }

    return false;
  }
}

/**
 * Send proftest SMS and update tracking
 */
async function sendProftestSMSWithTracking(
  phone: string,
  email: string,
  leadId: string
): Promise<boolean> {
  try {
    console.log(`📱 [Lead ${leadId}] Sending SMS to ${phone}...`);

    // Validate phone
    if (!phone || phone.length < 10) {
      throw new Error('Invalid phone format');
    }

    // Send SMS
    const success = await sendProftestResultSMS(phone);
    if (!success) {
      throw new Error('SMS sending returned false');
    }

    // ✅ UPDATE landing_leads (with error handling)
    try {
      await getLandingSupabase()
        .from('landing_leads')
        .update({
          sms_sent: true,
          sms_sent_at: new Date().toISOString(),
        })
        .eq('id', leadId);
    } catch (err) {
      console.warn(`⚠️ Failed to update landing_leads SMS: ${err}`);
    }

    // ✅ UPDATE unified_lead_tracking (with error handling)
    try {
      await getTripwireSupabase()
        .from('unified_lead_tracking')
        .update({
          sms_sent: true,
          sms_sent_at: new Date().toISOString(),
          sms_sent_campaign: 'proftest_welcome',
        })
        .eq('source_lead_id', leadId);
    } catch (err) {
      console.warn(`⚠️ Failed to update unified SMS: ${err}`);
    }

    console.log(`✅ [Lead ${leadId}] SMS sent successfully`);
    return true;
  } catch (error: any) {
    console.error(`❌ [Lead ${leadId}] SMS ERROR:`, error.message);

    // ✅ UPDATE landing_leads with error (with error handling)
    try {
      await getLandingSupabase()
        .from('landing_leads')
        .update({
          sms_error: error.message,
        })
        .eq('id', leadId);
    } catch (err) {
      console.warn(`⚠️ Failed to log SMS error: ${err}`);
    }

    // ✅ UPDATE unified_lead_tracking with error (with error handling)
    try {
      await getTripwireSupabase()
        .from('unified_lead_tracking')
        .update({
          sms_failed: true,
          sms_failed_reason: error.message,
        })
        .eq('source_lead_id', leadId);
    } catch (err) {
      console.warn(`⚠️ Failed to log SMS error in unified table: ${err}`);
    }

    return false;
  }
}

/**
 * Create lead in unified_lead_tracking
 */
async function createUnifiedLead(
  notification: ScheduledNotification
): Promise<void> {
  try {
    const { leadId, name, email, phone, sourceCampaign } = notification;

    // Validate required fields
    if (!name || !email || !phone) {
      throw new Error('Missing required fields: name, email, or phone');
    }

    console.log(`\n📝 [Lead ${leadId}] Creating in unified_lead_tracking...`);

    await getTripwireSupabase()
      .from('unified_lead_tracking')
      .insert({
        full_name: name,
        email,
        phone,
        source: 'proftest',
        source_campaign: sourceCampaign,
        source_lead_id: leadId,
      });

    console.log(`✅ [Lead ${leadId}] Added to unified_lead_tracking`);
  } catch (error: any) {
    console.error(
      `❌ [Lead ${notification.leadId}] Failed to create in unified_lead_tracking:`,
      error.message
    );
  }
}

/**
 * Main scheduling function
 */
export function scheduleProftestNotifications(
  data: ScheduledNotification
): void {
  const { leadId, name, email, phone, sourceCampaign } = data;

  console.log(`\n⏰ SCHEDULING NOTIFICATIONS for ${name}`);
  console.log(` 📧 Email: ${email}`);
  console.log(` 📱 SMS: ${phone}`);
  console.log(` ⏳ Delay: 10 minutes`);
  console.log(` 🔗 Lead ID: ${leadId}`);

  // ✅ Create in unified_lead_tracking immediately
  createUnifiedLead(data);

  // Schedule notifications after delay
  const timeoutId = setTimeout(async () => {
    console.log(`\n🚀 EXECUTING SCHEDULED NOTIFICATIONS for ${name}`);
    try {
      // Send Email
      const emailSent = await sendProftestEmailWithTracking(
        name,
        email,
        leadId
      );

      // Send SMS
      const smsSent = await sendProftestSMSWithTracking(phone, email, leadId);

      // Remove from scheduled
      scheduledNotifications.delete(leadId);

      console.log(`\n🎉 NOTIFICATIONS COMPLETE for ${name}`);
      console.log(` ✅ Email: ${emailSent ? 'SENT' : 'FAILED'}`);
      console.log(` ✅ SMS: ${smsSent ? 'SENT' : 'FAILED'}\n`);
    } catch (error) {
      console.error(`\n❌ CRITICAL ERROR for ${name}:`, error);
    }
  }, NOTIFICATION_DELAY_MS);

  scheduledNotifications.set(leadId, timeoutId);
}

/**
 * Cancel scheduled notification
 */
export function cancelScheduledNotification(leadId: string): void {
  const timeoutId = scheduledNotifications.get(leadId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    scheduledNotifications.delete(leadId);
    console.log(`⏹️ Cancelled scheduled notification for lead ${leadId}`);
  }
}

/**
 * Get all scheduled notifications
 */
export function getScheduledNotifications(): string[] {
  return Array.from(scheduledNotifications.keys());
}
