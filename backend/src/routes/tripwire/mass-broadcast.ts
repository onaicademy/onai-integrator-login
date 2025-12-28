import { Router } from 'express';
import { authenticateTripwireJWT, requireTripwireAdmin } from '../../middleware/tripwire-auth';
import { tripwireAdminSupabase } from '../../config/supabase-tripwire';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { universalBroadcastEmail } from '../../templates/universalBroadcastEmail';
import { sendSMS } from '../../services/mobizon-simple';

const router = Router();
const supabase = tripwireAdminSupabase;

// 🎯 LANDING БД (для телефонов из landing_leads)
const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL || '';
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY || '';
const landingSupabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'onAI Academy <notifications@onai.academy>';

// 🚫 EXCLUDED EMAILS (admin + sales managers)
const EXCLUDED_EMAILS = [
  'test.student.tripwire@test.com',
  'smmmcwin@gmail.com',       // Admin
  'rakhat@onaiacademy.kz',    // Sales Manager 1
  'amina@onaiacademy.kz',     // Sales Manager 2
  'aselya@onaiacademy.kz',    // Sales Manager 3
  'ayaulym@onaiacademy.kz',   // Sales Manager 4
];

/**
 * 🔄 Функция нормализации имени для сопоставления
 */
function normalizeName(name: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^а-яёa-z\s]/gi, '');
}

/**
 * 📱 Получить телефоны из landing_leads с сопоставлением по email и имени
 */
async function getPhoneMapFromLandingLeads(tripwireStudents: Array<{ email: string; full_name: string }>): Promise<Map<string, string>> {
  const phoneMap = new Map<string, string>();

  try {
    // Получить все лиды с телефонами из landing_leads
    const { data: leadsWithPhones, error } = await landingSupabase
      .from('landing_leads')
      .select('email, phone, name')
      .not('phone', 'is', null);

    if (error) {
      console.error('❌ Error fetching landing_leads:', error);
      return phoneMap;
    }

    console.log(`📞 Найдено лидов с телефонами: ${leadsWithPhones?.length || 0}`);

    // 1️⃣ Сопоставление по EMAIL
    tripwireStudents.forEach(student => {
      const lead = leadsWithPhones?.find(l => 
        l.email?.toLowerCase().trim() === student.email?.toLowerCase().trim()
      );
      if (lead && lead.phone) {
        phoneMap.set(student.email, lead.phone);
      }
    });

    console.log(`✅ Сопоставлено по EMAIL: ${phoneMap.size}`);

    // 2️⃣ Сопоставление по ИМЕНИ для оставшихся
    let nameMatches = 0;
    tripwireStudents.forEach(student => {
      // Пропускаем если уже нашли по email
      if (phoneMap.has(student.email)) return;
      
      const studentName = normalizeName(student.full_name);
      if (!studentName) return;
      
      const lead = leadsWithPhones?.find(l => {
        const leadName = normalizeName(l.name);
        if (!leadName) return false;
        
        // Попробуем найти полное совпадение или частичное
        return leadName === studentName || 
               studentName.includes(leadName) || 
               leadName.includes(studentName);
      });
      
      if (lead && lead.phone) {
        phoneMap.set(student.email, lead.phone);
        nameMatches++;
      }
    });

    console.log(`✅ Сопоставлено по ИМЕНИ: ${nameMatches}`);
    console.log(`✅ ВСЕГО с телефонами: ${phoneMap.size}`);

  } catch (error: any) {
    console.error('❌ Error in getPhoneMapFromLandingLeads:', error);
  }

  return phoneMap;
}

/**
 * 🔄 POST /api/tripwire/admin/mass-broadcast/sync
 * Синхронизировать список получателей (обновить статистику)
 */
router.post('/sync', authenticateTripwireJWT, requireTripwireAdmin, async (req, res) => {
  try {
    console.log('🔄 СИНХРОНИЗАЦИЯ списка получателей...');

    // 1️⃣ Получить всех студентов из tripwire_users
    const { data: allStudents, error: allError } = await supabase
      .from('tripwire_users')
      .select('email, full_name');

    if (allError) {
      console.error('❌ Error fetching all students:', allError);
      return res.status(500).json({ error: 'Failed to fetch students' });
    }

    const totalStudents = allStudents?.length || 0;
    
    // Отфильтровать исключённых
    const filteredStudents = allStudents?.filter(s => !EXCLUDED_EMAILS.includes(s.email)) || [];
    const excludedCount = totalStudents - filteredStudents.length;
    
    // 2️⃣ Получить телефоны из landing_leads с сопоставлением
    console.log('📱 Синхронизация телефонов из landing_leads...');
    const phoneMap = await getPhoneMapFromLandingLeads(filteredStudents);

    console.log('✅ Синхронизация завершена');

    res.json({
      success: true,
      totalStudents,
      excludedCount,
      emailRecipients: filteredStudents.length,
      smsRecipients: phoneMap.size,
      message: 'Синхронизация успешно завершена',
    });

  } catch (error: any) {
    console.error('❌ Error in /sync:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 📊 GET /api/tripwire/admin/mass-broadcast/stats
 * Получить статистику получателей
 */
router.get('/stats', authenticateTripwireJWT, requireTripwireAdmin, async (req, res) => {
  try {
    console.log('📊 Загрузка статистики массовых рассылок...');

    // 1️⃣ Получить всех студентов из tripwire_users
    const { data: allStudents, error: allError } = await supabase
      .from('tripwire_users')
      .select('email, full_name');

    if (allError) {
      console.error('❌ Error fetching all students:', allError);
      return res.status(500).json({ error: 'Failed to fetch students' });
    }

    const totalStudents = allStudents?.length || 0;
    
    // Отфильтровать исключённых
    const filteredStudents = allStudents?.filter(s => !EXCLUDED_EMAILS.includes(s.email)) || [];
    const excludedCount = totalStudents - filteredStudents.length;
    
    // 2️⃣ Получить телефоны из landing_leads с сопоставлением
    const phoneMap = await getPhoneMapFromLandingLeads(filteredStudents);

    res.json({
      totalStudents,
      excludedCount,
      emailRecipients: filteredStudents.length,
      smsRecipients: phoneMap.size,
    });

  } catch (error: any) {
    console.error('❌ Error in /stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 📧📱 POST /api/tripwire/admin/mass-broadcast/send
 * Отправить массовую рассылку (EMAIL + SMS)
 */
router.post('/send', authenticateTripwireJWT, requireTripwireAdmin, async (req, res) => {
  try {
    const { email: emailData, sms: smsData } = req.body;

    if (!emailData || !emailData.subject || !emailData.message) {
      return res.status(400).json({ error: 'Email subject and message are required' });
    }

    if (!RESEND_API_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    }

    const resend = new Resend(RESEND_API_KEY);

    // 1️⃣ Получить всех студентов из tripwire_users
    console.log('📊 Получаем список студентов...');
    const { data: allStudents, error: studentsError } = await supabase
      .from('tripwire_users')
      .select('email, full_name')
      .not('email', 'in', `(${EXCLUDED_EMAILS.map(e => `"${e}"`).join(',')})`);

    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError);
      return res.status(500).json({ error: 'Failed to fetch students' });
    }

    if (!allStudents || allStudents.length === 0) {
      return res.status(404).json({ error: 'No students found' });
    }

    console.log(`✅ Найдено студентов: ${allStudents.length}`);

    // 2️⃣ Получить телефоны из landing_leads с сопоставлением
    const phoneMap = await getPhoneMapFromLandingLeads(allStudents);

    let emailSuccess = 0;
    let emailFail = 0;
    let smsSuccess = 0;
    let smsFail = 0;

    // 2️⃣ Отправка EMAIL
    console.log('📧 Начинаем EMAIL рассылку...');
    
    for (const student of allStudents) {
      try {
        const emailHtml = universalBroadcastEmail({
          recipientName: student.full_name || 'Студент',
          recipientEmail: student.email,
          subject: emailData.subject,
          message: emailData.message,
        });

        const { error: sendError } = await resend.emails.send({
          from: FROM_EMAIL,
          to: student.email,
          subject: emailData.subject,
          html: emailHtml,
        });

        if (sendError) {
          console.error(`  ❌ EMAIL ${student.email}:`, sendError.message);
          emailFail++;
        } else {
          console.log(`  ✅ EMAIL ${student.email}`);
          emailSuccess++;
        }

        // Задержка 600ms (чтобы не превысить rate limit Resend: 2 req/sec)
        await new Promise(resolve => setTimeout(resolve, 600));

      } catch (err: any) {
        console.error(`  ❌ EMAIL ${student.email}:`, err.message);
        emailFail++;
      }
    }

    // 3️⃣ Отправка SMS (если указан текст)
    if (smsData && smsData.message) {
      console.log('📱 Начинаем SMS рассылку...');
      
      // Заменить переменную {SHORT_LINK} на реальную ссылку
      const smsText = smsData.message.replace(/{SHORT_LINK}/g, smsData.shortLink || 'onai.academy/integrator');

      for (const student of allStudents) {
        // Получить телефон из phoneMap (ключ = email)
        const phone = phoneMap.get(student.email);
        
        if (!phone) {
          console.log(`  ⚠️  SMS пропущен: нет телефона для ${student.email}`);
          continue;
        }

        try {
          const success = await sendSMS({
            recipient: phone,
            text: smsText,
          });

          if (success) {
            console.log(`  ✅ SMS ${phone}`);
            smsSuccess++;
          } else {
            console.error(`  ❌ SMS ${phone}: Failed to send`);
            smsFail++;
          }

          // Задержка 1000ms между SMS
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (err: any) {
          console.error(`  ❌ SMS ${phone}:`, err.message);
          smsFail++;
        }
      }
    } else {
      console.log('📱 SMS рассылка пропущена (не указан текст)');
    }

    // 4️⃣ Итоги
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 EMAIL успешно: ${emailSuccess}`);
    console.log(`📧 EMAIL ошибок: ${emailFail}`);
    console.log(`📱 SMS успешно: ${smsSuccess}`);
    console.log(`📱 SMS ошибок: ${smsFail}`);
    console.log(`👥 Всего студентов: ${allStudents.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({
      success: true,
      emailSuccess,
      emailFail,
      smsSuccess,
      smsFail,
      totalRecipients: allStudents.length,
    });

  } catch (error: any) {
    console.error('❌ Error in /send:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
