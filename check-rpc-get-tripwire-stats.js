#!/usr/bin/env node

/**
 * Проверка RPC функции rpc_get_tripwire_stats
 * Цель: убедиться что total_revenue возвращается правильно (205000)
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

async function checkRPCFunction() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 ПРОВЕРКА RPC: rpc_get_tripwire_stats');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 URL:', TRIPWIRE_SUPABASE_URL);
  console.log('🔑 Service Role Key:', TRIPWIRE_SERVICE_ROLE_KEY.substring(0, 20) + '...');
  console.log('');

  try {
    console.log('📡 Вызов: SELECT * FROM rpc_get_tripwire_stats(NULL, NULL, NULL)');
    console.log('');

    const { data, error } = await supabase.rpc('rpc_get_tripwire_stats', {
      p_manager_id: null,
      p_start_date: null,
      p_end_date: null
    });

    if (error) {
      console.error('❌ ОШИБКА RPC:', error);
      process.exit(1);
    }

    console.log('✅ RPC вызов успешен');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 ПОЛНЫЙ РЕЗУЛЬТАТ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    // Проверяем структуру данных
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 АНАЛИЗ СТРУКТУРЫ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Тип данных:', typeof data);
    console.log('Является массивом?', Array.isArray(data));
    console.log('Длина массива:', Array.isArray(data) ? data.length : 'N/A');
    console.log('');

    if (Array.isArray(data) && data.length > 0) {
      const firstElement = data[0];
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 ПЕРВЫЙ ЭЛЕМЕНТ МАССИВА (data[0]):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(JSON.stringify(firstElement, null, 2));
      console.log('');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💰 ПРОВЕРКА total_revenue:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('total_revenue =', firstElement.total_revenue);
      console.log('');

      if (firstElement.total_revenue === 0) {
        console.log('❌ ПРОБЛЕМА: total_revenue = 0');
        console.log('   Ожидалось: 205000');
        console.log('   Возможная причина: проблема в RPC функции или данных');
      } else if (firstElement.total_revenue >= 200000 && firstElement.total_revenue <= 210000) {
        console.log('✅ УСПЕХ: total_revenue корректен');
        console.log(`   Значение ${firstElement.total_revenue} в ожидаемом диапазоне (200000-210000)`);
      } else {
        console.log('⚠️  WARNING: total_revenue не в ожидаемом диапазоне');
        console.log(`   Значение: ${firstElement.total_revenue}`);
        console.log('   Ожидалось: ~205000');
      }
      console.log('');

      // Показываем другие ключи
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 ВСЕ ПОЛЯ В РЕЗУЛЬТАТЕ:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      Object.keys(firstElement).forEach(key => {
        console.log(`   ${key}: ${firstElement[key]}`);
      });
      console.log('');
    } else {
      console.log('❌ ПРОБЛЕМА: Массив пустой или data не является массивом');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ПРОВЕРКА ЗАВЕРШЕНА');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (err) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', err);
    process.exit(1);
  }
}

checkRPCFunction();
