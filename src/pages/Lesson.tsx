import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/utils/apiClient";
import { 
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Download,
  FileText,
  Link as LinkIcon,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Clock,
  Book,
  Edit
} from "lucide-react";
import { LessonEditDialog } from "@/components/admin/LessonEditDialog";
import { MaterialPreviewDialog } from "@/components/MaterialPreviewDialog";
import { VideoPlayer } from "@/components/VideoPlayer";

const Lesson = () => {
  const { id, moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  
  // 🔍 ДИАГНОСТИКА
  console.log('🔍 Lesson.tsx - courseId (id):', id);
  console.log('🔍 Lesson.tsx - moduleId:', moduleId);
  console.log('🔍 Lesson.tsx - lessonId:', lessonId);
  console.log('🔍 Lesson.tsx - isAdmin:', isAdmin);
  
  // Lesson data
  const [lesson, setLesson] = useState<any>(null);
  const [video, setVideo] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // ✅ Все уроки модуля для навигации
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(-1);
  
  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Material preview dialog
  const [previewMaterial, setPreviewMaterial] = useState<any>(null);

  // Video player
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [videoQuality, setVideoQuality] = useState<'auto' | '1080p' | '720p' | '480p' | '360p'>('auto');
  
  // 📊 AI MENTOR TRACKING: Session ID и метрики для детекции проблем
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const [seeksCount, setSeeksCount] = useState(0);  // ✅ Счетчик перемоток
  const [pausesCount, setPausesCount] = useState(0); // ✅ Счетчик пауз
  const [maxSecondReached, setMaxSecondReached] = useState(0); // ✅ Максимальная секунда просмотра

  useEffect(() => {
    if (moduleId) {
      loadAllLessons(); // ✅ Загружаем все уроки модуля для навигации
    }
  }, [moduleId]); // ✅ Загружаем уроки только при смене модуля

  useEffect(() => {
    if (lessonId) {
      // ✅ Завершаем предыдущую сессию перед загрузкой нового урока
      if (video?.id && sessionId) {
        console.log('🎬 Смена урока - завершаем предыдущую сессию');
        endVideoSession();
      }
      
      // ✅ Сбрасываем метрики при смене урока
      setSeeksCount(0);
      setPausesCount(0);
      setMaxSecondReached(0);
      loadLessonData(); // ✅ Загружаем данные урока при смене lessonId
    }
  }, [lessonId]);

  // ✅ Обновляем индекс текущего урока при изменении lessonId или allLessons
  useEffect(() => {
    if (lessonId && allLessons.length > 0) {
      const currentIndex = allLessons.findIndex(l => l.id === parseInt(lessonId || '0'));
      setCurrentLessonIndex(currentIndex);
      console.log('📍 Обновлён индекс текущего урока:', currentIndex, 'из', allLessons.length);
    }
  }, [lessonId, allLessons]);

  // ✅ FIX: Используем ref для хранения актуальных метрик (избегаем stale closure)
  const metricsRef = useRef({ seeksCount: 0, pausesCount: 0, maxSecondReached: 0, currentTime: 0, playbackRate: 1 });
  
  // Обновляем ref при изменении метрик
  useEffect(() => {
    metricsRef.current = { seeksCount, pausesCount, maxSecondReached, currentTime, playbackRate };
  }, [seeksCount, pausesCount, maxSecondReached, currentTime, playbackRate]);

  // ✅ FIX: Завершаем видео-сессию при размонтировании (переход на другую страницу)
  useEffect(() => {
    return () => {
      // При уходе со страницы - отправляем метрики
      if (video?.id && sessionId && user?.id && lessonId) {
        const metrics = metricsRef.current;
        console.log('🚪 Unmount - завершаем видео-сессию');
        console.log('📊 Метрики на момент unmount:', metrics);
        
        const payload = {
          user_id: user.id,
          lesson_id: parseInt(lessonId),
          video_id: video.id,
          session_id: sessionId,
          seeks_count: metrics.seeksCount,
          pauses_count: metrics.pausesCount,
          max_second_reached: Math.floor(metrics.maxSecondReached),
          duration_seconds: Math.floor(metrics.currentTime),
          playback_speed: metrics.playbackRate,
        };
        
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        // ✅ FIX: Отправляем на Backend (port 3000), а не на Frontend (8080)!
        navigator.sendBeacon('http://localhost:3000/api/analytics/video-session/end', blob);
      }
    };
  }, [video?.id, sessionId, user?.id, lessonId]); // ✅ Только стабильные зависимости!

  // 🎬 Cleanup: Завершаем видео-сессию при закрытии страницы
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Используем navigator.sendBeacon для отправки данных при закрытии
      // ⚠️ Только если есть видео (урок может быть текстовым)
      if (sessionId && user?.id && lessonId && video?.id) {
        const metrics = metricsRef.current;
        
        // ✅ AI MENTOR: Отправляем ПОЛНЫЕ метрики через sendBeacon
        const payload = {
          user_id: user.id,
          lesson_id: parseInt(lessonId),
          video_id: video.id,              // ✅ UUID из video_content
          session_id: sessionId,
          seeks_count: metrics.seeksCount,         // ✅ Критично для AI Mentor!
          pauses_count: metrics.pausesCount,       // ✅ Критично для AI Mentor!
          max_second_reached: Math.floor(metrics.maxSecondReached),
          duration_seconds: Math.floor(metrics.currentTime),
          playback_speed: metrics.playbackRate,
        };
        
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        
        // ✅ FIX: Отправляем на Backend (port 3000)!
        navigator.sendBeacon('http://localhost:3000/api/analytics/video-session/end', blob);
        
        console.log('📡 sendBeacon (beforeunload): Метрики отправлены', payload);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionId, user?.id, lessonId, video?.id]); // ✅ Только стабильные зависимости!

  // ✅ Загрузить все уроки модуля для навигации
  const loadAllLessons = async () => {
    if (!moduleId) return;
    
    try {
      const response = await api.get(`/api/lessons?module_id=${moduleId}`);
      if (response?.lessons) {
        // ✅ Сортируем по order_index
        const sortedLessons = [...response.lessons].sort((a, b) => {
          const orderA = a.order_index ?? a.id ?? 0;
          const orderB = b.order_index ?? b.id ?? 0;
          return orderA - orderB;
        });
        setAllLessons(sortedLessons);
        
        // ✅ Находим индекс текущего урока
        const currentIndex = sortedLessons.findIndex(l => l.id === parseInt(lessonId || '0'));
        setCurrentLessonIndex(currentIndex);
        
        console.log('✅ Загружено уроков для навигации:', sortedLessons.length);
        console.log('📍 Текущий урок индекс:', currentIndex);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки уроков для навигации:', error);
    }
  };

  const loadLessonData = async () => {
    try {
      setLoading(true);
      
      // Загрузить урок
      console.log('📚 Загрузка урока:', lessonId);
      const lessonRes = await api.get(`/api/lessons/single/${lessonId}`);
      const lessonData = lessonRes?.lesson || lessonRes;
      setLesson(lessonData);
      
      // Загружаем статус завершения из БД
      try {
        // Получаем прогресс через API модуля
        const progressResponse = await api.get(`/api/lessons/progress/${moduleId}`);
        if (progressResponse?.progress && progressResponse.progress[parseInt(lessonId || '0')]) {
          setIsCompleted(true);
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки статуса урока:', error);
        // Fallback на localStorage для обратной совместимости
        const completed = localStorage.getItem(`lesson-${lessonId}-completed`);
        setIsCompleted(completed === "true");
      }

      // Загрузить видео (теперь только Bunny Stream с HLS)
      try {
        console.log('🎬 Загрузка видео для урока:', lessonId);
        const videoRes = await api.get(`/api/videos/lesson/${lessonId}`);
        const fetchedVideo = videoRes?.video || videoRes;
        
        // Если есть bunny_video_id, используем только его для HLS URL
        if (fetchedVideo?.bunny_video_id) {
          setVideo({
            ...fetchedVideo,
            video_url: `https://video.onai.academy/${fetchedVideo.bunny_video_id}/playlist.m3u8`,
            thumbnail_url: `https://video.onai.academy/${fetchedVideo.bunny_video_id}/thumbnail.jpg`
          });
          console.log('✅ Видео загружено (Bunny Stream HLS):', fetchedVideo.bunny_video_id);
        } else {
          // Если видео без bunny_video_id - значит оно старое (Bunny Storage)
          // Нужно перезагрузить видео через новый Bunny Stream
          console.warn('⚠️ Старое видео Bunny Storage обнаружено. Необходима перезагрузка через Bunny Stream.');
          setVideo(null);
        }
      } catch (error) {
        console.log('ℹ️ Видео не найдено для урока:', lessonId);
      }

      // Загрузить материалы
      try {
        console.log('📁 Загрузка материалов для урока:', lessonId);
        const materialsRes = await api.get(`/api/materials/${lessonId}`);
        setMaterials(materialsRes?.materials || materialsRes || []);
        console.log('✅ Материалов загружено:', materialsRes?.materials?.length || 0);
      } catch (error) {
        console.log('ℹ️ Материалы не найдены для урока:', lessonId);
      }

    } catch (error: any) {
      console.error('❌ Ошибка загрузки урока:', error);
      // ✅ Не используем мок-данные - показываем ошибку
      setLesson(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Обновление урока
  const handleUpdateLesson = async (data: any) => {
    try {
      console.log('📝 Обновление урока:', lessonId, data);
      await api.put(`/api/lessons/${lessonId}`, data);
      console.log('✅ Урок обновлен');
      // ✅ Перезагрузить урок и все уроки модуля (для обновления навигации)
      await loadLessonData();
      await loadAllLessons();
      setEditDialogOpen(false);
    } catch (error: any) {
      console.error('❌ Ошибка обновления урока:', error);
      alert(`Ошибка обновления урока: ${error?.message || 'Неизвестная ошибка'}`);
    }
  };

  // Трекинг события
  const trackEvent = async (eventType: string, data: any = {}) => {
    if (!video?.id || !user?.id) return;
    
    try {
      await api.post('/api/analytics/video-event', {
        user_id: user.id,
        lesson_id: parseInt(lessonId!),
        video_id: video.id,
        session_id: sessionId,
        event_type: eventType,
        position_seconds: currentTime,
        ...data,
      });
      console.log(`📊 Трекинг: ${eventType}`, data);
    } catch (error) {
      console.error('❌ Ошибка трекинга:', error);
    }
  };

  // 🎬 Завершение видео-сессии (агрегация метрик для AI Mentor)
  const endVideoSession = async () => {
    if (!sessionId || !user?.id || !lessonId) {
      console.log('ℹ️ Пропускаем завершение сессии - нет данных');
      return;
    }
    
    // ⚠️ Если нет видео - пропускаем (урок может быть текстовым)
    if (!video?.id) {
      console.log('ℹ️ Урок без видео, пропускаем video-session');
      return;
    }
    
    try {
      console.log('🎬 Завершаем видео-сессию:', { 
        sessionId, 
        lessonId,
        videoId: video.id, // ✅ UUID видео
        seeksCount, 
        pausesCount, 
        maxSecondReached 
      });
      
      // ✅ AI MENTOR: Отправляем полные метрики для детекции проблем
      const payload = {
        user_id: user.id,
        lesson_id: parseInt(lessonId),
        video_id: video.id,              // ✅ UUID из video_content
        session_id: sessionId,
        seeks_count: seeksCount,         // ✅ Количество перемоток
        pauses_count: pausesCount,       // ✅ Количество пауз
        max_second_reached: Math.floor(maxSecondReached), // ✅ Максимальная позиция
        duration_seconds: Math.floor(currentTime), // ✅ Время просмотра
        playback_speed: playbackRate,    // ✅ Скорость воспроизведения
      };
      
      console.log('📤 Отправляем payload:', payload);
      
      await api.post('/api/analytics/video-session/end', payload);
      
      console.log('✅ Видео-сессия завершена, метрики отправлены в AI Mentor');
      console.log('📊 Метрики:', { seeksCount, pausesCount, maxSecondReached });
      
      // ✅ Если seeks_count >= 5, AI Mentor создаст задачу через триггер!
      if (seeksCount >= 5) {
        console.log('⚠️ AI MENTOR: Обнаружена проблема с видео (много перемоток)!');
      }
    } catch (error) {
      console.error('❌ Ошибка завершения видео-сессии:', error);
    }
  };

  // Play/Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (playing) {
      videoRef.current.pause();
      trackEvent('pause');
      setPlaying(false);
      // ✅ AI MENTOR: Увеличиваем счетчик пауз
      setPausesCount(prev => prev + 1);
    } else {
      videoRef.current.play();
      trackEvent('play');
      setPlaying(true);
    }
  };

  // Обновление времени
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    
    // ✅ AI MENTOR: Отслеживаем максимальную секунду просмотра
    if (time > maxSecondReached) {
      setMaxSecondReached(time);
    }
    
    // Трекинг каждые 10 секунд
    if (Math.floor(time) % 10 === 0 && Math.floor(time) !== Math.floor(currentTime)) {
      trackEvent('progress', { 
        progress_percent: (time / duration) * 100 
      });
    }
  };

  // Загрузка метаданных
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    console.log('✅ Видео загружено, длительность:', videoRef.current.duration);
  };

  // Завершение видео
  const handleEnded = async () => {
    setPlaying(false);
    trackEvent('complete');
    console.log('✅ Видео завершено');
    
    // ✅ Явно отмечаем урок как завершенный
    try {
      if (user?.id && lessonId) {
        await api.post('/api/lessons/complete', {
          user_id: user.id,
          lesson_id: parseInt(lessonId),
          video_completed: true,
        });
        setIsCompleted(true);
        console.log('✅ Урок отмечен как завершенный');
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения завершения урока:', error);
    }
  };

  // Изменение скорости
  const changePlaybackRate = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    trackEvent('playback_rate_change', { playback_rate: rate });
  };

  // ✅ Изменение качества видео
  const changeVideoQuality = (quality: typeof videoQuality) => {
    setVideoQuality(quality);
    trackEvent('quality_change', { quality });
    console.log('🎬 Качество видео изменено:', quality);
    
    // ⚠️ NOTE: Для реальной работы нужны разные URL качеств от Cloudflare R2
    // Пример: video_720p.mp4, video_1080p.mp4
    // Сейчас только логируем изменение для аналитики
    
    // TODO: Когда будут разные качества:
    // const qualityUrl = getVideoUrlByQuality(video.id, quality);
    // if (videoRef.current) {
    //   const currentTime = videoRef.current.currentTime;
    //   videoRef.current.src = qualityUrl;
    //   videoRef.current.currentTime = currentTime;
    //   videoRef.current.play();
    // }
  };

  // Изменение громкости
  const changeVolume = (vol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = vol;
    setVolume(vol);
  };

  // Toggle Mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
    trackEvent('mute', { muted: !muted });
  };

  // 🎬 CINEMA MODE FULLSCREEN (как на GetCourse)
  const toggleFullscreen = () => {
    if (!videoRef.current) {
      console.error('❌ videoRef не найден');
      return;
    }
    
    const videoElement = videoRef.current as any;
    const doc = document as any;
    
    try {
      // Проверяем текущее состояние fullscreen
      const isFullscreen = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      
      if (isFullscreen) {
        // Выход из fullscreen
        if (doc.exitFullscreen) {
          doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
        console.log('✅ Вышли из cinema mode');
        trackEvent('exit_fullscreen');
      } else {
        // ✅ Вход в CINEMA MODE - разворачиваем ТОЛЬКО ВИДЕО!
        if (videoElement.requestFullscreen) {
          videoElement.requestFullscreen().catch((err: any) => {
            console.error('❌ requestFullscreen failed:', err);
          });
        } else if (videoElement.webkitEnterFullscreen) {
          // iOS Safari - специальный метод для видео
          videoElement.webkitEnterFullscreen();
        } else if (videoElement.webkitRequestFullscreen) {
          // Safari desktop
          videoElement.webkitRequestFullscreen();
        } else if (videoElement.mozRequestFullScreen) {
          // Firefox
          videoElement.mozRequestFullScreen();
        } else if (videoElement.msRequestFullscreen) {
          // IE/Edge legacy
          videoElement.msRequestFullscreen();
        } else {
          console.error('❌ Fullscreen API не поддерживается');
          alert('Ваш браузер не поддерживает полноэкранный режим');
          return;
        }
        console.log('✅ Cinema mode активирован (только видео)');
        trackEvent('fullscreen');
      }
    } catch (error: any) {
      console.error('❌ Ошибка cinema mode:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message
      });
    }
  };

  // Seek
  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    trackEvent('seek', { seek_to_seconds: time });
    // ✅ AI MENTOR: Увеличиваем счетчик перемоток
    setSeeksCount(prev => prev + 1);
  };

  // Форматирование времени
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = async () => {
    try {
      console.log('✅ Завершение урока:', lessonId);
      
      // 🎬 Сначала завершаем видео-сессию (отправляем метрики)
      await endVideoSession();
      
      const response = await api.post(`/api/lessons/${lessonId}/complete`);
      
      if (response?.success) {
        setIsCompleted(true);
        trackEvent('lesson_complete');
        console.log('✅ Урок успешно завершен');
        
        // Показываем уведомление
        // TODO: Добавить toast уведомление
      } else {
        console.error('❌ Ошибка завершения урока:', response);
        // TODO: Показать ошибку пользователю
      }
    } catch (error: any) {
      console.error('❌ Ошибка завершения урока:', error);
      
      // Проверяем, есть ли домашнее задание
      if (error?.response?.data?.error?.includes('домашнее задание')) {
        // TODO: Показать сообщение о необходимости выполнить домашнее задание
        alert('Для завершения урока необходимо выполнить домашнее задание и дождаться проверки куратором.');
      } else {
        // TODO: Показать общую ошибку
        alert('Не удалось завершить урок. Попробуйте еще раз.');
      }
    }
  };

  // ✅ Навигация к следующему уроку по order_index
  const handleNext = () => {
    if (currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentLessonIndex + 1];
      if (nextLesson) {
        console.log('➡️ Переход к следующему уроку:', nextLesson.id, nextLesson.title);
        navigate(`/course/${id}/module/${moduleId}/lesson/${nextLesson.id}`);
      }
    } else {
      console.log('ℹ️ Следующий урок не найден');
      // Можно показать toast или вернуться к модулю
    }
  };

  // ✅ Навигация к предыдущему уроку
  const handlePrevious = () => {
    if (currentLessonIndex > 0) {
      const prevLesson = allLessons[currentLessonIndex - 1];
      if (prevLesson) {
        console.log('⬅️ Переход к предыдущему уроку:', prevLesson.id, prevLesson.title);
        navigate(`/course/${id}/module/${moduleId}/lesson/${prevLesson.id}`);
      }
    }
  };

  // ✅ Получить номер урока (1-based для отображения)
  const getLessonNumber = () => {
    return currentLessonIndex >= 0 ? currentLessonIndex + 1 : 0;
  };

  // ✅ Проверка наличия следующего/предыдущего урока
  const hasNextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1;
  const hasPreviousLesson = currentLessonIndex > 0;

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-4 h-4" />;
      case "link":
        return <LinkIcon className="w-4 h-4" />;
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-[#00FF88] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Загрузка урока...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-4">Урок не найден</p>
          <Button onClick={() => navigate(`/course/${id}/module/${moduleId}`)}>
            Вернуться к модулю
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Neural Network Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Floating Neural Nodes */}
        {Array.from({ length: 30 }).map((_, i) => {
          const size = 2 + Math.random() * 4;
          const x = Math.random() * 100;
          const y = Math.random() * 100;
          const duration = 10 + Math.random() * 20;
          
          return (
            <motion.div
              key={`node-${i}`}
              className="absolute rounded-full bg-[#00FF88]"
              style={{
                width: size,
                height: size,
                left: `${x}%`,
                top: `${y}%`,
                boxShadow: `0 0 ${size * 4}px rgba(0, 255, 136, 0.6)`,
              }}
              animate={{
                x: [0, Math.random() * 40 - 20, 0],
                y: [0, Math.random() * 40 - 20, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 5,
              }}
            />
          );
        })}
        
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00FF88" stopOpacity="0" />
              <stop offset="50%" stopColor="#00FF88" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00FF88" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Линии - ОТКЛЮЧЕНЫ при видео для производительности */}
          {!playing && Array.from({ length: 10 }).map((_, i) => {
            const x1 = Math.random() * 100;
            const y1 = Math.random() * 100;
            const x2 = Math.random() * 100;
            const y2 = Math.random() * 100;
            
            return (
              <motion.line
                key={`line-${i}`}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="url(#lineGradient)"
                strokeWidth="1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: [0, 1, 0],
                  opacity: [0, 0.4, 0],
                }}
                transition={{
                  duration: 8 + Math.random() * 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: Math.random() * 3,
                }}
                style={{ willChange: 'opacity' }} // ✅ GPU оптимизация
              />
            );
          })}
        </svg>
        
        {/* Data Particles - ОТКЛЮЧЕНЫ при воспроизведении видео для производительности */}
        {!playing && Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-[#00FF88] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              willChange: 'transform, opacity', // ✅ GPU оптимизация
            }}
            animate={{
              y: [0, -100, -200, -300],
              x: [0, Math.random() * 50 - 25],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 6,
            }}
          />
        ))}
      </div>

      {/* Shooting Stars / Comets - ОТКЛЮЧЕНЫ при видео для производительности */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {!playing && Array.from({ length: 3 }).map((_, i) => {
          const startX = Math.random() * 100;
          const startY = Math.random() * 80;
          const angle = 30 + Math.random() * 40;
          const duration = 0.8 + Math.random() * 0.4;
          const delay = Math.random() * 0.3;
          const size = 4 + Math.random() * 3;
          const tailLength = 120 + Math.random() * 80;
          
          return (
            <motion.div
              key={`comet-${i}`}
              className="absolute"
              style={{
                left: `${startX}%`,
                top: `${startY}%`,
              }}
              initial={{ opacity: 0 }}
              animate={{
                x: [0, Math.cos(angle * Math.PI / 180) * 1500],
                y: [0, Math.sin(angle * Math.PI / 180) * 1500],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration,
                repeat: Infinity,
                ease: "easeIn",
                delay,
                repeatDelay: 7,
              }}
            >
              <div
                className="absolute bg-white rounded-full"
                style={{
                  width: size,
                  height: size,
                  boxShadow: `
                    0 0 ${size * 6}px rgba(255, 255, 255, 1),
                    0 0 ${size * 3}px rgba(220, 220, 255, 0.8),
                    0 0 ${size}px rgba(255, 255, 255, 1)
                  `,
                }}
              />
              <motion.div
                className="absolute top-0 left-0 origin-left"
                style={{
                  width: tailLength,
                  height: 3,
                  background: 'linear-gradient(90deg, rgba(240, 240, 255, 0.8) 0%, rgba(200, 200, 230, 0.5) 30%, rgba(160, 160, 200, 0.3) 60%, transparent 100%)',
                  transform: `rotate(${180 - angle}deg)`,
                  filter: 'blur(1px)',
                  boxShadow: '0 0 8px rgba(200, 200, 240, 0.4)',
                }}
              />
            </motion.div>
          );
        })}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 flex items-center gap-3 flex-wrap"
        >
          <Button
            variant="ghost"
            onClick={() => {
              console.log('🔙 Навигация назад к курсу, courseId:', id);
              if (id) {
                navigate(`/course/${id}`);
              } else {
                console.error('❌ courseId отсутствует! Переход на /courses');
                navigate('/courses');
              }
            }}
            className="text-gray-400 hover:text-[#00FF88] hover:bg-[#00FF88]/10 gap-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад к курсу
          </Button>
          
          <span className="text-gray-600">/</span>
          
          <Button
            variant="ghost"
            onClick={() => {
              console.log('🔙 Навигация назад к модулю, courseId:', id, 'moduleId:', moduleId);
              if (id && moduleId) {
                navigate(`/course/${id}/module/${moduleId}`);
              } else {
                console.error('❌ courseId или moduleId отсутствует! Переход на /courses');
                navigate('/courses');
              }
            }}
            className="text-gray-400 hover:text-[#00FF88] hover:bg-[#00FF88]/10 gap-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад к модулю
          </Button>
        </motion.div>

        {/* Lesson Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-xs sm:text-sm text-gray-400 uppercase tracking-wide">
              Модуль {moduleId} • Урок {getLessonNumber()} из {allLessons.length}
            </span>
            {isCompleted && (
              <div className="flex items-center gap-1.5 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-full px-3 py-1">
                <CheckCircle2 className="w-4 h-4 text-[#00FF88]" />
                <span className="text-[#00FF88] text-xs sm:text-sm font-semibold">Завершено</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 font-display">
            {lesson.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-3xl leading-relaxed mb-4">
            {lesson.description}
          </p>
          
          {/* ✅ Кнопка "Редактировать" для админа */}
          {isAdmin && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Клик по кнопке "Редактировать урок"');
                console.log('🖱️ Текущее состояние editDialogOpen:', editDialogOpen);
                setEditDialogOpen(true);
                console.log('🖱️ Установлено editDialogOpen = true');
              }}
              className="mt-4 text-gray-300 hover:text-[#00FF88] hover:bg-[#00FF88]/10 border-gray-700 hover:border-[#00FF88]/30 relative z-50"
            >
              <Edit className="mr-2 h-4 w-4" />
              Редактировать урок
            </Button>
          )}
        </motion.header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Video Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* 🎥 BunnyCDN Video Player */}
            {video?.bunny_video_id ? (
              <VideoPlayer 
                videoId={video.bunny_video_id}
                title={lesson?.title || 'Lesson Video'}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                autoPlay={false}
              />
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-[#00FF88]/20 shadow-lg shadow-[#00FF88]/10">
                <div className="aspect-video bg-[#0a0a0f] flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Видео еще не загружено</p>
                  </div>
                </div>
              </div>
            )}

            {/* Video Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={handleComplete}
                disabled={isCompleted}
                className={`flex-1 font-semibold rounded-xl transition-all ${
                  isCompleted 
                    ? "bg-gray-800 text-gray-400 cursor-not-allowed" 
                    : "bg-[#00FF88] text-black hover:bg-[#00cc88] shadow-lg shadow-[#00FF88]/30"
                }`}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {isCompleted ? "Урок завершён" : "Завершить урок"}
              </Button>
              <div className="flex gap-3 w-full">
                {/* ✅ Кнопка "Предыдущий урок" */}
                {hasPreviousLesson && (
                  <Button
                    size="lg"
                    onClick={handlePrevious}
                    variant="outline"
                    className="flex-1 bg-transparent border-2 border-[#00FF88]/40 text-[#00FF88] hover:bg-[#00FF88]/10 hover:border-[#00FF88] font-semibold rounded-xl transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Предыдущий урок
                  </Button>
                )}
                
                {/* ✅ Кнопка "Следующий урок" */}
                {hasNextLesson ? (
                  <Button
                    size="lg"
                    onClick={handleNext}
                    className="flex-1 bg-transparent border-2 border-[#00FF88]/40 text-[#00FF88] hover:bg-[#00FF88]/10 hover:border-[#00FF88] font-semibold rounded-xl transition-all"
                  >
                    Следующий урок
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => navigate(`/course/${id}/module/${moduleId}`)}
                    className="flex-1 bg-transparent border-2 border-[#00FF88]/40 text-[#00FF88] hover:bg-[#00FF88]/10 hover:border-[#00FF88] font-semibold rounded-xl transition-all"
                  >
                    Вернуться к модулю
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </motion.section>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Lesson Info Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#1a1a24] border border-gray-800 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center">
                  <Play className="w-6 h-6 text-[#00FF88]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Длительность</p>
                  <p className="text-xl font-bold text-white">
                    {lesson.duration_minutes ? `${lesson.duration_minutes} мин` : formatTime(duration)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Прогресс модуля</span>
                  <span className="text-[#00FF88] font-semibold">60%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#00FF88] to-[#00cc88]"
                    initial={{ width: 0 }}
                    animate={{ width: "60%" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Materials Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#1a1a24] border border-gray-800 rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Book className="w-5 h-5 text-[#00FF88]" />
                <h3 className="text-lg font-bold text-white">
                  Материалы урока
                </h3>
              </div>
              
              {materials.length > 0 ? (
                <div className="space-y-2">
                  {materials.map((material, index) => (
                    <button
                      key={material.id || index}
                      onClick={() => setPreviewMaterial(material)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-black/40 hover:bg-[#00FF88]/10 border border-gray-800 hover:border-[#00FF88]/30 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#00FF88]/10 flex items-center justify-center text-[#00FF88] group-hover:bg-[#00FF88]/20 transition-colors">
                        {getMaterialIcon(material.type || material.file_type)}
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-sm text-gray-300 group-hover:text-[#00FF88] transition-colors block">
                          {material.display_name || material.filename || material.title}
                        </span>
                        {material.file_size_bytes && (
                          <span className="text-xs text-gray-500">
                            {(material.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                      <Download className="w-4 h-4 text-gray-500 group-hover:text-[#00FF88] transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  Материалы пока не загружены
                </p>
              )}
            </motion.div>

            {/* Tips Card */}
            {lesson?.tip && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-[#00FF88]/10 to-[#00cc88]/5 border border-[#00FF88]/30 rounded-2xl p-6"
              >
                <h3 className="text-base font-bold text-[#00FF88] mb-3 flex items-center gap-2">
                  <span className="text-xl">💡</span>
                  Совет по уроку
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {lesson.tip}
                </p>
              </motion.div>
            )}
          </aside>
        </div>
      </div>
      
      {/* ✅ Диалог редактирования урока */}
      {isAdmin && lesson && (
        <LessonEditDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            // ✅ Перезагрузить данные урока и все уроки модуля после закрытия
            loadLessonData();
            loadAllLessons();
          }}
          onSave={handleUpdateLesson}
          lesson={lesson.id ? {
            id: lesson.id,
            title: lesson.title || '',
            description: lesson.description || '',
            duration_minutes: lesson.duration_minutes || 0,
            tip: (lesson as any).tip || ''
          } : null}
          moduleId={parseInt(moduleId!)}
        />
      )}
      
      {/* Material Preview Dialog */}
      <MaterialPreviewDialog
        open={!!previewMaterial}
        onClose={() => setPreviewMaterial(null)}
        material={previewMaterial}
      />
    </div>
  );
};

export default Lesson;
