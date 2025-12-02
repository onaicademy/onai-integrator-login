/**
 * Скрипт для транскрибации Lesson 29
 * Запуск: node transcribe-lesson-29.js
 */

require('dotenv').config();
const fetch = require('node-fetch');

const VIDEO_ID = '48e82664-1fe9-4a71-9519-ae89b667ab68';
const VIDEO_URL = `https://video.onai.academy/${VIDEO_ID}/playlist.m3u8`;
const API_URL = `http://localhost:3000/api/video/${VIDEO_ID}/transcription/generate`;

// Используем простой admin токен (для локального теста)
const ADMIN_TOKEN = process.env.ADMIN_TEST_TOKEN || 'test-admin-token';

async function transcribeLesson29() {
  console.log('🎬 Starting transcription for Lesson 29...');
  console.log(`📺 Video ID: ${VIDEO_ID}`);
  console.log(`🔗 Video URL: ${VIDEO_URL}`);
  console.log('');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoUrl: VIDEO_URL
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Transcription started successfully!');
      console.log('📊 Response:', data);
      console.log('');
      console.log('⏳ Please wait 1-2 minutes for transcription to complete...');
      console.log('');
      console.log('📝 Check progress in Supabase:');
      console.log(`   SELECT * FROM video_transcriptions WHERE video_id = '${VIDEO_ID}';`);
    } else {
      console.error('❌ Failed to start transcription');
      console.error('Response:', data);
      
      // Если ошибка авторизации, пробуем без токена (для локального теста)
      if (response.status === 401 || response.status === 403) {
        console.log('');
        console.log('🔄 Trying without authentication...');
        
        const retryResponse = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            videoUrl: VIDEO_URL
          })
        });
        
        const retryData = await retryResponse.json();
        
        if (retryResponse.ok) {
          console.log('✅ Transcription started successfully!');
          console.log('📊 Response:', retryData);
        } else {
          console.error('❌ Still failed:', retryData);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('💡 Make sure backend is running on http://localhost:3000');
  }
}

// Запуск
transcribeLesson29();

