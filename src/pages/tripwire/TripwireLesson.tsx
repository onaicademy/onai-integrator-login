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
  Book
} from "lucide-react";

const TripwireLesson = () => {
  const { moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  
  // ✅ Generate or get Tripwire User ID from localStorage
  const [tripwireUserId] = useState(() => {
    let userId = localStorage.getItem('tripwire_user_id');
    if (!userId) {
      userId = `tripwire_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('tripwire_user_id', userId);
    }
    return userId;
  });
  
  // Lesson data
  const [lesson, setLesson] = useState<any>(null);
  const [video, setVideo] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // ✅ Все уроки модуля для навигации
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(-1);

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

      // Загрузить видео
      try {
        const videoRes = await api.get(`/api/tripwire/videos/${lessonId}`);
        setVideo(videoRes?.video || videoRes);
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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white">Урок не найден</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0f]">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Breadcrumbs */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/tripwire')}
            className="text-gray-400 hover:text-[#00FF00] transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Назад к модулю</span>
          </button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[#00FF00] text-sm mb-2 uppercase tracking-wider">
                МОДУЛЬ {moduleId} • УРОК {currentLessonIndex + 1} ИЗ {allLessons.length}
              </p>
              <h1 className="text-4xl font-bold text-white">{lesson.title}</h1>
            </div>
            {isCompleted && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#00FF00]/10 border border-[#00FF00]/20 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-[#00FF00]" />
                <span className="text-[#00FF00]">Завершено</span>
              </div>
            )}
          </div>
          {lesson.description && (
            <p className="text-gray-400">{lesson.description}</p>
          )}
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
            {/* Video Player */}
            {(video?.video_url || video?.public_url) ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#00FF00]/20 shadow-lg shadow-[#00FF00]/10">
                <div 
                  ref={videoContainerRef}
                  className="relative aspect-video bg-black"
                  onMouseEnter={() => setShowControls(true)}
                  onMouseLeave={() => playing && setShowControls(false)}
                >
                  <video
                    ref={videoRef}
                    src={video.video_url || video.public_url}
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
                        className="w-20 h-20 rounded-full bg-[#00FF00]/20 border-2 border-[#00FF00] flex items-center justify-center backdrop-blur-sm"
                      >
                        <Play className="w-10 h-10 text-[#00FF00] ml-1" />
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
                          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00FF00]"
                        />
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Play/Pause */}
                          <button
                            onClick={togglePlay}
                            className="text-white hover:text-[#00FF00] transition-colors"
                          >
                            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                          </button>

                          {/* Volume */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={toggleMute}
                              className="text-white hover:text-[#00FF00] transition-colors"
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
                              className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00FF00]"
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
                            className="bg-black/50 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-[#00FF00] outline-none cursor-pointer"
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
                            className="text-white hover:text-[#00FF00] transition-colors"
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
              <div className="relative rounded-2xl overflow-hidden border border-[#00FF00]/20">
                <div className="aspect-video bg-[#0a0a0f] flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Видео еще не загружено</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={handleComplete}
                disabled={isCompleted}
                className={`flex-1 font-semibold rounded-xl transition-all ${
                  isCompleted 
                    ? "bg-gray-800 text-gray-400 cursor-not-allowed" 
                    : "bg-[#00FF00] text-black hover:bg-[#00cc00] shadow-lg shadow-[#00FF00]/30"
                }`}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {isCompleted ? "Урок завершён" : "Завершить урок"}
              </Button>
              <div className="flex gap-3">
                {hasPreviousLesson && (
                  <Button
                    size="lg"
                    onClick={handlePrevious}
                    variant="outline"
                    className="flex-1 bg-transparent border-2 border-[#00FF00]/40 text-[#00FF00] hover:bg-[#00FF00]/10 hover:border-[#00FF00] font-semibold rounded-xl"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Предыдущий
                  </Button>
                )}
                {hasNextLesson ? (
                  <Button
                    size="lg"
                    onClick={handleNext}
                    className="flex-1 bg-transparent border-2 border-[#00FF00]/40 text-[#00FF00] hover:bg-[#00FF00]/10 hover:border-[#00FF00] font-semibold rounded-xl"
                  >
                    Следующий
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => navigate('/tripwire')}
                    className="flex-1 bg-transparent border-2 border-[#00FF00]/40 text-[#00FF00] hover:bg-[#00FF00]/10 hover:border-[#00FF00] font-semibold rounded-xl"
                  >
                    К курсу
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </motion.section>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Lesson Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#1a1a24] border border-gray-800 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#00FF00]/10 border border-[#00FF00]/20 flex items-center justify-center">
                  <Book className="w-6 h-6 text-[#00FF00]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Информация</h3>
                  <p className="text-sm text-gray-400">О уроке</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Длительность
                  </span>
                  <span className="text-white font-mono">{lesson.duration_minutes || 0} мин</span>
                </div>

                {lesson.tip && (
                  <div className="p-4 bg-[#00FF00]/5 border border-[#00FF00]/10 rounded-lg">
                    <p className="text-sm text-gray-300">💡 {lesson.tip}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Materials */}
            {materials.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-[#1a1a24] border border-gray-800 rounded-2xl p-6"
              >
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#00FF00]" />
                  Материалы
                </h3>
                <div className="space-y-2">
                  {materials.map((material: any) => (
                    <a
                      key={material.id}
                      href={material.file_url}
                      download
                      className="flex items-center justify-between p-3 bg-[#0a0a0f] hover:bg-[#00FF00]/5 border border-gray-800 hover:border-[#00FF00]/20 rounded-lg transition-all group"
                    >
                      <span className="text-sm text-gray-300 group-hover:text-white">
                        {material.display_name || material.filename}
                      </span>
                      <Download className="w-4 h-4 text-gray-400 group-hover:text-[#00FF00]" />
                    </a>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Progress */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#1a1a24] border border-gray-800 rounded-2xl p-6"
            >
              <h3 className="text-white font-semibold mb-4">Прогресс модуля</h3>
              <Progress value={((currentLessonIndex + 1) / allLessons.length) * 100} className="h-2 mb-2" />
              <p className="text-sm text-gray-400">
                {currentLessonIndex + 1} из {allLessons.length} уроков
              </p>
            </motion.div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default TripwireLesson;

