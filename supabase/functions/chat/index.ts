import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const OPENAI_API_KEY = "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"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  try {
    const { messages } = await req.json()
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Ты - AI-ассистент образовательной платформы onAI Academy. 

ТВОЯ РОЛЬ:
- Помогать студентам с вопросами об искусственном интеллекте, нейросетях, автоматизации
- Отвечать на вопросы про обучение на платформе
- Быть дружелюбным, мотивирующим и профессиональным
- Говорить на русском языке

ЧТО ТЫ ЗНАЕШЬ:
- Основы AI и машинного обучения
- ChatGPT, GPT-4, Claude и другие LLM модели
- Автоматизация с помощью Make.com, n8n
- CRM системы и интеграции
- Telegram боты и API
- Prompt engineering

СТИЛЬ ОБЩЕНИЯ:
- Дружелюбный, но профессиональный
- Короткие и понятные ответы
- Используй эмодзи где уместно
- На "ты" со студентами
- Мотивируй продолжать обучение

onAI Academy специализируется на:
- Курс "Integrator 2.0" - автоматизация бизнес-процессов
- Курс "Creator 2.0" - создание AI-продуктов`
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500,
      })
    })

    const data = await response.json()
    
    return new Response(
      JSON.stringify({ message: data.choices[0].message.content }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})

