#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './backend/env.env' });

// Landing DB connection parameters
const landingUrl = process.env.LANDING_SUPABASE_URL;
const landingServiceKey = process.env.LANDING_SUPABASE_SERVICE_KEY;

// Extract project ID from URL
const match = landingUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!match) {
  console.error('❌ Could not extract project ID from URL');
  process.exit(1);
}

const projectId = match[1];
const connectionString = `postgresql://postgres.${projectId}:${landingServiceKey}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

async function applyMigration() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📱 ПРИМЕНЕНИЕ МИГРАЦИИ 20251226_fix_analytics_and_ai');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔗 Подключение к Landing Supabase...');
    console.log('   Project:', projectId, '\n');

    await client.connect();
    console.log('✅ Подключено успешно!\n');

    // Read the SQL file
    const sqlPath = './supabase/migrations/20251226_fix_analytics_and_ai.sql';
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 SQL файл загружен:', sqlPath);
    console.log('📏 Размер:', sql.length, 'символов\n');

    // Apply the migration
    console.log('🚀 Применение миграции...\n');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('✅ Миграция применена успешно!\n');

    // Verify the view was created
    console.log('🔍 Проверка view funnel_analytics...\n');
    
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'funnel_analytics'
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ View funnel_analytics существует!');
    console.log('   Колонки view:', result.rows.length, '\n');
    
    result.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n✨ Готово! Миграция успешно применена!\n');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('\n⚠️  Попробуй применить SQL вручную:');
    console.error('   1. Открой: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new');
    console.error('   2. Скопируй SQL из: supabase/migrations/20251226_fix_analytics_and_ai.sql');
    console.error('   3. Выполни в SQL Editor\n');
  } finally {
    await client.end();
    console.log('═══════════════════════════════════════════════════════════════\n');
  }
}

applyMigration();