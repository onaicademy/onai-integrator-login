/**
 * Отслеживание использования токенов OpenAI
 * Логирует каждый запрос к API
 */

import { api } from '@/utils/apiClient';
import { supabase } from './supabase';

export type AgentType = 'curator' | 'mentor' | 'analyst';
export type ModelType = 'gpt-4o' | 'gpt-4o-mini' | 'whisper-1';
export type OperationType = 
  | 'text_message' 
  | 'voice_transcription' 
  | 'image_analysis'
  | 'daily_analysis' 
  | 'weekly_report' 
  | 'monthly_report';

interface TokenUsageParams {
  agentType: AgentType;
  model: ModelType;
  operationType: OperationType;
  promptTokens: number;
  completionTokens: number;
  audioDurationSeconds?: number;
  userId?: string;
  threadId?: string;
  requestId?: string;
}

/**
 * Логирование использования токенов через Backend API
 */
export async function logTokenUsage(params: TokenUsageParams): Promise<string | null> {
  try {
    console.log('[TokenTracker] 📊 Логируем токены:', {
      agent: params.agentType,
      model: params.model,
      operation: params.operationType,
      tokens: params.promptTokens + params.completionTokens,
      audioDuration: params.audioDurationSeconds,
    });

    // ✅ Используем Backend API вместо Supabase RPC
    const response = await api.post('/api/tokens/log', {
      userId: params.userId,
      assistantType: params.agentType,
      model: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens: params.promptTokens + params.completionTokens,
      requestType: params.operationType || 'chat',
      audioDurationSeconds: params.audioDurationSeconds,
    });

    console.log(`✅ Токены залогированы: ${params.agentType} - ${params.promptTokens + params.completionTokens} tokens`);
    return response.data?.id || null;
  } catch (error: any) {
    console.error('❌ Ошибка логирования токенов:', error.message);
    return null;
  }
}

/**
 * Получить дневную статистику токенов
 */
export async function getDailyTokenUsage(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from('ai_token_usage_daily')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Ошибка получения дневной статистики:', error);
    return { data: null, error };
  }
}

/**
 * Получить детальную статистику по агентам
 */
export async function getAgentStats(agentType?: AgentType, days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase
      .from('ai_token_usage')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (agentType) {
      query = query.eq('agent_type', agentType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Ошибка получения статистики агента:', error);
    return { data: null, error };
  }
}

/**
 * Проверить лимиты бюджета
 */
export async function checkBudgetLimits() {
  try {
    const { data, error } = await supabase.rpc('check_budget_limits');

    if (error) throw error;
    return { data: data?.[0], error: null };
  } catch (error) {
    console.error('Ошибка проверки лимитов:', error);
    return { data: null, error };
  }
}

/**
 * Генерация уникального ID запроса
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Обёртка для OpenAI запросов с автоматическим логированием
 */
export async function trackOpenAIRequest<T>(
  agent: AgentType,
  operation: OperationType,
  apiCall: () => Promise<T>,
  context?: {
    userId?: string;
    threadId?: string;
    model?: ModelType;
  }
): Promise<T> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Выполняем запрос к OpenAI
    const result = await apiCall();

    // Логируем использование токенов
    // (токены должны быть в result.usage)
    const usage = (result as any).usage;
    if (usage) {
      await logTokenUsage({
        agentType: agent,
        model: context?.model || 'gpt-4o', // ✅ Можно передать модель из контекста
        operationType: operation,
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        userId: context?.userId,
        threadId: context?.threadId,
        requestId
      });
    }

    const duration = Date.now() - startTime;
    console.log(`⏱️ ${agent} ${operation}: ${duration}ms`);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${agent} ${operation} failed: ${duration}ms`, error);
    throw error;
  }
}

/**
 * Логирование Whisper (транскрибация аудио)
 */
export async function logWhisperUsage(
  audioDurationSeconds: number,
  context?: {
    userId?: string;
    threadId?: string;
  }
) {
  console.log('[TokenTracker] 🎙️ Логируем Whisper транскрипцию:', {
    duration: audioDurationSeconds,
    userId: context?.userId,
  });
  
  return logTokenUsage({
    agentType: 'curator', // ✅ Исправлено: 'curator' вместо 'ai_curator'
    model: 'whisper-1',
    operationType: 'voice_transcription',
    promptTokens: 0,
    completionTokens: 0,
    audioDurationSeconds,
    userId: context?.userId,
    threadId: context?.threadId
  });
}

