/**
 * 📧 МАССОВАЯ ОТПРАВКА EMAIL И SMS
 * Отправляет уведомления всем лидам, кому еще не отправили
 */

import { createClient } from '@supabase/supabase-js';
import { scheduleProftestNotifications } from '../src/services/scheduledNotifications.js';

// Supabase credentials
const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL || '';
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY || '';

const landingSupabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY);

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  source: string;
  email_sent: boolean;
  sms_sent: boolean;
}

async function sendMissedNotifications() {
  console.log('📧 НАЧИНАЮ МАССОВУЮ ОТПРАВКУ...\n');

  try {
    // 1. Получаем всех лидов без отправки
    const { data: leads, error } = await landingSupabase
      .from('landing_leads')
      .select('id, name, email, phone, source, email_sent, sms_sent')
      .or('email_sent.is.false,sms_sent.is.false,email_sent.is.null,sms_sent.is.null')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка получения лидов:', error);
      return;
    }

    if (!leads || leads.length === 0) {
      console.log('✅ Все уведомления уже отправлены!');
      return;
    }

    console.log(`📋 Найдено лидов для отправки: ${leads.length}\n`);

    // 2. Отправляем каждому лиду
    for (const lead of leads as Lead[]) {
      console.log(`\n👤 Обрабатываю: ${lead.name} (${lead.source})`);
      console.log(`   Email: ${lead.email || 'нет'}`);
      console.log(`   Phone: ${lead.phone}`);
      console.log(`   Статус: email_sent=${lead.email_sent}, sms_sent=${lead.sms_sent}`);

      try {
        // Отправляем сразу (delay = 0)
        await scheduleProftestNotifications({
          leadId: lead.id,
          name: lead.name,
          email: lead.email || undefined,
          phone: lead.phone,
          emailDelayMinutes: 0,  // 🚀 Отправить сразу!
          smsDelayMinutes: 0,    // 🚀 Отправить сразу!
          sourceCampaign: lead.source,
        });

        console.log(`   ✅ Отправлено успешно!`);
        
        // Небольшая задержка между отправками
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        console.error(`   ❌ Ошибка отправки: ${error.message}`);
      }
    }

    console.log('\n\n🎉 МАССОВАЯ ОТПРАВКА ЗАВЕРШЕНА!');
    console.log(`📊 Обработано лидов: ${leads.length}`);

  } catch (error: any) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

// Запускаем
sendMissedNotifications()
  .then(() => {
    console.log('\n✅ Скрипт завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Скрипт завершен с ошибкой:', error);
    process.exit(1);
  });
