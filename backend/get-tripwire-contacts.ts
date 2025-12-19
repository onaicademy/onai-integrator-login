/**
 * 📱 ЭКСПОРТ КОНТАКТОВ УЧЕНИКОВ ИЗ TRIPWIRE
 */

import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), 'env.env') });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

console.log('📱 ЭКСПОРТ КОНТАКТОВ УЧЕНИКОВ ИЗ TRIPWIRE БД\n');

async function getContacts() {
  try {
    // Получаем всех студентов с телефонами
    const response = await fetch(
      `${TRIPWIRE_URL}/rest/v1/tripwire_students?select=id,email,full_name,phone,created_at,onboarding_completed&order=created_at.desc`,
      {
        headers: {
          'apikey': TRIPWIRE_KEY!,
          'Authorization': `Bearer ${TRIPWIRE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const students = await response.json();

    console.log(`✅ Найдено студентов: ${students.length}\n`);
    console.log('═'.repeat(80));
    console.log('📋 СПИСОК КОНТАКТОВ:\n');

    let csvData = 'ID,ФИО,Email,Телефон,Дата регистрации,Онбординг\n';
    
    students.forEach((student: any, idx: number) => {
      const phone = student.phone || 'Нет телефона';
      const name = student.full_name || student.email || 'Без имени';
      const onboarding = student.onboarding_completed ? 'Да' : 'Нет';
      const date = new Date(student.created_at).toLocaleDateString('ru-RU');

      console.log(`${idx + 1}. ${name}`);
      console.log(`   Email: ${student.email}`);
      console.log(`   Телефон: ${phone}`);
      console.log(`   Дата: ${date}`);
      console.log(`   Онбординг: ${onboarding}`);
      console.log('');

      // CSV строка
      csvData += `${student.id},"${name}","${student.email}","${phone}","${date}","${onboarding}"\n`;
    });

    console.log('═'.repeat(80));
    console.log(`\n📊 СТАТИСТИКА:`);
    console.log(`   Всего студентов: ${students.length}`);
    
    const withPhone = students.filter((s: any) => s.phone).length;
    const withoutPhone = students.length - withPhone;
    const completed = students.filter((s: any) => s.onboarding_completed).length;

    console.log(`   С телефоном: ${withPhone}`);
    console.log(`   Без телефона: ${withoutPhone}`);
    console.log(`   Прошли онбординг: ${completed}`);

    // Сохраняем в CSV
    const fs = require('fs');
    const csvPath = join(process.cwd(), '../tripwire-contacts.csv');
    fs.writeFileSync(csvPath, csvData, 'utf-8');

    console.log(`\n💾 Сохранено в: ${csvPath}`);
    console.log('   Открой файл в Excel или Google Sheets\n');

    // Только телефоны
    const phones = students
      .filter((s: any) => s.phone)
      .map((s: any) => s.phone);

    const phonesPath = join(process.cwd(), '../tripwire-phones.txt');
    fs.writeFileSync(phonesPath, phones.join('\n'), 'utf-8');

    console.log(`📞 Только телефоны: ${phonesPath}`);
    console.log(`   Всего телефонов: ${phones.length}\n`);

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
  }
}

getContacts();
