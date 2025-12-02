require('dotenv').config();
const { generateTranscription } = require('./dist/services/transcriptionService');

const videoId = '48e82664-1fe9-4a71-9519-ae89b667ab68';
const videoUrl = `https://video.onai.academy/${videoId}/playlist.m3u8`;

console.log('🎬 Starting Groq Whisper transcription for Lesson 29...\n');
console.log('📺 Video ID:', videoId);
console.log('🔗 Video URL:', videoUrl);
console.log('\n⏳ This will take 1-3 minutes (Groq is FAST!)...\n');

generateTranscription(videoId, videoUrl)
  .then((result) => {
    console.log('\n✅ TRANSCRIPTION COMPLETED!');
    console.log('📊 Stats:');
    console.log('  - Text length:', result.transcript_text.length, 'characters');
    console.log('  - VTT length:', result.transcript_vtt.length, 'characters');
    console.log('  - Language:', result.language);
    console.log('  - Status:', result.status);
    console.log('\n🎉 Subtitles are ready in the database!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ TRANSCRIPTION FAILED:',error.message);
    console.error('\n🔍 Full error:', error);
    process.exit(1);
  });

