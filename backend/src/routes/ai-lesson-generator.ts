import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { supabase } from '../config/supabase';
import Groq from 'groq-sdk';

const router = Router();

// Экспортируем для использования в других модулях
export { generateLessonAI };

// ✅ Groq Client (БЫСТРЕЕ И ДЕШЕВЛЕ чем OpenAI!)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * 🎯 AI-ГЕНЕРАЦИЯ ОПИСАНИЯ И СОВЕТОВ ПО УРОКУ
 * 
 * Работает для ОБЕИХ платформ:
 * - Основная платформа (lessons) ✅
 * - Tripwire (tripwire_lessons - если таблица существует) ✅
 * 
 * Процесс:
 * 1. Берет транскрибацию урока из video_transcriptions
 * 2. Отправляет в Groq (Llama 3.1 70B) - БЫСТРЕЕ и ДЕШЕВЛЕ! 🚀
 * 3. Генерирует описание (3-4 предложения для 10-классника)
 * 4. Генерирует советы (как лучше усвоить материал)
 * 5. Сохраняет в БД
 */

interface AIGenerationRequest {
  videoId: string;
  platform: 'main' | 'tripwire'; // Какая платформа
  lessonId: number;
}

/**
 * 🎯 ОСНОВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ (можно вызывать напрямую из кода)
 * 
 * Экспортируется для использования в transcriptionService и других местах.
 */
async function generateLessonAI(videoId: string, platform: 'main' | 'tripwire', lessonId: number) {
  console.log(`[AI Generator] 🎯 Генерируем описание и советы для урока ${lessonId} (${platform})`);

  // 1️⃣ Получаем транскрибацию из БД
  const { data: transcription, error: transcriptionError } = await supabase
    .from('video_transcriptions')
    .select('transcript_text, status')
    .eq('video_id', videoId)
    .eq('status', 'completed')
    .single();

  if (transcriptionError || !transcription) {
    console.error('[AI Generator] ❌ Транскрибация не найдена:', transcriptionError);
    throw new Error('Транскрибация не найдена или еще не готова');
  }

  if (!transcription.transcript_text) {
    throw new Error('Транскрибация пустая');
  }

  console.log(`[AI Generator] ✅ Транскрибация загружена (${transcription.transcript_text.length} символов)`);

  // 2️⃣ Генерируем описание и советы через Groq
  const prompt = `Ты - опытный методист образовательной AI-платформы onAI Academy.

На основе транскрибации видео-урока создай:

1. **ОПИСАНИЕ** - СТРОГО от 200 до 230 символов. Тезисно в формате:
   • Узнаем... (что изучим)
   • Научимся... (какие навыки получим)
   • Получим... (какой результат)

2. **СОВЕТЫ** - 3-4 практических рекомендации как лучше усвоить материал

ТРАНСКРИБАЦИЯ УРОКА:
"""
${transcription.transcript_text.slice(0, 6000)}
"""

КРИТИЧЕСКИ ВАЖНЫЕ ТРЕБОВАНИЯ:

📝 **ПУНКТУАЦИЯ:**
- ✅ КАЖДОЕ предложение ОБЯЗАТЕЛЬНО заканчивается точкой (.)
- ✅ Используй запятые где нужно
- ✅ Правильная пунктуация - это ОБЯЗАТЕЛЬНО!

📋 **ОПИСАНИЕ:**
- ⚠️ СТРОГО от 200 до 230 символов (НЕ МЕНЬШЕ 200!)
- Тезисный формат: "Узнаем..., научимся..., получим..."
- Каждый тезис заканчивается точкой

💡 **СОВЕТЫ:**
- Формат: **Совет 1:** Текст первого совета.
- Каждый совет НА НОВОЙ СТРОКЕ через \\n
- "Совет 1:", "Совет 2:", "Совет 3:" - это ЗАГОЛОВКИ (будут выделены жирным)
- После заголовка сразу пробел и текст совета
- Каждый совет ОБЯЗАТЕЛЬНО заканчивается точкой!
- Советы конкретные, практические, полезные

ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "description": "Узнаем базовые принципы работы нейросетей. Научимся применять AI-инструменты на практике. Получим понимание перспектив технологий.",
  "tips": "**Совет 1:** Начните с изучения базовых концепций и терминологии.\\n**Совет 2:** Практикуйтесь на реальных задачах после каждого урока.\\n**Совет 3:** Записывайте ключевые моменты для лучшего запоминания."
}

ВНИМАНИЕ: Точки в конце каждого предложения ОБЯЗАТЕЛЬНЫ!`;

  console.log('[AI Generator] 🤖 Отправляем запрос в Groq (Llama 3.3 70B)...');

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'Ты - методист образовательной платформы. Отвечай ТОЛЬКО валидным JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000,
    response_format: { type: 'json_object' }
  });

  const aiResponse = completion.choices[0].message.content;
  if (!aiResponse) {
    throw new Error('Groq вернул пустой ответ');
  }

  const { description, tips } = JSON.parse(aiResponse);

  console.log('[AI Generator] ✅ AI сгенерировал контент:', {
    descriptionLength: description.length,
    tipsLength: tips.length
  });

  // 3️⃣ Сохраняем в БД (в зависимости от платформы)
  const tableName = platform === 'tripwire' ? 'tripwire_lessons' : 'lessons';

  // Проверяем существует ли таблица tripwire_lessons
  if (platform === 'tripwire') {
    const { error: tableCheckError } = await supabase
      .from('tripwire_lessons')
      .select('id')
      .limit(1);

    if (tableCheckError) {
      console.log('[AI Generator] ⚠️ Таблица tripwire_lessons не существует, используем lessons');
      // Fallback на основную таблицу
      const { error: updateError } = await supabase
        .from('lessons')
        .update({
          ai_description: description,
          ai_tips: tips
        })
        .eq('id', lessonId);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Таблица существует, обновляем tripwire_lessons
      const { error: updateError } = await supabase
        .from('tripwire_lessons')
        .update({
          ai_description: description,
          ai_tips: tips
        })
        .eq('id', lessonId);

      if (updateError) {
        throw updateError;
      }
    }
  } else {
    // Основная платформа
    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        ai_description: description,
        ai_tips: tips
      })
      .eq('id', lessonId);

    if (updateError) {
      throw updateError;
    }
  }

  console.log(`[AI Generator] 💾 Сохранено в ${tableName} для урока ${lessonId}`);

  // 4️⃣ ЗАПИСЬ ЗАТРАТ
  try {
    const totalTokens = completion.usage?.total_tokens || 0;
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    
    // Groq pricing (бесплатен, но трекаем для статистики)
    // llama-3.3-70b: $0.00 (free tier)
    const costUsd = 0;

    if (platform === 'tripwire') {
      // ✅ TRIPWIRE: Записываем в tripwire_ai_costs
      await supabase.from('tripwire_ai_costs').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // System user
        cost_type: 'lesson_generation', // Новый тип затрат
        service: 'groq',
        model: 'llama-3.3-70b-versatile',
        tokens_used: totalTokens,
        cost_usd: costUsd,
        metadata: {
          lesson_id: lessonId,
          video_id: videoId,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          description_length: description.length,
          tips_length: tips.length
        }
      });
      console.log(`[AI Generator] ✅ Tripwire cost записан: ${totalTokens} tokens`);
    } else {
      // ✅ MAIN PLATFORM: Записываем в ai_token_usage
      await supabase.from('ai_token_usage').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // System user
        assistant_type: 'analyst', // Или 'generator' если добавим новый тип
        model_used: 'llama-3.3-70b-versatile',
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: totalTokens,
        prompt_cost_usd: '0',
        completion_cost_usd: '0',
        total_cost_usd: '0',
        context_type: 'lesson_generation',
        metadata: {
          lesson_id: lessonId,
          video_id: videoId,
          description_length: description.length,
          tips_length: tips.length
        }
      });
      console.log(`[AI Generator] ✅ Main platform cost записан: ${totalTokens} tokens`);
    }
  } catch (costError: any) {
    console.warn(`[AI Generator] ⚠️ Не удалось записать cost:`, costError.message);
  }

  // 5️⃣ Возвращаем результат
  return {
    description,
    tips,
    lessonId,
    platform,
    tokens: completion.usage?.total_tokens || 0
  };
}

router.post('/generate-lesson-ai', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { videoId, platform, lessonId } = req.body as AIGenerationRequest;
    
    // Вызываем функцию генерации
    const data = await generateLessonAI(videoId, platform, lessonId);
    
    return res.json({
      success: true,
      data
    });

  } catch (error: any) {
    console.error('[AI Generator] ❌ Ошибка:', error);
    return res.status(500).json({ 
      error: 'Ошибка генерации AI контента',
      details: error.message 
    });
  }
});

/**
 * 🔄 АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ при появлении транскрибации
 * 
 * Endpoint для webhook/trigger который:
 * 1. Находит уроки с транскрибацией но БЕЗ описания
 * 2. Генерирует для них описание и советы
 */
router.post('/auto-generate-missing', authenticateJWT, async (req: Request, res: Response) => {
  try {
    console.log('[AI Generator] 🔄 Запуск автоматической генерации для уроков без описания...');

    // Находим уроки БЕЗ описания но С транскрибацией
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, bunny_video_id')
      .is('ai_description', null)
      .not('bunny_video_id', 'is', null);

    if (lessonsError) {
      throw lessonsError;
    }

    if (!lessons || lessons.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Нет уроков для генерации',
        generated: 0 
      });
    }

    console.log(`[AI Generator] 📋 Найдено ${lessons.length} уроков без описания`);

    const results = [];

    // Генерируем для каждого урока
    for (const lesson of lessons) {
      try {
        // Проверяем есть ли транскрибация
        const { data: transcription } = await supabase
          .from('video_transcriptions')
          .select('video_id, status')
          .eq('video_id', lesson.bunny_video_id)
          .eq('status', 'completed')
          .single();

        if (!transcription) {
          console.log(`[AI Generator] ⏭️ Урок ${lesson.id}: транскрибация не готова`);
          continue;
        }

        // Генерируем через основной endpoint
        const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/ai/generate-lesson-ai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization || ''
          },
          body: JSON.stringify({
            videoId: lesson.bunny_video_id,
            platform: 'main',
            lessonId: lesson.id
          })
        });

        const result = await response.json() as { success: boolean };
        results.push({ lessonId: lesson.id, success: result.success });

        console.log(`[AI Generator] ✅ Урок ${lesson.id}: сгенерировано`);

        // Задержка чтобы не словить rate limit
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        console.error(`[AI Generator] ❌ Ошибка для урока ${lesson.id}:`, error.message);
        results.push({ lessonId: lesson.id, success: false, error: error.message });
      }
    }

    return res.json({
      success: true,
      message: `Сгенерировано для ${results.filter(r => r.success).length} из ${lessons.length} уроков`,
      results
    });

  } catch (error: any) {
    console.error('[AI Generator] ❌ Ошибка авто-генерации:', error);
    return res.status(500).json({ 
      error: 'Ошибка автоматической генерации',
      details: error.message 
    });
  }
});

export default router;

