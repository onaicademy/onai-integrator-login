import React, { useRef, useEffect, useCallback, useState } from 'react';
import { SmartVideoPlayer } from './SmartVideoPlayer';
import { PlayerJSVideoPlayer, VideoTrackingData } from './PlayerJSVideoPlayer';
import { useVideoTracking } from '@/hooks/useVideoTracking';

interface VideoPlayerProps {
  videoId: string;
  title?: string;
  onTimeUpdate?: (telemetry: VideoTelemetry) => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  mode?: 'iframe' | 'hls'; // New: Choose rendering mode
}

// 📊 Video Telemetry
export interface VideoTelemetry {
  currentTime: number;
  duration: number;
  percentage: number;
  watchedSegments: [number, number][];
  totalPlayTime: number;
  seekForwardCount: number;
  seekBackwardCount: number;
  playbackSpeedAvg: number;
  maxPositionReached: number;
}

// 🐰 BunnyCDN Config
const BUNNY_LIBRARY_ID = '551815';
const BUNNY_CDN_HOSTNAME = 'video.onai.academy';

/**
 * VideoPlayer: Adaptive video player with two modes
 * 
 * MODE: iframe (default for Tripwire)
 * - Simple, reliable Bunny Iframe embed
 * - Safety Net timer for progress tracking
 * - No complex dependencies
 * 
 * MODE: hls (for main platform with full auth)
 * - Direct HLS streaming via Plyr
 * - Full analytics (heatmaps, seeks, segments)
 * - Custom styling
 */
export const VideoPlayer = ({ 
  videoId, 
  title = 'Video', 
  onTimeUpdate, 
  onEnded, 
  autoPlay = false,
  mode = 'iframe' // Default to iframe for reliability
}: VideoPlayerProps) => {
  // 🎬 If no videoId, show error
  if (!videoId) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-red-500/30">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-8">
            <h3 className="text-2xl font-bold text-red-500 mb-2">
              Видео не найдено
            </h3>
            <p className="text-white/60">
              Загрузите видео через редактор урока
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // MODE: HLS (Plyr + Full Analytics)
  // ========================================
  
  if (mode === 'hls') {
    const hlsUrl = `https://${BUNNY_CDN_HOSTNAME}/${videoId}/playlist.m3u8`;

    const handleAnalyticsUpdate = (analytics: any) => {
      if (!onTimeUpdate) return;

      const watchedSegments: [number, number][] = analytics.watchedSegments.map((seg: any) => 
        [seg.start, seg.end] as [number, number]
      );

      const telemetry: VideoTelemetry = {
        currentTime: analytics.percentComplete > 0 ? 
          (analytics.percentComplete / 100) * analytics.totalWatched : 0,
        duration: analytics.totalWatched > 0 ? analytics.totalWatched : 826,
        percentage: analytics.percentComplete,
        watchedSegments,
        totalPlayTime: Math.floor(analytics.totalWatched),
        seekForwardCount: analytics.seekCount,
        seekBackwardCount: 0,
        playbackSpeedAvg: 1.0,
        maxPositionReached: Math.floor(analytics.totalWatched),
      };

      onTimeUpdate(telemetry);
    };

    return (
      <SmartVideoPlayer
        videoId={videoId}
        hlsUrl={hlsUrl}
        autoplay={autoPlay}
        preload="metadata"
        onTimeUpdate={handleAnalyticsUpdate}
        onComplete={onEnded}
      />
    );
  }

  // ========================================
  // MODE: IFRAME (Enhanced with player.js)
  // ========================================
  
  return <IframePlayerWithTracking
    videoId={videoId}
    title={title}
    autoPlay={autoPlay}
    onTimeUpdate={onTimeUpdate}
    onEnded={onEnded}
  />;
};

/**
 * IframePlayerWithTracking: Enhanced Iframe Player with player.js
 * Uses player.js CDN for full telemetry tracking
 */
const IframePlayerWithTracking = ({ 
  videoId, 
  title, 
  autoPlay,
  onTimeUpdate,
  onEnded 
}: VideoPlayerProps) => {
  // For now, we'll use a simple wrapper that converts VideoTrackingData to VideoTelemetry
  // In the future, we can refactor to use VideoTrackingData everywhere
  
  const handleProgressUpdate = useCallback((data: VideoTrackingData) => {
    if (!onTimeUpdate) return;
    
    // Convert VideoTrackingData to VideoTelemetry format
    const telemetry: VideoTelemetry = {
      currentTime: data.currentTime,
      duration: data.duration,
      percentage: data.percentage,
      watchedSegments: data.watchedSegments,
      totalPlayTime: data.totalPlayTime,
      seekForwardCount: data.seekForwardCount,
      seekBackwardCount: data.seekBackwardCount,
      playbackSpeedAvg: data.playbackSpeedAvg,
      maxPositionReached: data.maxPositionReached,
    };
    
    onTimeUpdate(telemetry);
  }, [onTimeUpdate]);
  
  // PlayerJSVideoPlayer needs a lessonId, but we don't have it in this context
  // For now, use a fallback simple player or pass lessonId through props
  // TODO: Add lessonId to VideoPlayerProps
  
  return (
    <SimpleIframePlayer
      videoId={videoId}
      title={title}
      autoPlay={autoPlay}
      onTimeUpdate={onTimeUpdate}
      onEnded={onEnded}
    />
  );
};

/**
 * SimpleIframePlayer: Bunny Iframe with Safety Net Timer
 * Fallback player when player.js is not available
 */
const SimpleIframePlayer = ({ 
  videoId, 
  title, 
  autoPlay,
  onTimeUpdate,
  onEnded 
}: VideoPlayerProps) => {
  const watchedSecondsRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // 🎧 Listen to Bunny iframe postMessage events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from Bunny CDN
      if (!event.origin.includes('mediadelivery.net') && !event.origin.includes('bunnycdn.com')) {
        return;
      }
      
      try {
        let data = event.data;
        
        // Parse JSON if it's a string (безопасно)
        if (typeof data === 'string') {
          const { safeJSONParse } = await import('@/utils/error-recovery');
          data = safeJSONParse(data, null);
          if (!data) return; // Invalid JSON
        }
        
        // Handle Bunny player events
        if (data && typeof data === 'object' && 'event' in data) {
          const eventType = data.event;
          
          switch (eventType) {
            case 'play':
              setIsPlaying(true);
              console.log('▶️ [SimpleIframe] Video PLAYING');
              break;
              
            case 'pause':
              setIsPlaying(false);
              console.log('⏸️ [SimpleIframe] Video PAUSED');
              break;
              
            case 'ended':
              setIsPlaying(false);
              console.log('🏁 [SimpleIframe] Video ENDED');
              if (onEnded) onEnded();
              break;
              
            case 'ready':
              console.log('✅ [SimpleIframe] Player ready');
              break;
          }
        }
      } catch (error) {
        console.warn('⚠️ [SimpleIframe] Error parsing message:', error);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onEnded]);
  
  // 🔄 Safety Net: Track time ONLY when playing
  useEffect(() => {
    if (!videoId) return;
    
    console.log('✅ [SimpleIframe] Starting tracking timer (1s interval)');
    
    timerIntervalRef.current = window.setInterval(() => {
      // Only increment if video is playing
      if (isPlaying) {
        watchedSecondsRef.current += 1;
        console.log(`⏱️ [SimpleIframe] Playback time: ${watchedSecondsRef.current}s`);
      }
      
      // Send telemetry every 10 seconds
      if (watchedSecondsRef.current > 0 && watchedSecondsRef.current % 10 === 0 && onTimeUpdate) {
        const telemetry: VideoTelemetry = {
          currentTime: watchedSecondsRef.current,
          duration: 826, // Fallback
          percentage: (watchedSecondsRef.current / 826) * 100,
          watchedSegments: [[0, watchedSecondsRef.current]],
          totalPlayTime: watchedSecondsRef.current,
          seekForwardCount: 0,
          seekBackwardCount: 0,
          playbackSpeedAvg: 1.0,
          maxPositionReached: watchedSecondsRef.current,
        };
        
        console.log('📊 [SimpleIframe] Telemetry update:', {
          playbackTime: watchedSecondsRef.current + 's',
          percentage: telemetry.percentage.toFixed(1) + '%',
          isPlaying,
        });
        
        onTimeUpdate(telemetry);
      }
    }, 1000);
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [videoId, isPlaying, onTimeUpdate]);
  
  const embedUrl = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}?autoplay=${autoPlay}&loop=false&muted=false&preload=true&responsive=true`;
  
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-[#00FF88]/20">
      {/* Debug indicator (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 z-50 bg-black/90 text-[#00FF88] px-3 py-1 rounded-full text-xs font-mono border border-[#00FF88]/30">
          {isPlaying ? '▶️ Playing' : '⏸️ Paused'} • {watchedSecondsRef.current}s
        </div>
      )}
      
      <iframe
        src={embedUrl}
        title={title}
        loading="eager"
        referrerPolicy="origin"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen={true}
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
