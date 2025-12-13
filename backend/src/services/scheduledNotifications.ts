import { Resend } from 'resend';
import { sendProftestResultSMS } from './mobizon.js';
import { generateProftestResultEmail } from '../templates/proftest-result-email.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const NOTIFICATION_DELAY_MS = 0; // МОМЕНТАЛЬНО (было 15 минут)
const PRODUCT_URL = 'https://onai.academy/integrator/expresscourse';

interface ScheduledNotification {
  name: string;
  email: string;
  phone: string;
  leadId: string;
}

// In-memory storage for scheduled notifications
// In production, use a database or job queue (Bull, BullMQ, etc.)
const scheduledNotifications = new Map<string, NodeJS.Timeout>();

export function scheduleProftestNotifications(data: ScheduledNotification): void {
  const { name, email, phone, leadId } = data;

  console.log(`⏰ Sending notifications for lead ${leadId} (INSTANT - no delay):`);
  console.log(`   - Email: ${email}`);
  console.log(`   - Phone: ${phone}`);
  console.log(`   - Delay: МОМЕНТАЛЬНО (0 секунд)`);

  // Cancel existing notification if any
  if (scheduledNotifications.has(leadId)) {
    clearTimeout(scheduledNotifications.get(leadId)!);
  }

  // Schedule notification to be sent after 15 minutes
  const timeoutId = setTimeout(async () => {
    console.log(`📬 Sending scheduled notifications for lead ${leadId}...`);

    try {
      console.log(`\n📧 Step 1/2: Sending Email to ${email}...`);
      await sendProftestEmail(name, email);
      console.log(`✅ Email sent successfully to ${email}`);

      console.log(`\n📱 Step 2/2: Sending SMS to ${phone}...`);
      await sendProftestResultSMS(phone);
      console.log(`✅ SMS sent successfully to ${phone}`);

      // Remove from scheduled map
      scheduledNotifications.delete(leadId);

      console.log(`\n🎉 All notifications sent for lead ${leadId}\n`);
    } catch (error) {
      console.error(`\n❌ Error sending scheduled notifications for lead ${leadId}:`, error);
      console.error('Full error:', error);
    }
  }, NOTIFICATION_DELAY_MS);

  scheduledNotifications.set(leadId, timeoutId);
}

async function sendProftestEmail(name: string, email: string): Promise<void> {
  try {
    const htmlContent = generateProftestResultEmail(name, PRODUCT_URL);

    const result = await resend.emails.send({
      from: 'OnAI Academy <noreply@onai.academy>',
      to: email,
      subject: 'Тест пройден. Получить продукт',
      html: htmlContent,
    });

    if (result.error) {
      console.error('❌ Email sending error:', result.error);
      throw new Error(result.error.message);
    }

    console.log('✅ Email sent successfully:', result.data?.id);
  } catch (error: any) {
    console.error('❌ Error sending email:', error.message);
    throw error;
  }
}

export function cancelScheduledNotification(leadId: string): void {
  if (scheduledNotifications.has(leadId)) {
    clearTimeout(scheduledNotifications.get(leadId)!);
    scheduledNotifications.delete(leadId);
    console.log(`⏹️ Cancelled scheduled notification for lead ${leadId}`);
  }
}

// Get count of scheduled notifications (for monitoring)
export function getScheduledNotificationsCount(): number {
  return scheduledNotifications.size;
}
