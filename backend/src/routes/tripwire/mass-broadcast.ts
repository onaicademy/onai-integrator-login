import { Router } from 'express';
import { authenticateJWT, requireAdmin } from '../../middleware/auth';
import { tripwireAdminSupabase } from '../../config/supabase-tripwire';
import { Resend } from 'resend';
import { universalBroadcastEmail } from '../../templates/universalBroadcastEmail';
import { sendSMS } from '../../services/mobizon-simple';

const router = Router();
const supabase = tripwireAdminSupabase;

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
 * 📊 GET /api/tripwire/admin/mass-broadcast/stats
 * Получить статистику получателей
 */
router.get('/stats', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // Получить всех студентов
    const { data: allStudents, error: allError } = await supabase
      .from('tripwire_users')
      .select('email, phone, full_name');

    if (allError) {
      console.error('❌ Error fetching all students:', allError);
      return res.status(500).json({ error: 'Failed to fetch students' });
    }

    const totalStudents = allStudents?.length || 0;
    
    // Отфильтровать исключённых
    const filteredStudents = allStudents?.filter(s => !EXCLUDED_EMAILS.includes(s.email)) || [];
    const excludedCount = totalStudents - filteredStudents.length;
    
    // Подсчитать получателей SMS (у кого есть телефон)
    const smsRecipients = filteredStudents.filter(s => s.phone && s.phone.trim()).length;

    res.json({
      totalStudents,
      excludedCount,
      emailRecipients: filteredStudents.length,
      smsRecipients,
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
router.post('/send', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { email: emailData, sms: smsData } = req.body;

    if (!emailData || !emailData.subject || !emailData.message) {
      return res.status(400).json({ error: 'Email subject and message are required' });
    }

    if (!RESEND_API_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    }

    const resend = new Resend(RESEND_API_KEY);

    // 1️⃣ Получить всех студентов
    console.log('📊 Получаем список студентов...');
    const { data: allStudents, error: studentsError } = await supabase
      .from('tripwire_users')
      .select('email, phone, full_name')
      .not('email', 'in', `(${EXCLUDED_EMAILS.map(e => `"${e}"`).join(',')})`);

    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError);
      return res.status(500).json({ error: 'Failed to fetch students' });
    }

    if (!allStudents || allStudents.length === 0) {
      return res.status(404).json({ error: 'No students found' });
    }

    console.log(`✅ Найдено студентов: ${allStudents.length}`);

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
        if (!student.phone || !student.phone.trim()) {
          console.log(`  ⚠️  SMS пропущен: нет телефона для ${student.email}`);
          continue;
        }

        try {
          const success = await sendSMS({
            recipient: student.phone,
            text: smsText,
          });

          if (success) {
            console.log(`  ✅ SMS ${student.phone}`);
            smsSuccess++;
          } else {
            console.error(`  ❌ SMS ${student.phone}: Failed to send`);
            smsFail++;
          }

          // Задержка 1000ms между SMS
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (err: any) {
          console.error(`  ❌ SMS ${student.phone}:`, err.message);
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
