import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { sendProftestResultSMS } from './mobizon.js';
import { generateProftestResultEmail } from '../templates/proftest-result-email.js';
import { createShortLink } from './urlShortener.js';

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
      process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_KEY || ''
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

// ========================================
// 🔥 PERSISTENT STORAGE IN DB
// ========================================

/**
 * Save scheduled notification to DB (PERSISTENT)
 */
async function saveScheduledNotificationToDB(
  leadId: string,
  notification: ScheduledNotification,
  scheduledFor: Date
): Promise<void> {
  try {
    const { data, error } = await getLandingSupabase()
      .from('scheduled_notifications')
      .insert({
        lead_id: leadId,
        notification_type: 'both', // SMS + Email
        recipient_name: notification.name,
        recipient_email: notification.email,
        recipient_phone: notification.phone,
        source_campaign: notification.sourceCampaign,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    console.log(`💾 [Lead ${leadId}] Saved to DB (scheduled_notifications)`);
  } catch (err: any) {
    console.error(`❌ Failed to save to DB:`, err.message);
  }
}

/**
 * Update notification status in DB
 */
async function updateNotificationStatus(
  leadId: string,
  status: 'sent' | 'failed' | 'cancelled',
  errorMessage?: string
): Promise<void> {
  try {
    await getLandingSupabase()
      .from('scheduled_notifications')
      .update({
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        error_message: errorMessage || null,
      })
      .eq('lead_id', leadId)
      .eq('status', 'pending'); // Only update pending ones

    console.log(`✅ [Lead ${leadId}] DB status → ${status}`);
  } catch (err: any) {
    console.warn(`⚠️ Failed to update DB status:`, err.message);
  }
}

/**
 * Load pending notifications from DB and reschedule them
 */
export async function recoverPendingNotifications(): Promise<void> {
  try {
    console.log('\n🔄 [RECOVERY] Loading pending notifications from DB...');

    const { data, error } = await getLandingSupabase()
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .order('scheduled_for', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('✅ [RECOVERY] No pending notifications');
      return;
    }

    console.log(`📋 [RECOVERY] Found ${data.length} pending notifications`);

    for (const notif of data) {
      // 🚫 КРИТИЧЕСКИ ВАЖНО: НИКОГДА не отправлять SMS/Email для экспресс-курса!
      const isExpressCourse = notif.source_campaign?.toLowerCase().includes('express');
      
      if (isExpressCourse) {
        console.log(`🚫 [Lead ${notif.lead_id}] SKIPPING - ExpressCourse lead (no SMS/Email allowed)`);
        // Отменяем в БД
        await updateNotificationStatus(notif.lead_id, 'cancelled', 'ExpressCourse leads do not receive SMS/Email');
        continue; // Пропускаем этот лид
      }

      const scheduledFor = new Date(notif.scheduled_for);
      const now = new Date();
      const delayMs = scheduledFor.getTime() - now.getTime();

      // If scheduled time already passed, send immediately
      if (delayMs <= 0) {
        console.log(`⚡ [Lead ${notif.lead_id}] OVERDUE - sending immediately`);
        await executeNotification({
          leadId: notif.lead_id,
          name: notif.recipient_name,
          email: notif.recipient_email,
          phone: notif.recipient_phone,
          sourceCampaign: notif.source_campaign,
        });
      } else {
        // Reschedule for future
        console.log(
          `⏰ [Lead ${notif.lead_id}] Rescheduling in ${Math.round(delayMs / 1000)}s`
        );
        const timeout = setTimeout(() => {
          executeNotification({
            leadId: notif.lead_id,
            name: notif.recipient_name,
            email: notif.recipient_email,
            phone: notif.recipient_phone,
            sourceCampaign: notif.source_campaign,
          });
          scheduledNotifications.delete(notif.lead_id);
        }, delayMs);

        scheduledNotifications.set(notif.lead_id, timeout);
      }
    }

    console.log(`✅ [RECOVERY] Restored ${data.length} notifications`);
  } catch (err: any) {
    console.error(`❌ [RECOVERY] Failed:`, err.message);
  }
}

/**
 * Send proftest Email and update tracking
 * ✅ EXPORTED for manual resend from admin panel
 * ✅ WITH IDEMPOTENCY CHECK to prevent duplicate sends
 */
export async function sendProftestEmailWithTracking(
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

    // 🛡️ IDEMPOTENCY CHECK: Don't send if already sent
    const { data: leadCheck, error: checkError } = await getLandingSupabase()
      .from('landing_leads')
      .select('email_sent')
      .eq('id', leadId)
      .single();

    if (checkError) {
      console.warn(`⚠️ Could not check Email status: ${checkError.message}`);
      // Continue anyway if DB check fails
    } else if (leadCheck?.email_sent) {
      console.log(`⏭️ [Lead ${leadId}] Email already sent - skipping duplicate`);
      return true; // Return success since Email was already sent
    }

    // 🔗 Создаем КОРОТКУЮ ссылку для экономии и лучшего трекинга
    let trackingUrl = `https://api.onai.academy/api/landing/track/${leadId}?source=email`;
    
    // Полная ссылка с UTM параметрами
    const originalUrl = `https://onai.academy/integrator/expresscourse?utm_source=email&utm_campaign=proftest&lead_id=${leadId}`;
    
    console.log(`🔗 Creating short link for Email (lead ${leadId})...`);
    
    // Создаем короткую ссылку
    const shortCode = await createShortLink({
      originalUrl,
      leadId,
      campaign: 'proftest',
      source: 'email',
      expiresInDays: 90 // Ссылка действует 90 дней
    });

    if (shortCode) {
      trackingUrl = `https://onai.academy/l/${shortCode}`;
      console.log(`✅ Short link created for Email: ${trackingUrl}`);
      console.log(`📊 Saved ${originalUrl.length - trackingUrl.length} characters (${Math.round((1 - trackingUrl.length / originalUrl.length) * 100)}% reduction)`);
    } else {
      console.warn('⚠️ Failed to create short link for Email, using fallback URL');
    }
    
    const htmlContent = generateProftestResultEmail(name, trackingUrl);

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
 * ✅ WITH IDEMPOTENCY CHECK to prevent duplicate sends
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

    // 🛡️ IDEMPOTENCY CHECK: Don't send if already sent
    const { data: leadCheck, error: checkError } = await getLandingSupabase()
      .from('landing_leads')
      .select('sms_sent')
      .eq('id', leadId)
      .single();

    if (checkError) {
      console.warn(`⚠️ Could not check SMS status: ${checkError.message}`);
      // Continue anyway if DB check fails
    } else if (leadCheck?.sms_sent) {
      console.log(`⏭️ [Lead ${leadId}] SMS already sent - skipping duplicate`);
      return true; // Return success since SMS was already sent
    }

    // Send SMS with tracking URL
    const success = await sendProftestResultSMS(phone, leadId);
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
 * Execute notification: send SMS + Email + update DB status
 */
async function executeNotification(
  notification: ScheduledNotification
): Promise<void> {
  const { leadId, name, email, phone, sourceCampaign } = notification;

  // 🚫 ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Никогда не отправлять для экспресс-курса!
  const isExpressCourse = sourceCampaign?.toLowerCase().includes('express');
  
  if (isExpressCourse) {
    console.log(`🚫 [Lead ${leadId}] BLOCKED - ExpressCourse lead cannot receive SMS/Email`);
    await updateNotificationStatus(leadId, 'cancelled', 'ExpressCourse leads do not receive SMS/Email');
    return; // Выходим без отправки
  }

  console.log(`\n🚀 [Lead ${leadId}] Executing scheduled notification...`);

  let emailSuccess = false;
  let smsSuccess = false;
  let errorMessages: string[] = [];

  // 1. Create unified lead first
  try {
    await createUnifiedLead(notification);
  } catch (err: any) {
    console.error(`❌ Failed to create unified lead:`, err.message);
    errorMessages.push(`unified: ${err.message}`);
  }

  // 2. Send Email
  try {
    emailSuccess = await sendProftestEmailWithTracking(name, email, leadId);
  } catch (err: any) {
    console.error(`❌ Email error:`, err.message);
    errorMessages.push(`email: ${err.message}`);
  }

  // 3. Send SMS
  try {
    smsSuccess = await sendProftestSMSWithTracking(phone, email, leadId);
  } catch (err: any) {
    console.error(`❌ SMS error:`, err.message);
    errorMessages.push(`sms: ${err.message}`);
  }

  // 4. Update DB status
  if (emailSuccess && smsSuccess) {
    await updateNotificationStatus(leadId, 'sent');
    console.log(`✅ [Lead ${leadId}] Notification completed successfully`);
  } else {
    await updateNotificationStatus(
      leadId,
      'failed',
      errorMessages.join('; ')
    );
    console.log(`⚠️ [Lead ${leadId}] Notification partially failed`);
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
 * Main scheduling function (WITH PERSISTENT DB STORAGE)
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

  // 💾 SAVE TO DB (PERSISTENT!)
  const scheduledFor = new Date(Date.now() + NOTIFICATION_DELAY_MS);
  saveScheduledNotificationToDB(leadId, data, scheduledFor);

  // ✅ Create in unified_lead_tracking immediately
  createUnifiedLead(data);

  // Schedule notifications after delay
  const timeoutId = setTimeout(async () => {
    try {
      // 🚀 Execute via unified function (updates DB status automatically)
      await executeNotification(data);
      
      // Remove from in-memory map
      scheduledNotifications.delete(leadId);
    } catch (error) {
      console.error(`\n❌ CRITICAL ERROR for ${name}:`, error);
      await updateNotificationStatus(leadId, 'failed', (error as Error).message);
    }
  }, NOTIFICATION_DELAY_MS);

  scheduledNotifications.set(leadId, timeoutId);
  console.log(`✅ Scheduled + saved to DB`);
}

/**
 * Cancel scheduled notification (also updates DB)
 */
export async function cancelScheduledNotification(leadId: string): Promise<void> {
  const timeoutId = scheduledNotifications.get(leadId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    scheduledNotifications.delete(leadId);
    
    // Update DB status
    await updateNotificationStatus(leadId, 'cancelled');
    
    console.log(`⏹️ Cancelled scheduled notification for lead ${leadId}`);
  }
}

/**
 * Get all scheduled notifications
 */
export function getScheduledNotifications(): string[] {
  return Array.from(scheduledNotifications.keys());
}
