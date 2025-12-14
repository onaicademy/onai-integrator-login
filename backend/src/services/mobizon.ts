import axios from 'axios';
import { createShortLink } from './urlShortener.js';

const MOBIZON_API_KEY = process.env.MOBIZON_API_KEY || 'kzc180c8b156ce75254b1b9845d410516dc4d968da627abf32ae3052e6f941f71bc368';
const MOBIZON_API_URL = 'https://api.mobizon.kz/service/message/sendSmsMessage';

interface SendSMSParams {
  recipient: string;
  text: string;
}

export async function sendSMS(params: SendSMSParams): Promise<boolean> {
  try {
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = params.recipient.replace(/\D/g, '');

    console.log('📱 Sending SMS via Mobizon:', {
      recipient: cleanPhone.substring(0, 3) + '***',
      textLength: params.text.length,
    });

    const response = await axios.post(
      MOBIZON_API_URL,
      new URLSearchParams({
        recipient: cleanPhone,
        text: params.text,
      }).toString(),
      {
        params: {
          output: 'json',
          api: 'v1',
          apiKey: MOBIZON_API_KEY,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data?.code === 0) {
      console.log('✅ SMS sent successfully via Mobizon');
      return true;
    } else {
      console.error('❌ Mobizon SMS error:', response.data);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error sending SMS via Mobizon:', error.message);
    return false;
  }
}

export async function sendProftestResultSMS(phone: string, leadId?: string): Promise<boolean> {
  try {
    // 🔗 Создаем КОРОТКУЮ ссылку для экономии на SMS
    let finalUrl = 'https://onai.academy/integrator/expresscourse';

    if (leadId) {
      // Полная ссылка с UTM параметрами и отслеживанием
      const originalUrl = `https://onai.academy/integrator/expresscourse?utm_source=sms&utm_campaign=proftest&lead_id=${leadId}`;
      
      console.log(`🔗 Creating short link for lead ${leadId}...`);
      
      // Создаем короткую ссылку
      const shortCode = await createShortLink({
        originalUrl,
        leadId,
        campaign: 'proftest',
        source: 'sms',
        expiresInDays: 90 // Ссылка действует 90 дней
      });

      if (shortCode) {
        finalUrl = `https://onai.academy/l/${shortCode}`;
        console.log(`✅ Short link created: ${finalUrl}`);
        console.log(`📊 Saved ${originalUrl.length - finalUrl.length} characters (${Math.round((1 - finalUrl.length / originalUrl.length) * 100)}% reduction)`);
      } else {
        console.warn('⚠️ Failed to create short link, using fallback URL');
        finalUrl = `https://api.onai.academy/api/landing/track/${leadId}?source=sms`;
      }
    }

    const text = `Тест пройден. Ваша ссылка ${finalUrl}`;
    
    console.log(`📱 SMS text length: ${text.length} chars (max 160 for 1 SMS)`);
    
    return await sendSMS({ recipient: phone, text });
  } catch (error: any) {
    console.error('❌ Error in sendProftestResultSMS:', error.message);
    
    // Фоллбэк: отправляем SMS со старой ссылкой если что-то пошло не так
    const fallbackUrl = leadId 
      ? `https://api.onai.academy/api/landing/track/${leadId}?source=sms`
      : 'https://onai.academy/integrator/expresscourse';
    
    const text = `Тест пройден. Ваша ссылка ${fallbackUrl}`;
    return await sendSMS({ recipient: phone, text });
  }
}
