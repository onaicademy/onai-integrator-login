require('dotenv').config();
const axios = require('axios');

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz.amocrm.ru';
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const AMOCRM_PIPELINE_ID = process.env.AMOCRM_PIPELINE_ID || '10350882';

console.log('🔍 Тестируем AmoCRM API...');
console.log('Domain:', AMOCRM_DOMAIN);
console.log('Pipeline ID:', AMOCRM_PIPELINE_ID);
console.log('Token:', AMOCRM_ACCESS_TOKEN ? `${AMOCRM_ACCESS_TOKEN.substring(0, 30)}...` : 'NOT SET');
console.log('');

async function testAmoCRM() {
  try {
    // 1. Проверяем токен и получаем информацию об аккаунте
    console.log('📊 Шаг 1: Проверяем доступ к аккаунту...');
    const accountResponse = await axios.get(
      `https://${AMOCRM_DOMAIN}/api/v4/account`,
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Доступ к аккаунту OK!');
    console.log('   Аккаунт:', accountResponse.data.name);
    console.log('   ID:', accountResponse.data.id);
    console.log('');

    // 2. Получаем информацию о воронке и находим статус "Не разобранное"
    console.log('📊 Шаг 2: Получаем информацию о воронке...');
    const pipelineResponse = await axios.get(
      `https://${AMOCRM_DOMAIN}/api/v4/leads/pipelines/${AMOCRM_PIPELINE_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Воронка найдена:', pipelineResponse.data.name);
    console.log('   Статусы:');
    const statuses = pipelineResponse.data._embedded?.statuses || [];
    statuses.forEach(s => {
      console.log(`   - ${s.name} (ID: ${s.id})`);
    });
    
    // Находим статус "Не разобранное"
    const unsortedStatus = statuses.find(s => 
      s.name?.toLowerCase().includes('не разобран') || 
      s.name?.toLowerCase().includes('неразобран')
    );
    
    let statusId = unsortedStatus?.id || statuses[0]?.id;
    console.log(`   🎯 Используем статус: ${unsortedStatus?.name || statuses[0]?.name} (ID: ${statusId})`);
    console.log('');

    // 3. Создаем тестовый контакт
    console.log('📊 Шаг 3: Создаем тестовый контакт...');
    const contactData = {
      name: 'TEST - Диас Серекбай (CURSOR)',
      custom_fields_values: [
        {
          field_code: 'EMAIL',
          values: [{ value: 'test-cursor@onai.kz' }]
        },
        {
          field_code: 'PHONE',
          values: [{ value: '+77001234567' }]
        }
      ]
    };

    const contactResponse = await axios.post(
      `https://${AMOCRM_DOMAIN}/api/v4/contacts`,
      [contactData],
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const contactId = contactResponse.data._embedded?.contacts?.[0]?.id;
    console.log('✅ Контакт создан! ID:', contactId);
    console.log('');

    // 4. Создаем тестовую сделку
    console.log('📊 Шаг 4: Создаем тестовую сделку...');
    const leadData = {
      name: 'TEST - Заявка с лендинга /twland (CURSOR)',
      pipeline_id: parseInt(AMOCRM_PIPELINE_ID),
      status_id: statusId,
      _embedded: {
        contacts: [{ id: contactId }]
      }
    };

    const leadResponse = await axios.post(
      `https://${AMOCRM_DOMAIN}/api/v4/leads`,
      [leadData],
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const leadId = leadResponse.data._embedded?.leads?.[0]?.id;
    console.log('✅ Сделка создана! ID:', leadId);
    console.log('');

    console.log('🎉 ВСЁ РАБОТАЕТ!');
    console.log('');
    console.log('📋 Резюме:');
    console.log(`   Контакт ID: ${contactId}`);
    console.log(`   Сделка ID: ${leadId}`);
    console.log(`   Ссылка: https://${AMOCRM_DOMAIN}/leads/detail/${leadId}`);
    console.log('');
    console.log('✅ Проверь сделку в AmoCRM в разделе "Не разобранное"!');

  } catch (error) {
    console.error('');
    console.error('❌ ОШИБКА:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

testAmoCRM();
