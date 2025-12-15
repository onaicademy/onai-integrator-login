/**
 * 🚨 СРОЧНЫЙ СКРИПТ: Синхронизация потерянных лидов с AmoCRM
 * 
 * Находит все лиды без amocrm_lead_id и синхронизирует их
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config({ path: './env.env' });

const SUPABASE_URL = process.env.LANDING_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY!;
const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN!;
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN!;
const AMOCRM_PIPELINE_ID = process.env.AMOCRM_PIPELINE_ID!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface LandingLead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  source: string;
  created_at: string;
  amocrm_lead_id: string | null;
}

/**
 * Создать контакт в AmoCRM
 */
async function createAmoCRMContact(lead: LandingLead): Promise<number | null> {
  try {
    const customFieldsValues: any[] = [
      {
        field_code: 'PHONE',
        values: [{ value: lead.phone }]
      }
    ];

    // Добавляем email ТОЛЬКО если он есть
    if (lead.email && lead.email.trim()) {
      customFieldsValues.push({
        field_code: 'EMAIL',
        values: [{ value: lead.email }]
      });
    }

    const contactData = {
      name: lead.name,
      custom_fields_values: customFieldsValues
    };

    const response = await axios.post(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/contacts`,
      [contactData],
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.data._embedded?.contacts?.[0]?.id) {
      const contactId = response.data._embedded.contacts[0].id;
      console.log(`✅ AmoCRM contact created: ${contactId}`);
      return contactId;
    }

    return null;
  } catch (error: any) {
    console.error('❌ Error creating AmoCRM contact:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Создать сделку в AmoCRM
 */
async function createAmoCRMLead(lead: LandingLead, contactId: number): Promise<number | null> {
  try {
    // ✅ Создаём лид БЕЗ status_id - AmoCRM сам назначит первый статус
    const leadData: any = {
      name: `Профтест: ${lead.name}`,
      pipeline_id: parseInt(AMOCRM_PIPELINE_ID),
      _embedded: {
        contacts: [{ id: contactId }]
      }
    };

    // ✅ Добавляем цену если это expresscourse
    if (lead.source === 'expresscourse') {
      leadData.price = 5000; // 5000 тенге
    }

    console.log(`   📝 Creating lead with:`, JSON.stringify(leadData, null, 2));

    const response = await axios.post(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads`,
      [leadData],
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.data._embedded?.leads?.[0]?.id) {
      const leadId = response.data._embedded.leads[0].id;
      console.log(`✅ AmoCRM lead created: ${leadId}`);
      return leadId;
    }

    return null;
  } catch (error: any) {
    console.error('❌ Error creating AmoCRM lead:', JSON.stringify(error.response?.data || error.message, null, 2));
    return null;
  }
}

/**
 * Синхронизировать один лид
 */
async function syncLead(lead: LandingLead): Promise<boolean> {
  console.log(`\n🔄 Синхронизирую лид: ${lead.name} (${lead.id})`);
  console.log(`   📧 Email: ${lead.email || 'НЕТ'}`);
  console.log(`   📱 Phone: ${lead.phone}`);
  console.log(`   📍 Source: ${lead.source}`);

  try {
    // 1. Создаём контакт
    const contactId = await createAmoCRMContact(lead);
    if (!contactId) {
      console.log('❌ Не удалось создать контакт');
      return false;
    }

    // Небольшая задержка
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Создаём сделку
    const leadId = await createAmoCRMLead(lead, contactId);
    if (!leadId) {
      console.log('❌ Не удалось создать сделку');
      return false;
    }

    // 3. Обновляем БД
    const { error } = await supabase
      .from('landing_leads')
      .update({
        amocrm_lead_id: leadId.toString(),
        amocrm_synced: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id);

    if (error) {
      console.error('❌ Ошибка обновления БД:', error);
      return false;
    }

    console.log('✅ Лид успешно синхронизирован!');
    return true;

  } catch (error: any) {
    console.error('❌ Ошибка синхронизации:', error.message);
    return false;
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('🚀 ЗАПУСК ВОССТАНОВЛЕНИЯ ЛИДОВ\n');

  // Получаем все несинхронизированные лиды
  const { data: leads, error } = await supabase
    .from('landing_leads')
    .select('*')
    .is('amocrm_lead_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Ошибка получения лидов:', error);
    process.exit(1);
  }

  if (!leads || leads.length === 0) {
    console.log('✅ Все лиды уже синхронизированы!');
    process.exit(0);
  }

  console.log(`📊 Найдено несинхронизированных лидов: ${leads.length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const lead of leads) {
    const success = await syncLead(lead);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Задержка между лидами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 ИТОГОВЫЙ ОТЧЁТ:');
  console.log(`✅ Успешно: ${successCount}`);
  console.log(`❌ Ошибки: ${failCount}`);
  console.log(`📋 Всего: ${leads.length}`);
  console.log('='.repeat(50));
}

// Запуск
main().catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});

