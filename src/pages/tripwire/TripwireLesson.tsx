import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/utils/apiClient";
import { tripwireSupabase } from '@/lib/supabase-tripwire'; // ✅ Для получения Tripwire user
import { useToast } from "@/hooks/use-toast";
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
  Edit,
  Star,
  Sparkles,
  ArrowRight,
  Send
} from "lucide-react";
import { TripwireLessonEditDialog } from "@/components/tripwire/TripwireLessonEditDialog";
import { MaterialPreviewDialog } from "@/components/MaterialPreviewDialog";
import { HomeworkDialog } from "@/components/tripwire/HomeworkDialog";
import { Module3CompleteModal } from "@/components/tripwire/Module3CompleteModal";
import { SmartVideoPlayer } from "@/components/SmartVideoPlayer";
import TranscriptionModal from "@/components/admin/TranscriptionModal";
import { useHonestVideoTracking } from "@/hooks/useHonestVideoTracking";
import { useProgressUpdate } from "@/hooks/useProgressUpdate";
import { useAuth } from "@/contexts/AuthContext";
import { VideoTelemetry } from "@/components/VideoPlayer/BunnyPlayer";
import confetti from "canvas-confetti";
import AchievementModal from "./components/AchievementModal";
import { ModuleUnlockAnimation } from "@/components/tripwire/ModuleUnlockAnimation";
import { VideoProcessingOverlay } from "@/components/tripwire/VideoProcessingOverlay";
import { useVideoProcessingStatus } from "@/hooks/useVideoProcessingStatus"; // ✅ NEW: Real-time video processing tracking

const TripwireLesson = () => {
  const { lessonId } = useParams(); // ✅ ТОЛЬКО lessonId из URL
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  // ✅ moduleId получаем из ДАННЫХ урока, НЕ из URL
  const [moduleId, setModuleId] = useState<number | null>(null);
  
  // ✅ ИСПРАВЛЕНО: Получаем РЕАЛЬНЫЙ UUID от Tripwire Supabase
  const [tripwireUserId, setTripwireUserId] = useState<string>(''); // tripwire_users.id
  const [mainUserId, setMainUserId] = useState<string>(''); // users.id (for video_tracking)

  // ✅ Загружаем Tripwire user при монтировании
  useEffect(() => {
    const loadTripwireUser = async () => {
      console.log('🔄 TripwireLesson: Загружаем Tripwire user...');
      const { data: { user: authUser } } = await tripwireSupabase.auth.getUser();
      if (authUser?.email) {
        // Get BOTH IDs + role from users table (via user_id)
        const { data: tripwireUser, error } = await tripwireSupabase
          .from('tripwire_users')
          .select('id, user_id')
          .eq('email', authUser.email)
          .single();
        
        if (tripwireUser?.id && tripwireUser?.user_id) {
          console.log('✅ TripwireLesson: Loaded IDs:', {
            tripwire_users_id: tripwireUser.id,
            users_id: tripwireUser.user_id
          });
          setTripwireUserId(tripwireUser.id); // For API completion
          setMainUserId(tripwireUser.user_id); // For video_tracking
          
          // ✅ CHECK ROLE: Получаем из auth.users metadata (всегда доступно)
          const userRole = authUser.user_metadata?.role || 'student';
          console.log('🔒 TripwireLesson: User role:', userRole);
          setIsAdmin(userRole === 'admin' || userRole === 'manager' || userRole === 'sales');
        } else {
          console.error('❌ TripwireLesson: No tripwire_users record found for:', authUser.email);
        }
      } else {
        console.error('❌ TripwireLesson: No auth user found');
      }
    };
    loadTripwireUser();
  }, []);
  
  // 🔧 Admin check for debug panel
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Module data
  const [module, setModule] = useState<any>(null);
  
  // Lesson data
  const [lesson, setLesson] = useState<any>(null);
  const [video, setVideo] = useState<any>(null);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [processingVideoId, setProcessingVideoId] = useState<string | null>(null);
  
  // 🎬 NEW: Real-time video processing status tracking
  const {
    statusData: videoStatusData,
    statusLabel: videoStatusLabel,
    isProcessing: isVideoCurrentlyProcessing,
    isReady: isVideoReady,
    isFailed: isVideoFailed,
    error: videoProcessingError,
    refetch: refetchVideoStatus,
  } = useVideoProcessingStatus(processingVideoId, !!processingVideoId);
  
  // 🎯 Честный Video Tracking (учитывает только реальный просмотр, НЕ перемотку!)
  const {
    progress: videoProgress,
    isCompleted: isVideoCompleted,
    isLoaded: isProgressLoaded,
    totalWatchedSeconds,
    lastPosition, // ✅ NEW: Последняя позиция для восстановления в плеере
    // ✅ FIX #3: Используем флаг квалификации (остается даже при откате прогресса!)
    isQualifiedForCompletion,
    handleTimeUpdate: trackVideoTime,
    handlePlay: trackVideoPlay,
    handlePause: trackVideoPause,
    handleSeeking: trackVideoSeeking,
    handleSeeked: trackVideoSeeked
  } = useHonestVideoTracking(
    Number(lessonId),
    mainUserId, // ✅ CRITICAL FIX: video_tracking uses users.id, NOT tripwire_users.id!
    'video_tracking' // ✅ ИСПРАВЛЕНО: Используем video_tracking (не tripwire_progress)
  );
  
  // 📊 Progress Update Hook (saves to backend for AI Mentor)
  // 🔒 SECURE: userId берётся из JWT на backend, НЕ отправляется отсюда!
  const { sendProgressUpdate } = useProgressUpdate({
    lessonId: Number(lessonId),
    videoId: video?.bunny_video_id, // Bunny video GUID (will be null initially)
    onProgressChange: (percentage, qualifiedForCompletion) => {
      console.log('📊 [TripwireLesson] Progress updated:', { percentage, qualifiedForCompletion });
      
      // Auto-enable "Complete Lesson" button when 80% reached
      if (qualifiedForCompletion && !isCompleted) {
        console.log('✅ [TripwireLesson] Video 80% complete - ready to finish lesson!');
      }
    }
  });
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false); // ✅ Prevent double-submission
  
  // ✅ Все уроки модуля для навигации
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(-1);
  
  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Material preview dialog
  const [previewMaterial, setPreviewMaterial] = useState<any>(null);
  
  // Homework dialog
  const [isHomeworkDialogOpen, setIsHomeworkDialogOpen] = useState(false);
  const [isHomeworkSubmitted, setIsHomeworkSubmitted] = useState(false); // ✅ Чекпойнт: ДЗ сдано
  
  // ✅ Google Forms для 1-го модуля (урок 67)
  const HOMEWORK_GOOGLE_FORM_URL = 'https://forms.gle/8poeqWvJ5tsz9XgN7';
  const isFirstModule = lessonId === '67'; // ✅ ПЕРВЫЙ МОДУЛЬ - урок 67
  
  // Transcription modal
  const [isTranscriptionOpen, setIsTranscriptionOpen] = useState(false);
  
  // 🎉 Module 3 Complete Modal
  const [showModule3Modal, setShowModule3Modal] = useState(false);

  // 🏆 Achievement & Module Unlock
  const [newAchievement, setNewAchievement] = useState<any>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [unlockedModuleNumber, setUnlockedModuleNumber] = useState<number | null>(null);

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

  useEffect(() => {
    if (moduleId) {
      loadModuleData();
      loadAllLessons();
    }
  }, [moduleId]);

  useEffect(() => {
    // ✅ FIX #7: Загружаем данные только когда tripwireUserId готов
    if (lessonId && tripwireUserId) {
      loadLessonData();
    }
  }, [lessonId, tripwireUserId]); // ✅ Добавлена зависимость от tripwireUserId

  useEffect(() => {
    if (lessonId && allLessons.length > 0) {
      const currentIndex = allLessons.findIndex(l => l.id === parseInt(lessonId || '0'));
      setCurrentLessonIndex(currentIndex);
    }
  }, [lessonId, allLessons]);
  
  // 🔧 Check if user is admin (используем роль из AuthContext)
  useEffect(() => {
    if (userRole === 'admin') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [userRole]);

  const loadModuleData = async () => {
    if (!moduleId) return;
    
    try {
      const response = await api.get(`/api/modules/${moduleId}`);
      if (response?.module) {
        setModule(response.module);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки модуля:', error);
    }
  };

  const loadAllLessons = async () => {
    if (!moduleId) return;
    
    try {
      // ✅ Загружаем уроки текущего модуля для навигации
      const response = await api.get(`/api/tripwire/lessons?module_id=${moduleId}`);
      if (response?.lessons) {
        const sortedLessons = [...response.lessons].sort((a, b) => {
          const orderA = a.order_index ?? a.id ?? 0;
          const orderB = b.order_index ?? b.id ?? 0;
          return orderA - orderB;
        });
        setAllLessons(sortedLessons);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки уроков:', error);
    }
  };

  // 🎯 Глобальная нумерация уроков (module_id → глобальный номер)
  const getGlobalLessonNumber = () => {
    if (!module?.id) return 1;
    // module_id: 16=урок1, 17=урок2, 18=урок3
    const MODULE_TO_LESSON = { 16: 1, 17: 2, 18: 3 };
    return MODULE_TO_LESSON[module.id] || 1;
  };

  const TOTAL_LESSONS = 3;

  const loadLessonData = async () => {
    try {
      setLoading(true);
      
      // Загрузить урок
      const lessonRes = await api.get(`/api/tripwire/lessons/${lessonId}`);
      const loadedLesson = lessonRes?.lesson || lessonRes;
      setLesson(loadedLesson);
      
      // ✅ Получаем module_id из данных урока
      if (loadedLesson?.module_id) {
        setModuleId(loadedLesson.module_id);
      }
      
      // Проверить завершение
      const progressRes = await api.get(`/api/tripwire/progress/${lessonId}?tripwire_user_id=${tripwireUserId}`);
      setIsCompleted(progressRes?.isCompleted || false);

      // Загрузить видео (теперь только Bunny Stream с HLS)
      try {
        const videoRes = await api.get(`/api/tripwire/videos/${lessonId}`);
        const fetchedVideo = videoRes?.video || videoRes;
        
        // Если есть bunny_video_id, используем только его для HLS URL
        if (fetchedVideo?.bunny_video_id) {
          const videoId = fetchedVideo.bunny_video_id;
          
          // 🔍 Проверяем статус обработки видео
          try {
            const statusRes = await api.get(`/api/videos/bunny-status/${videoId}`);
            const { status: videoStatus, bunnyStatus } = statusRes;
            
            console.log('🎥 [VIDEO DEBUG] Status check:', { videoStatus, bunnyStatus });
            
            // ✅ Проверяем статус (может быть строка "ready" или число 4)
            if (videoStatus === 'ready' || videoStatus === 'completed' || bunnyStatus === 4) {
              // ✅ Видео готово
              console.log('✅ [VIDEO DEBUG] Video is ready! Setting video state...');
              setVideo({
                ...fetchedVideo,
                video_url: `https://video.onai.academy/${videoId}/playlist.m3u8`,
                thumbnail_url: `https://video.onai.academy/${videoId}/thumbnail.jpg`
              });
              setIsVideoProcessing(false);
            } else if (videoStatus === 'processing' || bunnyStatus === 3 || bunnyStatus === 2 || bunnyStatus === 1) {
              // ⏳ Видео обрабатывается
              console.log('⏳ Video is still processing:', { videoStatus, bunnyStatus });
              setProcessingVideoId(videoId);
              setIsVideoProcessing(true);
              setVideo(null);
            } else if (videoStatus === 'failed' || bunnyStatus === 5) {
              // ❌ Ошибка обработки
              console.error('❌ Video processing failed:', { videoStatus, bunnyStatus });
              setVideo(null);
            } else {
              console.warn('⚠️ Unknown video status:', { videoStatus, bunnyStatus });
              // Всё равно пытаемся показать видео
              setVideo({
                ...fetchedVideo,
                video_url: `https://video.onai.academy/${videoId}/playlist.m3u8`,
                thumbnail_url: `https://video.onai.academy/${videoId}/thumbnail.jpg`
              });
            }
          } catch (statusError) {
            // Если не удалось проверить статус, показываем видео
            console.warn('⚠️ Could not check video status, showing video anyway');
            setVideo({
              ...fetchedVideo,
              video_url: `https://video.onai.academy/${videoId}/playlist.m3u8`,
              thumbnail_url: `https://video.onai.academy/${videoId}/thumbnail.jpg`
            });
          }
        } else {
          // Если видео без bunny_video_id - значит оно старое (Bunny Storage)
          // Нужно перезагрузить видео через новый Bunny Stream
          console.warn('⚠️ Старое видео Bunny Storage обнаружено. Необходима перезагрузка через Bunny Stream.');
          setVideo(null);
        }
      } catch (error) {
        console.log('ℹ️ Видео не найдено в video_content');
        
        // 🔥 ВАЖНО: Проверяем есть ли bunny_video_id в самом уроке!
        // Возможно видео ещё в обработке на BunnyCDN
        if (loadedLesson?.bunny_video_id) {
          const videoId = loadedLesson.bunny_video_id;
          console.log('🎬 [LESSON] Found bunny_video_id in lesson data:', videoId);
          console.log('⏳ [LESSON] Video might be processing, checking status...');
          
          // Проверяем статус на BunnyCDN
          try {
            const statusRes = await api.get(`/api/videos/bunny-status/${videoId}`);
            const { status: videoStatus, bunnyStatus } = statusRes;
            
            console.log('🎥 [LESSON] Bunny status check:', { videoStatus, bunnyStatus });
            
            if (videoStatus === 'ready' || videoStatus === 'completed' || bunnyStatus === 4 || bunnyStatus === 5) {
              // ✅ Видео готово!
              console.log('✅ [LESSON] Video is ready! Loading player...');
              setVideo({
                bunny_video_id: videoId,
                video_url: `https://video.onai.academy/${videoId}/playlist.m3u8`,
                thumbnail_url: `https://video.onai.academy/${videoId}/thumbnail.jpg`
              });
              setIsVideoProcessing(false);
            } else if (bunnyStatus === 1 || bunnyStatus === 2 || bunnyStatus === 3) {
              // ⏳ Видео обрабатывается - ПОКАЗЫВАЕМ OVERLAY!
              console.log('⏳ [LESSON] Video is processing! Showing overlay...');
              setProcessingVideoId(videoId);
              setIsVideoProcessing(true);
              setVideo(null);
            } else if (bunnyStatus === 6) {
              // ❌ Ошибка обработки
              console.error('❌ [LESSON] Video processing failed!');
              setVideo(null);
              setIsVideoProcessing(false);
            } else {
              // Неизвестный статус - показываем как processing
              console.warn('⚠️ [LESSON] Unknown status, treating as processing:', bunnyStatus);
              setProcessingVideoId(videoId);
              setIsVideoProcessing(true);
              setVideo(null);
            }
          } catch (statusError) {
            console.error('❌ [LESSON] Could not check Bunny status:', statusError);
            // Пытаемся показать видео (может быть готово)
            setVideo({
              bunny_video_id: videoId,
              video_url: `https://video.onai.academy/${videoId}/playlist.m3u8`,
              thumbnail_url: `https://video.onai.academy/${videoId}/thumbnail.jpg`
            });
          }
        } else {
          console.log('ℹ️ [LESSON] No bunny_video_id in lesson - video not uploaded yet');
        }
      }

      // Загрузить материалы
      try {
        const materialsRes = await api.get(`/api/tripwire/lessons/${lessonId}/materials`);
        console.log('📎 [Materials] Response:', materialsRes);
        setMaterials(materialsRes?.data || []);
      } catch (error) {
        console.log('ℹ️ Материалы не найдены');
      }

      // ✅ Загрузить статус домашнего задания
      if (mainUserId) {
        try {
          const homeworkRes = await api.get(`/api/tripwire/homework/${lessonId}?user_id=${mainUserId}`);
          if (homeworkRes?.homework) {
            console.log('✅ [Homework] ДЗ уже сдано:', homeworkRes.homework.id);
            setIsHomeworkSubmitted(true);
          } else {
            console.log('ℹ️ [Homework] ДЗ еще не сдано');
            setIsHomeworkSubmitted(false);
          }
        } catch (error) {
          console.log('ℹ️ [Homework] Не удалось загрузить статус ДЗ');
          setIsHomeworkSubmitted(false);
        }
      }

    } catch (error: any) {
      console.error('❌ Ошибка загрузки урока:', error);
      setLesson(null);
    } finally {
      setLoading(false);
    }
  };

  // Video player functions
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleEnded = async () => {
    setPlaying(false);
    
    // Отметить урок как завершенный
    try {
      await api.post('/api/tripwire/complete', {
        lesson_id: parseInt(lessonId!),
        tripwire_user_id: tripwireUserId,
      });
      setIsCompleted(true);
    } catch (error) {
      console.error('❌ Ошибка завершения урока:', error);
    }
  };

  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const changePlaybackRate = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const changeVolume = (vol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = vol;
    setVolume(vol);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    
    const videoElement = videoRef.current as any;
    const doc = document as any;
    
    const isFullscreen = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
    
    if (isFullscreen) {
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    } else {
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen();
      } else if (videoElement.webkitEnterFullscreen) {
        videoElement.webkitEnterFullscreen();
      } else if (videoElement.webkitRequestFullscreen) {
        videoElement.webkitRequestFullscreen();
      } else if (videoElement.mozRequestFullScreen) {
        videoElement.mozRequestFullScreen();
      } else if (videoElement.msRequestFullscreen) {
        videoElement.msRequestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ PERPLEXITY BEST PRACTICE: useCallback для стабильной ссылки
  const handleComplete = useCallback(async () => {
    console.log('✅ handleComplete FIRED!'); // ✅ Debug log

    // ✅ GUARD 1: Prevent double-submission
    if (isCompleting || isCompleted) {
      console.warn('⚠️ Already completing or completed');
      return;
    }

    // ✅ GUARD 2: Validate user ID
    if (!tripwireUserId) {
      console.error('❌ tripwireUserId не загружен!');
      toast({
        title: "Ошибка",
        description: "Не удалось определить пользователя. Обновите страницу.",
        variant: "destructive",
      });
      return;
    }

    // ✅ GUARD 3: Validate lesson ID
    if (!lessonId) {
      console.error('❌ lessonId не определён!');
      return;
    }

    setIsCompleting(true);

    try {
      console.log(`🎯 Завершаем урок ${lessonId} (модуль ${moduleId}) для пользователя ${tripwireUserId}`);

      // ✅ Call backend API
      const response = await api.post('/api/tripwire/complete', {
        lesson_id: parseInt(lessonId),
        module_id: moduleId ? parseInt(moduleId) : undefined,
        tripwire_user_id: tripwireUserId,
      });

      console.log('✅ Backend response:', response.data);
      console.log('🔍 [DEBUG] Response details:', {
        moduleCompleted: response.data?.moduleCompleted,
        unlockedModuleId: response.data?.unlockedModuleId,
        success: response.data?.success
      });

      // ✅ Optimistic UI update
      setIsCompleted(true);

      // ✅ Show success toast
      toast({
        title: '✅ Урок завершён!',
        description: 'Отличная работа!',
        variant: 'default',
      });
      
      // 🎉 GAMIFICATION: Trigger confetti explosion
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Neon green confetti from multiple angles
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#00FF88', '#00cc88', '#FFFFFF', '#00FFAA']
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#00FF88', '#00cc88', '#FFFFFF', '#00FFAA']
        });
      }, 250);

      // ✅ Navigate to main page after confetti (with unlock animation if module completed)
      setTimeout(() => {
        clearInterval(interval); // ✅ Очищаем interval перед редиректом
        
        console.log('🔍 [REDIRECT] Checking redirect conditions:', {
          lessonId,
          moduleCompleted: response.data?.moduleCompleted,
          unlockedModuleId: response.data?.unlockedModuleId,
          willShowAnimation: !!(response.data?.moduleCompleted && response.data?.unlockedModuleId)
        });

        // 🎉 МОДУЛЬ 3 ЗАВЕРШЕН - Показываем модалку с сертификатом ВСЕГДА!
        if (lessonId === '69') {
          console.log('🎉 [MODULE 3 COMPLETE] Показываем модалку с сертификатом! (урок 69 завершен)');
          
          // ✅ ПРИНУДИТЕЛЬНО сохраняем флаг что модуль 3 завершен
          localStorage.setItem('tripwire_module3_completed', 'true');
          console.log('💾 [MODULE 3] Флаг завершения сохранен в localStorage');
          
          setShowModule3Modal(true);
          return; // Не редиректим, модалка сама редиректит
        }

        if (response.data?.moduleCompleted && response.data?.unlockedModuleId) {
          console.log(`🔓 Module ${response.data.unlockedModuleId} unlocked!`);
          
          // ✅ ИНВАЛИДАЦИЯ КЭША: Очищаем чтобы загрузить свежие данные
          if (mainUserId) {
            const cachedKey = `tripwire_unlocks_${mainUserId}`; // ✅ FIX: Use mainUserId (auth.users.id)
            localStorage.removeItem(cachedKey);
            console.log('🗑️ Cache invalidated - will reload fresh unlocks');
          }
          
          const redirectUrl = `/integrator?unlockedModule=${response.data.unlockedModuleId}`;
          console.log(`🚀 Redirecting to: ${redirectUrl}`);
          // ✅ Используем window.location для надежного редиректа с state в URL
          window.location.href = redirectUrl;
        } else {
          console.log('🏠 Редирект на главную страницу (без анимации)...');
          window.location.href = '/integrator';
        }
      }, 2500);
      
    } catch (error: any) {
      console.error('❌ Ошибка завершения:', error);
      
      // ✅ Show error toast
      toast({
        title: 'Ошибка',
        description: error.response?.data?.error || error.message || 'Не удалось завершить урок',
        variant: 'destructive',
      });

      // ✅ Reset state on error
      setIsCompleting(false);
    }
  }, [lessonId, moduleId, tripwireUserId, isCompleting, isCompleted, toast, navigate]);

  // 🏆 Проверить завершение модуля и разблокировать достижение
  const checkAndUnlockAchievement = async () => {
    if (!user || !moduleId) return;

    try {
      // Получаем все уроки модуля и проверяем прогресс
      const { data: moduleProgress } = await api.get(`/api/tripwire/module-progress/${moduleId}?tripwire_user_id=${tripwireUserId}`);
      
      // Если все уроки модуля завершены
      if (moduleProgress?.all_lessons_completed) {
        console.log('🏆 Module completed! Unlocking achievement...');
        
        // Разблокируем достижение
        const { data: achievementResult } = await api.post('/api/tripwire/unlock-achievement', {
          module_number: parseInt(moduleId!)
        });

        console.log('🏆 Achievement unlock result:', achievementResult);
        
        // Если достижение только что разблокировано, показываем модалку
        if (achievementResult?.newly_unlocked && achievementResult?.achievement) {
          const achievement = achievementResult.achievement;
          setNewAchievement({
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon
          });
          setShowAchievementModal(true);
          
          // Проверяем, нужно ли разблокировать следующий модуль
          const currentModuleNum = parseInt(moduleId!);
          if (currentModuleNum < 3) {
            // Разблокируем следующий модуль с небольшой задержкой после достижения
            setTimeout(() => {
              setUnlockedModuleNumber(currentModuleNum + 1);
            }, 3000);
          }
        }

        // Если достижение было только что разблокировано
        if (achievementResult?.newly_unlocked && achievementResult?.achievement) {
          console.log('✨ New achievement unlocked!', achievementResult.achievement);
          
          // Сохраняем флаг в localStorage для показа на странице профиля
          localStorage.setItem('tripwire_pending_achievement', JSON.stringify({
            id: achievementResult.achievement.id,
            title: achievementResult.achievement.title,
            description: achievementResult.achievement.description,
            icon: achievementResult.achievement.icon,
          }));

          // Редиректим на профиль через 1 секунду (чтобы пользователь увидел confetti)
          setTimeout(() => {
            navigate('/integrator/profile');
          }, 1000);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка проверки достижения:', error);
    }
  };

  // ✅ Обработка клика на кнопку "Сдать домашнее задание"
  const handleHomeworkClick = async () => {
    console.log('🔍 [DEBUG] handleHomeworkClick fired!', { lessonId, isFirstModule });
    
    if (isFirstModule) {
      // ✅ ПЕРВЫЙ МОДУЛЬ (урок 67): открываем Google Forms
      console.log('📝 [Homework] УРОК 67 - Открываем Google Forms:', HOMEWORK_GOOGLE_FORM_URL);
      const opened = window.open(HOMEWORK_GOOGLE_FORM_URL, '_blank');
      console.log('🔍 [DEBUG] window.open result:', opened);
      
      // ✅ Отмечаем ДЗ как принятое (только один раз)
      if (!isHomeworkSubmitted && mainUserId) {
        try {
          await api.post(`/api/tripwire/homework/${lessonId}`, {
            user_id: mainUserId,
            homework_text: 'Google Forms заполнена (автоматически)',
          });
          setIsHomeworkSubmitted(true);
          console.log('✅ [Homework] ДЗ автоматически принято');
        } catch (error) {
          console.error('❌ [Homework] Ошибка отметки ДЗ:', error);
        }
      }
    } else {
      // ✅ ВТОРОЙ И ТРЕТИЙ МОДУЛИ (урок 68, 69): открываем модалку с текстовым полем
      console.log('📝 [Homework] УРОК 68/69 - Открываем модалку с текстом');
      setIsHomeworkDialogOpen(true);
    }
  };

  // ✅ Save progress every 10 seconds
  useEffect(() => {
    if (!playing || !lessonId) return;
    
    const interval = setInterval(() => {
      const progressPercent = Math.floor((currentTime / duration) * 100);
      api.post('/api/tripwire/progress', {
        lesson_id: parseInt(lessonId),
        tripwire_user_id: tripwireUserId,
        video_progress_percent: progressPercent,
        last_position_seconds: Math.floor(currentTime),
        watch_time_seconds: Math.floor(currentTime),
      }).catch(error => {
        console.error('❌ Ошибка сохранения прогресса:', error);
      });
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [playing, currentTime, duration, lessonId, tripwireUserId]);

  // ✅ Navigation (определяем есть ли следующий урок для показа кнопки)
  const hasNextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="text-center space-y-4">
          {/* Spinner */}
          <div className="flex justify-center">
            <div className="w-16 h-16 border-4 border-[#00FF88]/20 border-t-[#00FF88] rounded-full animate-spin"></div>
          </div>
          
          {/* Текст */}
          <div className="space-y-2">
            <p className="text-white font-['JetBrains_Mono'] text-lg font-bold">
              Загрузка урока...
            </p>
            <p className="text-gray-500 text-sm font-['JetBrains_Mono']">
              Подождите несколько секунд
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Показываем ошибку ТОЛЬКО после завершения загрузки
  if (!loading && !lesson) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Иконка ошибки */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          
          {/* Сообщение */}
          <div>
            <h2 className="text-white font-['JetBrains_Mono'] text-2xl font-bold mb-2">
              Урок не найден
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Возможно, урок ещё загружается или произошла ошибка сети
            </p>
          </div>
          
          {/* Инструкции */}
          <div className="bg-[#0a0a0f] border border-[#00FF88]/20 rounded-lg p-4 text-left space-y-2">
            <p className="text-[#00FF88] font-['JetBrains_Mono'] text-xs font-bold mb-2">
              ЧТО ДЕЛАТЬ:
            </p>
            <div className="space-y-2 text-gray-300 text-sm">
              <p className="flex items-start gap-2">
                <span className="text-[#00FF88] mt-1">1.</span>
                <span>Обновите страницу (кнопка ниже или F5)</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-[#00FF88] mt-1">2.</span>
                <span>Проверьте интернет-соединение</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-[#00FF88] mt-1">3.</span>
                <span>Если проблема повторяется - напишите в поддержку</span>
              </p>
            </div>
          </div>
          
          {/* Кнопки */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#00FF88] text-black font-['JetBrains_Mono'] font-bold rounded-lg hover:bg-[#00FF88]/90 transition-all"
            >
              🔄 ОБНОВИТЬ СТРАНИЦУ
            </button>
            <button
              onClick={() => navigate('/integrator')}
              className="px-6 py-3 bg-[#1a1a1f] text-white border border-[#00FF88]/30 font-['JetBrains_Mono'] rounded-lg hover:bg-[#2a2a2f] transition-all"
            >
              ← НАЗАД К МОДУЛЯМ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#030303] overflow-hidden">
      {/* ⚡ CYBER GRID OVERLAY */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* ⚡ RADIAL GLOW */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#00FF88]/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* ⚡ CYBER BREADCRUMBS */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/integrator')}
            className="text-gray-500 hover:text-[#00FF88] transition-all duration-300 flex items-center gap-2 font-['Manrope'] text-sm group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="tracking-wide">НАЗАД К МОДУЛЯМ</span>
          </button>
        </motion.div>

        {/* ⚡ CYBER HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
            <div className="flex-1">
              <motion.p
                className="text-[#00FF88] text-xs mb-3 uppercase tracking-[0.3em] font-['Manrope'] font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                УРОК {getGlobalLessonNumber()} / {TOTAL_LESSONS}
              </motion.p>
              <motion.h1
                className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white font-sans uppercase mb-4 leading-tight tracking-wide line-clamp-2 px-2 sm:px-0"
                style={{
                  textShadow: '0 0 40px rgba(0, 255, 136, 0.3), 0 0 80px rgba(0, 255, 136, 0.1)'
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {lesson.title}
              </motion.h1>
              {lesson.description && (
                <motion.p 
                  className="text-gray-400 font-['Manrope'] text-sm sm:text-base md:text-lg max-w-3xl leading-relaxed px-2 sm:px-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {lesson.description}
                </motion.p>
              )}
            </div>
            
            {isCompleted && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-lg"
              >
                <CheckCircle2 className="w-4 h-4 text-[#00FF88]" />
                {/* Добавили font-mono tracking-wider */}
                <span className="text-[#00FF88] text-xs font-mono font-bold tracking-wider uppercase">
                  Завершено
                </span>
              </motion.div>
            )}
          </div>
          
          {/* ⚡ ADMIN EDIT BUTTON - Only visible for admin/manager */}
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <button
                onClick={() => setEditDialogOpen(true)}
                className="group relative px-6 py-3 bg-transparent border border-[#00FF88]/20 hover:border-[#00FF88] text-[#00FF88] font-['Manrope'] font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] overflow-hidden"
                style={{ transform: 'skewX(-10deg)' }}
              >
                <span className="flex items-center gap-2" style={{ transform: 'skewX(10deg)' }}>
                  <Edit className="w-4 h-4" />
                  Редактировать урок
                </span>
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Video Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-4 sm:space-y-6"
          >
            {/* 🎥 SMART VIDEO PLAYER - DIRECT HLS STREAMING (Plyr + HLS.js) */}
            {video?.bunny_video_id ? (
              <div className="space-y-4 relative">
                {/* 🎬 NEW: Real-time Processing Overlay with progress tracking */}
                {isVideoProcessing && processingVideoId && (
                  <VideoProcessingOverlay
                    videoId={processingVideoId}
                    statusLabel={videoStatusLabel}
                    progress={videoStatusData?.progress || 0}
                    isLoading={!videoStatusData}
                    error={videoProcessingError}
                    isFailed={isVideoFailed}
                    onRefresh={() => {
                      console.log('🔄 Refreshing video status...');
                      refetchVideoStatus();
                      loadLessonData(); // Reload lesson data
                    }}
                  />
                )}
                
                {/* ✅ Auto-reload when video is ready + Auto-generate content */}
                {isVideoReady && isVideoProcessing && (
                  <>
                    {console.log('✅ Video ready! Triggering auto-generation...')}
                    {setTimeout(async () => {
                      // 1️⃣ Запускаем автоматическую генерацию транскрипции + AI-контента
                      try {
                        console.log('🚀 [Auto-Generate] Triggering content generation...');
                        await api.post(`/api/tripwire/lessons/${lessonId}/auto-generate-content`);
                        console.log('✅ [Auto-Generate] Content generation started');
                      } catch (err) {
                        console.error('❌ [Auto-Generate] Failed to trigger:', err);
                      }
                      
                      // 2️⃣ Перезагружаем данные урока
                      setIsVideoProcessing(false);
                      setProcessingVideoId(null);
                      loadLessonData();
                    }, 1000)}
                  </>
                )}
                
                <SmartVideoPlayer
                  videoId={video.bunny_video_id}
                  videoUrl={`https://video.onai.academy/${video.bunny_video_id}/playlist.m3u8`}
                  posterUrl={video.thumbnail_url || `https://video.onai.academy/${video.bunny_video_id}/thumbnail.jpg`}
                  startPosition={lastPosition} // ✅ NEW: Восстанавливаем позицию из БД
                  enableAutoSubtitles={true}
                  onProgress={(progress, currentTime, duration) => {
                    // 🎯 Честный трекинг (не засчитывает перемотку!)
                    trackVideoTime(currentTime, duration);
                    console.log(`📊 Video progress: ${progress.toFixed(1)}% (${Math.round(currentTime)}s / ${Math.round(duration)}s)`);
                  }}
                  onPlay={trackVideoPlay}
                  onPause={trackVideoPause}
                  onSeeking={trackVideoSeeking}
                  onSeeked={trackVideoSeeked}
                />
                
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-[#00FF88]/20">
                {/* 🎬 NEW: Real-time Processing Overlay with progress tracking */}
                {isVideoProcessing && processingVideoId ? (
                  <div className="aspect-video bg-[#0a0a0f] relative">
                    <VideoProcessingOverlay
                      videoId={processingVideoId}
                      statusLabel={videoStatusLabel}
                      progress={videoStatusData?.progress || 0}
                      isLoading={!videoStatusData}
                      error={videoProcessingError}
                      isFailed={isVideoFailed}
                      onRefresh={() => {
                        console.log('🔄 Refreshing video status...');
                        refetchVideoStatus();
                        loadLessonData(); // Reload lesson data
                      }}
                    />
                    
                    {/* ✅ Auto-reload when video is ready + Auto-generate content */}
                    {isVideoReady && (
                      <>
                        {console.log('✅ Video ready! Triggering auto-generation...')}
                        {setTimeout(async () => {
                          // 1️⃣ Запускаем автоматическую генерацию транскрипции + AI-контента
                          try {
                            console.log('🚀 [Auto-Generate] Triggering content generation...');
                            await api.post(`/api/tripwire/lessons/${lessonId}/auto-generate-content`);
                            console.log('✅ [Auto-Generate] Content generation started');
                          } catch (err) {
                            console.error('❌ [Auto-Generate] Failed to trigger:', err);
                          }
                          
                          // 2️⃣ Перезагружаем данные урока
                          setIsVideoProcessing(false);
                          setProcessingVideoId(null);
                          loadLessonData();
                        }, 1000)}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-[#0a0a0f] flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">Видео еще не загружено</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 🎯 КНОПКИ УПРАВЛЕНИЯ */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* ✅ Кнопка "ЗАВЕРШИТЬ МОДУЛЬ" - показывается при просмотре >= 80% */}
              {!isCompleted && isQualifiedForCompletion && (
                <motion.button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 group relative px-4 sm:px-8 py-3 sm:py-4 font-bold uppercase tracking-wider text-sm sm:text-base lg:text-lg overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                  style={{
                    background: isCompleting 
                      ? 'linear-gradient(135deg, #00FF88 0%, #00CC6A 100%)'
                      : '#00FF88',
                    color: '#000',
                    border: '2px solid #00FF88',
                    boxShadow: '0 0 30px rgba(0, 255, 136, 0.3)',
                    fontFamily: 'Manrope, sans-serif',
                    fontStyle: 'normal'
                  }}
                >
                  <span className="flex items-center justify-center gap-2 sm:gap-3">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    {isCompleting ? 'Завершение...' : 'ЗАВЕРШИТЬ МОДУЛЬ'}
                  </span>
                </motion.button>
              )}

              {/* 📚 Подсказка когда прогресс < 80% */}
              {!isCompleted && !isQualifiedForCompletion && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-full text-center text-base sm:text-lg text-gray-300 font-['Manrope'] py-4 px-6 bg-[#0A0A0A]/60 border border-[#00FF88]/20 rounded-xl"
                >
                  ⏳ Просмотрите видео до 80% чтобы завершить модуль
                </motion.div>
              )}
              
              {/* ✅ Кнопка "СЛЕДУЮЩИЙ МОДУЛЬ" - показывается ПОСЛЕ завершения (если не последний модуль) */}
              {isCompleted && moduleId && moduleId < 18 && (
                <motion.button
                  onClick={() => {
                    // ✅ FIX: Use centralized mapping instead of hardcode
                    const { getNextLessonId } = require('@/config/tripwire-mappings');
                    const nextLessonId = getNextLessonId(moduleId);
                    console.log(`🚀 Переход: Module ${moduleId} → Lesson ${nextLessonId}`);
                    if (nextLessonId) {
                      navigate(`/integrator/lesson/${nextLessonId}`);
                    }
                  }}
                  className="flex-1 group relative px-4 sm:px-8 py-3 sm:py-4 font-sans font-bold uppercase tracking-wider text-sm sm:text-base lg:text-lg overflow-hidden transition-all duration-300 not-italic bg-[#00FF88] text-black border-2 border-[#00FF88] hover:shadow-[0_0_50px_rgba(0,255,136,0.5)]"
                  style={{
                    transform: 'skewX(-10deg)',
                    boxShadow: '0 0 30px rgba(0, 255, 136, 0.3)'
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="flex items-center justify-center gap-2 sm:gap-3 not-italic" style={{ transform: 'skewX(10deg)' }}>
                    <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="hidden xs:inline">СЛЕДУЮЩИЙ МОДУЛЬ</span>
                    <span className="xs:hidden">ДАЛЕЕ</span>
                  </span>
                </motion.button>
              )}
            </div>
          </motion.section>

          {/* ⚡ CYBER SIDEBAR */}
          <aside className="space-y-4 sm:space-y-6">
            {/* ⚡ GLASS PANEL: Lesson Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              }}
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/30 flex items-center justify-center flex-shrink-0">
                  <Book className="w-5 h-5 sm:w-6 sm:h-6 text-[#00FF88]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-['JetBrains_Mono'] font-bold uppercase tracking-wider text-sm sm:text-base truncate">Информация</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 font-['Manrope'] uppercase tracking-wider">О уроке</p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* Адаптивный блок длительности */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl border border-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white/60 min-w-[120px]">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm font-medium">Длительность:</span>
                  </div>
                  <span className="text-[#00FF88] font-mono font-bold text-base sm:text-lg">
                    {(() => {
                      const totalSeconds = lesson.video_duration || 0;
                      const minutes = Math.round(totalSeconds / 60);
                      return `${minutes} минут`;
                    })()}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* 📝 GLASS PANEL: Homework - ВТОРОЙ (под информацией) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-xl ${
                isHomeworkSubmitted
                  ? 'bg-gradient-to-br from-green-900/20 to-transparent border border-green-500/30'
                  : 'bg-gradient-to-br from-[#00FF88]/5 to-transparent border border-[#00FF88]/20'
              }`}
              style={{
                boxShadow: isHomeworkSubmitted 
                  ? '0 8px 32px rgba(34, 197, 94, 0.1), inset 0 1px 0 rgba(34, 197, 94, 0.1)'
                  : '0 8px 32px rgba(0, 255, 136, 0.1), inset 0 1px 0 rgba(0, 255, 136, 0.1)'
              }}
            >
              <h3 className={`font-['JetBrains_Mono'] font-bold uppercase tracking-wider mb-2 text-sm sm:text-base flex items-center gap-2 ${
                isHomeworkSubmitted ? 'text-green-400' : 'text-[#00FF88]'
              }`}>
                {isHomeworkSubmitted ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                Домашнее задание
              </h3>
              
              {/* Уведомление зависит от статуса */}
              <div className={`text-[10px] sm:text-xs mb-3 font-['Manrope'] px-2 py-1.5 rounded ${
                isHomeworkSubmitted
                  ? 'text-green-300 bg-green-900/20'
                  : isVideoCompleted 
                    ? 'text-gray-400 bg-transparent' 
                    : 'text-gray-500 bg-gray-900/30'
              }`}>
                {isHomeworkSubmitted 
                  ? '✅ Ваше домашнее задание принято'
                  : isVideoCompleted 
                    ? 'Чтобы открыть новый модуль обязательно сдайте домашнее задание'
                    : '⏳ Кнопка будет доступна когда вы посмотрите 80% видео'
                }
              </div>

              <Button
                onClick={handleHomeworkClick}
                disabled={isFirstModule ? !isVideoCompleted : (isHomeworkSubmitted || !isVideoCompleted)}
                className={`w-full font-['Manrope'] font-semibold text-sm sm:text-base py-3 sm:py-4 transition-all duration-300 ${
                  isHomeworkSubmitted && isFirstModule
                    ? 'bg-green-600/80 hover:bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]'
                    : isHomeworkSubmitted
                      ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed border border-gray-600/50'
                      : isVideoCompleted
                        ? 'bg-[#00FF88] hover:bg-[#00cc88] text-black shadow-[0_0_20px_rgba(0,255,136,0.4)] hover:shadow-[0_0_30px_rgba(0,255,136,0.6)]'
                        : 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/50'
                }`}
                style={(isVideoCompleted && !isHomeworkSubmitted) || (isFirstModule && isHomeworkSubmitted) ? { transform: 'skewX(-5deg)' } : {}}
              >
                <span className="flex items-center justify-center gap-2" style={(isVideoCompleted && !isHomeworkSubmitted) || (isFirstModule && isHomeworkSubmitted) ? { transform: 'skewX(5deg)' } : {}}>
                  {isHomeworkSubmitted ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {isHomeworkSubmitted 
                    ? (isFirstModule ? 'Открыть форму еще раз' : 'Домашнее задание сдано')
                    : 'Сдать домашнее задание'
                  }
                </span>
              </Button>
            </motion.div>

            {/* ⚡ GLASS PANEL: Materials */}
            {/* 📎 МАТЕРИАЛЫ: Показываем только если есть материалы */}
            {materials.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl"
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}
              >
                <h3 className="text-white font-['JetBrains_Mono'] font-bold uppercase tracking-wider mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#00FF88]" />
                  Материалы урока
                </h3>
                
                <div className="space-y-2">
                  {materials.map((material: any) => (
                    <motion.button
                      key={material.id}
                      onClick={() => setPreviewMaterial(material)}
                      whileHover={{ x: 4 }}
                      className="w-full group relative overflow-hidden"
                    >
                      <div 
                        className="flex items-center gap-3 p-3 rounded-xl bg-black/40 hover:bg-[#00FF88]/10 border border-white/5 hover:border-[#00FF88]/30 transition-all duration-300"
                        style={{ transform: 'skewX(-5deg)' }}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg bg-[#00FF88]/10 flex items-center justify-center text-[#00FF88] group-hover:bg-[#00FF88]/20 transition-all duration-300 border border-[#00FF88]/20"
                          style={{ transform: 'skewX(5deg)' }}
                        >
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left" style={{ transform: 'skewX(5deg)' }}>
                          <span className="text-sm text-gray-300 group-hover:text-[#00FF88] transition-colors block font-['Manrope'] font-medium">
                            {material.display_name || material.filename}
                          </span>
                          {material.file_size_bytes && (
                            <span className="text-xs text-gray-500 font-['Manrope']">
                              {(material.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                            </span>
                          )}
                        </div>
                        <Download 
                          className="w-4 h-4 text-gray-500 group-hover:text-[#00FF88] transition-all duration-300 group-hover:translate-y-[-2px]" 
                          style={{ transform: 'skewX(5deg)' }}
                        />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 💡 GLASS PANEL: AI Tips - ПОСЛЕДНИЙ */}
            {(lesson?.tip || lesson?.ai_tips) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-gradient-to-br from-[#00FF88]/10 to-[#00cc88]/5 border border-[#00FF88]/30 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-xl"
                style={{
                  boxShadow: '0 8px 32px rgba(0, 255, 136, 0.1), inset 0 1px 0 rgba(0, 255, 136, 0.1)'
                }}
              >
                {/* Заголовок с лампочкой */}
                <h3 className="text-[#00FF88] font-['JetBrains_Mono'] font-bold uppercase tracking-wider mb-4 flex items-center gap-2 text-sm sm:text-base">
                  {/* 💡 Пульсирующая лампочка */}
                  <motion.span
                    animate={{ 
                      opacity: [1, 0.6, 1],
                      scale: [1, 1.1, 1],
                      filter: [
                        'drop-shadow(0 0 4px rgba(255,220,0,0.6))',
                        'drop-shadow(0 0 10px rgba(255,220,0,1))',
                        'drop-shadow(0 0 4px rgba(255,220,0,0.6))'
                      ]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  >
                    💡
                  </motion.span>
                  Советы по уроку
                </h3>
                <div className="text-xs sm:text-sm text-gray-300 leading-relaxed font-['Manrope'] space-y-3">
                  {(lesson.tip || lesson.ai_tips || '').split('\n').map((line, index) => {
                    // Пропускаем заголовок "**СОВЕТ:**"
                    if (line.includes('**СОВЕТ:**')) {
                      return null;
                    }
                    
                    // Парсим строки вида "**Совет 1:** текст" или "Совет 1: текст"
                    if (line.trim().match(/Совет \d+:/)) {
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      return (
                        <p key={index} className="leading-relaxed">
                          {parts.map((part, i) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              // Удаляем ** и делаем жирным зеленым
                              return (
                                <span key={i} className="font-bold text-[#00FF88]">
                                  {part.slice(2, -2)}
                                </span>
                              );
                            }
                            return <span key={i}>{part}</span>;
                          })}
                        </p>
                      );
                    }
                    
                    // Пустые строки пропускаем
                    if (!line.trim()) {
                      return null;
                    }
                    
                    // Любой другой текст
                    return (
                      <p key={index} className="leading-relaxed">
                        {line}
                      </p>
                    );
                  }).filter(Boolean)}
                </div>
              </motion.div>
            )}

            {/* 📊 GLASS PANEL: Progress - ТРЕТИЙ */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              }}
            >
              <h3 className="text-white font-['JetBrains_Mono'] font-bold uppercase tracking-wider mb-3 sm:mb-4 text-sm sm:text-base">Прогресс видео</h3>
              <div className="relative">
                <Progress 
                  value={videoProgress} 
                  className="h-3 mb-3 bg-black/50 border border-[#00FF88]/20 rounded-full overflow-hidden"
                  style={{
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}
                />
                <div 
                  className="absolute top-0 left-0 h-3 bg-[#00FF88] rounded-full transition-all duration-500"
                  style={{
                    width: `${videoProgress}%`,
                    boxShadow: '0 0 20px rgba(0, 255, 136, 0.6)'
                  }}
                />
              </div>
              <p className="text-xs sm:text-sm text-gray-400 font-['Manrope'] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
                <span className="text-[10px] sm:text-sm">{isVideoCompleted ? '✅ Урок можно завершить' : `⏳ Просмотрено ${Math.round(totalWatchedSeconds)}сек`}</span>
                <span className="text-[#00FF88] font-bold text-sm sm:text-base">
                  {Math.round(videoProgress)}%
                </span>
              </p>
            </motion.div>
          </aside>
        </div>
      </div>
      
      {/* Edit Dialog */}
      {lesson && (
        <TripwireLessonEditDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            // Перезагрузить данные урока после закрытия
            loadLessonData();
          }}
          lesson={lesson}
          moduleId={parseInt(moduleId || '1')}
          onSave={() => {
            loadLessonData();
          }}
        />
      )}
      
      {/* Material Preview Dialog */}
      <MaterialPreviewDialog
        open={!!previewMaterial}
        onClose={() => setPreviewMaterial(null)}
        material={previewMaterial}
      />
      
      {/* Homework Dialog */}
      {mainUserId && lessonId && (
        <HomeworkDialog
          open={isHomeworkDialogOpen}
          onClose={() => setIsHomeworkDialogOpen(false)}
          lessonId={lessonId}
          userId={mainUserId}
          onSubmitSuccess={() => {
            setIsHomeworkSubmitted(true); // ✅ Устанавливаем чекпойнт
            toast({
              title: '✅ Домашнее задание сдано!',
              description: 'Отличная работа!',
              variant: 'default',
            });
          }}
        />
      )}
      
      {/* 🎉 Module 3 Complete Modal - Сертификат */}
      <Module3CompleteModal 
        open={showModule3Modal} 
        onOpenChange={setShowModule3Modal} 
      />
      
      {/* 🏆 Achievement Modal */}
      {showAchievementModal && newAchievement && (
        <AchievementModal
          achievement={newAchievement}
          open={showAchievementModal}
          onClose={() => setShowAchievementModal(false)}
        />
      )}
      
      {/* 🔓 Module Unlock Animation */}
      {unlockedModuleNumber && (
        <ModuleUnlockAnimation
          moduleNumber={unlockedModuleNumber}
          onClose={() => setUnlockedModuleNumber(null)}
          onNavigate={() => {
            // Navigate back to Integrator homepage where user will see unlocked modules
            setUnlockedModuleNumber(null);
            navigate('/integrator');
          }}
        />
      )}
    </div>
  );
};

export default TripwireLesson;

