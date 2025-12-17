import { useState, useRef, useEffect, memo } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import Hls from 'hls.js';
import { api } from '@/utils/apiClient';

interface SmartVideoPlayerProps {
  videoUrl: string;
  videoId: string;
  posterUrl?: string; // 🖼️ URL превью/обложки видео
  startPosition?: number; // ✅ NEW: Начальная позиция из БД (секунды)
  onProgress?: (progress: number, currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onSeeking?: () => void;
  onSeeked?: (newTime: number) => void;
  enableAutoSubtitles?: boolean;
  userSubtitles?: string;
}

// 🚀 ОПТИМИЗАЦИЯ: Мемоизация компонента
export const SmartVideoPlayer = memo(function SmartVideoPlayer({
  videoUrl,
  videoId,
  posterUrl, // 🖼️ Превью видео
  startPosition, // ✅ NEW: Начальная позиция из БД
  onProgress,
  onPlay,
  onPause,
  onSeeking,
  onSeeked,
  enableAutoSubtitles = false, // 🔒 ПО УМОЛЧАНИЮ ВЫКЛЮЧЕНО
  userSubtitles
}: SmartVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [subtitlesVTT, setSubtitlesVTT] = useState<string | null>(null);
  const [captionSize, setCaptionSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [captionsEnabled, setCaptionsEnabled] = useState(false); // 🔒 ПО УМОЛЧАНИЮ ВЫКЛЮЧЕНО
  const [showCaptionsMenu, setShowCaptionsMenu] = useState(false);
  const [transcodingStatus, setTranscodingStatus] = useState<'processing' | 'ready' | 'failed' | null>(null);
  const [transcodingProgress, setTranscodingProgress] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false); // 🔥 NEW: Флаг готовности плеера
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null); // ✅ Хранить blob URL для cleanup
  
  // Функция добавления track с проверками и ре-инициализацией
  const addSubtitleTrack = (video: HTMLVideoElement, vtt: string) => {
    try {
      // ✅ ОЧИСТКА: Освобождаем старый blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      // ✅ ФИКС: Удаляем старые tracks ВСЕГДА
      const existingTracks = Array.from(video.querySelectorAll('track'));
      if (existingTracks.length > 0) {
        existingTracks.forEach(track => track.remove());
      }

      // Создать новый track
      const track = document.createElement('track');
      track.kind = 'captions';
      track.label = 'Русский (авто)';
      track.srclang = 'ru';
      track.default = false; // 🔒 НЕ ВКЛЮЧАТЬ ПО УМОЛЧАНИЮ
      
      // ✅ ИСПОЛЬЗУЕМ BLOB URL
      const blob = new Blob([vtt], { type: 'text/vtt' });
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl; // ✅ Сохраняем для cleanup
      track.src = blobUrl;
      
      // ✅ Добавляем обработчик загрузки
      track.addEventListener('load', () => {
        console.log('✅ Subtitle track loaded successfully');
      });
      
      track.addEventListener('error', (e) => {
        console.error('❌ Subtitle track failed to load:', e);
      });
      
      video.appendChild(track);
      
      console.log('✅ Subtitle track added:', track.src);
      console.log('📊 Total textTracks:', video.textTracks.length);
    } catch (error) {
      console.error('❌ Failed to add subtitle track:', error);
    }
  };

  // Функция инициализации Plyr
  const initPlyr = (video: HTMLVideoElement, hls: Hls | null) => {
    const qualityLevels = hls && hls.levels.length > 0 ? hls.levels.map(level => level.height) : [720];
    
    const plyrOptions: Plyr.Options = {
        controls: [
        'play-large',      // ✅ БОЛЬШАЯ КНОПКА PLAY
          'play',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'captions',
          'settings',
          'pip',
        'fullscreen'
        ],
      
        settings: ['captions', 'quality', 'speed'],
      
        quality: {
          default: 720,
        options: qualityLevels,
          forced: true,
        onChange: (quality: number) => {
          if (!hls) return;
          const levelIndex = hls.levels.findIndex(level => level.height === quality);
          if (levelIndex >= 0) {
            console.log(`🔄 Quality changed to ${quality}p`);
            hls.currentLevel = levelIndex;
          }
        }
      },
      
      speed: {
        selected: 1,
        options: [0.5, 0.75, 1, 1.25, 1.5, 2]
      },
      
      // ✅ КРИТИЧЕСКИ ВАЖНО ДЛЯ HLS
        captions: {
        active: false,       // Выключены по умолчанию (включаются по желанию)
          language: 'ru',
        update: true         // ✅ ОБЯЗАТЕЛЬНО!
      },
      
      i18n: {
        restart: 'Перезапустить',
        rewind: 'Перемотать назад',
        play: 'Воспроизвести',
        pause: 'Пауза',
        fastForward: 'Перемотать вперед',
        seek: 'Перемотка',
        seekLabel: '{currentTime} из {duration}',
        played: 'Воспроизведено',
        buffered: 'Буферизовано',
        currentTime: 'Текущее время',
        duration: 'Продолжительность',
        volume: 'Громкость',
        mute: 'Без звука',
        unmute: 'Включить звук',
        enableCaptions: 'Включить субтитры',
        disableCaptions: 'Выключить субтитры',
        download: 'Скачать',
        enterFullscreen: 'Полный экран',
        exitFullscreen: 'Выйти из полноэкранного режима',
        frameTitle: 'Плеер для {title}',
        captions: 'Субтитры',
        settings: 'Настройки',
        pip: 'Картинка в картинке',
        menuBack: 'Назад',
        speed: 'Скорость',
        normal: 'Обычная',
        quality: 'Качество',
        loop: 'Повтор',
        start: 'Начало',
        end: 'Конец',
        all: 'Все',
        reset: 'Сбросить',
        disabled: 'Отключено',
        enabled: 'Включено',
        qualityBadge: {
          2160: '4K',
          1440: 'HD',
          1080: 'HD',
          720: 'HD',
          576: 'SD',
          480: 'SD',
        },
      },
      
      ratio: '16:9',
      storage: { enabled: true, key: 'plyr' },
      keyboard: { focused: true, global: false },
      tooltips: { controls: true, seek: true }
    };

    const player = new Plyr(video, plyrOptions);
    playerRef.current = player;

    // ✅ ВАЖНО: Для HLS + Captions
    if (hls) {
      player.on('languagechange', () => {
        setTimeout(() => {
          if ((hls as any).subtitleTrack !== undefined) {
            (hls as any).subtitleTrack = player.currentTrack;
          }
        }, 50);
      });
    }

    // Events
    player.on('ready', () => {
      console.log('✅ Plyr ready');
      setIsPlayerReady(true); // 🔥 Плеер готов!
      
      // 🎬 ВОССТАНОВЛЕНИЕ ПРОГРЕССА из БД (приоритет) или localStorage
      try {
        let positionToRestore: number | null = null;
        
        // 1️⃣ Пробуем восстановить из startPosition (из БД)
        if (startPosition && startPosition > 5 && player.duration && startPosition < player.duration * 0.95) {
          positionToRestore = startPosition;
          console.log(`🎬 [DB] Восстановлена позиция из БД: ${startPosition.toFixed(1)}s`);
        }
        // 2️⃣ Если нет в БД - пробуем localStorage (fallback)
        else {
          const savedProgress = localStorage.getItem(`video_progress_${videoId}`);
          if (savedProgress) {
            const savedTime = parseFloat(savedProgress);
            if (savedTime > 5 && player.duration && savedTime < player.duration * 0.95) {
              positionToRestore = savedTime;
              console.log(`🎬 [LocalStorage] Восстановлена позиция: ${savedTime.toFixed(1)}s`);
            }
          }
        }
        
        // Применяем восстановленную позицию
        if (positionToRestore) {
          player.currentTime = positionToRestore;
        }
      } catch (error) {
        console.error('❌ Ошибка восстановления прогресса:', error);
      }
      
      // ✅ Перехватываем клик по кнопке CC
      const ccButton = video.closest('.plyr')?.querySelector('[data-plyr="captions"]');
      if (ccButton) {
        ccButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowCaptionsMenu(prev => !prev);
        });
      }
    });
    
    // ✅ ВАЖНО: Отслеживаем изменение состояния субтитров в Plyr
    player.on('captionsenabled', () => {
      console.log('📺 Plyr captions enabled');
      setCaptionsEnabled(true);
    });
    
    player.on('captionsdisabled', () => {
      console.log('📺 Plyr captions disabled');
      setCaptionsEnabled(false);
    });
    
    player.on('play', () => {
      setIsPlaying(true);
      onPlay?.();
    });
    
    player.on('pause', () => {
      setIsPlaying(false);
      onPause?.();
    });
    
    player.on('seeking', () => {
      onSeeking?.();
    });
    
    player.on('seeked', () => {
      onSeeked?.(player.currentTime);
    });
    
    player.on('timeupdate', () => {
      if (onProgress && player.duration) {
        const progress = (player.currentTime / player.duration) * 100;
        const currentTime = player.currentTime;
        
        onProgress(progress, currentTime, player.duration);
        
        // 💾 СОХРАНЕНИЕ ПРОГРЕССА в localStorage (каждые 5 секунд)
        if (Math.floor(currentTime) % 5 === 0) {
          try {
            localStorage.setItem(`video_progress_${videoId}`, currentTime.toString());
          } catch (error) {
            console.error('❌ Ошибка сохранения прогресса:', error);
          }
        }
      }
    });

    console.log('✅ Plyr initialized');
  };

  // Загрузка субтитров (Tripwire)
  const fetchSubtitles = async () => {
    try {
      console.log(`🔍 Fetching subtitles for video ${videoId}...`);
      
      // ✅ Для Tripwire используем новый API endpoint
      const response = await api.get<{ success: boolean; data: { vttContent?: string } | null }>(`/api/tripwire/transcriptions/${videoId}`);
      
      console.log('✅ Subtitles fetched:', {
        success: response.success,
        hasData: !!response.data,
        hasVTT: !!response.data?.vttContent,
        vttLength: response.data?.vttContent?.length || 0
      });
      
      if (response.success && response.data?.vttContent) {
        setSubtitlesVTT(response.data.vttContent);
        console.log('✅ Subtitles loaded successfully');
      } else {
        console.log('ℹ️ No subtitles available for this video');
      }
    } catch (error) {
      console.error('❌ Failed to fetch subtitles:', error);
      // Не критично - субтитры опциональны
    }
  };

  // ШАГ 0: Проверка статуса транскодинга (для новых видео)
  useEffect(() => {
    if (!videoId) return;

    let intervalId: NodeJS.Timeout;

    const checkTranscodingStatus = async () => {
      try {
        const response = await api.get(`/api/videos/bunny-status/${videoId}`);
        
        if (response.status === 'ready') {
          setTranscodingStatus('ready');
          setTranscodingProgress(100);
          if (intervalId) clearInterval(intervalId);
        } else if (response.status === 'failed') {
          setTranscodingStatus('failed');
          setTranscodingProgress(0);
          if (intervalId) clearInterval(intervalId);
        } else if (response.status === 'processing') {
          setTranscodingStatus('processing');
          setTranscodingProgress(response.progress || 0);
        }
      } catch (error) {
        // Если API не отвечает, считаем что видео готово (старые видео)
        setTranscodingStatus('ready');
        setTranscodingProgress(100);
        if (intervalId) clearInterval(intervalId);
      }
    };

    // Первая проверка сразу
    checkTranscodingStatus();

    // Потом каждые 10 секунд
    intervalId = setInterval(checkTranscodingStatus, 10000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [videoId]);

  // ШАГ 1: Загрузить субтитры
  useEffect(() => {
    if (enableAutoSubtitles && videoId) {
      fetchSubtitles();
    }
  }, [videoId, enableAutoSubtitles]);

  // ШАГ 2: Инициализация HLS и Plyr (ОДИН РАЗ)
  useEffect(() => {
    if (!videoRef.current || playerRef.current) return; // Не инициализировать повторно!

    const video = videoRef.current;

    // B. Инициализировать HLS
    if (Hls.isSupported()) {
      // 🚀 ОПТИМИЗАЦИЯ: Конфигурация HLS для быстрой загрузки
      const hls = new Hls({
        enableWorker: true, // Используем Web Worker для парсинга
        lowLatencyMode: false,
        backBufferLength: 30, // ✅ Уменьшено с 90 до 30 секунд (меньше памяти)
        maxBufferLength: 30, // ✅ Макс буфер 30 секунд
        maxBufferSize: 60 * 1000 * 1000, // ✅ 60MB макс (вместо default)
        maxMaxBufferLength: 600, // ✅ 10 минут макс
        liveSyncDurationCount: 3, // ✅ Live буфер
        liveMaxLatencyDurationCount: 10, // ✅ Live макс задержка
        startLevel: -1, // ✅ Автовыбор начального качества
        abrEwmaDefaultEstimate: 500000, // ✅ 500Kbps начальная оценка
        abrBandWidthFactor: 0.95, // ✅ 95% от bandwidth для выбора качества
        abrBandWidthUpFactor: 0.7, // ✅ 70% запас для апгрейда качества
        capLevelToPlayerSize: true, // ✅ Ограничение качества размером плеера
        debug: false, // ✅ Отключаем debug логи
      });

      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS manifest loaded');
        
        // C. Инициализировать Plyr ПОСЛЕ HLS
        initPlyr(video, hls);
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = videoUrl;
      initPlyr(video, null);
    }

    // Cleanup
    return () => {
      // ✅ Освобождаем blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl]); // ✅ Только videoUrl, БЕЗ subtitlesVTT!

  // ШАГ 3: Добавить субтитры когда они загрузятся И плеер готов
  useEffect(() => {
    if (!videoRef.current || !subtitlesVTT || !isPlayerReady) {
      console.log('⚠️ Skip adding subtitles:', {
        hasVideo: !!videoRef.current,
        hasVTT: !!subtitlesVTT,
        isPlayerReady: isPlayerReady
      });
      return;
    }
    
    console.log('🎬 Adding subtitles to existing player...');
    addSubtitleTrack(videoRef.current, subtitlesVTT);
    
    // 🔒 НЕ ВКЛЮЧАЕМ АВТОМАТИЧЕСКИ - пользователь сам включит если нужно
  }, [subtitlesVTT, isPlayerReady]); // 🔥 Зависимость от isPlayerReady!

  // ШАГ 4: Изменить размер субтитров
  useEffect(() => {
    const captionsContainer = document.querySelector('.plyr__captions');
    if (!captionsContainer) return;

    // Убрать все классы размеров
    captionsContainer.classList.remove('plyr__captions--small', 'plyr__captions--medium', 'plyr__captions--large');
    
    // Добавить текущий размер
    captionsContainer.classList.add(`plyr__captions--${captionSize}`);
    
    console.log(`📐 Caption size changed to: ${captionSize}`);
  }, [captionSize]);

  // ШАГ 5: Управление субтитрами - ЯВНОЕ включение/выключение
  useEffect(() => {
    if (!playerRef.current || !videoRef.current) return;
    
    console.log(`🎬 Setting captions to: ${captionsEnabled ? 'ON' : 'OFF'}`);
    console.log(`📊 Current textTracks count: ${videoRef.current.textTracks.length}`);
    
    try {
      // ✅ КРИТИЧНО: Устанавливаем явное состояние, а не toggle
      const currentState = playerRef.current.captions?.active;
      
      if (captionsEnabled && !currentState) {
        // ✅ ФИКС: Убедимся что track существует ПЕРЕД включением
        if (subtitlesVTT && videoRef.current.textTracks.length === 0) {
          console.log('⚠️ No subtitle tracks found, re-adding...');
          addSubtitleTrack(videoRef.current, subtitlesVTT);
          // Небольшая задержка для применения track
          setTimeout(() => {
            if (playerRef.current) {
              try {
                playerRef.current.captions.active = true;
                console.log('✅ Captions enabled after re-adding track');
              } catch (error) {
                console.error('❌ Failed to enable captions after re-adding:', error);
              }
            }
          }, 150);
        } else {
          // Track уже есть, просто включаем
          playerRef.current.captions.active = true;
          console.log('✅ Captions enabled');
        }
      } else if (!captionsEnabled && currentState) {
        // Выключаем субтитры
        playerRef.current.captions.active = false;
        console.log('✅ Captions disabled');
      }
    } catch (error) {
      console.error('❌ Error managing captions:', error);
    }
  }, [captionsEnabled, subtitlesVTT]);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowCaptionsMenu(false);
      }
    };

    if (showCaptionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCaptionsMenu]);

  return (
    <div className="relative">
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
        {/* 🎬 ПРОГРЕСС БАР ТРАНСКОДИНГА */}
        {transcodingStatus === 'processing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0A] z-50">
            <div className="text-center space-y-6 px-8 max-w-md">
              {/* Анимированная иконка */}
              <div className="relative">
                <div className="w-20 h-20 mx-auto rounded-full border-4 border-[#00FF88]/20 border-t-[#00FF88] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-10 h-10 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              
              {/* Заголовок */}
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Обработка видео
                </h3>
                <p className="text-gray-400 text-sm">
                  Обрабатываю ваше видео. Отслеживайте прогресс.
                </p>
              </div>

              {/* Прогресс бар */}
              <div className="space-y-2">
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#00FF88] to-[#00CC6E] transition-all duration-500 ease-out"
                    style={{ width: `${transcodingProgress}%` }}
                  />
                </div>
                <p className="text-[#00FF88] font-mono text-sm">
                  {transcodingProgress}%
                </p>
              </div>

              {/* Информация */}
              <p className="text-xs text-gray-500">
                Это может занять несколько минут. Страница автоматически обновится.
              </p>
            </div>
          </div>
        )}

        {/* 💀 ОШИБКА ТРАНСКОДИНГА */}
        {transcodingStatus === 'failed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0A] z-50">
            <div className="text-center space-y-4 px-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Ошибка обработки видео
                </h3>
                <p className="text-gray-400 text-sm">
                  Попробуйте загрузить видео в формате MP4 (H.264)
                </p>
              </div>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className="plyr-video"
          crossOrigin="anonymous"  // ✅ КРИТИЧЕСКИ ВАЖНО!
          playsInline
          preload="metadata" // 🚀 Предзагрузка метаданных (быстрее)
          style={{ opacity: transcodingStatus === 'processing' || transcodingStatus === 'failed' ? 0 : 1 }}
        />
        
        {/* 🎨 CUSTOM CC MENU - Выпадающее меню для субтитров */}
        {showCaptionsMenu && (
          <div 
            ref={menuRef}
            className="absolute bottom-16 right-4 z-50 bg-[#0a0a0f]/95 backdrop-blur-xl border border-[#00FF88]/30 rounded-xl shadow-2xl shadow-[#00FF88]/20 min-w-[200px] overflow-hidden"
            style={{
              animation: 'slideIn 0.2s ease-out'
            }}
          >
            {/* Заголовок */}
            <div className="px-4 py-3 border-b border-gray-800">
              <span className="text-sm font-semibold text-white">Субтитры</span>
            </div>
            
            {/* Опции */}
            <div className="p-2 space-y-1">
              {/* Маленький */}
              <button
                onClick={() => {
                  setCaptionSize('small');
                  setCaptionsEnabled(true);
                  setShowCaptionsMenu(false);
                }}
                className={`w-full px-4 py-2.5 rounded-lg text-left text-sm transition-all flex items-center gap-2 ${
                  captionsEnabled && captionSize === 'small' 
                    ? 'bg-[#00FF88]/20 text-[#00FF88] font-semibold' 
                    : 'text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                {captionsEnabled && captionSize === 'small' && <span className="text-[#00FF88]">✓</span>}
                <span>Маленький</span>
              </button>
              
              {/* Средний */}
              <button
                onClick={() => {
                  setCaptionSize('medium');
                  setCaptionsEnabled(true);
                  setShowCaptionsMenu(false);
                }}
                className={`w-full px-4 py-2.5 rounded-lg text-left text-sm transition-all flex items-center gap-2 ${
                  captionsEnabled && captionSize === 'medium' 
                    ? 'bg-[#00FF88]/20 text-[#00FF88] font-semibold' 
                    : 'text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                {captionsEnabled && captionSize === 'medium' && <span className="text-[#00FF88]">✓</span>}
                <span>Средний</span>
              </button>
              
              {/* Большой */}
              <button
                onClick={() => {
                  setCaptionSize('large');
                  setCaptionsEnabled(true);
                  setShowCaptionsMenu(false);
                }}
                className={`w-full px-4 py-2.5 rounded-lg text-left text-sm transition-all flex items-center gap-2 ${
                  captionsEnabled && captionSize === 'large' 
                    ? 'bg-[#00FF88]/20 text-[#00FF88] font-semibold' 
                    : 'text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                {captionsEnabled && captionSize === 'large' && <span className="text-[#00FF88]">✓</span>}
                <span>Большой</span>
              </button>
            </div>
          </div>
        )}

        {/* ✅ СТИЛИ */}
        <style dangerouslySetInnerHTML={{ __html: `
        /* 🎬 АНИМАЦИЯ ДЛЯ МЕНЮ */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Progress bar */
        .plyr__progress {
          border-radius: 100px !important;
        }

        .plyr__progress input[type="range"] {
          border-radius: 100px !important;
        }

        /* ✅ УБРАТЬ SHADOW */
        .plyr__progress__container {
          background: transparent !important;
          border-radius: 100px !important;
        }

        .plyr__progress__buffer {
          background: rgba(255, 255, 255, 0.25) !important;
          border-radius: 100px !important;
        }

        .plyr--full-ui input[type=range] {
          color: #00FF88 !important;
        }

        .plyr__progress input[type=range]::-webkit-slider-thumb {
          background: #00FF88 !important;
          border: none !important;
          box-shadow: 0 0 10px rgba(0, 255, 136, 0.5) !important;
        }

        .plyr__progress input[type=range]::-moz-range-thumb {
          background: #00FF88 !important;
          border: none !important;
          box-shadow: 0 0 10px rgba(0, 255, 136, 0.5) !important;
        }

        .plyr__progress__container,
        .plyr__progress input[type="range"],
        .plyr__progress__buffer {
          box-shadow: none !important;
          border: none !important;
        }

        /* Play button - ЗЕЛЁНЫЙ КРУГ С БЕЛОЙ СТРЕЛКОЙ */
        .plyr__control--overlaid {
          background: rgba(0, 255, 136, 0.9) !important;
          width: 60px !important;
          height: 60px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
        }

        /* ✅ БЕЛАЯ СТРЕЛКА В ЗЕЛЕНОМ КРУЖКЕ */
        .plyr__control--overlaid svg {
          fill: #FFFFFF !important;
          width: 28px !important;
          height: 28px !important;
          margin-left: 3px !important; /* Визуально центрируем треугольник */
        }

        /* ✅ МОБИЛЬНАЯ АДАПТАЦИЯ PLAY BUTTON */
        @media (max-width: 640px) {
          .plyr__control--overlaid {
            width: 50px !important;
            height: 50px !important;
          }
          
          .plyr__control--overlaid svg {
            width: 22px !important;
            height: 22px !important;
            margin-left: 2px !important;
          }
        }

        /* ✅ HOVER - РЕВЕРС ЦВЕТОВ (БЕЛЫЙ ФОН + ЗЕЛЕНЫЙ ЗНАЧОК) - СТАТИЧНАЯ */
        .plyr__control--overlaid:hover {
          background: rgba(255, 255, 255, 0.95) !important;
          transition: background 0.2s ease !important;
        }

        .plyr__control--overlaid:hover svg {
          fill: #00FF88 !important;
          transition: fill 0.2s ease !important;
        }

        /* ✅ МАЛЕНЬКАЯ КНОПКА PLAY В КОНТРОЛАХ (тоже зелёная) */
        .plyr__control[data-plyr="play"] svg {
          fill: #00FF88 !important;
        }

        /* Pause - БЕЛАЯ */
        .plyr__control[data-plyr="pause"] svg {
          fill: #FFFFFF !important;
        }

        /* Time - БЕЛЫЙ */
        .plyr__time {
          color: #FFFFFF !important;
        }

        /* Volume */
        .plyr__control[data-plyr="mute"] svg {
          fill: #FFFFFF !important;
        }

        .plyr__volume input[type=range]::-webkit-slider-thumb {
          background: #FFFFFF !important;
        }

        /* CC button */
        .plyr__control[data-plyr="captions"] {
          display: inline-block !important;
          color: rgba(255, 255, 255, 0.6) !important;
        }

        .plyr__control[data-plyr="captions"][aria-pressed="true"] {
          color: #00FF88 !important;
        }

        /* Settings */
        .plyr__control[data-plyr="settings"] {
          color: #FFFFFF !important;
        }

        .plyr__control[data-plyr="settings"][aria-expanded="true"] {
          color: #00FF88 !important;
        }

        /* PIP, Fullscreen */
        .plyr__control[data-plyr="pip"] svg,
        .plyr__control[data-plyr="fullscreen"] svg {
          fill: #FFFFFF !important;
        }

        /* Settings menu */
        .plyr__menu__container {
          background: rgba(10, 10, 10, 0.95) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(0, 255, 148, 0.3) !important;
          border-radius: 12px !important;
          color: #FFFFFF !important;
        }

        .plyr__menu__container button {
          color: #FFFFFF !important;
        }

        .plyr__menu__container button:hover {
          background: rgba(0, 255, 148, 0.1) !important;
        }

        .plyr__menu__container [role="menuitemradio"][aria-checked="true"]::before {
          background: #00FF88 !important;
        }

        .plyr__menu__container [role="menuitemradio"][aria-checked="true"] {
          color: #00FF88 !important;
        }

        /* ✅ СУБТИТРЫ - БЕЛЫЙ ФОН */
        .plyr__captions {
          font-family: Arial, Helvetica, sans-serif !important;
          font-weight: 500 !important;
        }

        /* Маленький размер */
        .plyr__captions--small {
          font-size: 1.0em !important;
        }

        /* Средний размер (по умолчанию) */
        .plyr__captions--medium {
          font-size: 1.4em !important;
        }

        /* Большой размер */
        .plyr__captions--large {
          font-size: 2.0em !important;
        }

        .plyr__caption {
          background: rgba(255, 255, 255, 0.95) !important;
          color: #000000 !important;
          padding: 4px 12px !important;
          border-radius: 4px !important;
          text-shadow: none !important;
          line-height: 1.4 !important;
        }

        /* Hover */
        .plyr__control:hover {
          background: rgba(0, 255, 148, 0.1) !important;
        }

        /* ✅ АДАПТАЦИЯ КОНТРОЛОВ ДЛЯ МОБИЛЬНЫХ */
        @media (max-width: 640px) {
          /* Уменьшаем размер кнопок */
          .plyr__controls button {
            padding: 6px !important;
          }
          
          /* Уменьшаем иконки */
          .plyr__controls svg {
            width: 16px !important;
            height: 16px !important;
          }
          
          /* Адаптивный размер времени */
          .plyr__time {
            font-size: 11px !important;
          }
          
          /* Адаптивный прогресс бар */
          .plyr__progress input[type=range] {
            height: 4px !important;
          }
          
          /* Адаптивный volume */
          .plyr__volume {
            max-width: 60px !important;
          }
          
          /* Скрыть некоторые кнопки на очень маленьких экранах */
          @media (max-width: 400px) {
            .plyr__control[data-plyr="pip"] {
              display: none !important;
            }
          }
        }

        /* ✅ АДАПТАЦИЯ СУБТИТРОВ ДЛЯ МОБИЛЬНЫХ */
        @media (max-width: 640px) {
          .plyr__captions--small {
            font-size: 0.8em !important;
          }
          
          .plyr__captions--medium {
            font-size: 1.1em !important;
          }
          
          .plyr__captions--large {
            font-size: 1.5em !important;
          }
          
          .plyr__caption {
            padding: 2px 8px !important;
          }
        }

        /* ✅ АДАПТАЦИЯ МЕНЮ НАСТРОЕК ДЛЯ МОБИЛЬНЫХ */
        @media (max-width: 640px) {
          .plyr__menu__container {
            max-width: 90vw !important;
            right: 5px !important;
          }
        }
      ` }} />
      </div>
    </div>
  );
}); // 🚀 ОПТИМИЗАЦИЯ: Закрываем memo
