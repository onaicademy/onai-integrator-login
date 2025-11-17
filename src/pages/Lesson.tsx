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
  
  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Video player
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  
  // Session ID для аналитики
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  useEffect(() => {
    if (lessonId) {
      loadLessonData();
    }
  }, [lessonId]);

  const loadLessonData = async () => {
    try {
      setLoading(true);
      
      // Загрузить урок
      console.log('📚 Загрузка урока:', lessonId);
      const lessonRes = await api.get(`/api/lessons/${lessonId}`);
      const lessonData = lessonRes?.lesson || lessonRes;
      setLesson(lessonData);
      
      // Проверить завершение
      const completed = localStorage.getItem(`lesson-${lessonId}-completed`);
      setIsCompleted(completed === "true");

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

    } catch (error) {
      console.error('❌ Ошибка загрузки урока:', error);
      // Fallback к mock данным
      setLesson({
        id: parseInt(lessonId!),
        module_id: parseInt(moduleId!),
        title: "Урок загружается...",
        description: "Данные урока загружаются из API",
        duration_minutes: 0
      });
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
      // Перезагрузить урок
      await loadLessonData();
      setEditDialogOpen(false);
    } catch (error) {
      console.error('❌ Ошибка обновления урока:', error);
      alert('Ошибка обновления урока');
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
  const toggleFullscreen = () => {
    if (!videoRef.current?.parentElement) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.parentElement.requestFullscreen();
    }
    trackEvent('fullscreen_toggle');
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

  const handleComplete = () => {
    localStorage.setItem(`lesson-${lessonId}-completed`, "true");
    setIsCompleted(true);
    trackEvent('lesson_complete');
  };

  const handleNext = () => {
    const nextLessonId = Number(lessonId) + 1;
    navigate(`/course/${id}/module/${moduleId}/lesson/${nextLessonId}`);
  };

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
              Модуль {moduleId} • Урок {lessonId}
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
                          {/* Playback Speed */}
                          <select
                            value={playbackRate}
                            onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                            className="bg-black/50 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-[#00ff00] outline-none cursor-pointer"
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
              <Button
                size="lg"
                onClick={handleNext}
                className="flex-1 bg-transparent border-2 border-[#00ff00]/40 text-[#00ff00] hover:bg-[#00ff00]/10 hover:border-[#00ff00] font-semibold rounded-xl transition-all"
              >
                Следующий урок
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
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
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-[#00ff00]/10 to-[#00cc00]/5 border border-[#00ff00]/30 rounded-2xl p-6"
            >
              <h3 className="text-base font-bold text-[#00ff00] mb-3 flex items-center gap-2">
                <span className="text-xl">💡</span>
                Совет
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                После просмотра видео обязательно попрактикуйтесь с материалами урока. Это поможет лучше усвоить материал.
              </p>
            </motion.div>
          </aside>
        </div>
      </div>
      
      {/* ✅ Диалог редактирования урока */}
      {isAdmin && (
        <LessonEditDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSave={handleUpdateLesson}
          lesson={lesson ? {
            id: lesson.id,
            title: lesson.title || '',
            description: lesson.description || '',
            duration_minutes: lesson.duration_minutes || 0
          } : null}
          moduleId={parseInt(moduleId!)}
        />
      )}
    </div>
  );
};

export default Lesson;
