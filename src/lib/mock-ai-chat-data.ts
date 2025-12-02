// Mock данные для тестирования интерфейса диалогов с AI-куратором

export interface MockAIThread {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  message_count: number;
  assistant_id: string;
  thread_id: string;
}

export interface MockAIMessage {
  id: string;
  thread_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  is_voice_message: boolean;
  transcription_text?: string;
  has_attachments: boolean;
  response_time_ms?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  lesson_reference?: string;
  lesson_timestamp?: number;
}

export interface MockAIMetrics {
  thread_id: string;
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  avg_response_time_ms: number;
  avg_sentiment_score: number;
  positive_interactions: number;
  neutral_interactions: number;
  negative_interactions: number;
  lessons_discussed: number;
  questions_asked: number;
}

// Генерируем mock данные
const generateMockThreads = (): MockAIThread[] => {
  const users = [
    { id: '1', name: 'Александр Иванов', email: 'alex.ivanov@example.com' },
    { id: '2', name: 'Мария Петрова', email: 'maria.petrova@example.com' },
    { id: '3', name: 'Дмитрий Сидоров', email: 'dmitry.sidorov@example.com' },
    { id: '4', name: 'Анна Козлова', email: 'anna.kozlova@example.com' },
    { id: '5', name: 'Сергей Волков', email: 'sergey.volkov@example.com' },
    { id: '6', name: 'Елена Морозова', email: 'elena.morozova@example.com' },
    { id: '7', name: 'Иван Новиков', email: 'ivan.novikov@example.com' },
    { id: '8', name: 'Ольга Лебедева', email: 'olga.lebedeva@example.com' },
  ];

  const topics = [
    'Как начать работу с платформой?',
    'Не могу понять задачу по Python',
    'Объясните, пожалуйста, про циклы',
    'Проблема с выполнением домашнего задания',
    'Как работает API?',
    'Вопрос про базы данных',
    'Нужна помощь с Git',
    'Не понимаю концепцию ООП',
  ];

  return users.map((user, index) => ({
    id: `thread-${index + 1}`,
    user_id: user.id,
    user_name: user.name,
    user_email: user.email,
    title: topics[index] || `Диалог ${index + 1}`,
    created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
    last_message_at: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
    message_count: Math.floor(Math.random() * 20) + 5,
    assistant_id: 'asst_123456789',
    thread_id: `thread_${index + 1}_${Date.now()}`,
  }));
};

const generateMockMessages = (threadId: string, count: number): MockAIMessage[] => {
  const messages: MockAIMessage[] = [];
  const userMessages = [
    'Привет! Можешь помочь с уроком?',
    'Не понимаю, как работает эта функция',
    'Можешь объяснить поподробнее?',
    'Спасибо, стало понятнее!',
    'А что если я хочу сделать по-другому?',
    'Отлично, попробую так',
    'У меня возникла ошибка при выполнении',
    'Не могу найти нужную информацию',
  ];

  const assistantMessages = [
    'Конечно! С чем именно тебе нужна помощь?',
    'Конечно, давай разберемся. Эта функция работает следующим образом...',
    'Рад, что помог! Если будут еще вопросы - обращайся.',
    'Да, конечно! Альтернативный способ - это...',
    'Понял! Попробуй и дай знать, если будут вопросы.',
    'Давай посмотрим на ошибку. Скорее всего проблема в...',
    'Попробуй посмотреть в разделе "Документация" или спроси у меня.',
    'Давай я помогу тебе разобраться. Начнем с основ...',
  ];

  let currentTime = Date.now() - count * 60 * 1000; // За последний час

  for (let i = 0; i < count; i++) {
    const isUser = i % 2 === 0;
    const messageIndex = Math.floor(i / 2) % userMessages.length;
    
    messages.push({
      id: `msg-${threadId}-${i}`,
      thread_id: threadId,
      user_id: 'user-1',
      role: isUser ? 'user' : 'assistant',
      content: isUser ? userMessages[messageIndex] : assistantMessages[messageIndex],
      created_at: new Date(currentTime).toISOString(),
      is_voice_message: Math.random() > 0.7 && isUser,
      transcription_text: Math.random() > 0.7 && isUser ? userMessages[messageIndex] : undefined,
      has_attachments: Math.random() > 0.8,
      response_time_ms: !isUser ? Math.floor(Math.random() * 3000) + 500 : undefined,
      sentiment: isUser 
        ? (Math.random() > 0.7 ? 'positive' : Math.random() > 0.5 ? 'neutral' : 'negative')
        : undefined,
      lesson_reference: Math.random() > 0.6 ? `lesson-${Math.floor(Math.random() * 10) + 1}` : undefined,
      lesson_timestamp: Math.random() > 0.7 ? Math.floor(Math.random() * 3600) : undefined,
    });

    currentTime += Math.random() * 5 * 60 * 1000; // От 0 до 5 минут между сообщениями
  }

  return messages;
};

export const mockAIThreads = generateMockThreads();

export const getMockMessages = (threadId: string): MockAIMessage[] => {
  const thread = mockAIThreads.find(t => t.id === threadId);
  if (!thread) return [];
  return generateMockMessages(threadId, thread.message_count);
};

export const getMockMetrics = (threadId: string): MockAIMetrics => {
  const messages = getMockMessages(threadId);
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  const responseTimes = assistantMessages
    .map(m => m.response_time_ms)
    .filter((t): t is number => t !== undefined);
  
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;

  const sentiments = messages
    .map(m => m.sentiment)
    .filter((s): s is 'positive' | 'neutral' | 'negative' => s !== undefined);
  
  const positiveCount = sentiments.filter(s => s === 'positive').length;
  const neutralCount = sentiments.filter(s => s === 'neutral').length;
  const negativeCount = sentiments.filter(s => s === 'negative').length;
  
  const avgSentimentScore = sentiments.length > 0
    ? (positiveCount * 1 + neutralCount * 0 + negativeCount * -1) / sentiments.length
    : 0;

  const lessonsDiscussed = new Set(
    messages
      .map(m => m.lesson_reference)
      .filter((l): l is string => l !== undefined)
  ).size;

  return {
    thread_id: threadId,
    total_messages: messages.length,
    user_messages: userMessages.length,
    assistant_messages: assistantMessages.length,
    avg_response_time_ms: avgResponseTime,
    avg_sentiment_score: avgSentimentScore,
    positive_interactions: positiveCount,
    neutral_interactions: neutralCount,
    negative_interactions: negativeCount,
    lessons_discussed: lessonsDiscussed,
    questions_asked: userMessages.filter(m => m.content.includes('?')).length,
  };
};

