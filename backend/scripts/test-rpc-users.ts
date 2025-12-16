/**
 * 🧪 Тест RPC функции rpc_get_tripwire_users
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../env.env') });

const supabaseUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const supabaseKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
  console.log('🧪 Тестируем RPC: rpc_get_tripwire_users\n');

  try {
    console.log('Вызываем RPC...');
    const { data, error } = await supabase.rpc('rpc_get_tripwire_users', {
      p_end_date: null,
      p_limit: 20,
      p_manager_id: null,
      p_page: 1,
      p_start_date: null,
      p_status: null
    });

    if (error) {
      console.error('\n❌ RPC ОШИБКА:');
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      return;
    }

    console.log('\n✅ RPC УСПЕХ!');
    console.log('   Найдено:', data?.length || 0, 'пользователей');
    
    if (data && data.length > 0) {
      console.log('\n📊 Данные:');
      data.forEach((user: any, idx: number) => {
        console.log(`   ${idx + 1}. ${user.email} (ID: ${user.id})`);
      });
    }

  } catch (error: any) {
    console.error('\n❌ ОШИБКА:', error.message);
  }
}

testRPC().then(() => process.exit(0));
