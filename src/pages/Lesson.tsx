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
  
  // Session ID для аналитики
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  useEffect(() => {
    if (moduleId) {
      loadAllLessons(); // ✅ Загружаем все уроки модуля для навигации
    }
  }, [moduleId]); // ✅ Загружаем уроки только при смене модуля

  useEffect(() => {
    if (lessonId) {
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

  // 🎬 Cleanup: Завершаем видео-сессию при закрытии страницы
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Используем navigator.sendBeacon для отправки данных при закрытии
      if (sessionId && user?.id && lessonId) {
        navigator.sendBeacon(
          `${window.location.origin}/api/analytics/video-session/end`,
          JSON.stringify({
            user_id: user.id,
            lesson_id: parseInt(lessonId),
            session_id: sessionId,
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // При размонтировании компонента тоже завершаем сессию
      endVideoSession();
    };
  }, [sessionId, user?.id, lessonId]);

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

      // Загрузить видео
      try {
        console.log('🎬 Загрузка видео для урока:', lessonId);
        const videoRes = await api.get(`/api/videos/lesson/${lessonId}`);
        setVideo(videoRes?.video || videoRes);
        console.log('✅ Видео загружено:', videoRes?.video?.video_url);
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
    
    try {
      console.log('🎬 Завершаем видео-сессию:', { sessionId, lessonId });
      await api.post('/api/analytics/video-session/end', {
        user_id: user.id,
        lesson_id: parseInt(lessonId),
        session_id: sessionId,
      });
      console.log('✅ Видео-сессия завершена, метрики отправлены в AI Mentor');
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
  const handleEnded = () => {
    setPlaying(false);
    trackEvent('complete');
    console.log('✅ Видео завершено');
  };

  // Изменение скорости
  const changePlaybackRate = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    trackEvent('playback_rate_change', { playback_rate: rate });
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

  // Fullscreen
  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) {
      console.error('❌ videoContainerRef не найден');
      return;
    }
    
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        console.log('✅ Вышли из полноэкранного режима');
      } else {
        await videoContainerRef.current.requestFullscreen();
        console.log('✅ Вошли в полноэкранный режим');
      }
      trackEvent('fullscreen_toggle');
    } catch (error) {
      console.error('❌ Ошибка переключения fullscreen:', error);
    }
  };

  // Seek
  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    trackEvent('seek', { seek_to_seconds: time });
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
          <div className="w-16 h-16 border-4 border-[#00ff00] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
              linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)
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
              className="absolute rounded-full bg-[#00ff00]"
              style={{
                width: size,
                height: size,
                left: `${x}%`,
                top: `${y}%`,
                boxShadow: `0 0 ${size * 4}px rgba(0, 255, 0, 0.6)`,
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
              <stop offset="0%" stopColor="#00ff00" stopOpacity="0" />
              <stop offset="50%" stopColor="#00ff00" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00ff00" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {Array.from({ length: 15 }).map((_, i) => {
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
              />
            );
          })}
        </svg>
        
        {/* Data Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-[#00ff00] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
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

      {/* Shooting Stars / Comets */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {Array.from({ length: 5 }).map((_, i) => {
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
            className="text-gray-400 hover:text-[#00ff00] hover:bg-[#00ff00]/10 gap-2 transition-colors"
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
            className="text-gray-400 hover:text-[#00ff00] hover:bg-[#00ff00]/10 gap-2 transition-colors"
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
              <div className="flex items-center gap-1.5 bg-[#00ff00]/10 border border-[#00ff00]/30 rounded-full px-3 py-1">
                <CheckCircle2 className="w-4 h-4 text-[#00ff00]" />
                <span className="text-[#00ff00] text-xs sm:text-sm font-semibold">Завершено</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
            {lesson.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-3xl leading-relaxed mb-4">
            {lesson.description}
          </p>
          
          {/* ✅ Кнопка "Редактировать" для админа */}
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(true)}
              className="mt-4 text-gray-300 hover:text-[#00ff00] hover:bg-[#00ff00]/10 border-gray-700 hover:border-[#00ff00]/30"
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
            {/* Video Player */}
            {video?.video_url ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#00ff00]/20 shadow-lg shadow-[#00ff00]/10">
                <div 
                  ref={videoContainerRef}
                  className="relative aspect-video bg-black"
                  onMouseEnter={() => setShowControls(true)}
                  onMouseLeave={() => playing && setShowControls(false)}
                >
                  <video
                    ref={videoRef}
                    src={video.video_url}
                    className="w-full h-full cursor-pointer"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    onClick={togglePlay}
                  />

                  {/* Play button overlay */}
                  {!playing && showControls && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <motion.button
                        onClick={togglePlay}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-20 h-20 rounded-full bg-[#00ff00]/20 border-2 border-[#00ff00] flex items-center justify-center backdrop-blur-sm"
                      >
                        <Play className="w-10 h-10 text-[#00ff00] ml-1" />
                      </motion.button>
                    </div>
                  )}

                  {/* Video Controls */}
                  {showControls && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4"
                    >
                      {/* Progress Bar */}
                      <div className="mb-4">
                        <input
                          type="range"
                          min="0"
                          max={duration || 100}
                          value={currentTime}
                          onChange={(e) => handleSeek(parseFloat(e.target.value))}
                          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00ff00]"
                        />
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Play/Pause */}
                          <button
                            onClick={togglePlay}
                            className="text-white hover:text-[#00ff00] transition-colors"
                          >
                            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                          </button>

                          {/* Volume */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={toggleMute}
                              className="text-white hover:text-[#00ff00] transition-colors"
                            >
                              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={volume}
                              onChange={(e) => changeVolume(parseFloat(e.target.value))}
                              className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00ff00]"
                            />
                          </div>

                          {/* Time */}
                          <span className="text-white text-sm font-mono">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Video Quality */}
                          <select
                            value={videoQuality}
                            onChange={(e) => {
                              const quality = e.target.value as typeof videoQuality;
                              setVideoQuality(quality);
                              console.log('✅ Качество видео изменено:', quality);
                            }}
                            className="bg-black/50 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-[#00ff00] outline-none cursor-pointer"
                            title="Качество видео"
                          >
                            <option value="auto">Авто</option>
                            <option value="1080p">1080p</option>
                            <option value="720p">720p</option>
                            <option value="480p">480p</option>
                            <option value="360p">360p</option>
                          </select>
                          
                          {/* Playback Speed */}
                          <select
                            value={playbackRate}
                            onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                            className="bg-black/50 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-[#00ff00] outline-none cursor-pointer"
                            title="Скорость воспроизведения"
                          >
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1">1x</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="1.75">1.75x</option>
                            <option value="2">2x</option>
                          </select>

                          {/* Fullscreen */}
                          <button
                            onClick={toggleFullscreen}
                            className="text-white hover:text-[#00ff00] transition-colors"
                          >
                            <Maximize className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-[#00ff00]/20 shadow-lg shadow-[#00ff00]/10">
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
                    : "bg-[#00ff00] text-black hover:bg-[#00cc00] shadow-lg shadow-[#00ff00]/30"
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
                    className="flex-1 bg-transparent border-2 border-[#00ff00]/40 text-[#00ff00] hover:bg-[#00ff00]/10 hover:border-[#00ff00] font-semibold rounded-xl transition-all"
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
                    className="flex-1 bg-transparent border-2 border-[#00ff00]/40 text-[#00ff00] hover:bg-[#00ff00]/10 hover:border-[#00ff00] font-semibold rounded-xl transition-all"
                  >
                    Следующий урок
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => navigate(`/course/${id}/module/${moduleId}`)}
                    className="flex-1 bg-transparent border-2 border-[#00ff00]/40 text-[#00ff00] hover:bg-[#00ff00]/10 hover:border-[#00ff00] font-semibold rounded-xl transition-all"
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
                <div className="w-12 h-12 rounded-xl bg-[#00ff00]/10 border border-[#00ff00]/20 flex items-center justify-center">
                  <Play className="w-6 h-6 text-[#00ff00]" />
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
                  <span className="text-[#00ff00] font-semibold">60%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#00ff00] to-[#00cc00]"
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
                <Book className="w-5 h-5 text-[#00ff00]" />
                <h3 className="text-lg font-bold text-white">
                  Материалы урока
                </h3>
              </div>
              
              {materials.length > 0 ? (
                <div className="space-y-2">
                  {materials.map((material, index) => (
                    <a
                      key={material.id || index}
                      href={material.public_url || material.file_url || material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={material.display_name || material.filename}
                      className="flex items-center gap-3 p-3 rounded-xl bg-black/40 hover:bg-[#00ff00]/10 border border-gray-800 hover:border-[#00ff00]/30 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#00ff00]/10 flex items-center justify-center text-[#00ff00] group-hover:bg-[#00ff00]/20 transition-colors">
                        {getMaterialIcon(material.type || material.file_type)}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm text-gray-300 group-hover:text-[#00ff00] transition-colors block">
                          {material.display_name || material.filename || material.title}
                        </span>
                        {material.file_size_bytes && (
                          <span className="text-xs text-gray-500">
                            {(material.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                      <Download className="w-4 h-4 text-gray-500 group-hover:text-[#00ff00] transition-colors" />
                    </a>
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
                className="bg-gradient-to-br from-[#00ff00]/10 to-[#00cc00]/5 border border-[#00ff00]/30 rounded-2xl p-6"
              >
                <h3 className="text-base font-bold text-[#00ff00] mb-3 flex items-center gap-2">
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
    </div>
  );
};

export default Lesson;
