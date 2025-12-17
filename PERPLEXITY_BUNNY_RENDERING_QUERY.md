# 🎬 ЗАПРОС ДЛЯ PERPLEXITY: АРХИТЕКТУРА ОТСЛЕЖИВАНИЯ РЕНДЕРИНГА BUNNYCDN

## 🎯 ПРОБЛЕМА

В нашем онлайн-курсе (React + TypeScript + Node.js + BunnyCDN Stream API) после загрузки видео на BunnyCDN студенты видят **черное окно с текстом "Видео еще не загружено"** без какой-либо информации о процессе:

- ❌ Не видно, что видео загружается
- ❌ Не видно прогресса транскодинга (encoding progress 0-100%)
- ❌ Не видно статуса обработки (queued → processing → finished)
- ❌ Длительность показывается как "0 минут" вместо реальной
- ❌ Студент не понимает, нужно ли ждать или видео вообще не загрузилось

## 📦 ТЕКУЩАЯ РЕАЛИЗАЦИЯ

### Backend (Node.js + Express)

**Endpoint для проверки статуса:**
```typescript
// GET /api/videos/bunny-status/:videoId
router.get('/bunny-status/:videoId', async (req, res) => {
  const { videoId } = req.params;
  
  const bunnyResponse = await axios.get(
    `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
    { headers: { 'AccessKey': BUNNY_API_KEY } }
  );

  const videoData = bunnyResponse.data;
  
  return res.json({
    success: true,
    status: videoData.status === 4 ? 'ready' : 'processing',
    progress: videoData.encodeProgress || 0,
    bunnyStatus: videoData.status,
    availableResolutions: videoData.availableResolutions
  });
});
```

**BunnyCDN Stream API возвращает:**
```json
{
  "videoLibraryId": 12345,
  "guid": "abc-123-def",
  "title": "Lesson 69",
  "dateUploaded": "2024-12-17T10:30:00Z",
  "views": 0,
  "isPublic": true,
  "length": 1847,
  "status": 3,
  "framerate": 30,
  "width": 1920,
  "height": 1080,
  "availableResolutions": "1080p,720p,480p,360p",
  "thumbnailCount": 1,
  "encodeProgress": 67,
  "storageSize": 156789234,
  "captions": [],
  "hasMP4Fallback": false,
  "collectionId": "",
  "thumbnailFileName": "thumbnail.jpg",
  "averageWatchTime": 0,
  "totalWatchTime": 0,
  "category": "",
  "chapters": [],
  "moments": [],
  "metaTags": []
}
```

**Статусы BunnyCDN (`status` field):**
- `0` = Created (только создан, видео еще не загружено)
- `1` = Uploaded (файл загружен, ожидает обработки)
- `2` = Processing (начата обработка)
- `3` = Encoding (активно кодируется, есть `encodeProgress`)
- `4` = Finished (готово к воспроизведению)
- `5` = Resolution Finished (все разрешения готовы)
- `6` = Failed (ошибка обработки)

### Frontend (React + TypeScript)

**TripwireLesson.tsx (страница урока):**
```typescript
const [video, setVideo] = useState<any>(null);
const [isVideoProcessing, setIsVideoProcessing] = useState(false);
const [processingVideoId, setProcessingVideoId] = useState<string | null>(null);

// При загрузке урока проверяем статус ОДИН РАЗ
const statusRes = await api.get(`/api/videos/bunny-status/${videoId}`);
const { status: videoStatus, bunnyStatus } = statusRes;

if (videoStatus === 'ready' || bunnyStatus === 4) {
  setVideo({ ...fetchedVideo, video_url: `https://video.onai.academy/${videoId}/playlist.m3u8` });
  setIsVideoProcessing(false);
} else if (bunnyStatus === 3 || bunnyStatus === 2 || bunnyStatus === 1) {
  setProcessingVideoId(videoId);
  setIsVideoProcessing(true);
  setVideo(null);
}

// Рендер:
{isVideoProcessing && processingVideoId ? (
  <VideoProcessingOverlay 
    videoId={processingVideoId} 
    onComplete={() => loadLessonData()} 
  />
) : (
  <div>Видео еще не загружено</div>
)}
```

**VideoProcessingOverlay.tsx (компонент для отображения прогресса):**
```typescript
// ❌ ПРОБЛЕМА: Компонент есть, но не работает или показывает статичную информацию
export const VideoProcessingOverlay = ({ videoId, onComplete }) => {
  // НЕТ POLLING'А!
  // НЕТ ОБНОВЛЕНИЯ ПРОГРЕССА!
  return (
    <div className="aspect-video bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        <div className="text-xl">Обработка видео...</div>
        {/* НЕТ ПРОГРЕСС-БАРА! */}
      </div>
    </div>
  );
};
```

## ❓ ВОПРОСЫ К PERPLEXITY

### 1. **Архитектура Polling для BunnyCDN**

Как правильно реализовать **polling (опрос статуса)** для отслеживания прогресса транскодинга видео на BunnyCDN Stream?

**Требования:**
- Проверять статус каждые 3-5 секунд
- Показывать прогресс в реальном времени (0-100%)
- Останавливать polling при достижении статуса `4` (Finished)
- Обрабатывать ошибки (статус `6` = Failed)
- Автоматически загружать видео после завершения обработки
- Cleanup при размонтировании компонента

**Best practices:**
- Использовать `setInterval` или `setTimeout`?
- Где хранить polling logic: в React hook или в компоненте?
- Как избежать memory leaks?
- Как правильно отменять polling при unmount?

### 2. **UI/UX для статуса рендеринга**

Какие **UI-паттерны** использовать для отображения прогресса обработки видео?

**Нужно показать:**
- 🎬 Статус: "Загрузка...", "Обработка...", "Кодирование 67%", "Готово!"
- 📊 Прогресс-бар с процентами (0-100%)
- ⏱️ Предполагаемое время ожидания (optional)
- 🎥 Thumbnail видео (если доступен)
- ⚠️ Сообщения об ошибках (если статус = Failed)

**Референсы:**
- YouTube upload progress
- Vimeo encoding overlay
- Wistia video processing UI

### 3. **Backend Architecture**

Нужен ли **отдельный endpoint для polling** или можно переиспользовать существующий `/api/videos/bunny-status/:videoId`?

**Варианты:**
- **A)** Frontend вызывает `/bunny-status/:videoId` каждые 3 секунды (simple polling)
- **B)** Backend использует Server-Sent Events (SSE) для push-уведомлений
- **C)** Backend использует WebSockets для real-time обновлений
- **D)** Backend webhook от BunnyCDN (BunnyCDN вызывает наш API при изменении статуса)

**Что лучше для:**
- Низкой нагрузки на сервер?
- Простоты реализации?
- Real-time опыта пользователя?

### 4. **Оптимизация и Кэширование**

Как **кэшировать статус** и избежать лишних запросов к BunnyCDN API?

**Проблемы:**
- BunnyCDN API имеет rate limits (сколько запросов в минуту?)
- Несколько студентов могут смотреть одно видео → много дублирующих запросов
- Нужно ли кэшировать статус "Finished" навсегда?

**Решения:**
- Redis для кэширования статусов обработки?
- localStorage для фронтенда?
- Database field `transcoding_status` в таблице `video_content`?

### 5. **Обработка Edge Cases**

Как обрабатывать:
- ⏳ **Очень долгая обработка** (>10 минут): показывать ли кнопку "Обновить статус"?
- ❌ **Failed encoding**: давать ли админу возможность переzагрузить видео?
- 🔄 **Network errors**: retry logic для запросов к BunnyCDN API?
- 👥 **Multiple tabs open**: синхронизация статуса между вкладками?
- 📱 **Mobile**: оптимизация polling для экономии батареи?

### 6. **Integration с Video Player**

После завершения обработки видео нужно:
- ✅ Автоматически загрузить HLS playlist (`https://video.onai.academy/${videoId}/playlist.m3u8`)
- ✅ Инициализировать видео плеер (Plyr + HLS.js)
- ✅ Загрузить метаданные (duration, thumbnail)
- ✅ Обновить UI (скрыть overlay, показать плеер)

**Вопрос:**
- Нужно ли **pre-load** видео или начинать загрузку только при клике на Play?
- Как обрабатывать ситуацию, когда HLS playlist еще не готов, хотя BunnyCDN вернул status=4?

### 7. **Admin Experience**

Админам (которые загружают видео) нужно видеть:
- 📤 **Upload progress** (0-100%) во время загрузки файла
- 🎬 **Encoding progress** (0-100%) после загрузки
- ✅ **Success notification** после завершения обработки
- 📊 **Video metadata** (duration, resolution, file size)

**Вопрос:**
- Показывать ли это в отдельном Admin Dashboard или inline в форме редактирования урока?

## 🎯 ЖЕЛАЕМАЯ АРХИТЕКТУРА

Предложите **полную архитектуру** с:
1. ✅ **React Component** для отображения прогресса (с TypeScript типами)
2. ✅ **Custom Hook** `useVideoProcessingStatus(videoId)` для polling
3. ✅ **Backend Endpoint** (или улучшение существующего)
4. ✅ **UI/UX flow** (wireframe или описание)
5. ✅ **Error handling** и edge cases
6. ✅ **Performance optimization** (кэширование, debounce, rate limiting)

## 📚 ТЕХНОЛОГИИ

- **Frontend:** React 18, TypeScript, TanStack Query (React Query), Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express, Axios
- **Video Platform:** BunnyCDN Stream API
- **Database:** Supabase (PostgreSQL)
- **Video Player:** Plyr + HLS.js

## 🔗 РЕФЕРЕНСЫ

Пожалуйста, используйте:
- BunnyCDN Stream API documentation
- React best practices для polling
- Real-world примеры из YouTube, Vimeo, Wistia
- TypeScript patterns для video processing state

## 🚀 ЦЕЛЬ

Студент должен **всегда понимать** что происходит с видео:
- "Загружается..." → "Обработка 45%..." → "Готово! ▶️"
- Никогда не видеть черный экран без объяснений
- Автоматическое обновление UI без необходимости обновлять страницу

---

**СПАСИБО! Жду детальный архитектурный ответ с примерами кода! 🙏**


