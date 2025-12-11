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
  ArrowRight
} from "lucide-react";
import { TripwireLessonEditDialog } from "@/components/tripwire/TripwireLessonEditDialog";
import { MaterialPreviewDialog } from "@/components/MaterialPreviewDialog";
import { SmartVideoPlayer } from "@/components/SmartVideoPlayer";
import TranscriptionModal from "@/components/admin/TranscriptionModal";
import { useHonestVideoTracking } from "@/hooks/useHonestVideoTracking";
import { useProgressUpdate } from "@/hooks/useProgressUpdate";
import { useAuth } from "@/contexts/AuthContext";
import { VideoTelemetry } from "@/components/VideoPlayer/BunnyPlayer";
import { TripwireAIChatDialog } from "@/components/tripwire/TripwireAIChatDialog";
import { Bot } from "lucide-react";
import confetti from "canvas-confetti";
import AchievementModal from "./components/AchievementModal";
import { ModuleUnlockAnimation } from "@/components/tripwire/ModuleUnlockAnimation";

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
          
          // ✅ CHECK ROLE from users table
          const { data: userData } = await tripwireSupabase
            .from('users')
            .select('role')
            .eq('id', tripwireUser.user_id)
            .single();
          
          const userRole = userData?.role;
          console.log('🔒 TripwireLesson: User role:', userRole);
          setIsAdmin(userRole === 'admin' || userRole === 'manager');
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
  
  // 🎯 Честный Video Tracking (учитывает только реальный просмотр, НЕ перемотку!)
  const {
    progress: videoProgress,
    isCompleted: isVideoCompleted,
    isLoaded: isProgressLoaded,
    totalWatchedSeconds,
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
  
  // Transcription modal
  const [isTranscriptionOpen, setIsTranscriptionOpen] = useState(false);
  
  // ✅ AI Curator Chat
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  
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
    if (lessonId) {
      loadLessonData();
    }
  }, [lessonId]);

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
          setVideo({
            ...fetchedVideo,
            video_url: `https://video.onai.academy/${fetchedVideo.bunny_video_id}/playlist.m3u8`,
            thumbnail_url: `https://video.onai.academy/${fetchedVideo.bunny_video_id}/thumbnail.jpg`
          });
        } else {
          // Если видео без bunny_video_id - значит оно старое (Bunny Storage)
          // Нужно перезагрузить видео через новый Bunny Stream
          console.warn('⚠️ Старое видео Bunny Storage обнаружено. Необходима перезагрузка через Bunny Stream.');
          setVideo(null);
        }
      } catch (error) {
        console.log('ℹ️ Видео не найдено');
      }

      // Загрузить материалы
      try {
        const materialsRes = await api.get(`/api/tripwire/lessons/${lessonId}/materials`);
        setMaterials(materialsRes?.data || []);
      } catch (error) {
        console.log('ℹ️ Материалы не найдены');
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

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
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
        if (response.data?.moduleCompleted && response.data?.unlockedModuleId) {
          console.log(`🔓 Module ${response.data.unlockedModuleId} unlocked!`);
          
          // ✅ ИНВАЛИДАЦИЯ КЭША: Очищаем чтобы загрузить свежие данные
          if (tripwireUserId) {
            const cachedKey = `tripwire_unlocks_${tripwireUserId}`;
            localStorage.removeItem(cachedKey);
            console.log('🗑️ Cache invalidated - will reload fresh unlocks');
          }
          
          navigate('/integrator', {
            state: {
              unlockedModuleId: response.data.unlockedModuleId,
              showUnlockAnimation: true,
            },
          });
        } else {
          navigate('/integrator');
        }
      }, 2000);
      
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
        <div className="text-[#00FF88] font-mono text-xl uppercase tracking-wider animate-pulse">
          Загрузка...
        </div>
      </div>
    );
  }

  // ✅ Показываем ошибку ТОЛЬКО после завершения загрузки
  if (!loading && !lesson) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="text-white font-['JetBrains_Mono'] text-xl">Урок не найден</div>
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
                МОДУЛЬ {module?.order_index !== undefined ? module.order_index + 1 : moduleId} • УРОК {currentLessonIndex + 1} / {allLessons.length}
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
              <div className="space-y-4">
                <SmartVideoPlayer 
                  videoId={video.bunny_video_id}
                  videoUrl={`https://video.onai.academy/${video.bunny_video_id}/playlist.m3u8`}
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
                <div className="aspect-video bg-[#0a0a0f] flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Видео еще не загружено</p>
                  </div>
                </div>
              </div>
            )}

            {/* ⚡ CYBER ACTION BUTTONS - Адаптивные */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* ✅ Кнопка "ЗАВЕРШИТЬ УРОК" - показывается ДО завершения */}
              {!isCompleted && (
                <motion.button
                  onClick={handleComplete}
                  disabled={!isQualifiedForCompletion}
                  className={`flex-1 group relative px-4 sm:px-8 py-3 sm:py-4 font-sans font-bold uppercase tracking-wider text-sm sm:text-base lg:text-lg overflow-hidden transition-all duration-300 not-italic ${
                    !isQualifiedForCompletion
                      ? "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/50 opacity-60"
                      : "bg-[#00FF88] text-black border-2 border-[#00FF88] hover:shadow-[0_0_50px_rgba(0,255,136,0.5)]"
                  }`}
                  style={{
                    transform: 'skewX(-10deg)',
                    boxShadow: !isQualifiedForCompletion ? 'none' : '0 0 30px rgba(0, 255, 136, 0.3)'
                  }}
                >
                  <span className="flex items-center justify-center gap-2 sm:gap-3 not-italic" style={{ transform: 'skewX(10deg)' }}>
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="hidden xs:inline">
                      {!isQualifiedForCompletion ? "ПОСМОТРИТЕ ВИДЕО (80%)" : "ЗАВЕРШИТЬ УРОК"}
                    </span>
                    <span className="xs:hidden">
                      {!isQualifiedForCompletion ? "80% ВИДЕО" : "ЗАВЕРШИТЬ"}
                    </span>
                  </span>
                </motion.button>
              )}
              
              {/* ✅ Кнопка "СЛЕДУЮЩИЙ МОДУЛЬ" - показывается ПОСЛЕ завершения (если не последний модуль) */}
              {isCompleted && moduleId && moduleId < 18 && (
                <motion.button
                  onClick={() => {
                    // ✅ 100% ПРАВИЛЬНЫЙ MAPPING:
                    // Module 16 (lesson 67) → Module 17 (lesson 68)
                    // Module 17 (lesson 68) → Module 18 (lesson 69)
                    const nextLessonId = moduleId === 16 ? 68 : moduleId === 17 ? 69 : null;
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl border border-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white/60">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm font-medium">Длительность</span>
                  </div>
                  <span className="text-[#00FF88] font-mono font-bold text-base sm:text-lg">
                    {lesson.duration_minutes || 0} мин
                  </span>
                </div>
              </div>
            </motion.div>

            {/* ⚡ GLASS PANEL: Materials */}
            {/* 📎 МАТЕРИАЛЫ: Показываем только если есть материалы */}
            {materials.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl"
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}
              >
                <h3 className="text-white font-['JetBrains_Mono'] font-bold uppercase tracking-wider mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#00FF88]" />
                  Материалы
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

            {/* 💡 GLASS PANEL: AI Tips - с пульсирующей лампочкой */}
            {lesson?.ai_tips && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
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
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-['Manrope'] whitespace-pre-wrap">
                  {lesson.ai_tips}
                </p>
              </motion.div>
            )}

            {/* 🤖 GLASS PANEL: AI Curator - ВТОРОЙ */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl"
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}
              >
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border flex items-center justify-center flex-shrink-0 ${
                  isAdmin 
                    ? 'bg-[#00FF88]/10 border-[#00FF88]/30' 
                    : 'bg-white/5 border-white/10'
                }`}>
                  <Bot className={`w-5 h-5 sm:w-6 sm:h-6 ${isAdmin ? 'text-[#00FF88]' : 'text-white/40'}`} />
                </div>
                <div className="min-w-0">
                  <h3 className={`font-['JetBrains_Mono'] font-bold uppercase tracking-wider text-sm sm:text-base truncate ${
                    isAdmin ? 'text-white' : 'text-white/50'
                  }`}>AI-Куратор</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 font-['Manrope'] uppercase tracking-wider">
                    {isAdmin ? 'Онлайн 24/7' : '🔒 Полная версия'}
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-gray-400 font-['Manrope'] mb-4 leading-relaxed">
                {isAdmin 
                  ? 'Задавайте вопросы, отправляйте голосовые сообщения и файлы'
                  : 'Доступно на полной версии продукта'
                }
              </p>
              
              <motion.button
                onClick={() => {
                  if (isAdmin) {
                    setIsAIChatOpen(true);
                  } else {
                    showLocked('AI Куратор');
                  }
                }}
                disabled={!isAdmin}
                className={`w-full group relative px-4 sm:px-6 py-3 font-sans font-bold uppercase tracking-wider text-xs sm:text-sm transition-all duration-300 overflow-hidden ${
                  isAdmin 
                    ? 'bg-[#00FF88] text-black hover:shadow-[0_0_40px_rgba(0,255,136,0.6)] cursor-pointer'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
                style={{
                  transform: 'skewX(-10deg)',
                  boxShadow: isAdmin ? '0 0 20px rgba(0, 255, 136, 0.3)' : 'none'
                }}
              >
                <span className="flex items-center justify-center gap-2 not-italic" style={{ transform: 'skewX(10deg)' }}>
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                  {isAdmin ? 'Написать куратору' : 'Заблокировано'}
                </span>
              </motion.button>
            </motion.div>

            {/* 📊 GLASS PANEL: Progress - ТРЕТИЙ */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.65 }}
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
      
      {/* AI Chat Dialog */}
      <TripwireAIChatDialog open={isAIChatOpen} onOpenChange={setIsAIChatOpen} />
      
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

