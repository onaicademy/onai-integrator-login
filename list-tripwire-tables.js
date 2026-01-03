#!/usr/bin/env node

/**
 * Список всех таблиц в Tripwire DB
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

async function listTables() {
  console.log('📋 Получение списка таблиц...');
  console.log('');

  try {
    const { data, error } = await supabase.rpc('pg_catalog.pg_tables', {});

    if (error) {
      console.log('Попробуем другой способ...');

      // Пробуем получить через SQL
      const { data: sqlData, error: sqlError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      if (sqlError) {
        console.error('Ошибка:', sqlError);

        // Попробуем перечислить известные таблицы
        console.log('');
        console.log('Проверяю известные таблицы:');
        const knownTables = [
          'tripwire_users',
          'tripwire_students',
          'tripwire_payments',
          'tripwire_transactions',
          'tripwire_purchases',
          'tripwire_orders',
          'users',
          'students',
          'payments',
          'transactions'
        ];

        for (const table of knownTables) {
          const { data: testData, error: testError } = await supabase
            .from(table)
            .select('*')
            .limit(1);

          if (!testError) {
            console.log(`✅ ${table}`);
          }
        }
      } else {
        console.log('Таблицы:', sqlData);
      }
    }
  } catch (err) {
    console.error('Критическая ошибка:', err);
  }
}

listTables();
