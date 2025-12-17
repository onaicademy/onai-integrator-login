import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { promisify } from 'util';
import { exec } from 'child_process';
import axios from 'axios';
import { generateLessonAI } from '../routes/ai-lesson-generator';

const execPromise = promisify(exec);

// ✅ ИСПОЛЬЗУЕМ TRIPWIRE БД для транскрипций Tripwire уроков
const supabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL || '',
  process.env.TRIPWIRE_SERVICE_ROLE_KEY || ''
);

// ✅ GROQ WHISPER CLIENT (в 10× быстрее OpenAI!)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1'
});

interface TranscriptionResult {
  id: string;
  video_id: string;
  transcript_text: string;
  transcript_srt: string;
  transcript_vtt: string;
  language: string;
  status: string;
}

/**
 * Генерация транскрибации через Groq Whisper API (FAST!)
 */
export async function generateTranscription(videoId: string, videoUrl: string): Promise<TranscriptionResult> {
  const tempVideoPath = `/tmp/${videoId}.mp4`;
  const tempAudioPath = `/tmp/${videoId}.mp3`;

  try {
    console.log(`🎙️ [Transcription] Starting for video ${videoId}`);
    
    // Обновить статус на "processing"
    await supabase
      .from('video_transcriptions')
      .upsert({
        video_id: videoId,
        status: 'processing',
        generated_by: 'groq-whisper'
      });
    
    // ШАГ 1: Скачать видео через yt-dlp (работает с любым HLS)
    console.log(`📥 [Transcription] Downloading video with yt-dlp...`);
    console.log(`🔗 Source: ${videoUrl}`);
    
    await execPromise(
      `yt-dlp -f "bestvideo[height<=480]+bestaudio/best[height<=480]" "${videoUrl}" -o "${tempVideoPath}" --no-warnings --quiet`
    );
    
    console.log(`✅ [Transcription] Video downloaded`);
    
    // ШАГ 2: Извлечь аудио через ffmpeg
    console.log(`🎵 [Transcription] Extracting audio...`);
    
    await execPromise(
      `ffmpeg -i "${tempVideoPath}" -vn -acodec libmp3lame -q:a 2 "${tempAudioPath}" -y -loglevel error`
    );
    
    console.log(`✅ [Transcription] Audio extracted: ${tempAudioPath}`);
    
    // ШАГ 2.5: Проверить размер файла
    const audioStats = fs.statSync(tempAudioPath);
    const audioSizeMB = audioStats.size / (1024 * 1024);
    console.log(`📊 [Transcription] Audio size: ${audioSizeMB.toFixed(2)} MB`);
    
    let allSegments: any[] = [];
    let fullText = '';
    
    // ✅ FIX: Если файл > 20MB - разбиваем на чанки по 10 минут
    if (audioSizeMB > 20) {
      console.log(`✂️ [Transcription] File too large, splitting into chunks...`);
      
      // Получить длительность аудио
      const durationCmd = await execPromise(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempAudioPath}"`
      );
      const totalDuration = parseFloat(durationCmd.stdout.trim());
      console.log(`⏱️ [Transcription] Total duration: ${totalDuration.toFixed(0)}s`);
      
      // Разбить на 10-минутные чанки
      const chunkDuration = 600; // 10 минут
      const numChunks = Math.ceil(totalDuration / chunkDuration);
      console.log(`🔢 [Transcription] Splitting into ${numChunks} chunks...`);
      
      for (let i = 0; i < numChunks; i++) {
        const startTime = i * chunkDuration;
        const chunkPath = `/tmp/${videoId}_chunk_${i}.mp3`;
        
        console.log(`✂️ [Transcription] Processing chunk ${i + 1}/${numChunks} (${startTime}s)...`);
        
        // Извлечь чанк
        await execPromise(
          `ffmpeg -i "${tempAudioPath}" -ss ${startTime} -t ${chunkDuration} -acodec copy "${chunkPath}" -y -loglevel error`
        );
        
        // Транскрибировать чанк
        const chunkTranscription = await groq.audio.transcriptions.create({
          file: fs.createReadStream(chunkPath),
          model: 'whisper-large-v3',
          language: 'ru',
          response_format: 'verbose_json',
          temperature: 0.0
        }) as any;
        
        // Добавить сегменты с корректировкой времени
        if (chunkTranscription.segments) {
          chunkTranscription.segments.forEach((seg: any) => {
            allSegments.push({
              ...seg,
              start: seg.start + startTime,
              end: seg.end + startTime
            });
          });
        }
        
        fullText += (chunkTranscription.text || '') + ' ';
        console.log(`✅ [Transcription] Chunk ${i + 1} completed (${(chunkTranscription.text || '').length} chars)`);
        
        // Удалить чанк
        fs.unlinkSync(chunkPath);
      }
      
      console.log(`✅ [Transcription] All chunks merged! Total: ${fullText.length} chars`);
    } else {
      // ШАГ 3: Маленький файл - отправляем целиком
      console.log(`🤖 [Transcription] Sending to Groq Whisper API...`);
      
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(tempAudioPath),
        model: 'whisper-large-v3',
        language: 'ru',
        response_format: 'verbose_json',
        temperature: 0.0
      }) as any;
      
      allSegments = transcription.segments || [];
      fullText = transcription.text || '';
      
      console.log(`✅ [Transcription] Received from Groq`);
    }
    
    // ШАГ 4: Конвертировать форматы
    const plainText = fullText.trim();
    const srtContent = convertToSRT(allSegments);
    const vttContent = convertSRTtoVTT(srtContent);
    
    // ШАГ 5: Сохранить в БД
    const { data, error } = await supabase
      .from('video_transcriptions')
      .upsert({
        video_id: videoId,
        transcript_text: plainText,
        transcript_srt: srtContent,
        transcript_vtt: vttContent,
        language: 'ru',
        generated_by: 'groq-whisper',
        status: 'completed',
        generated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ [Transcription] DB Save error:`, error);
      throw error;
    }
    
    console.log(`✅ [Transcription] Saved to DB! Text length: ${plainText.length} chars`);
    console.log(`✅ [Transcription] Completed for ${videoId}`);
    
    // ✅ ЗАПИСЬ ЗАТРАТ НА ТРАНСКРИБАЦИЮ (для всех видео, не только Tripwire)
    try {
      // Найти урок по video_id
      const { data: lesson } = await supabase
        .from('lessons')
        .select('id, module_id, modules!inner(course_id)')
        .eq('bunny_video_id', videoId)
        .single();
      
      if (lesson) {
        const courseId = (lesson as any).modules?.course_id;
        // ✅ FIX: Для чанков записываем 0 (не критично для учёта затрат)
        const audioDuration = 0; // Groq Whisper бесплатен
        const isTripwire = courseId === 13;
        
        // Groq Whisper бесплатен, но записываем для трекинга
        // Если бы платили, то $0.006/минуту
        const costUsd = 0; // Groq Whisper бесплатен
        
        if (isTripwire) {
          // Tripwire: сохраняем в tripwire_ai_costs
        await supabase.from('tripwire_ai_costs').insert({
            user_id: '00000000-0000-0000-0000-000000000000', // System
          cost_type: 'lesson_transcription',
          service: 'groq',
          model: 'whisper-large-v3',
          tokens_used: 0,
            cost_usd: costUsd,
          metadata: { 
            video_id: videoId,
            lesson_id: lesson.id,
            duration: audioDuration,
            text_length: plainText.length
          }
        });
          console.log(`✅ [Transcription] Tripwire cost записан для урока ${lesson.id}`);
        } else {
          // Main platform: сохраняем в ai_token_usage
          await supabase.from('ai_token_usage').insert({
            user_id: '00000000-0000-0000-0000-000000000000', // System
            assistant_type: 'curator', // используем как дефолт для транскрибаций
            model: 'whisper-large-v3',
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            prompt_cost_usd: 0,
            completion_cost_usd: 0,
            total_cost_usd: costUsd,
            request_type: 'video_transcription',
            audio_duration_seconds: Math.round(audioDuration),
            metadata: JSON.stringify({
              video_id: videoId,
              lesson_id: lesson.id,
              service: 'groq',
              text_length: plainText.length
            })
          });
          console.log(`✅ [Transcription] Main platform cost записан для урока ${lesson.id}`);
        }
      }
    } catch (costError: any) {
      console.warn(`⚠️ [Transcription] Не удалось записать cost:`, costError.message);
    }
    
    // 🤖 АВТОМАТИЧЕСКИ ТРИГГЕРИМ AI ГЕНЕРАЦИЮ (асинхронно)
    triggerAIGeneration(videoId).catch(err => {
      console.warn(`⚠️ [AI Generator] Failed to auto-generate for ${videoId}:`, err.message);
    });
    
    return data as TranscriptionResult;
  } catch (error: any) {
    console.error(`❌ [Transcription] Error:`, error.message);
    
    // Обновить статус на "failed"
    await supabase
      .from('video_transcriptions')
      .upsert({
        video_id: videoId,
        status: 'failed'
      });
    
    throw error;
  } finally {
    // Очистка временных файлов
    try {
      if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
      if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
      console.log(`🧹 [Transcription] Cleaned up temp files`);
    } catch (err) {
      console.warn('[Transcription] Could not delete temp files:', err);
    }
  }
}

/**
 * Получить транскрибацию (берем последнюю completed)
 */
export async function getTranscription(videoId: string) {
  const { data, error } = await supabase
    .from('video_transcriptions')
    .select('*')
    .eq('video_id', videoId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    console.warn(`❌ Transcription not found for ${videoId}:`, error.message);
    return null;
  }
  
  console.log(`✅ Found transcription for ${videoId}`);
  return data;
}

/**
 * Конвертация segments в SRT формат
 */
function convertToSRT(segments: any[]): string {
  if (!segments || segments.length === 0) return '';
  
  return segments.map((segment, index) => {
    const start = formatTimestamp(segment.start);
    const end = formatTimestamp(segment.end);
    const text = segment.text.trim();
    
    return `${index + 1}\n${start} --> ${end}\n${text}\n`;
  }).join('\n');
}

/**
 * Конвертация SRT в WebVTT формат
 */
function convertSRTtoVTT(srt: string): string {
  if (!srt) return 'WEBVTT\n\n';
  // Заменяем запятую на точку в таймкодах (SRT использует запятую, VTT - точку)
  return 'WEBVTT\n\n' + srt.replace(/,/g, '.');
}

/**
 * Форматирование timestamp для SRT (HH:MM:SS,mmm)
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Скачать видео из BunnyCDN Stream API
 */
async function downloadFromBunnyCDN(
  videoUrl: string,
  videoId: string,
  destPath: string
): Promise<void> {
  try {
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_STREAM_API_KEY;
    
    // Получаем информацию о видео через API
    console.log(`📥 [Download] Fetching video info for ${videoId}...`);
    
    const videoInfoUrl = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;
    const videoInfo = await axios.get(videoInfoUrl, {
      headers: {
        'AccessKey': apiKey
      }
    });
    
    // Ищем MP4 URL (обычно это play_{quality}.mp4)
    // Используем 480p для экономии времени и трафика
    const mp4Url = `https://video.onai.academy/${videoId}/play_480p.mp4`;
    
    console.log(`📥 [Download] Downloading from: ${mp4Url}`);
    
    const response = await axios({
      method: 'GET',
      url: mp4Url,
      responseType: 'stream',
      timeout: 180000, // 3 minutes
      maxRedirects: 5
    });
    
    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      let downloadedBytes = 0;
      
      response.data.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        if (downloadedBytes % (1024 * 1024 * 10) === 0) { // каждые 10MB
          console.log(`📊 Downloaded ${Math.floor(downloadedBytes / (1024 * 1024))}MB`);
        }
      });
      
      writer.on('finish', () => {
        console.log(`✅ [Download] Video saved to ${destPath} (${Math.floor(downloadedBytes / (1024 * 1024))}MB)`);
        resolve();
      });
      
      writer.on('error', (err) => {
        console.error(`❌ [Download] Error writing file:`, err);
        reject(err);
      });
      
      response.data.on('error', (err: Error) => {
        console.error(`❌ [Download] Error downloading:`, err);
        reject(err);
      });
    });
  } catch (error: any) {
    console.error(`❌ [Download] Failed:`, error.message);
    throw new Error(`Failed to download video: ${error.message}`);
  }
}

/**
 * 🤖 АВТОМАТИЧЕСКИЙ ТРИГГЕР AI ГЕНЕРАЦИИ
 * 
 * Вызывается после успешной транскрибации.
 * Находит lesson по videoId и генерирует описание + советы.
 */
async function triggerAIGeneration(videoId: string) {
  try {
    console.log(`🤖 [AI Generator] Auto-trigger for video ${videoId}`);
    
    // 1️⃣ Ищем урок в ОСНОВНОЙ ПЛАТФОРМЕ
    const { data: mainLesson } = await supabase
      .from('lessons')
      .select('id, module_id, bunny_video_id')
      .eq('bunny_video_id', videoId)
      .single();
    
    if (mainLesson) {
      console.log(`✅ [AI Generator] Found lesson ${mainLesson.id} in MAIN platform`);
      await generateAIContent(videoId, 'main', mainLesson.id);
      return;
    }
    
    // 2️⃣ Ищем урок в TRIPWIRE (если таблица существует)
    try {
      const { data: tripwireLesson } = await supabase
        .from('tripwire_lessons')
        .select('id, module_id, bunny_video_id')
        .eq('bunny_video_id', videoId)
        .single();
      
      if (tripwireLesson) {
        console.log(`✅ [AI Generator] Found lesson ${tripwireLesson.id} in TRIPWIRE platform`);
        await generateAIContent(videoId, 'tripwire', tripwireLesson.id);
        return;
      }
    } catch (err) {
      // Таблица tripwire_lessons может не существовать - это нормально
      console.log(`ℹ️ [AI Generator] Tripwire table not found or no lesson`);
    }
    
    console.warn(`⚠️ [AI Generator] No lesson found for video ${videoId}`);
  } catch (error: any) {
    console.error(`❌ [AI Generator] Trigger error:`, error.message);
    throw error;
  }
}

/**
 * 🎯 ГЕНЕРАЦИЯ AI КОНТЕНТА
 * 
 * Вызывает функцию generateLessonAI напрямую (без HTTP).
 */
async function generateAIContent(videoId: string, platform: 'main' | 'tripwire', lessonId: number) {
  try {
    console.log(`🚀 [AI Generator] Generating for lesson ${lessonId} (${platform})`);
    
    const result = await generateLessonAI(videoId, platform, lessonId);
    
    console.log(`✅ [AI Generator] Successfully generated for lesson ${lessonId}`);
    console.log(`   - Description: ${result.description.substring(0, 50)}...`);
    console.log(`   - Tips: ${result.tips.substring(0, 50)}...`);
    console.log(`   - Tokens used: ${result.tokens}`);
  } catch (error: any) {
    console.error(`❌ [AI Generator] Generation failed:`, error.message);
    throw error;
  }
}

