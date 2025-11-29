import React, { useRef, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  videoId: string;
  title?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  autoPlay?: boolean;
}

// 🐰 BunnyCDN Stream Library ID (должен совпадать с бэкендом)
const BUNNY_LIBRARY_ID = '551815';

interface PlayerMessage {
  event: string;
  data?: {
    seconds?: number;
    duration?: number;
    currentTime?: number;
    percent?: number;
  };
}

export const VideoPlayer = ({ 
  videoId, 
  title = 'Video', 
  onTimeUpdate, 
  onEnded, 
  autoPlay = false 
}: VideoPlayerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 🎬 BunnyCDN Iframe Embed URL
  const embedUrl = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}?autoplay=${autoPlay}&loop=false&muted=false&preload=true&responsive=true`;

  useEffect(() => {
    // 🎧 Listen for postMessage events from iframe (Player.js spec)
    const handleMessage = (event: MessageEvent<PlayerMessage>) => {
      // Проверяем что сообщение от BunnyCDN iframe
      if (event.origin !== 'https://iframe.mediadelivery.net') {
        return;
      }

      const message = event.data;
      
      // Debug logging
      console.log('🎬 [VideoPlayer] Message from iframe:', message);

      // Обрабатываем события
      switch (message.event) {
        case 'ready':
          console.log('✅ [VideoPlayer] Player ready');
          setIsReady(true);
          setIsLoading(false);
          break;

        case 'timeupdate':
          if (message.data && onTimeUpdate) {
            const currentTime = message.data.seconds || message.data.currentTime || 0;
            const duration = message.data.duration || 0;
            
            if (duration > 0) {
              onTimeUpdate(currentTime, duration);
            }
          }
          break;

        case 'ended':
          console.log('🏁 [VideoPlayer] Video ended');
          if (onEnded) {
            onEnded();
          }
          break;

        case 'play':
          console.log('▶️ [VideoPlayer] Video playing');
          setIsLoading(false);
          break;

        case 'pause':
          console.log('⏸️ [VideoPlayer] Video paused');
          break;

        case 'error':
          console.error('❌ [VideoPlayer] Player error:', message.data);
          setIsLoading(false);
          break;

        default:
          // Игнорируем другие события
          break;
      }
    };

    // Подписываемся на события
    window.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onTimeUpdate, onEnded]);

  // 🔄 Handle iframe load
  const handleIframeLoad = () => {
    console.log('📺 [VideoPlayer] Iframe loaded');
    setIsLoading(false);
  };

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10">
      {/* 🔄 Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 p-8">
            {/* Animated Loader */}
            <div className="relative">
              <Loader2 className="w-16 h-16 text-[#00FF88] animate-spin" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-[#00FF88]/20 rounded-full animate-pulse" />
            </div>
            
            {/* Title */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">
                Загрузка видео...
              </h3>
              <p className="text-white/60 text-sm">
                Подождите несколько секунд
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🎬 BunnyCDN Iframe Player */}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title}
        loading="eager"
        referrerPolicy="origin"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen={true}
        onLoad={handleIframeLoad}
        className="w-full h-full border-none"
        style={{
          border: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};
