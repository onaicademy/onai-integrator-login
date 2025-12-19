import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), 'backend/env.env') });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

async function getSchema() {
  // Получаем первую запись чтобы увидеть структуру
  const res = await fetch(
    `${TRIPWIRE_URL}/rest/v1/tripwire_users?limit=1`,
    {
      headers: {
        'apikey': TRIPWIRE_KEY!,
        'Authorization': `Bearer ${TRIPWIRE_KEY}`
      }
    }
  );

  const data = await res.json();
  
  if (Array.isArray(data) && data.length > 0) {
    console.log('📋 Колонки в tripwire_users:\n');
    Object.keys(data[0]).forEach((key, idx) => {
      console.log(`   ${idx + 1}. ${key}`);
    });
    console.log('\n📄 Пример записи:\n');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

getSchema();
