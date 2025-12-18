/**
 * Notification Scheduler Service
 * Периодически проверяет и отправляет просроченные email/SMS notifications
 * 
 * ПРОБЛЕМА: При перезапуске backend таймеры из setTimeout теряются
 * РЕШЕНИЕ: Cron job проверяет БД каждую минуту и отправляет просроченные
 */

import cron from 'node-cron';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { sendProftestResultSMS } from './mobizon.js';
import { generateProftestResultEmail } from '../templates/proftest-result-email.js';

// Lazy initialization of Supabase clients
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

// ========================================
// 📧 EMAIL SENDING
// ========================================

async function sendProftestEmailWithTracking(
  name: string,
  email: string,
  leadId: string
): Promise<boolean> {
  try {
    console.log(`📧 [Scheduler] Sending email to ${email}...`);

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
      console.log(`⏭️ [Scheduler] Email already sent to ${email} - skipping`);
      return true; // Return success since Email was already sent
    }

    const trackingUrl = `https://api.onai.academy/api/landing/track/${leadId}?source=email`;
    const htmlContent = generateProftestResultEmail(name, trackingUrl);

    const result = await resend.emails.send({
      from: 'OnAI Academy <noreply@onai.academy>',
      to: email,
      subject: 'Тест пройден. Получить продукт',
      html: htmlContent,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Update landing_leads
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

    // Update unified_lead_tracking
    try {
      await getTripwireSupabase()
        .from('unified_lead_tracking')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq('source_lead_id', leadId);
    } catch (err) {
      console.warn(`⚠️ Failed to update unified_lead_tracking: ${err}`);
    }

    console.log(`✅ [Scheduler] Email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error(`❌ [Scheduler] Email error:`, error.message);
    return false;
  }
}

// ========================================
// 📱 SMS SENDING
// ========================================

async function sendProftestSMSWithTracking(
  phone: string,
  leadId: string
): Promise<boolean> {
  try {
    console.log(`📱 [Scheduler] Sending SMS to ${phone}...`);

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
      console.log(`⏭️ [Scheduler] SMS already sent to ${phone} - skipping`);
      return true; // Return success since SMS was already sent
    }

    const success = await sendProftestResultSMS(phone, leadId);
    if (!success) {
      throw new Error('SMS sending returned false');
    }

    // Update landing_leads
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

    // Update unified_lead_tracking
    try {
      await getTripwireSupabase()
        .from('unified_lead_tracking')
        .update({
          sms_sent: true,
          sms_sent_at: new Date().toISOString(),
        })
        .eq('source_lead_id', leadId);
    } catch (err) {
      console.warn(`⚠️ Failed to update unified SMS: ${err}`);
    }

    console.log(`✅ [Scheduler] SMS sent to ${phone}`);
    return true;
  } catch (error: any) {
    console.error(`❌ [Scheduler] SMS error:`, error.message);
    return false;
  }
}

// ========================================
// 🔄 CHECK AND SEND OVERDUE NOTIFICATIONS
// ========================================

async function checkAndSendOverdueNotifications() {
  try {
    console.log('\n🔍 [Scheduler] Checking for overdue notifications...');

    // Find all pending notifications that should have been sent already
    const { data: overdueNotifications, error } = await getLandingSupabase()
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lt('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50); // Process max 50 at a time to avoid overload

    if (error) {
      console.error('❌ [Scheduler] Error fetching notifications:', error);
      return;
    }

    if (!overdueNotifications || overdueNotifications.length === 0) {
      console.log('✅ [Scheduler] No overdue notifications');
      return;
    }

    console.log(`⚡ [Scheduler] Found ${overdueNotifications.length} overdue notifications`);

    // Process each overdue notification
    for (const notif of overdueNotifications) {
      const scheduledFor = new Date(notif.scheduled_for);
      const now = new Date();
      const delayMinutes = Math.floor((now.getTime() - scheduledFor.getTime()) / 60000);

      console.log(`\n📨 [Scheduler] Processing lead ${notif.lead_id} (${delayMinutes} min late)`);

      let emailSuccess = false;
      let smsSuccess = false;
      let errorMessages: string[] = [];

      // Send Email
      if (notif.recipient_email) {
        try {
          emailSuccess = await sendProftestEmailWithTracking(
            notif.recipient_name,
            notif.recipient_email,
            notif.lead_id
          );
        } catch (err: any) {
          console.error(`❌ Email error:`, err.message);
          errorMessages.push(`email: ${err.message}`);
        }
      }

      // Send SMS
      if (notif.recipient_phone) {
        try {
          smsSuccess = await sendProftestSMSWithTracking(
            notif.recipient_phone,
            notif.lead_id
          );
        } catch (err: any) {
          console.error(`❌ SMS error:`, err.message);
          errorMessages.push(`sms: ${err.message}`);
        }
      }

      // Update notification status in DB
      const status = (emailSuccess || smsSuccess) ? 'sent' : 'failed';
      const errorMessage = errorMessages.length > 0 ? errorMessages.join('; ') : null;

      await getLandingSupabase()
        .from('scheduled_notifications')
        .update({
          status,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
          error_message: errorMessage,
        })
        .eq('id', notif.id);

      console.log(`✅ [Scheduler] Lead ${notif.lead_id} → ${status}`);

      // Small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n🎉 [Scheduler] Processed ${overdueNotifications.length} notifications`);
  } catch (error: any) {
    console.error('❌ [Scheduler] Error in checkAndSendOverdueNotifications:', error);
  }
}

// ========================================
// 🚀 START NOTIFICATION SCHEDULER
// ========================================

/**
 * Start notification scheduler
 * Runs every minute to check for overdue notifications
 */
export function startNotificationScheduler() {
  console.log('🚀 [Notification Scheduler] Starting...');

  // Run every minute
  cron.schedule('* * * * *', () => {
    checkAndSendOverdueNotifications();
  });

  console.log('✅ [Notification Scheduler] Started (runs every minute)');
  
  // Also run immediately on startup to catch any overdue notifications
  setTimeout(() => {
    checkAndSendOverdueNotifications();
  }, 5000); // Wait 5 seconds after startup
}

/**
 * Manual trigger for testing
 */
export async function triggerNotificationCheck() {
  console.log('🧪 [Notification Scheduler] Manual trigger...');
  await checkAndSendOverdueNotifications();
}











