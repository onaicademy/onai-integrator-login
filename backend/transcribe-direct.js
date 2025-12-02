/**
 * Прямой вызов транскрибации БЕЗ API
 * Запуск: node transcribe-direct.js
 */

require('dotenv').config();

// Импортируем напрямую транскрибацию сервис
async function main() {
  console.log('🎬 Starting DIRECT transcription for Lesson 29...');
  console.log('');
  
  const VIDEO_ID = '48e82664-1fe9-4a71-9519-ae89b667ab68';
  const VIDEO_URL = `https://video.onai.academy/${VIDEO_ID}/playlist.m3u8`;
  
  console.log(`📺 Video ID: ${VIDEO_ID}`);
  console.log(`🔗 Video URL: ${VIDEO_URL}`);
  console.log('');
  console.log('⏳ This will take 1-2 minutes...');
  console.log('');
  
  try {
    // Динамический импорт
    const { generateTranscription } = await import('./dist/services/transcriptionService.js');
    
    console.log('✅ Service imported');
    console.log('🚀 Starting transcription...');
    console.log('');
    
    const result = await generateTranscription(VIDEO_ID, VIDEO_URL);
    
    console.log('');
    console.log('🎉 SUCCESS! Transcription completed!');
    console.log('📊 Result:', result);
    console.log('');
    console.log('✅ You can now open the video and see subtitles!');
    console.log('🔗 http://localhost:8080/tripwire/module/1/lesson/29');
    
  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    
    if (error.message.includes('Cannot find module')) {
      console.error('💡 Backend not compiled. Trying TypeScript directly...');
      console.error('');
      
      // Пробуем через ts-node
      try {
        require('ts-node/register');
        const { generateTranscription } = require('./src/services/transcriptionService');
        
        console.log('✅ Service imported via ts-node');
        console.log('🚀 Starting transcription...');
        console.log('');
        
        const result = await generateTranscription(VIDEO_ID, VIDEO_URL);
        
        console.log('');
        console.log('🎉 SUCCESS! Transcription completed!');
        console.log('📊 Result:', result);
        console.log('');
        console.log('✅ You can now open the video and see subtitles!');
        console.log('🔗 http://localhost:8080/tripwire/module/1/lesson/29');
        
      } catch (tsError) {
        console.error('❌ ts-node also failed:', tsError.message);
        console.error('');
        console.error('💡 Solution: Use the API endpoint instead');
        console.error('   You need a valid JWT token for authentication');
      }
    } else {
      console.error('Stack:', error.stack);
    }
  }
}

main();

