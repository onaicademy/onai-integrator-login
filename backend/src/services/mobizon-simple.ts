import axios from 'axios';

const MOBIZON_API_KEY = process.env.MOBIZON_API_KEY || 'kzc180c8b156ce75254b1b9845d410516dc4d968da627abf32ae3052e6f941f71bc368';
const MOBIZON_API_URL = 'https://api.mobizon.kz/service/message/sendSmsMessage';

interface SendSMSParams {
  recipient: string;
  text: string;
}

/**
 * 📱 Отправка SMS через Mobizon (упрощённая версия без зависимостей)
 */
export async function sendSMS(params: SendSMSParams): Promise<boolean> {
  try {
    // Очистка телефона (убираем все кроме цифр)
    const cleanPhone = params.recipient.replace(/\D/g, '');

    console.log('📱 Отправка SMS через Mobizon:', {
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
      console.log('✅ SMS отправлен успешно');
      return true;
    } else {
      console.error('❌ Ошибка Mobizon:', response.data);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Ошибка отправки SMS:', error.message);
    return false;
  }
}
