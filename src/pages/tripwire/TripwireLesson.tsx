import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  Edit,
  Star,
  Sparkles
} from "lucide-react";
import { TripwireLessonEditDialog } from "@/components/tripwire/TripwireLessonEditDialog";
import { MaterialPreviewDialog } from "@/components/MaterialPreviewDialog";
import { SmartVideoPlayer } from "@/components/SmartVideoPlayer";
import { useVideoTracking } from "@/hooks/useVideoTracking";
import { useProgressUpdate } from "@/hooks/useProgressUpdate";
import { useAuth } from "@/contexts/AuthContext";
import { VideoTelemetry } from "@/components/VideoPlayer/BunnyPlayer";
import confetti from "canvas-confetti";

const TripwireLesson = () => {
  const { moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // ✅ Generate or get Tripwire User ID from localStorage
  const [tripwireUserId] = useState(() => {
    let userId = localStorage.getItem('tripwire_user_id');
    if (!userId) {
      userId = `tripwire_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('tripwire_user_id', userId);
    }
    return userId;
  });
  
  // 🔧 Admin check for debug panel
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Lesson data
  const [lesson, setLesson] = useState<any>(null);
  const [video, setVideo] = useState<any>(null);
  
  // 🎥 Video Tracking Hook (local state for UI)
  const { progress: videoProgress, isCompleted: isVideoCompleted, handleTimeUpdate: trackVideoTime } = useVideoTracking(
    Number(lessonId), 
    user?.id
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

  useEffect(() => {
    if (moduleId) {
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
  
  // 🔧 Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user?.id) return;
      
      try {
        const response = await api.get('/api/users/profile');
        const profile = response.data;
        setIsAdmin(profile?.role === 'admin');
      } catch (error) {
        console.error('Failed to fetch user role:', error);
        setIsAdmin(false);
      }
    };
    
    checkAdminRole();
  }, [user?.id]);

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
      setLesson(lessonRes?.lesson || lessonRes);
      
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
        const materialsRes = await api.get(`/api/tripwire/materials/${lessonId}`);
        setMaterials(materialsRes?.materials || []);
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

  const handleComplete = async () => {
    try {
      await api.post('/api/tripwire/complete', {
        lesson_id: parseInt(lessonId!),
        tripwire_user_id: tripwireUserId,
      });
      setIsCompleted(true);
      
      // 🎉 GAMIFICATION: Trigger confetti explosion
      const duration = 3000;
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
      
    } catch (error) {
      console.error('❌ Ошибка завершения:', error);
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

  // Navigation
  const hasNextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1;
  const hasPreviousLesson = currentLessonIndex > 0;

  const handleNext = () => {
    if (hasNextLesson) {
      const nextLesson = allLessons[currentLessonIndex + 1];
      navigate(`/tripwire/module/${moduleId}/lesson/${nextLesson.id}`);
    }
  };

  const handlePrevious = () => {
    if (hasPreviousLesson) {
      const prevLesson = allLessons[currentLessonIndex - 1];
      navigate(`/tripwire/module/${moduleId}/lesson/${prevLesson.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="text-[#00FF88] font-mono text-xl uppercase tracking-wider animate-pulse">
          Загрузка...
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="text-white font-['Space_Grotesk'] text-xl">Урок не найден</div>
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
            onClick={() => navigate('/tripwire')}
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
                МОДУЛЬ {moduleId} • УРОК {currentLessonIndex + 1} / {allLessons.length}
              </motion.p>
              <motion.h1 
                className="text-5xl lg:text-6xl font-bold text-white font-sans uppercase mb-4 leading-tight tracking-wide"
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
                  className="text-gray-400 font-['Manrope'] text-lg max-w-3xl leading-relaxed"
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
          
          {/* ⚡ ADMIN EDIT BUTTON - Ghost style with neon text */}
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
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* 🎥 SMART VIDEO PLAYER - DIRECT HLS STREAMING (Plyr + HLS.js) */}
            {video?.bunny_video_id ? (
              <div className="space-y-3">
                <SmartVideoPlayer 
                  videoId={video.bunny_video_id}
                  hlsUrl={`https://video.onai.academy/${video.bunny_video_id}/playlist.m3u8`}
                  captions={[]}
                  onTimeUpdate={(data) => {
                    // Convert to VideoTelemetry format for compatibility
                    const telemetry: VideoTelemetry = {
                      currentTime: data.currentTime,
                      duration: data.duration,
                      percentage: data.percentage,
                      watchedSegments: [[0, data.currentTime]],
                      totalPlayTime: data.currentTime,
                      seekForwardCount: 0,
                      seekBackwardCount: 0,
                      playbackSpeedAvg: 1.0,
                      maxPositionReached: data.currentTime,
                    };
                    
                    // Update local UI state (for immediate visual feedback)
                    trackVideoTime(telemetry.currentTime, telemetry.duration);
                    
                    // 🔥 Send telemetry to backend
                    sendProgressUpdate(telemetry);
                  }}
                  onPlay={() => console.log('▶️ Video started')}
                  onPause={() => console.log('⏸️ Video paused')}
                  onEnded={() => console.log('🏁 Video ended')}
                />
                
                {/* 🔧 Debug панель - ТОЛЬКО ДЛЯ АДМИНОВ */}
                {isAdmin && (
                  <div className="flex items-center justify-between px-4 py-2 bg-black/50 rounded-lg border border-[#00FF88]/30 backdrop-blur-sm">
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-[#00FF88] font-bold">🔧 ADMIN DEBUG:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white/60">Прогресс:</span>
                        <span className="text-[#00FF88] font-bold">{videoProgress.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/60">Завершение:</span>
                        <span className={isVideoCompleted ? "text-[#00FF88]" : "text-red-400"}>
                          {isVideoCompleted ? '✅ ДА' : '❌ НЕТ (нужно 80%)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/60">User ID:</span>
                        <span className="text-white/80 text-[10px]">{user?.id?.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                )}
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

            {/* ⚡ CYBER ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Complete Button - Skewed with Pulse */}
              <motion.button
                onClick={handleComplete}
                disabled={isCompleted || !isVideoCompleted}
                whileHover={!isCompleted && isVideoCompleted ? { scale: 1.02 } : {}}
                whileTap={!isCompleted && isVideoCompleted ? { scale: 0.98 } : {}}
                className={`flex-1 group relative px-8 py-4 font-sans font-bold uppercase tracking-wider text-lg overflow-hidden transition-all duration-300 not-italic ${
                  isCompleted 
                    ? "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700" 
                    : !isVideoCompleted
                    ? "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/50 opacity-60"
                    : "bg-[#00FF88] text-black hover:bg-[#00cc88] border-2 border-[#00FF88]"
                }`}
                style={{
                  transform: 'skewX(-10deg)',
                  boxShadow: (isCompleted || !isVideoCompleted) ? 'none' : '0 0 40px rgba(0, 255, 136, 0.4), 0 10px 30px rgba(0, 255, 136, 0.2)'
                }}
              >
                <span className="flex items-center justify-center gap-3 not-italic" style={{ transform: 'skewX(10deg)' }}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Sparkles className="w-6 h-6" />
                  )}
                  {isCompleted ? "УРОК ЗАВЕРШЁН" : !isVideoCompleted ? "ПОСМОТРИТЕ ВИДЕО (80%)" : "ЗАВЕРШИТЬ УРОК"}
                </span>
              </motion.button>
              
              {/* Navigation Buttons */}
              <div className="flex gap-3">
                {hasPreviousLesson && (
                  <motion.button
                    onClick={handlePrevious}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="group px-6 py-4 bg-transparent border-2 border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/10 hover:border-[#00FF88] font-sans font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] not-italic"
                    style={{ transform: 'skewX(-10deg)' }}
                  >
                    <span className="flex items-center gap-2 not-italic" style={{ transform: 'skewX(10deg)' }}>
                      <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                      Назад
                    </span>
                  </motion.button>
                )}
                {hasNextLesson ? (
                  <motion.button
                    onClick={handleNext}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="group px-6 py-4 bg-transparent border-2 border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/10 hover:border-[#00FF88] font-sans font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] not-italic"
                    style={{ transform: 'skewX(-10deg)' }}
                  >
                    <span className="flex items-center gap-2 not-italic" style={{ transform: 'skewX(10deg)' }}>
                      Далее
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={() => navigate('/tripwire')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="group px-6 py-4 bg-transparent border-2 border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/10 hover:border-[#00FF88] font-sans font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] not-italic"
                    style={{ transform: 'skewX(-10deg)' }}
                  >
                    <span className="flex items-center gap-2 not-italic" style={{ transform: 'skewX(10deg)' }}>
                      К Модулям
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.section>

          {/* ⚡ CYBER SIDEBAR */}
          <aside className="space-y-6">
            {/* ⚡ GLASS PANEL: Lesson Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/30 flex items-center justify-center">
                  <Book className="w-6 h-6 text-[#00FF88]" />
                </div>
                <div>
                  <h3 className="text-white font-['Space_Grotesk'] font-bold uppercase tracking-wider">Информация</h3>
                  <p className="text-xs text-gray-500 font-['Manrope'] uppercase tracking-wider">О уроке</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Адаптивный блок длительности */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white/60">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Длительность</span>
                  </div>
                  <span className="text-[#00FF88] font-mono font-bold text-lg">
                    {lesson.duration_minutes || 0} мин
                  </span>
                </div>

                {lesson.tip && (
                  <div className="p-4 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-lg backdrop-blur-sm">
                    <p className="text-sm text-gray-300 font-['Manrope'] leading-relaxed">💡 {lesson.tip}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* ⚡ GLASS PANEL: Materials */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              }}
            >
              <h3 className="text-white font-['Space_Grotesk'] font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00FF88]" />
                Материалы
              </h3>
              
              {materials.length > 0 ? (
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
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-8 h-8 text-[#00FF88]/50" />
                  </div>
                  <p className="text-sm text-gray-400 mb-1 font-['Manrope']">
                    Материалы пока не загружены
                  </p>
                  <p className="text-xs text-gray-500 font-['Manrope']">
                    Проверьте позже или свяжитесь с преподавателем
                  </p>
                </div>
              )}
            </motion.div>

            {/* ⚡ GLASS PANEL: Progress */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl"
              style={{
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              }}
            >
              <h3 className="text-white font-['Space_Grotesk'] font-bold uppercase tracking-wider mb-4">Прогресс</h3>
              <div className="relative">
                <Progress 
                  value={((currentLessonIndex + 1) / allLessons.length) * 100} 
                  className="h-3 mb-3 bg-black/50 border border-[#00FF88]/20 rounded-full overflow-hidden"
                  style={{
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}
                />
                <div 
                  className="absolute top-0 left-0 h-3 bg-[#00FF88] rounded-full transition-all duration-500"
                  style={{
                    width: `${((currentLessonIndex + 1) / allLessons.length) * 100}%`,
                    boxShadow: '0 0 20px rgba(0, 255, 136, 0.6)'
                  }}
                />
              </div>
              <p className="text-sm text-gray-400 font-['Manrope'] flex items-center justify-between">
                <span>{currentLessonIndex + 1} / {allLessons.length} уроков</span>
                <span className="text-[#00FF88] font-bold">
                  {Math.round(((currentLessonIndex + 1) / allLessons.length) * 100)}%
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
    </div>
  );
};

export default TripwireLesson;

