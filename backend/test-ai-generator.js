#!/usr/bin/env node

/**
 * 🧪 ТЕСТОВЫЙ СКРИПТ ДЛЯ AI LESSON GENERATOR
 * 
 * Тестирует генерацию описания и советов для урока 29
 */

const https = require('https');

// Получаем Supabase auth token
async function getAuthToken() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: 'saint@onaiacademy.kz',
      password: 'Onai2134'
    });

    const options = {
      hostname: 'arqhkacellqbhjhbebfh.supabase.co',
      port: 443,
      path: '/auth/v1/token?grant_type=password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFycWhrYWNlbGxxYmhqaGJlYmZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4OTY3OTUsImV4cCI6MjA0NjQ3Mjc5NX0.iSRDCWmkqHBPQXnx59OIdFyP__LL8Hy9B35Cx3bA'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.access_token);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Тестируем AI генерацию
async function testAIGeneration(token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      videoId: '48e82664-1fe9-4a71-9519-ae89b667ab68',
      platform: 'main',
      lessonId: 29
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/generate-lesson-ai',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': data.length
      }
    };

    const req = require('http').request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (e) {
          reject(new Error(`Parse error: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Запускаем тест
(async () => {
  try {
    console.log('\n🧪 ТЕСТИРУЕМ AI LESSON GENERATOR\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('1️⃣ Получаем auth token...');
    const token = await getAuthToken();
    console.log(`✅ Token получен: ${token.substring(0, 20)}...\n`);

    console.log('2️⃣ Тестируем AI генерацию для урока 29...');
    console.log('⏳ Это займет ~10-15 секунд (GPT-4o-mini)...\n');
    
    const result = await testAIGeneration(token);
    
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('🎉 РЕЗУЛЬТАТ:\n');
    console.log('📝 ОПИСАНИЕ:');
    console.log(result.data.description);
    console.log('\n💡 СОВЕТЫ:');
    console.log(result.data.tips);
    console.log('\n📊 МЕТРИКИ:');
    console.log(`   - Токены: ${result.data.tokens}`);
    console.log(`   - Lesson ID: ${result.data.lessonId}`);
    console.log(`   - Platform: ${result.data.platform}`);
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('✅ ТЕСТ ПРОЙДЕН УСПЕШНО!\n');

  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();

