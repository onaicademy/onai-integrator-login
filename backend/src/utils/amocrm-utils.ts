/**
 * ════════════════════════════════════════════════════════════════
 * 🔍 AmoCRM Utilities - Поиск сделок и UTM атрибуция
 * ════════════════════════════════════════════════════════════════
 */

import axios from 'axios';

const AMOCRM_DOMAIN = 'onaiagencykz.amocrm.ru';
const UTM_FIELD_IDS = {
  utm_source: 434731,
  utm_campaign: 434729,
  utm_medium: 434727,
  utm_content: 434725,
  utm_term: 434733
};

interface UTMData {
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_content?: string;
  utm_term?: string;
}

interface AmoCRMDeal {
  id: number;
  name: string;
  price: number;
  pipeline_id: number;
  status_id: number;
  created_at: number;
  updated_at: number;
  closed_at?: number;
  custom_fields_values?: Array<{
    field_id: number;
    field_name: string;
    field_code?: string;
    values: Array<{ value: string }>;
  }>;
  _embedded?: {
    contacts?: Array<{
      id: number;
      custom_fields_values?: any[];
    }>;
  };
}

/**
 * Извлекает UTM данные из AmoCRM deal
 */
export function extractUTMFromDeal(deal: AmoCRMDeal): UTMData {
  const utmData: UTMData = {};

  if (!deal.custom_fields_values) return utmData;

  for (const field of deal.custom_fields_values) {
    const fieldId = field.field_id;

    if (fieldId === UTM_FIELD_IDS.utm_source && field.values?.[0]?.value) {
      utmData.utm_source = field.values[0].value;
    } else if (fieldId === UTM_FIELD_IDS.utm_campaign && field.values?.[0]?.value) {
      utmData.utm_campaign = field.values[0].value;
    } else if (fieldId === UTM_FIELD_IDS.utm_medium && field.values?.[0]?.value) {
      utmData.utm_medium = field.values[0].value;
    } else if (fieldId === UTM_FIELD_IDS.utm_content && field.values?.[0]?.value) {
      utmData.utm_content = field.values[0].value;
    } else if (fieldId === UTM_FIELD_IDS.utm_term && field.values?.[0]?.value) {
      utmData.utm_term = field.values[0].value;
    }
  }

  return utmData;
}

/**
 * Проверяет, есть ли полные UTM данные
 */
export function hasCompleteUTM(utm: UTMData): boolean {
  return !!(utm.utm_source && utm.utm_source !== 'unknown');
}

/**
 * Извлекает телефон из AmoCRM контакта
 */
function extractPhoneFromContact(contact: any): string | null {
  if (!contact.custom_fields_values) return null;

  for (const field of contact.custom_fields_values) {
    if (field.field_code === 'PHONE' && field.values?.[0]?.value) {
      // Нормализуем телефон: убираем все кроме цифр
      const phone = field.values[0].value.replace(/\D/g, '');
      return phone;
    }
  }

  return null;
}

/**
 * Извлекает телефон из deal (через embedded contacts)
 */
export function extractPhoneFromDeal(deal: AmoCRMDeal): string | null {
  if (!deal._embedded?.contacts || deal._embedded.contacts.length === 0) {
    return null;
  }

  // Берем первый контакт
  const contact = deal._embedded.contacts[0];
  return extractPhoneFromContact(contact);
}

/**
 * Поиск сделок по телефону в AmoCRM
 */
export async function findDealsByPhone(
  phone: string,
  accessToken: string
): Promise<AmoCRMDeal[]> {
  try {
    // Нормализуем телефон
    const normalizedPhone = phone.replace(/\D/g, '');

    console.log(`[AmoCRM Utils] 🔍 Searching deals by phone: ${normalizedPhone}`);

    // Шаг 1: Ищем контакты по телефону
    const contactsResponse = await axios.get(
      `https://${AMOCRM_DOMAIN}/api/v4/contacts`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          query: normalizedPhone,
          with: 'leads' // Получаем связанные сделки
        }
      }
    );

    if (!contactsResponse.data._embedded?.contacts) {
      console.log('[AmoCRM Utils] ❌ No contacts found');
      return [];
    }

    const contacts = contactsResponse.data._embedded.contacts;
    console.log(`[AmoCRM Utils] ✅ Found ${contacts.length} contacts`);

    // Шаг 2: Собираем все ID сделок из контактов
    const dealIds: number[] = [];
    for (const contact of contacts) {
      if (contact._embedded?.leads) {
        dealIds.push(...contact._embedded.leads.map((l: any) => l.id));
      }
    }

    if (dealIds.length === 0) {
      console.log('[AmoCRM Utils] ❌ No deals found for contacts');
      return [];
    }

    console.log(`[AmoCRM Utils] 📋 Found ${dealIds.length} deals, fetching details...`);

    // Шаг 3: Получаем детали сделок (с UTM метками)
    const dealsResponse = await axios.get(
      `https://${AMOCRM_DOMAIN}/api/v4/leads`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          'filter[id]': dealIds.join(','),
          with: 'contacts'
        }
      }
    );

    const deals = dealsResponse.data._embedded?.leads || [];
    console.log(`[AmoCRM Utils] ✅ Fetched ${deals.length} deals with UTM data`);

    return deals;

  } catch (error: any) {
    console.error('[AmoCRM Utils] ❌ Error searching deals:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Находит оригинальные UTM метки с приоритетом
 *
 * Приоритет:
 * 1. UTM из текущей сделки (если полные)
 * 2. UTM из связанных сделок по телефону (самая ранняя)
 * 3. Fallback: unknown
 */
export async function getOriginalUTM(
  currentDeal: AmoCRMDeal,
  accessToken: string
): Promise<{
  original: UTMData;
  source: 'current_deal' | 'related_deal' | 'fallback';
  relatedDealId?: number;
  phone?: string;
}> {
  // STEP 1: Проверяем UTM в текущей сделке
  const currentUTM = extractUTMFromDeal(currentDeal);

  if (hasCompleteUTM(currentUTM)) {
    console.log(`[UTM Attribution] ✅ Using UTM from current deal ${currentDeal.id}`);
    return {
      original: currentUTM,
      source: 'current_deal'
    };
  }

  // STEP 2: Извлекаем телефон из сделки
  const phone = extractPhoneFromDeal(currentDeal);

  if (!phone) {
    console.log('[UTM Attribution] ⚠️ No phone found, using fallback');
    return {
      original: { utm_source: 'unknown' },
      source: 'fallback'
    };
  }

  // STEP 3: Ищем связанные сделки по телефону
  const relatedDeals = await findDealsByPhone(phone, accessToken);

  if (relatedDeals.length === 0) {
    console.log('[UTM Attribution] ⚠️ No related deals found, using fallback');
    return {
      original: { utm_source: 'unknown' },
      source: 'fallback',
      phone
    };
  }

  // STEP 4: Сортируем по дате создания (самая ранняя = первое касание)
  const sortedDeals = relatedDeals.sort((a, b) => a.created_at - b.created_at);

  // STEP 5: Ищем первую сделку с полными UTM
  for (const deal of sortedDeals) {
    // Пропускаем текущую сделку
    if (deal.id === currentDeal.id) continue;

    const utm = extractUTMFromDeal(deal);

    if (hasCompleteUTM(utm)) {
      const dealDate = new Date(deal.created_at * 1000).toISOString();
      console.log(`[UTM Attribution] ✅ Using UTM from related deal ${deal.id} (created: ${dealDate})`);
      return {
        original: utm,
        source: 'related_deal',
        relatedDealId: deal.id,
        phone
      };
    }
  }

  // STEP 6: Fallback
  console.log('[UTM Attribution] ⚠️ No UTM found in related deals, using fallback');
  return {
    original: { utm_source: 'unknown', utm_campaign: phone },
    source: 'fallback',
    phone
  };
}

export default {
  extractUTMFromDeal,
  extractPhoneFromDeal,
  hasCompleteUTM,
  findDealsByPhone,
  getOriginalUTM
};
