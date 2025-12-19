import * as dotenv from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';

dotenv.config({ path: join(process.cwd(), 'backend/env.env') });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

console.log('📱 ЭКСПОРТ КОНТАКТОВ ИЗ TRIPWIRE БД\n');

async function exportContacts() {
  try {
    const res = await fetch(
      `${TRIPWIRE_URL}/rest/v1/tripwire_users?select=id,email,phone,full_name,created_at&order=created_at.desc`,
      {
        headers: {
          'apikey': TRIPWIRE_KEY!,
          'Authorization': `Bearer ${TRIPWIRE_KEY}`
        }
      }
    );

    const users = await res.json();

    console.log(`✅ Найдено учеников: ${users.length}\n`);
    console.log('═'.repeat(80));
    console.log('📋 СПИСОК КОНТАКТОВ:\n');

    let csvData = 'ID,ФИО,Email,Телефон,Дата регистрации\n';
    const phones: string[] = [];
    
    users.forEach((user: any, idx: number) => {
      const phone = user.phone || 'Нет';
      const name = user.full_name || user.email || 'Без имени';
      const date = new Date(user.created_at).toLocaleDateString('ru-RU');

      console.log(`${idx + 1}. ${name}`);
      console.log(`   Email: ${user.email || 'Нет'}`);
      console.log(`   Телефон: ${phone}`);
      console.log(`   Дата: ${date}`);
      console.log('');

      csvData += `${user.id},"${name}","${user.email || ''}","${phone}","${date}"\n`;
      
      if (user.phone) {
        phones.push(user.phone);
      }
    });

    console.log('═'.repeat(80));
    console.log(`\n📊 СТАТИСТИКА:`);
    console.log(`   Всего учеников: ${users.length}`);
    console.log(`   С телефоном: ${phones.length}`);
    console.log(`   Без телефона: ${users.length - phones.length}`);

    // Сохраняем CSV
    const csvPath = join(process.cwd(), 'tripwire-contacts.csv');
    fs.writeFileSync(csvPath, csvData, 'utf-8');
    console.log(`\n💾 CSV: ${csvPath}`);

    // Сохраняем только телефоны
    const phonesPath = join(process.cwd(), 'tripwire-phones.txt');
    fs.writeFileSync(phonesPath, phones.join('\n'), 'utf-8');
    console.log(`📞 Телефоны: ${phonesPath}`);
    console.log(`   Всего номеров: ${phones.length}\n`);

    // Показываем первые 5 телефонов
    console.log('📱 Первые 5 номеров:');
    phones.slice(0, 5).forEach((p, i) => console.log(`   ${i+1}. ${p}`));
    console.log('');

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
  }
}

exportContacts();
