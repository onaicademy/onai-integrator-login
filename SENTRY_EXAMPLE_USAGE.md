# 🛡️ SENTRY MONITORING - Примеры использования

## 📋 Содержание

1. [Frontend Examples](#frontend-examples)
2. [Backend Examples](#backend-examples)
3. [Critical Tripwire Flows](#critical-tripwire-flows)
4. [Common Patterns](#common-patterns)

---

## Frontend Examples

### 1. Мониторинг загрузки урока (TripwireLesson.tsx)

```typescript
import { monitorLessonLoading, Sentry } from '@/utils/sentryMonitoring';

const TripwireLesson = () => {
  const { lessonId } = useParams();

  const loadLesson = async () => {
    try {
      // ✅ Мониторим загрузку урока
      const lesson = await monitorLessonLoading(lessonId!, async () => {
        const response = await fetch(`/api/tripwire/lessons/${lessonId}`);
        if (!response.ok) throw new Error('Failed to load lesson');
        return response.json();
      });

      setLesson(lesson);
    } catch (error) {
      // ❌ Ошибка автоматически отправится в Sentry
      console.error('Error loading lesson:', error);
    }
  };

  useEffect(() => {
    loadLesson();
  }, [lessonId]);
};
```

### 2. Мониторинг AI генерации (AI Curator Chat)

```typescript
import { monitorAIGeneration } from '@/utils/sentryMonitoring';

const sendMessageToAI = async (message: string) => {
  return await monitorAIGeneration(
    'ai_curator_chat',
    { 
      lessonId,
      messageLength: message.length,
      userId: user?.id,
    },
    async () => {
      const response = await fetch('/api/tripwire/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          lessonId,
          chatHistory,
        }),
      });

      if (!response.ok) throw new Error('AI request failed');
      return response.json();
    }
  );
};
```

### 3. Мониторинг видео плеера

```typescript
import { monitorVideoLoading } from '@/utils/sentryMonitoring';
import { Sentry } from '@/config/sentry';

const VideoPlayer = ({ videoId, videoUrl }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVideo = async () => {
      try {
        // ✅ Мониторим загрузку видео
        await monitorVideoLoading(videoId, videoUrl, async () => {
          // Загружаем видео через Plyr или native HTML5
          const video = document.querySelector('video');
          if (!video) throw new Error('Video element not found');

          return new Promise((resolve, reject) => {
            video.onloadeddata = () => {
              setLoading(false);
              resolve(true);
            };
            video.onerror = (error) => {
              reject(new Error('Video failed to load'));
            };
            video.src = videoUrl;
          });
        });

        // ✅ Track video started
        Sentry.addBreadcrumb({
          category: 'video',
          message: 'Video started playing',
          level: 'info',
          data: { videoId, videoUrl },
        });

      } catch (error) {
        // ❌ Video load error tracked
        console.error('Video load error:', error);
      }
    };

    loadVideo();
  }, [videoId, videoUrl]);
};
```

### 4. Отслеживание оплаты

```typescript
import { monitorPaymentProcessing } from '@/utils/sentryMonitoring';

const handlePayment = async (paymentData: PaymentData) => {
  try {
    const result = await monitorPaymentProcessing(
      {
        method: paymentData.method,
        amount: paymentData.amount,
        currency: 'RUB',
      },
      async () => {
        const response = await fetch('/api/tripwire/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentData),
        });

        if (!response.ok) throw new Error('Payment failed');
        return response.json();
      }
    );

    console.log('Payment successful:', result);
  } catch (error) {
    // ❌ Payment error tracked
    console.error('Payment error:', error);
  }
};
```

### 5. Мониторинг API запросов

```typescript
import { monitorAPIRequest } from '@/utils/sentryMonitoring';

const updateProgress = async (lessonId: string, progress: number) => {
  return await monitorAPIRequest(
    '/api/tripwire/progress',
    'POST',
    async () => {
      const response = await fetch('/api/tripwire/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, progress }),
      });

      if (!response.ok) throw new Error('Failed to update progress');
      return response.json();
    }
  );
};
```

---

## Backend Examples

### 1. Мониторинг AI генерации (Groq/OpenAI)

```typescript
import { monitorAIGeneration } from '../utils/sentryMonitoring';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/generate-description', async (req, res) => {
  try {
    const { videoId, lessonId } = req.body;

    // ✅ Мониторим AI генерацию
    const description = await monitorAIGeneration(
      'groq',
      'lesson_description',
      { videoId, lessonId },
      async () => {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-70b-versatile',
          messages: [
            { role: 'system', content: 'You are an AI educator...' },
            { role: 'user', content: transcription },
          ],
        });

        return completion.choices[0].message.content;
      }
    );

    res.json({ description });
  } catch (error) {
    // ❌ Error tracked automatically
    res.status(500).json({ error: 'AI generation failed' });
  }
});
```

### 2. Мониторинг Email отправки (Resend)

```typescript
import { monitorEmailSending } from '../utils/sentryMonitoring';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendWelcomeEmail = async (
  email: string,
  name: string
) => {
  return await monitorEmailSending(
    'welcome_email',
    email,
    async () => {
      const result = await resend.emails.send({
        from: 'onAI Academy <noreply@onai.academy>',
        to: email,
        subject: `Добро пожаловать, ${name}!`,
        html: `<h1>Привет, ${name}!</h1>`,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result;
    }
  );
};
```

### 3. Мониторинг Database запросов

```typescript
import { monitorDBOperation } from '../utils/sentryMonitoring';
import { tripwireAdminSupabase } from '../config/supabase-tripwire';

router.get('/lessons/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Мониторим DB query
    const lesson = await monitorDBOperation(
      'select',
      'lessons',
      async () => {
        const { data, error } = await tripwireAdminSupabase
          .from('lessons')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data;
      }
    );

    res.json({ lesson });
  } catch (error) {
    // ❌ DB error tracked
    res.status(500).json({ error: 'Failed to load lesson' });
  }
});
```

### 4. Мониторинг File Processing (видео, PDF)

```typescript
import { monitorFileProcessing } from '../utils/sentryMonitoring';
import sharp from 'sharp';

router.post('/upload-thumbnail', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) throw new Error('No file uploaded');

    // ✅ Мониторим обработку файла
    const processedImage = await monitorFileProcessing(
      'image',
      file.originalname,
      'resize_and_compress',
      async () => {
        const buffer = await sharp(file.buffer)
          .resize(1280, 720, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();

        return buffer;
      }
    );

    res.json({ success: true });
  } catch (error) {
    // ❌ File processing error tracked
    res.status(500).json({ error: 'File processing failed' });
  }
});
```

### 5. Мониторинг External API (AmoCRM, Facebook)

```typescript
import { monitorExternalAPI } from '../utils/sentryMonitoring';
import axios from 'axios';

export const createAmoCRMLead = async (
  leadData: LeadData
) => {
  return await monitorExternalAPI(
    'amocrm',
    'create_lead',
    async () => {
      const response = await axios.post(
        'https://example.amocrm.ru/api/v4/leads',
        leadData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    }
  );
};
```

### 6. Обнаружение зацикливаний

```typescript
import { detectInfiniteLoop } from '../utils/sentryMonitoring';

router.post('/process-lessons', async (req, res) => {
  let iterations = 0;
  const lessons = await fetchLessons();

  for (const lesson of lessons) {
    iterations++;

    // ✅ Проверяем на зацикливание каждые 100 итераций
    if (iterations % 100 === 0) {
      detectInfiniteLoop('process_lessons', iterations, {
        current_lesson: lesson.id,
        total_lessons: lessons.length,
      });
    }

    // Защита от бесконечного цикла
    if (iterations > 10000) {
      throw new Error('Infinite loop detected - too many iterations');
    }

    await processLesson(lesson);
  }

  res.json({ processed: iterations });
});
```

### 7. Мониторинг памяти (Memory Leaks)

```typescript
import { checkMemoryUsage } from '../utils/sentryMonitoring';

// Проверяем память каждые 5 минут
setInterval(() => {
  const { heapUsedMB, heapTotalMB, usagePercent } = checkMemoryUsage();
  
  console.log(`[Memory] ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`);

  // Если память > 90% - очищаем кеш
  if (usagePercent > 90) {
    clearCache();
    console.log('[Memory] Cache cleared due to high memory usage');
  }
}, 5 * 60 * 1000);
```

---

## Critical Tripwire Flows

### 1. Полный flow загрузки урока

```typescript
// Frontend: TripwireLesson.tsx
const loadLessonFlow = async () => {
  try {
    // Step 1: Load lesson metadata
    const lesson = await monitorLessonLoading(lessonId!, async () => {
      const res = await fetch(`/api/tripwire/lessons/${lessonId}`);
      return res.json();
    });

    // Step 2: Load video
    const video = await monitorVideoLoading(
      lesson.bunny_video_id,
      lesson.video_url,
      async () => {
        const res = await fetch(`/api/tripwire/videos/${lessonId}`);
        return res.json();
      }
    );

    // Step 3: Load user progress
    const progress = await monitorAPIRequest(
      `/api/tripwire/progress/${lessonId}`,
      'GET',
      async () => {
        const res = await fetch(`/api/tripwire/progress/${lessonId}`);
        return res.json();
      }
    );

    setLesson(lesson);
    setVideo(video);
    setProgress(progress);

  } catch (error) {
    // ❌ Any error in the flow is tracked
    console.error('Lesson load flow error:', error);
  }
};
```

### 2. AI Curator Chat Flow

```typescript
// Backend: tripwire/ai.ts
router.post('/chat', async (req, res) => {
  try {
    const { message, lessonId, chatHistory } = req.body;

    // Step 1: Get lesson context
    const lesson = await monitorDBOperation('select', 'lessons', async () => {
      const { data } = await tripwireAdminSupabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();
      return data;
    });

    // Step 2: Get transcription
    const transcription = await monitorDBOperation(
      'select',
      'video_transcriptions',
      async () => {
        const { data } = await supabase
          .from('video_transcriptions')
          .select('transcript_text')
          .eq('video_id', lesson.bunny_video_id)
          .single();
        return data;
      }
    );

    // Step 3: Generate AI response
    const aiResponse = await monitorAIGeneration(
      'groq',
      'ai_curator_chat',
      { lessonId, messageLength: message.length },
      async () => {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
            { role: 'user', content: message },
          ],
        });
        return completion.choices[0].message.content;
      }
    );

    res.json({ response: aiResponse });
  } catch (error) {
    // ❌ Error tracked
    res.status(500).json({ error: 'AI chat failed' });
  }
});
```

### 3. Payment Flow

```typescript
// Frontend: TripwireProductPage.tsx
const handlePaymentFlow = async () => {
  try {
    // Step 1: Validate payment data
    Sentry.addBreadcrumb({
      category: 'payment',
      message: 'Payment validation started',
      level: 'info',
    });

    // Step 2: Process payment
    const result = await monitorPaymentProcessing(
      { method: 'card', amount: 990, currency: 'RUB' },
      async () => {
        const res = await fetch('/api/tripwire/payment', {
          method: 'POST',
          body: JSON.stringify(paymentData),
        });
        return res.json();
      }
    );

    // Step 3: Create user account
    await monitorAPIRequest('/api/tripwire/register', 'POST', async () => {
      const res = await fetch('/api/tripwire/register', {
        method: 'POST',
        body: JSON.stringify({ email, name }),
      });
      return res.json();
    });

    // Step 4: Send welcome email
    Sentry.addBreadcrumb({
      category: 'email',
      message: 'Sending welcome email',
      level: 'info',
    });

    navigate('/integrator/lesson/1');
  } catch (error) {
    // ❌ Payment flow error tracked
    console.error('Payment flow error:', error);
  }
};
```

---

## Common Patterns

### 1. Try-Catch с Sentry

```typescript
import { Sentry } from '@/config/sentry';

try {
  // Your code
  await someDangerousOperation();
} catch (error) {
  // ✅ Log to Sentry with context
  Sentry.captureException(error, {
    tags: {
      component: 'TripwireLesson',
      operation: 'load_lesson',
    },
    extra: {
      lessonId,
      userId: user?.id,
    },
  });

  // Show user-friendly error
  toast.error('Не удалось загрузить урок');
}
```

### 2. Breadcrumbs для trace

```typescript
import { Sentry } from '@/config/sentry';

// Step 1
Sentry.addBreadcrumb({
  category: 'user_action',
  message: 'User clicked "Start Lesson"',
  level: 'info',
});

// Step 2
Sentry.addBreadcrumb({
  category: 'api',
  message: 'Loading lesson data',
  level: 'info',
  data: { lessonId },
});

// Step 3
Sentry.addBreadcrumb({
  category: 'video',
  message: 'Initializing video player',
  level: 'info',
});

// Если произойдет ошибка, Sentry покажет весь trace!
```

### 3. Custom Performance Tracking

```typescript
import { Sentry } from '@/config/sentry';

const transaction = Sentry.startTransaction({
  name: 'complete_lesson_flow',
  op: 'user_flow',
});

try {
  // Step 1
  const span1 = transaction.startChild({
    op: 'load_lesson',
    description: 'Loading lesson data',
  });
  await loadLesson();
  span1.finish();

  // Step 2
  const span2 = transaction.startChild({
    op: 'load_video',
    description: 'Loading video',
  });
  await loadVideo();
  span2.finish();

  // Step 3
  const span3 = transaction.startChild({
    op: 'update_progress',
    description: 'Updating progress',
  });
  await updateProgress();
  span3.finish();

  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('unknown_error');
  throw error;
} finally {
  transaction.finish();
}
```

---

## 🎉 Результат

После внедрения Sentry мониторинга вы получите:

✅ **Полную видимость** - где и когда происходят ошибки
✅ **Быструю диагностику** - стек трейсы, breadcrumbs, session replay
✅ **Обнаружение зацикливаний** - автоматические алерты при долгих операциях
✅ **Performance insights** - какие API медленные, где узкие места
✅ **Проактивный мониторинг** - узнаете о проблемах до пользователей

🚀 **Серверы больше не будут падать неожиданно!**
