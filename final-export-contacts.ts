import * as dotenv from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';

dotenv.config({ path: join(process.cwd(), 'backend/env.env') });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;
const AMOCRM_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;

console.log('📱 ЭКСПОРТ КОНТАКТОВ УЧЕНИКОВ TRIPWIRE\n');

async function exportContacts() {
  // 1. Получаем всех пользователей
  const res = await fetch(
    `${TRIPWIRE_URL}/rest/v1/tripwire_users?select=id,email,full_name,amocrm_contact_id,created_at,status&order=created_at.desc`,
    {
      headers: {
        'apikey': TRIPWIRE_KEY!,
        'Authorization': `Bearer ${TRIPWIRE_KEY}`
      }
    }
  );

  const users = await res.json();

  if (!Array.isArray(users)) {
    console.error('❌ Ошибка получения данных');
    return;
  }

  console.log(`✅ Найдено учеников: ${users.length}\n`);
  console.log('═'.repeat(80));

  let csvData = 'ID,ФИО,Email,Телефон,AmoCRM ID,Дата регистрации,Статус\n';
  const emails: string[] = [];
  const phones: string[] = [];

  // 2. Для каждого пользователя получаем телефон из AmoCRM
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const name = user.full_name || 'Без имени';
    const date = new Date(user.created_at).toLocaleDateString('ru-RU');
    let phone = 'Нет';

    console.log(`${i + 1}. ${name}`);
    console.log(`   Email: ${user.email || 'Нет'}`);

    // Если есть AmoCRM contact ID - пробуем получить телефон
    if (user.amocrm_contact_id && AMOCRM_TOKEN) {
      try {
        const amoCrmRes = await fetch(
          `https://onaiagencykz.amocrm.ru/api/v4/contacts/${user.amocrm_contact_id}`,
          {
            headers: {
              'Authorization': `Bearer ${AMOCRM_TOKEN}`
            }
          }
        );

        if (amoCrmRes.ok) {
          const contact = await amoCrmRes.json();
          const phoneField = contact.custom_fields_values?.find((f: any) => f.field_code === 'PHONE');
          if (phoneField && phoneField.values && phoneField.values.length > 0) {
            phone = phoneField.values[0].value;
            phones.push(phone);
          }
        }
      } catch (e) {
        // Игнорируем ошибки AmoCRM
      }
    }

    console.log(`   Телефон: ${phone}`);
    console.log(`   Дата: ${date}`);
    console.log('');

    csvData += `${user.id},"${name}","${user.email || ''}","${phone}","${user.amocrm_contact_id || ''}","${date}","${user.status}"\n`;
    
    if (user.email) {
      emails.push(user.email);
    }
  }

  console.log('═'.repeat(80));
  console.log(`\n📊 СТАТИСТИКА:`);
  console.log(`   Всего учеников: ${users.length}`);
  console.log(`   С email: ${emails.length}`);
  console.log(`   С телефоном (из AmoCRM): ${phones.length}`);
  console.log(`   Без телефона: ${users.length - phones.length}`);

  // Сохраняем CSV
  const csvPath = join(process.cwd(), 'tripwire-contacts.csv');
  fs.writeFileSync(csvPath, csvData, 'utf-8');
  console.log(`\n💾 CSV: ${csvPath}`);

  // Сохраняем emails
  const emailsPath = join(process.cwd(), 'tripwire-emails.txt');
  fs.writeFileSync(emailsPath, emails.join('\n'), 'utf-8');
  console.log(`📧 Emails: ${emailsPath} (${emails.length} шт)`);

  // Сохраняем телефоны
  if (phones.length > 0) {
    const phonesPath = join(process.cwd(), 'tripwire-phones.txt');
    fs.writeFileSync(phonesPath, phones.join('\n'), 'utf-8');
    console.log(`📞 Телефоны: ${phonesPath} (${phones.length} шт)`);
  }

  console.log('\n✅ ГОТОВО!\n');
}

exportContacts();
