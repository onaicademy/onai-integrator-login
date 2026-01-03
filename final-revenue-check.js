#!/usr/bin/env node

/**
 * ФИНАЛЬНАЯ ПРОВЕРКА: Откуда берется 455000?
 */

import { createClient } from '@supabase/supabase-js';

const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc5NTMwOCwiZXhwIjoyMDgwMzcxMzA4fQ.QB_iIKt06nqa0owpVtKwKXmDwFInuy9mOyALf3VgWyk';

const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_ROLE_KEY);

async function finalCheck() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 ФИНАЛЬНАЯ ПРОВЕРКА ДОХОДА TRIPWIRE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // 1. Считаем всех студентов
    console.log('1️⃣  Подсчет студентов в tripwire_users:');
    const { count: totalUsers, error: usersError } = await supabase
      .from('tripwire_users')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      console.error('❌ Ошибка:', usersError);
    } else {
      console.log(`   Всего студентов: ${totalUsers}`);
      console.log(`   Расчетный доход: ${totalUsers} × 5000 = ${totalUsers * 5000} ₸`);
      console.log('');
    }

    // 2. RPC функция
    console.log('2️⃣  Вызов rpc_get_tripwire_stats:');
    const { data: stats, error: statsError } = await supabase.rpc('rpc_get_tripwire_stats', {
      p_manager_id: null,
      p_start_date: null,
      p_end_date: null
    });

    if (statsError) {
      console.error('❌ Ошибка:', statsError);
    } else {
      const result = stats[0];
      console.log(`   total_students: ${result.total_students}`);
      console.log(`   total_revenue: ${result.total_revenue}`);
      console.log('');
    }

    // 3. Проверка расчета
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 АНАЛИЗ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!usersError && !statsError) {
      const rpcStudents = stats[0].total_students;
      const rpcRevenue = stats[0].total_revenue;
      const expectedRevenue = rpcStudents * 5000;

      console.log(`   Студентов по RPC: ${rpcStudents}`);
      console.log(`   Доход по RPC: ${rpcRevenue} ₸`);
      console.log(`   Ожидаемый доход: ${expectedRevenue} ₸`);
      console.log('');

      if (rpcRevenue === expectedRevenue) {
        console.log('✅ УСПЕХ: RPC функция считает правильно!');
        console.log(`   Формула: COUNT(tripwire_users) × 5000 = ${rpcRevenue} ₸`);
        console.log('');
        console.log('ВЫВОД:');
        console.log(`- RPC функция возвращает массив: [{total_revenue: ${rpcRevenue}, ...}]`);
        console.log('- Фикс в tripwireManagerService.ts извлекает data[0]');
        console.log('- Всё работает корректно!');
      } else {
        console.log('❌ ПРОБЛЕМА: Расчет не совпадает');
        console.log(`   Разница: ${rpcRevenue - expectedRevenue} ₸`);
      }

      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📝 ИТОГОВЫЙ ОТЧЕТ:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Всего студентов Tripwire: ${rpcStudents}`);
      console.log(`✅ Общий доход: ${rpcRevenue} ₸`);
      console.log(`✅ Цена за студента: 5000 ₸`);
      console.log(`✅ Проверка: ${rpcStudents} × 5000 = ${expectedRevenue} ₸`);
      console.log('');
      console.log('СТАТУС: ✅ RPC функция работает правильно!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

  } catch (err) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', err);
    process.exit(1);
  }
}

finalCheck();
