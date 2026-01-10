/**
 * Production Health Check Script
 *
 * Проверяет состояние AI-агентов и транскрипций в production.
 *
 * Usage:
 *   npx tsx backend/scripts/check-production-health.ts
 */

import '../src/load-env.js';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const PRODUCTION_URL = process.env.PRODUCTION_API_URL || 'https://api.onai.academy';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface HealthCheckResult {
  category: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  details: string;
  data?: any;
}

const results: HealthCheckResult[] = [];

/**
 * 1. Проверка OpenAI Assistants
 */
async function checkOpenAIAssistants() {
  console.log('\n📊 === ПРОВЕРКА OPENAI ASSISTANTS ===\n');

  try {
    // Проверяем environment variables
    const assistants = {
      curator: process.env.OPENAI_ASSISTANT_CURATOR_ID,
      mentor: process.env.OPENAI_ASSISTANT_MENTOR_ID,
      analyst: process.env.OPENAI_ASSISTANT_ANALYST_ID,
      tripwire: process.env.OPENAI_ASSISTANT_CURATOR_TRIPWIRE_ID,
    };

    for (const [type, id] of Object.entries(assistants)) {
      if (!id) {
        results.push({
          category: 'OpenAI Assistants',
          status: 'ERROR',
          details: `${type} assistant ID NOT CONFIGURED`,
        });
        console.error(`❌ ${type}: NOT CONFIGURED`);
      } else {
        results.push({
          category: 'OpenAI Assistants',
          status: 'OK',
          details: `${type} assistant configured`,
          data: { id: id.substring(0, 20) + '...' },
        });
        console.log(`✅ ${type}: ${id.substring(0, 20)}...`);
      }
    }

    // Проверяем API keys
    const apiKeys = {
      curator: process.env.OPENAI_API_KEY_CURATOR || process.env.OPENAI_API_KEY,
      mentor: process.env.OPENAI_API_KEY_MENTOR || process.env.OPENAI_API_KEY,
      analyst: process.env.OPENAI_API_KEY_ANALYST || process.env.OPENAI_API_KEY,
    };

    console.log('\n🔑 API Keys:');
    for (const [type, key] of Object.entries(apiKeys)) {
      if (!key) {
        results.push({
          category: 'OpenAI API Keys',
          status: 'ERROR',
          details: `${type} API key NOT FOUND`,
        });
        console.error(`❌ ${type}: NOT FOUND`);
      } else {
        results.push({
          category: 'OpenAI API Keys',
          status: 'OK',
          details: `${type} API key configured`,
        });
        console.log(`✅ ${type}: ${key.substring(0, 10)}...`);
      }
    }
  } catch (error: any) {
    results.push({
      category: 'OpenAI Assistants',
      status: 'ERROR',
      details: `Error checking assistants: ${error.message}`,
    });
    console.error('❌ Error:', error.message);
  }
}

/**
 * 2. Проверка OpenAI Status через API
 */
async function checkOpenAIStatus() {
  console.log('\n📊 === ПРОВЕРКА OPENAI STATUS API ===\n');

  try {
    // Используем локальный import для проверки
    const { getRateLimiterStats, getClientPoolStats } = await import('../src/services/openaiService.js');

    const rateLimiterStats = getRateLimiterStats();
    const clientPoolStats = getClientPoolStats();

    console.log('Rate Limiter Status:', rateLimiterStats.status);
    console.log('Queue Length:', rateLimiterStats.queueLength);
    console.log('Circuit Breakers:', rateLimiterStats.circuitBreakers);

    if (rateLimiterStats.status === 'critical') {
      results.push({
        category: 'OpenAI Rate Limiter',
        status: 'ERROR',
        details: 'Rate limiter in CRITICAL state',
        data: rateLimiterStats,
      });
      console.error('❌ Rate Limiter: CRITICAL');
    } else if (rateLimiterStats.status === 'degraded') {
      results.push({
        category: 'OpenAI Rate Limiter',
        status: 'WARNING',
        details: 'Rate limiter DEGRADED',
        data: rateLimiterStats,
      });
      console.warn('⚠️ Rate Limiter: DEGRADED');
    } else {
      results.push({
        category: 'OpenAI Rate Limiter',
        status: 'OK',
        details: 'Rate limiter healthy',
        data: rateLimiterStats,
      });
      console.log('✅ Rate Limiter: HEALTHY');
    }

    console.log('\n📦 Client Pool:');
    console.log('Initialized:', clientPoolStats.initialized);
    for (const [type, stats] of Object.entries(clientPoolStats.clients)) {
      console.log(`  ${type}:`, stats);

      if (stats.successRate < 80) {
        results.push({
          category: 'OpenAI Client Pool',
          status: 'WARNING',
          details: `${type} success rate below 80%: ${stats.successRate}%`,
          data: stats,
        });
      } else {
        results.push({
          category: 'OpenAI Client Pool',
          status: 'OK',
          details: `${type} success rate: ${stats.successRate}%`,
          data: stats,
        });
      }
    }
  } catch (error: any) {
    results.push({
      category: 'OpenAI Status API',
      status: 'ERROR',
      details: `Error checking status: ${error.message}`,
    });
    console.error('❌ Error:', error.message);
  }
}

/**
 * 3. Проверка транскрипций (ai_token_usage)
 */
async function checkTranscriptions() {
  console.log('\n🎙️ === ПРОВЕРКА ТРАНСКРИПЦИЙ ===\n');

  try {
    // Последние 24 часа
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Проверяем Main Platform
    const { data: mainTranscriptions, error: mainError } = await supabase
      .from('ai_token_usage')
      .select('*')
      .eq('request_type', 'voice_transcription')
      .gte('created_at', yesterday);

    if (mainError) throw mainError;

    console.log(`📊 Main Platform: ${mainTranscriptions?.length || 0} транскрипций за 24ч`);

    if (mainTranscriptions && mainTranscriptions.length > 0) {
      const totalDuration = mainTranscriptions.reduce(
        (sum, t) => sum + (t.audio_duration_seconds || 0),
        0
      );
      console.log(`  Общая длительность: ${Math.round(totalDuration)}с (${Math.round(totalDuration / 60)}мин)`);

      results.push({
        category: 'Main Platform Transcriptions',
        status: 'OK',
        details: `${mainTranscriptions.length} транскрипций за 24ч`,
        data: { count: mainTranscriptions.length, totalDuration },
      });
    } else {
      results.push({
        category: 'Main Platform Transcriptions',
        status: 'WARNING',
        details: 'No transcriptions in last 24h',
      });
    }

    // Проверяем Tripwire
    const tripwireSupabase = createClient(
      process.env.SUPABASE_TRIPWIRE_URL!,
      process.env.SUPABASE_TRIPWIRE_SERVICE_KEY!
    );

    const { data: tripwireTranscriptions, error: tripwireError } = await tripwireSupabase
      .from('tripwire_ai_costs')
      .select('*')
      .eq('cost_type', 'curator_whisper')
      .gte('created_at', yesterday);

    if (tripwireError) {
      console.warn('⚠️ Tripwire transcriptions check failed:', tripwireError.message);
    } else {
      console.log(`📊 Tripwire: ${tripwireTranscriptions?.length || 0} транскрипций за 24ч`);

      if (tripwireTranscriptions && tripwireTranscriptions.length > 0) {
        results.push({
          category: 'Tripwire Transcriptions',
          status: 'OK',
          details: `${tripwireTranscriptions.length} транскрипций за 24ч`,
          data: { count: tripwireTranscriptions.length },
        });
      }
    }
  } catch (error: any) {
    results.push({
      category: 'Transcriptions',
      status: 'ERROR',
      details: `Error checking transcriptions: ${error.message}`,
    });
    console.error('❌ Error:', error.message);
  }
}

/**
 * 4. Проверка AI curator usage (последние threads)
 */
async function checkAICuratorUsage() {
  console.log('\n🤖 === ПРОВЕРКА AI CURATOR USAGE ===\n');

  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Main Platform curator chats
    const { data: mainChats, error: mainError } = await supabase
      .from('ai_token_usage')
      .select('*')
      .eq('assistant_type', 'curator')
      .eq('request_type', 'chat')
      .gte('created_at', yesterday);

    if (mainError) throw mainError;

    console.log(`💬 Main Platform: ${mainChats?.length || 0} curator chats за 24ч`);

    if (mainChats && mainChats.length > 0) {
      const totalTokens = mainChats.reduce((sum, c) => sum + (c.total_tokens || 0), 0);
      const uniqueUsers = new Set(mainChats.map(c => c.user_id)).size;

      console.log(`  Уникальных пользователей: ${uniqueUsers}`);
      console.log(`  Всего токенов: ${totalTokens.toLocaleString()}`);

      results.push({
        category: 'AI Curator Usage',
        status: 'OK',
        details: `${mainChats.length} chats, ${uniqueUsers} users, ${totalTokens} tokens`,
        data: { chats: mainChats.length, users: uniqueUsers, tokens: totalTokens },
      });
    } else {
      results.push({
        category: 'AI Curator Usage',
        status: 'WARNING',
        details: 'No curator chats in last 24h',
      });
      console.warn('⚠️ No curator activity in 24h');
    }

    // Tripwire curator
    const tripwireSupabase = createClient(
      process.env.SUPABASE_TRIPWIRE_URL!,
      process.env.SUPABASE_TRIPWIRE_SERVICE_KEY!
    );

    const { data: tripwireChats, error: tripwireError } = await tripwireSupabase
      .from('tripwire_ai_costs')
      .select('*')
      .eq('cost_type', 'curator_chat')
      .gte('created_at', yesterday);

    if (!tripwireError && tripwireChats) {
      console.log(`💬 Tripwire: ${tripwireChats.length} curator chats за 24ч`);

      if (tripwireChats.length > 0) {
        results.push({
          category: 'Tripwire AI Curator',
          status: 'OK',
          details: `${tripwireChats.length} chats за 24ч`,
          data: { count: tripwireChats.length },
        });
      }
    }
  } catch (error: any) {
    results.push({
      category: 'AI Curator Usage',
      status: 'ERROR',
      details: `Error checking usage: ${error.message}`,
    });
    console.error('❌ Error:', error.message);
  }
}

/**
 * 5. Проверка целостности данных
 */
async function checkDataIntegrity() {
  console.log('\n🔍 === ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ ===\n');

  try {
    // Проверяем orphaned threads (threads без messages)
    const { data: tokenUsage, error: tokenError } = await supabase
      .from('ai_token_usage')
      .select('openai_thread_id, openai_run_id')
      .eq('request_type', 'chat')
      .order('created_at', { ascending: false })
      .limit(100);

    if (tokenError) throw tokenError;

    const threadsWithRuns = tokenUsage?.filter(t => t.openai_thread_id && t.openai_run_id).length || 0;
    const threadsWithoutRuns = tokenUsage?.filter(t => t.openai_thread_id && !t.openai_run_id).length || 0;

    console.log(`📊 Last 100 chat records:`);
    console.log(`  With runs: ${threadsWithRuns}`);
    console.log(`  Without runs: ${threadsWithoutRuns}`);

    if (threadsWithoutRuns > 10) {
      results.push({
        category: 'Data Integrity',
        status: 'WARNING',
        details: `${threadsWithoutRuns} threads without run IDs (possible failures)`,
      });
      console.warn(`⚠️ ${threadsWithoutRuns} threads without runs`);
    } else {
      results.push({
        category: 'Data Integrity',
        status: 'OK',
        details: 'Thread/run integrity looks good',
      });
      console.log('✅ Thread/run integrity OK');
    }

    // Проверяем стоимость транскрипций
    const { data: transcriptionCosts, error: costError } = await supabase
      .from('ai_token_usage')
      .select('audio_duration_seconds')
      .eq('request_type', 'voice_transcription')
      .not('audio_duration_seconds', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!costError && transcriptionCosts && transcriptionCosts.length > 0) {
      const avgDuration = transcriptionCosts.reduce((sum, t) => sum + t.audio_duration_seconds, 0) / transcriptionCosts.length;
      console.log(`\n📊 Transcription stats (last 50):`);
      console.log(`  Average duration: ${Math.round(avgDuration)}s`);

      results.push({
        category: 'Transcription Integrity',
        status: 'OK',
        details: `Average duration: ${Math.round(avgDuration)}s`,
        data: { avgDuration, count: transcriptionCosts.length },
      });
    }
  } catch (error: any) {
    results.push({
      category: 'Data Integrity',
      status: 'ERROR',
      details: `Error checking integrity: ${error.message}`,
    });
    console.error('❌ Error:', error.message);
  }
}

/**
 * Печать итогового отчёта
 */
function printSummary() {
  console.log('\n\n');
  console.log('═'.repeat(60));
  console.log('📋 ИТОГОВЫЙ ОТЧЁТ');
  console.log('═'.repeat(60));

  const okCount = results.filter(r => r.status === 'OK').length;
  const warningCount = results.filter(r => r.status === 'WARNING').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;

  console.log(`\n✅ OK: ${okCount}`);
  console.log(`⚠️  WARNING: ${warningCount}`);
  console.log(`❌ ERROR: ${errorCount}`);

  if (errorCount > 0) {
    console.log('\n❌ КРИТИЧНЫЕ ПРОБЛЕМЫ:');
    results
      .filter(r => r.status === 'ERROR')
      .forEach(r => {
        console.log(`  - [${r.category}] ${r.details}`);
      });
  }

  if (warningCount > 0) {
    console.log('\n⚠️  ПРЕДУПРЕЖДЕНИЯ:');
    results
      .filter(r => r.status === 'WARNING')
      .forEach(r => {
        console.log(`  - [${r.category}] ${r.details}`);
      });
  }

  console.log('\n' + '═'.repeat(60));

  if (errorCount === 0 && warningCount === 0) {
    console.log('✅ ВСЕ СИСТЕМЫ РАБОТАЮТ НОРМАЛЬНО');
  } else if (errorCount === 0) {
    console.log('⚠️  ОБНАРУЖЕНЫ НЕЗНАЧИТЕЛЬНЫЕ ПРОБЛЕМЫ');
  } else {
    console.log('❌ ОБНАРУЖЕНЫ КРИТИЧНЫЕ ПРОБЛЕМЫ');
  }

  console.log('═'.repeat(60) + '\n');
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Starting production health check...\n');
  console.log(`Target: ${PRODUCTION_URL}\n`);

  await checkOpenAIAssistants();
  await checkOpenAIStatus();
  await checkTranscriptions();
  await checkAICuratorUsage();
  await checkDataIntegrity();

  printSummary();

  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
