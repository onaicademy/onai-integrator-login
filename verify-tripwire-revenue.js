#!/usr/bin/env node

/**
 * Проверка реальных данных о доходе в Tripwire
 */

import { createClient } from '@supabase/supabase-js';

const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc5NTMwOCwiZXhwIjoyMDgwMzcxMzA4fQ.QB_iIKt06nqa0owpVtKwKXmDwFInuy9mOyALf3VgWyk';

const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyRevenue() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 ПРОВЕРКА ДОХОДА TRIPWIRE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // 1. Проверяем платежи напрямую
    console.log('1️⃣  Проверка таблицы tripwire_payments:');
    const { data: payments, error: paymentsError } = await supabase
      .from('tripwire_payments')
      .select('*')
      .eq('status', 'completed');

    if (paymentsError) {
      console.error('❌ Ошибка:', paymentsError);
    } else {
      console.log(`   Всего успешных платежей: ${payments.length}`);
      const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      console.log(`   Общая сумма платежей: ${totalAmount}`);
      console.log('');

      // Показываем первые 5 платежей
      console.log('   Первые 5 платежей:');
      payments.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. student_id=${p.student_id}, amount=${p.amount}, created_at=${p.created_at}`);
      });
      console.log('');
    }

    // 2. Проверяем студентов со статусом paid
    console.log('2️⃣  Проверка таблицы tripwire_students (status=paid):');
    const { data: students, error: studentsError } = await supabase
      .from('tripwire_students')
      .select('id, email, payment_status, created_at')
      .eq('payment_status', 'paid');

    if (studentsError) {
      console.error('❌ Ошибка:', studentsError);
    } else {
      console.log(`   Всего оплативших студентов: ${students.length}`);
      console.log(`   Расчетный доход (${students.length} × 5000 = ${students.length * 5000})`);
      console.log('');
    }

    // 3. Проверяем RPC функцию
    console.log('3️⃣  Вызов RPC rpc_get_tripwire_stats:');
    const { data: stats, error: statsError } = await supabase.rpc('rpc_get_tripwire_stats', {
      p_manager_id: null,
      p_start_date: null,
      p_end_date: null
    });

    if (statsError) {
      console.error('❌ Ошибка RPC:', statsError);
    } else {
      console.log('   RPC результат:', JSON.stringify(stats[0], null, 2));
      console.log('');
    }

    // 4. Сравнение
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 СРАВНЕНИЕ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (!paymentsError && !studentsError && !statsError) {
      const paymentsTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const studentsTotal = students.length * 5000;
      const rpcTotal = stats[0].total_revenue;

      console.log(`   Сумма из tripwire_payments: ${paymentsTotal}`);
      console.log(`   Расчет по студентам: ${studentsTotal}`);
      console.log(`   RPC total_revenue: ${rpcTotal}`);
      console.log('');

      if (paymentsTotal === rpcTotal) {
        console.log('✅ RPC возвращает корректную сумму платежей');
      } else {
        console.log('❌ RPC не совпадает с фактической суммой платежей');
        console.log(`   Разница: ${rpcTotal - paymentsTotal}`);
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (err) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', err);
    process.exit(1);
  }
}

verifyRevenue();
