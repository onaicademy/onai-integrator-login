/**
 * 📱 WHAPI SERVICE
 * Сервис для массовых рассылок через WhatsApp API (Whapi.cloud)
 */

const WHAPI_API_URL = process.env.WHAPI_API_URL || 'https://gate.whapi.cloud';
const WHAPI_TOKEN = process.env.WHAPI_TOKEN || '';

interface SendMessageParams {
  phone: string;
  message: string;
}

interface WhapiResponse {
  sent: boolean;
  id?: string;
  error?: string;
}

/**
 * Нормализация номера телефона для WhatsApp
 * Удаляет все символы кроме цифр, добавляет + в начале
 */
function normalizePhone(phone: string): string {
  // Удаляем все кроме цифр
  let cleaned = phone.replace(/\D/g, '');
  
  // Если начинается с 8 (Россия/Казахстан), заменяем на 7
  if (cleaned.startsWith('8')) {
    cleaned = '7' + cleaned.substring(1);
  }
  
  // Добавляем +
  return '+' + cleaned;
}

/**
 * Проверка валидности номера телефона
 */
function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  // Минимум 10 цифр, максимум 15 (международный стандарт)
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Отправка текстового сообщения через WhatsApp
 */
export async function sendWhatsAppMessage({
  phone,
  message,
}: SendMessageParams): Promise<WhapiResponse> {
  try {
    // Валидация
    if (!WHAPI_TOKEN) {
      console.error('❌ WHAPI_TOKEN не настроен в env.env');
      return { sent: false, error: 'WHAPI_TOKEN not configured' };
    }

    if (!isValidPhone(phone)) {
      console.error(`❌ Невалидный номер телефона: ${phone}`);
      return { sent: false, error: 'Invalid phone number' };
    }

    const normalizedPhone = normalizePhone(phone);
    
    console.log(`📱 Отправка WhatsApp сообщения на ${normalizedPhone}...`);

    // Отправка запроса к Whapi
    const response = await fetch(`${WHAPI_API_URL}/messages/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHAPI_TOKEN}`,
      },
      body: JSON.stringify({
        to: normalizedPhone,
        body: message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Ошибка Whapi API (${response.status}):`, data);
      return { 
        sent: false, 
        error: data.message || `HTTP ${response.status}` 
      };
    }

    console.log(`✅ WhatsApp сообщение отправлено: ${normalizedPhone}`);
    
    return {
      sent: true,
      id: data.id || data.message_id,
    };

  } catch (error: any) {
    console.error('❌ Ошибка при отправке WhatsApp:', error.message);
    return {
      sent: false,
      error: error.message,
    };
  }
}

/**
 * Массовая рассылка через WhatsApp с задержками
 */
export async function sendBulkWhatsApp(
  recipients: Array<{ phone: string; name?: string }>,
  message: string
): Promise<{
  success: number;
  failed: number;
  results: Array<{ phone: string; sent: boolean; error?: string }>;
}> {
  const results: Array<{ phone: string; sent: boolean; error?: string }> = [];
  let success = 0;
  let failed = 0;

  console.log(`\n📱 ====== МАССОВАЯ РАССЫЛКА WHATSAPP ======`);
  console.log(`📊 Всего получателей: ${recipients.length}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  for (const [index, recipient] of recipients.entries()) {
    try {
      // Пропускаем невалидные номера
      if (!isValidPhone(recipient.phone)) {
        console.log(`⚠️  [${index + 1}/${recipients.length}] Пропущен невалидный номер: ${recipient.phone}`);
        results.push({
          phone: recipient.phone,
          sent: false,
          error: 'Invalid phone number',
        });
        failed++;
        continue;
      }

      // Отправка сообщения
      const result = await sendWhatsAppMessage({
        phone: recipient.phone,
        message,
      });

      results.push({
        phone: recipient.phone,
        sent: result.sent,
        error: result.error,
      });

      if (result.sent) {
        console.log(`✅ [${index + 1}/${recipients.length}] ${recipient.name || recipient.phone}`);
        success++;
      } else {
        console.log(`❌ [${index + 1}/${recipients.length}] ${recipient.name || recipient.phone}: ${result.error}`);
        failed++;
      }

      // Задержка между сообщениями (1.5 секунды)
      // Чтобы не превысить rate limit WhatsApp
      if (index < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

    } catch (error: any) {
      console.error(`❌ [${index + 1}/${recipients.length}] ${recipient.phone}:`, error.message);
      results.push({
        phone: recipient.phone,
        sent: false,
        error: error.message,
      });
      failed++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 ИТОГО WHATSAPP:`);
  console.log(`   ✅ Успешно: ${success}`);
  console.log(`   ❌ Ошибок: ${failed}`);
  console.log(`   📱 Всего: ${recipients.length}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  return { success, failed, results };
}

/**
 * Проверка доступности Whapi API
 */
export async function checkWhapiStatus(): Promise<boolean> {
  try {
    if (!WHAPI_TOKEN) {
      console.error('❌ WHAPI_TOKEN не настроен');
      return false;
    }

    const response = await fetch(`${WHAPI_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WHAPI_TOKEN}`,
      },
    });

    if (response.ok) {
      console.log('✅ Whapi API доступен');
      return true;
    } else {
      console.error(`❌ Whapi API недоступен: HTTP ${response.status}`);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Ошибка проверки Whapi API:', error.message);
    return false;
  }
}

export default {
  sendWhatsAppMessage,
  sendBulkWhatsApp,
  checkWhapiStatus,
};

