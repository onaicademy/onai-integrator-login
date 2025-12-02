/**
 * СИСТЕМА ОБНАРУЖЕНИЯ КОНФЛИКТОВ БОТА
 * Автоматически выявляет ошибки, галлюцинации и проблемы AI-куратора
 */

import { supabase } from "./supabase";

// ============================================
// ТИПЫ
// ============================================

export type ConflictType =
  | "INCORRECT_ANSWER"
  | "HALLUCINATION"
  | "MISUNDERSTOOD_QUESTION"
  | "REPETITIVE_ANSWER"
  | "INAPPROPRIATE_TONE"
  | "TECHNICAL_ERROR"
  | "INCOMPLETE_ANSWER";

export type ConflictSeverity = "critical" | "high" | "medium" | "low";

export interface Conflict {
  type: ConflictType;
  severity: ConflictSeverity;
  detected_issue: string;
  suggestion: string;
}

// ============================================
// ДЕТЕКТОРЫ КОНФЛИКТОВ
// ============================================

/**
 * 1. Неверный ответ - студент указывает на ошибку
 */
function detectIncorrectAnswer(userMessage: string): Conflict | null {
  const negativeKeywords = [
    "неправильно", "ошибка", "не так", "неверно",
    "wrong", "incorrect", "mistake", "это не то",
    "не согласен", "не может быть"
  ];

  const hasNegative = negativeKeywords.some(kw =>
    userMessage.toLowerCase().includes(kw)
  );

  if (hasNegative) {
    return {
      type: "INCORRECT_ANSWER",
      severity: "high",
      detected_issue: "Студент указал на неверный ответ",
      suggestion: "Проверить knowledge base. Добавить disclaimer о проверке источников.",
    };
  }

  return null;
}

/**
 * 2. Галлюцинации - бот придумывает несуществующие данные
 */
function detectHallucination(
  aiResponse: string,
  availableLessons: number[]
): Conflict | null {
  // Проверяем упоминание уроков
  const lessonMatch = aiResponse.match(/урок[а-я\s]*(\d+)/i);
  if (lessonMatch) {
    const lessonNum = parseInt(lessonMatch[1]);
    if (!availableLessons.includes(lessonNum)) {
      return {
        type: "HALLUCINATION",
        severity: "critical",
        detected_issue: `Бот упомянул несуществующий урок ${lessonNum}`,
        suggestion: "СРОЧНО: Обновить context с актуальным списком уроков. Добавить fact-checking.",
      };
    }
  }

  // Проверяем фразы-признаки галлюцинаций
  const hallucinationPhrases = [
    "в уроке который мы не проходили",
    "этого в курсе нет",
    "модуль [0-9]+ которого не существует"
  ];

  for (const phrase of hallucinationPhrases) {
    const regex = new RegExp(phrase, "i");
    if (regex.test(aiResponse)) {
      return {
        type: "HALLUCINATION",
        severity: "critical",
        detected_issue: "Обнаружены признаки галлюцинации",
        suggestion: "Обновить prompt: отвечать ТОЛЬКО на основе данных курса.",
      };
    }
  }

  return null;
}

/**
 * 3. Не понял вопрос - студент переспрашивает
 */
function detectMisunderstanding(userMessage: string): Conflict | null {
  const clarificationKeywords = [
    "не про это", "не понял", "что?", "переспрошу",
    "я про другое", "не о том", "не ответил на вопрос"
  ];

  const needsClarification = clarificationKeywords.some(kw =>
    userMessage.toLowerCase().includes(kw)
  );

  if (needsClarification) {
    return {
      type: "MISUNDERSTOOD_QUESTION",
      severity: "medium",
      detected_issue: "Бот не понял вопрос студента",
      suggestion: "Улучшить prompt: если не уверен - попросить уточнение ПЕРЕД ответом.",
    };
  }

  return null;
}

/**
 * 4. Повторяющиеся ответы
 */
function detectRepetition(
  currentResponse: string,
  previousResponses: string[]
): Conflict | null {
  if (previousResponses.length === 0) return null;

  // Простая проверка на очень похожие ответы
  const lastResponse = previousResponses[previousResponses.length - 1];
  const similarity = calculateSimilarity(currentResponse, lastResponse);

  if (similarity > 0.8) {
    return {
      type: "REPETITIVE_ANSWER",
      severity: "low",
      detected_issue: "Бот повторяет предыдущий ответ",
      suggestion: "Добавить проверку similarity. Если > 80% - перефразировать или дополнить.",
    };
  }

  return null;
}

/**
 * 5. Неуместный тон
 */
function detectInappropriateTone(
  userMessage: string,
  aiResponse: string
): Conflict | null {
  const toneComplaints = [
    "грубо", "неуместно", "не нравится тон",
    "слишком формально", "холодно", "резко"
  ];

  const hasToneComplaint = toneComplaints.some(kw =>
    userMessage.toLowerCase().includes(kw)
  );

  if (hasToneComplaint) {
    return {
      type: "INAPPROPRIATE_TONE",
      severity: "high",
      detected_issue: "Студент недоволен тоном ответа",
      suggestion: "Обновить prompt: использовать дружелюбный, поддерживающий тон. Добавить примеры.",
    };
  }

  // Проверяем грубые слова в ответе (не должно быть!)
  const rudeWords = ["дурак", "идиот", "тупой", "глупый"];
  const hasRudeWords = rudeWords.some(word =>
    aiResponse.toLowerCase().includes(word)
  );

  if (hasRudeWords) {
    return {
      type: "INAPPROPRIATE_TONE",
      severity: "critical",
      detected_issue: "КРИТИЧНО: Бот использует грубые слова!",
      suggestion: "СРОЧНО: Убрать грубые слова из ответов. Добавить фильтр перед отправкой.",
    };
  }

  return null;
}

/**
 * 6. Технические ошибки
 */
function detectTechnicalError(
  responseTime: number,
  error: Error | null
): Conflict | null {
  // Таймаут
  if (responseTime > 30000) {
    return {
      type: "TECHNICAL_ERROR",
      severity: "medium",
      detected_issue: `Таймаут: ${responseTime}ms (> 30 секунд)`,
      suggestion: "Увеличить timeout. Добавить retry механизм. Оптимизировать промпт.",
    };
  }

  // API ошибка
  if (error) {
    return {
      type: "TECHNICAL_ERROR",
      severity: "high",
      detected_issue: `API ошибка: ${error.message}`,
      suggestion: "Проверить API key. Добавить fallback ответ. Логировать для анализа.",
    };
  }

  return null;
}

/**
 * 7. Неполный ответ
 */
function detectIncompleteAnswer(
  userMessage: string,
  aiResponse: string
): Conflict | null {
  const incompleteKeywords = [
    "дальше", "подробнее", "это всё", "а что ещё",
    "продолжай", "расскажи больше"
  ];

  const needsMore = incompleteKeywords.some(kw =>
    userMessage.toLowerCase().includes(kw)
  );

  // Слишком короткий ответ на длинный вопрос
  const isTooShort = userMessage.length > 100 && aiResponse.length < 150;

  if (needsMore || isTooShort) {
    return {
      type: "INCOMPLETE_ANSWER",
      severity: "medium",
      detected_issue: "Ответ слишком краткий или неполный",
      suggestion: "Увеличить max_tokens. Обновить prompt: давать развёрнутые ответы на сложные вопросы.",
    };
  }

  return null;
}

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ ОБНАРУЖЕНИЯ
// ============================================

export async function detectConflicts(params: {
  userMessage: string;
  aiResponse: string;
  threadId: string;
  userId: string;
  responseTime: number;
  tokenCount?: number;
  model?: string;
  error?: Error | null;
  previousResponses?: string[];
}): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];

  // Доступные уроки (mock, потом загружать из БД)
  const availableLessons = Array.from({ length: 20 }, (_, i) => i + 1);

  // 1. Неверный ответ
  const incorrectAnswer = detectIncorrectAnswer(params.userMessage);
  if (incorrectAnswer) conflicts.push(incorrectAnswer);

  // 2. Галлюцинации
  const hallucination = detectHallucination(params.aiResponse, availableLessons);
  if (hallucination) conflicts.push(hallucination);

  // 3. Не понял вопрос
  const misunderstanding = detectMisunderstanding(params.userMessage);
  if (misunderstanding) conflicts.push(misunderstanding);

  // 4. Повторения
  if (params.previousResponses) {
    const repetition = detectRepetition(params.aiResponse, params.previousResponses);
    if (repetition) conflicts.push(repetition);
  }

  // 5. Неуместный тон
  const tone = detectInappropriateTone(params.userMessage, params.aiResponse);
  if (tone) conflicts.push(tone);

  // 6. Технические ошибки
  const technical = detectTechnicalError(params.responseTime, params.error || null);
  if (technical) conflicts.push(technical);

  // 7. Неполный ответ
  const incomplete = detectIncompleteAnswer(params.userMessage, params.aiResponse);
  if (incomplete) conflicts.push(incomplete);

  // Логируем конфликты в БД
  if (conflicts.length > 0) {
    await logConflictsToDatabase(conflicts, params);
  }

  return conflicts;
}

// ============================================
// ЛОГИРОВАНИЕ В БД
// ============================================

async function logConflictsToDatabase(
  conflicts: Conflict[],
  params: {
    userMessage: string;
    aiResponse: string;
    threadId: string;
    userId: string;
    responseTime: number;
    tokenCount?: number;
    model?: string;
  }
) {
  try {
    for (const conflict of conflicts) {
      const { error } = await supabase.rpc("log_bot_conflict", {
        p_thread_id: params.threadId,
        p_message_id: null, // будет заполнено позже
        p_user_id: params.userId,
        p_conflict_type: conflict.type,
        p_severity: conflict.severity,
        p_user_message: params.userMessage,
        p_ai_response: params.aiResponse,
        p_detected_issue: `${conflict.detected_issue}\n\nРЕШЕНИЕ: ${conflict.suggestion}`,
        p_response_time_ms: params.responseTime,
        p_token_count: params.tokenCount || null,
        p_model: params.model || null,
      });

      if (error) {
        console.error("Ошибка логирования конфликта:", error);
      }
    }
  } catch (err) {
    console.error("Ошибка при логировании конфликтов:", err);
  }
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Простой расчёт similarity (Jaccard)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Получить рекомендации для типа конфликта
 */
export function getConflictRecommendation(type: ConflictType): string {
  const recommendations: Record<ConflictType, string> = {
    INCORRECT_ANSWER: "→ Проверить knowledge base\n→ Добавить disclaimer о проверке источников\n→ Уведомить админа для ручной проверки",
    HALLUCINATION: "→ СРОЧНО: Обновить context с актуальным списком уроков\n→ Добавить fact-checking перед отправкой\n→ Улучшить prompt: отвечать ТОЛЬКО на основе данных курса",
    MISUNDERSTOOD_QUESTION: "→ Улучшить prompt: если не уверен - спросить уточнение\n→ Добавить clarification question перед ответом\n→ Обучить на примерах из этой категории",
    REPETITIVE_ANSWER: "→ Проверять similarity перед отправкой (> 80% = перефразировать)\n→ Добавить в context: избегать повторов\n→ Дополнять новой информацией",
    INAPPROPRIATE_TONE: "→ Обновить prompt: примеры дружелюбного тона\n→ Убрать фразы-триггеры\n→ Добавить tone checker перед отправкой",
    TECHNICAL_ERROR: "→ Увеличить timeout до 60 секунд\n→ Добавить retry механизм (3 попытки)\n→ Fallback: извинение + попробуйте позже",
    INCOMPLETE_ANSWER: "→ Увеличить max_tokens для сложных тем\n→ Обновить prompt: давать развёрнутые ответы\n→ Добавить follow-up: \"Хочешь подробнее?\"",
  };

  return recommendations[type];
}

