import { supabase } from '../config/supabase';

// OpenAI pricing (per 1M tokens) - Updated Nov 2024
const PRICING = {
  'gpt-4o': {
    prompt: 2.50,  // $2.50 per 1M input tokens
    completion: 10.00, // $10.00 per 1M output tokens
  },
  'gpt-4o-mini': {
    prompt: 0.15,  // $0.15 per 1M input tokens
    completion: 0.60, // $0.60 per 1M output tokens
  },
  'whisper-1': {
    prompt: 0.006, // $0.006 per minute
    completion: 0,
  },
  'tts-1': {
    prompt: 15.00, // $15.00 per 1M characters
    completion: 0,
  },
};

/**
 * Рассчитать стоимость на основе токенов или длительности аудио
 */
function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  audioDurationSeconds?: number
): { promptCost: number; completionCost: number; totalCost: number } {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4o'];

  // ✅ Для Whisper используем длительность аудио (в минутах)
  if (model === 'whisper-1' && audioDurationSeconds !== undefined) {
    const audioDurationMinutes = audioDurationSeconds / 60;
    const totalCost = audioDurationMinutes * pricing.prompt; // $0.006 per minute
    
    return {
      promptCost: parseFloat(totalCost.toFixed(6)),
      completionCost: 0,
      totalCost: parseFloat(totalCost.toFixed(6)),
    };
  }

  // Для других моделей используем токены
  const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
  const completionCost = (completionTokens / 1_000_000) * pricing.completion;
  const totalCost = promptCost + completionCost;

  return {
    promptCost: parseFloat(promptCost.toFixed(6)),
    completionCost: parseFloat(completionCost.toFixed(6)),
    totalCost: parseFloat(totalCost.toFixed(6)),
  };
}

/**
 * Логировать использование токенов
 */
export async function logTokenUsage(data: {
  userId: string;
  assistantType: 'curator' | 'analyst' | 'mentor';
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  openaiThreadId?: string;
  openaiMessageId?: string;
  openaiRunId?: string;
  requestType?: string;
  audioDurationSeconds?: number;
}) {
  try {
    console.log('[TokenService] Logging token usage:', {
      user: data.userId,
      assistant: data.assistantType,
      model: data.model,
      tokens: data.totalTokens,
      audioDuration: data.audioDurationSeconds,
    });

    // Рассчитываем стоимость (для Whisper используется audioDurationSeconds)
    const cost = calculateCost(data.model, data.promptTokens, data.completionTokens, data.audioDurationSeconds);

    // Сохраняем в БД
    const { data: result, error } = await supabase
      .from('ai_token_usage')
      .insert({
        user_id: data.userId,
        assistant_type: data.assistantType,
        model: data.model,
        prompt_tokens: data.promptTokens,
        completion_tokens: data.completionTokens,
        total_tokens: data.totalTokens,
        prompt_cost_usd: cost.promptCost,
        completion_cost_usd: cost.completionCost,
        total_cost_usd: cost.totalCost,
        openai_thread_id: data.openaiThreadId,
        openai_message_id: data.openaiMessageId,
        openai_run_id: data.openaiRunId,
        request_type: data.requestType || 'chat',
        audio_duration_seconds: data.audioDurationSeconds,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log token usage: ${error.message}`);
    }

    console.log('[TokenService] ✅ Token usage logged:', result.id);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('[TokenService] ❌ Error:', error.message);
    throw error;
  }
}

/**
 * Получить статистику по токенам для пользователя
 */
export async function getUserTokenStats(userId: string, assistantType?: string) {
  try {
    let query = supabase
      .from('ai_token_usage')
      .select('*')
      .eq('user_id', userId);

    if (assistantType) {
      query = query.eq('assistant_type', assistantType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get token stats: ${error.message}`);
    }

    // Агрегируем статистику
    const stats = {
      total_tokens: data.reduce((sum, row) => sum + row.total_tokens, 0),
      total_cost_usd: data.reduce((sum, row) => sum + (row.total_cost_usd || 0), 0),
      total_requests: data.length, // ✅ Общее количество запросов
      by_assistant: {} as Record<string, { tokens: number; cost: number; requests: number }>,
      by_model: {} as Record<string, { tokens: number; cost: number; requests: number }>,
      recent_requests: data.slice(0, 10),
    };

    // Группировка по ассистентам
    data.forEach((row) => {
      if (!stats.by_assistant[row.assistant_type]) {
        stats.by_assistant[row.assistant_type] = { tokens: 0, cost: 0, requests: 0 };
      }
      stats.by_assistant[row.assistant_type].tokens += row.total_tokens;
      stats.by_assistant[row.assistant_type].cost += row.total_cost_usd || 0;
      stats.by_assistant[row.assistant_type].requests += 1;

      // Группировка по моделям
      if (!stats.by_model[row.model]) {
        stats.by_model[row.model] = { tokens: 0, cost: 0, requests: 0 };
      }
      stats.by_model[row.model].tokens += row.total_tokens;
      stats.by_model[row.model].cost += row.total_cost_usd || 0;
      stats.by_model[row.model].requests += 1;
    });

    return stats;
  } catch (error: any) {
    console.error('[TokenService] ❌ Error getting stats:', error.message);
    throw error;
  }
}

/**
 * Получить общую статистику (только для админов)
 */
export async function getTotalTokenStats() {
  try {
    const { data, error } = await supabase
      .from('ai_token_usage')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get total stats: ${error.message}`);
    }

    const stats = {
      total_tokens: data.reduce((sum, row) => sum + row.total_tokens, 0),
      total_cost_usd: data.reduce((sum, row) => sum + (row.total_cost_usd || 0), 0),
      total_requests: data.length,
      by_assistant: {} as Record<string, { tokens: number; cost: number; requests: number }>,
      by_model: {} as Record<string, { tokens: number; cost: number; requests: number }>,
      by_user: {} as Record<string, { tokens: number; cost: number; requests: number }>,
      recent_requests: data.slice(0, 10),
    };

    data.forEach((row) => {
      // By assistant
      if (!stats.by_assistant[row.assistant_type]) {
        stats.by_assistant[row.assistant_type] = { tokens: 0, cost: 0, requests: 0 };
      }
      stats.by_assistant[row.assistant_type].tokens += row.total_tokens;
      stats.by_assistant[row.assistant_type].cost += row.total_cost_usd || 0;
      stats.by_assistant[row.assistant_type].requests += 1;

      // By model
      if (!stats.by_model[row.model]) {
        stats.by_model[row.model] = { tokens: 0, cost: 0, requests: 0 };
      }
      stats.by_model[row.model].tokens += row.total_tokens;
      stats.by_model[row.model].cost += row.total_cost_usd || 0;
      stats.by_model[row.model].requests += 1;

      // By user
      if (!stats.by_user[row.user_id]) {
        stats.by_user[row.user_id] = { tokens: 0, cost: 0, requests: 0 };
      }
      stats.by_user[row.user_id].tokens += row.total_tokens;
      stats.by_user[row.user_id].cost += row.total_cost_usd || 0;
      stats.by_user[row.user_id].requests += 1;
    });

    return stats;
  } catch (error: any) {
    console.error('[TokenService] ❌ Error getting total stats:', error.message);
    throw error;
  }
}

