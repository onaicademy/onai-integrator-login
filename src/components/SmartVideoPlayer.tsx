import React, { useRef, useEffect, useState } from 'react';
import Plyr from 'plyr';
import Hls from 'hls.js';
import 'plyr/dist/plyr.css';

interface SmartVideoPlayerProps {
  videoId: string;
  hlsUrl: string;
  captions?: Array<{
    kind: string;
    label: string;
    srclang: string;
    src: string;
    default?: boolean;
  }>;
  onTimeUpdate?: (data: {
    currentTime: number;
    duration: number;
    percentage: number;
  }) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

/**
 * SmartVideoPlayer - Direct HLS Streaming with Plyr
 * 
 * Features:
 * - Direct HLS streaming (no iframe!)
 * - Plyr UI with custom Neon Green styling
 * - Subtitles support (.vtt)
 * - Real-time telemetry
 * - Heatmap data collection
 */
export const SmartVideoPlayer: React.FC<SmartVideoPlayerProps> = ({
  videoId,
  hlsUrl,
  captions = [],
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;

    try {
      console.log('🎬 [SmartVideoPlayer] Initializing...');
      console.log('📺 HLS URL:', hlsUrl);

      // ============================
      // Step 1: Initialize HLS.js
      // ============================
      if (Hls.isSupported()) {
        console.log('✅ HLS.js is supported');
        
        hlsRef.current = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });

        hlsRef.current.loadSource(hlsUrl);
        hlsRef.current.attachMedia(videoRef.current);

        hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ [HLS] Manifest parsed successfully');
          setIsReady(true);
        });

        hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
          console.error('❌ [HLS] Error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError('Ошибка сети. Проверьте интернет.');
                hlsRef.current?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setError('Ошибка медиа. Попробуйте перезагрузить.');
                hlsRef.current?.recoverMediaError();
                break;
              default:
                setError('Фатальная ошибка воспроизведения.');
                break;
            }
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        console.log('✅ Using Safari native HLS support');
        videoRef.current.src = hlsUrl;
        setIsReady(true);
      } else {
        setError('HLS не поддерживается в этом браузере');
        return;
      }

      // ============================
      // Step 2: Initialize Plyr
      // ============================
      playerRef.current = new Plyr(videoRef.current, {
        controls: [
          'play-large',
          'play',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'captions',
          'settings',
          'pip',
          'fullscreen',
        ],
        settings: ['captions', 'quality', 'speed'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        quality: {
          default: 720,
          options: [1080, 720, 480, 360],
          forced: true,
          onChange: (quality) => {
            console.log('📺 Quality changed:', quality);
          },
        },
        captions: {
          active: true,
          language: 'ru',
          update: true,
        },
      });

      console.log('✅ [Plyr] Player initialized');

      // ============================
      // Step 3: Setup Event Listeners
      // ============================
      const player = playerRef.current;

      player.on('ready', () => {
        console.log('✅ [Plyr] Player ready');
      });

      player.on('play', () => {
        console.log('▶️ [Plyr] Play');
        onPlay?.();
      });

      player.on('pause', () => {
        console.log('⏸️ [Plyr] Pause');
        onPause?.();
      });

      player.on('timeupdate', () => {
        if (!videoRef.current) return;

        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration || 0;
        const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

        onTimeUpdate?.({
          currentTime,
          duration,
          percentage,
        });
      });

      player.on('ended', () => {
        console.log('🏁 [Plyr] Video ended');
        onEnded?.();
      });

      // ============================
      // Step 4: Cleanup
      // ============================
      return () => {
        console.log('🧹 [SmartVideoPlayer] Cleanup');
        player?.destroy();
        hlsRef.current?.destroy();
      };
    } catch (err: any) {
      console.error('❌ [SmartVideoPlayer] Initialization failed:', err);
      setError(err.message);
    }
  }, [hlsUrl, videoId]);

  return (
    <div className="smart-video-player-wrapper relative w-full">
      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 rounded-xl">
          <div className="text-center p-8">
            <h3 className="text-2xl font-bold text-red-500 mb-2">
              ❌ Ошибка воспроизведения
            </h3>
            <p className="text-white/60">{error}</p>
            <button
              onClick={() => {
                setError(null);
                window.location.reload();
              }}
              className="mt-4 px-6 py-2 bg-[#00FF88] text-black font-bold rounded-lg hover:bg-[#00DD77] transition-colors"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-40 rounded-xl">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#00FF88] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#00FF88] font-bold">Загрузка видео...</p>
          </div>
        </div>
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full rounded-xl"
        crossOrigin="anonymous"
        playsInline
        style={{
          aspectRatio: '16/9',
          backgroundColor: '#000',
        }}
      >
        {/* Subtitles/Captions */}
        {captions.map((caption, index) => (
          <track
            key={index}
            kind={caption.kind as any}
            label={caption.label}
            srcLang={caption.srclang}
            src={caption.src}
            default={caption.default}
          />
        ))}
      </video>

      {/* Custom Plyr Styling (Selective Green + White) */}
      <style>{`
        .plyr {
          --plyr-color-main: #ffffff;
          --plyr-video-background: #000;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 0 40px rgba(0, 255, 136, 0.2);
          border: 1px solid rgba(0, 255, 136, 0.2);
        }

        /* 🎯 ЗЕЛЁНАЯ большая кнопка Play (центр) - БЕЗ ЛАГА */
        .plyr__control--overlaid {
          background: rgba(0, 255, 136, 0.9) !important;
          color: #000 !important;
          transform: none !important; /* Убираем transform эффекты */
          transition: background-color 0.2s ease !important; /* Только цвет меняется */
        }

        .plyr__control--overlaid:hover {
          background: rgba(0, 255, 136, 1) !important;
          transform: none !important; /* БЕЗ ДВИЖЕНИЯ! */
        }

        /* 🎯 ЗЕЛЁНАЯ маленькая кнопка Play в контроллере */
        .plyr__controls button[data-plyr="play"] {
          color: #00FF88 !important;
        }

        .plyr__controls button[data-plyr="play"]:hover {
          color: #00DD77 !important;
          background: rgba(0, 255, 136, 0.1) !important;
        }

        /* 🎯 ЗЕЛЁНЫЕ: Settings, PIP, Fullscreen */
        .plyr__controls button[data-plyr="settings"],
        .plyr__controls button[data-plyr="pip"],
        .plyr__controls button[data-plyr="fullscreen"] {
          color: #00FF88 !important;
        }

        .plyr__controls button[data-plyr="settings"]:hover,
        .plyr__controls button[data-plyr="pip"]:hover,
        .plyr__controls button[data-plyr="fullscreen"]:hover {
          color: #00DD77 !important;
          background: rgba(0, 255, 136, 0.1) !important;
        }

        /* ⚪ БЕЛЫЕ: Остальные кнопки (mute, captions, и т.д.) */
        .plyr__controls button:not([data-plyr="play"]):not([data-plyr="settings"]):not([data-plyr="pip"]):not([data-plyr="fullscreen"]) {
          color: #ffffff !important;
        }

        .plyr__controls button:not([data-plyr="play"]):not([data-plyr="settings"]):not([data-plyr="pip"]):not([data-plyr="fullscreen"]):hover {
          color: #cccccc !important;
          background: rgba(255, 255, 255, 0.1) !important;
        }

        /* ⚪ БЕЛЫЙ прогресс бар */
        .plyr__progress__buffer {
          color: rgba(255, 255, 255, 0.3);
        }

        .plyr--full-ui input[type="range"] {
          color: #ffffff;
        }

        .plyr__volume input[type="range"]::-webkit-slider-thumb {
          background: #ffffff;
        }

        .plyr__volume input[type="range"]::-moz-range-thumb {
          background: #ffffff;
        }

        /* Таймеры (белые) */
        .plyr__time {
          color: #ffffff !important;
        }

        .plyr__captions {
          font-size: 1.2em;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9);
        }
      `}</style>
    </div>
  );
};

export default SmartVideoPlayer;

