import React, { useRef, useEffect, useState, useCallback } from 'react';

interface VideoPlayerProps {
  videoId: string;
  lessonId: number;
  title?: string;
  autoPlay?: boolean;
  onProgressUpdate?: (data: VideoTrackingData) => void;
}

export interface VideoTrackingData {
  lessonId: number;
  videoId: string;
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

// Bunny CDN Config
const BUNNY_LIBRARY_ID = '551815';

/**
 * PlayerJSVideoPlayer: Enhanced video player using player.js CDN for full telemetry
 * 
 * Features:
 * - player.js CDN integration (no npm dependency)
 * - Full telemetry tracking (segments, seeks, real playback time)
 * - Automatic progress reporting every 10 seconds
 * - Heatmap data collection
 */
export const PlayerJSVideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  lessonId,
  title = 'Video',
  autoPlay = false,
  onProgressUpdate,
}) => {
  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  
  // Tracking state (refs for real-time access without re-renders)
  const watchedSegmentsRef = useRef<[number, number][]>([]);
  const totalPlayTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const seekCountRef = useRef<number>(0);
  const maxPositionRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const playbackStartTimeRef = useRef<number | null>(null);
  const reportIntervalRef = useRef<number | null>(null);
  
  // React state for UI
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Merge overlapping segments
   * [[0, 10], [8, 15]] => [[0, 15]]
   */
  const mergeSegments = useCallback((segments: [number, number][]): [number, number][] => {
    if (segments.length === 0) return [];
    
    const sorted = [...segments].sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];
      
      if (current[0] <= last[1]) {
        // Overlapping - merge
        last[1] = Math.max(last[1], current[1]);
      } else {
        // Non-overlapping - add new segment
        merged.push(current);
      }
    }
    
    return merged;
  }, []);

  /**
   * Calculate total play time from segments
   */
  const calculateTotalPlayTime = useCallback((segments: [number, number][]): number => {
    const merged = mergeSegments(segments);
    return merged.reduce((total, [start, end]) => total + (end - start), 0);
  }, [mergeSegments]);

  /**
   * Report progress to parent component
   */
  const reportProgress = useCallback(() => {
    if (!onProgressUpdate || duration === 0) return;
    
    const mergedSegments = mergeSegments(watchedSegmentsRef.current);
    const totalPlayTime = calculateTotalPlayTime(watchedSegmentsRef.current);
    const percentage = (currentTime / duration) * 100;
    
    const trackingData: VideoTrackingData = {
      lessonId,
      videoId,
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      percentage: Math.min(Math.floor(percentage), 100),
      watchedSegments: mergedSegments,
      totalPlayTime: Math.floor(totalPlayTime),
      seekForwardCount: seekCountRef.current,
      seekBackwardCount: 0, // TODO: Track backward seeks
      playbackSpeedAvg: 1.0, // TODO: Track speed changes
      maxPositionReached: Math.floor(maxPositionRef.current),
    };
    
    console.log('📊 [PlayerJS] Progress report:', {
      percentage: trackingData.percentage + '%',
      totalPlayTime: trackingData.totalPlayTime + 's',
      segments: trackingData.watchedSegments.length,
      seeks: trackingData.seekForwardCount,
    });
    
    onProgressUpdate(trackingData);
  }, [lessonId, videoId, currentTime, duration, onProgressUpdate, mergeSegments, calculateTotalPlayTime]);

  /**
   * Load player.js from CDN and initialize
   */
  useEffect(() => {
    // Load player.js script if not already loaded
    if (!window.playerjs) {
      console.log('📦 [PlayerJS] Loading player.js from CDN...');
      
      const script = document.createElement('script');
      script.src = 'https://cdn.embed.ly/player-0.1.0.min.js';
      script.async = true;
      
      script.onload = () => {
        console.log('✅ [PlayerJS] Library loaded successfully');
        initializePlayer();
      };
      
      script.onerror = () => {
        console.error('❌ [PlayerJS] Failed to load library');
        setError('Failed to load player library');
      };
      
      document.body.appendChild(script);
      
      return () => {
        document.body.removeChild(script);
      };
    } else {
      // Library already loaded
      initializePlayer();
    }
  }, [videoId]);

  /**
   * Initialize the player and setup event listeners
   */
  const initializePlayer = useCallback(() => {
    if (!iframeRef.current || !window.playerjs) return;
    
    try {
      console.log('🎬 [PlayerJS] Initializing player...');
      
      // Create player instance
      const player = new window.playerjs.Player(iframeRef.current);
      playerRef.current = player;
      
      // Wait for player to be ready
      player.on('ready', () => {
        console.log('✅ [PlayerJS] Player ready');
        setIsReady(true);
        
        // Get duration
        player.getDuration((dur: number) => {
          setDuration(dur);
          console.log('📺 [PlayerJS] Duration:', dur + 's');
        });
        
        // Auto-play if requested
        if (autoPlay) {
          player.play();
        }
      });
      
      // Play event
      player.on('play', () => {
        console.log('▶️ [PlayerJS] Playing');
        isPlayingRef.current = true;
        setIsPlaying(true);
        playbackStartTimeRef.current = Date.now();
      });
      
      // Pause event
      player.on('pause', () => {
        console.log('⏸️ [PlayerJS] Paused');
        isPlayingRef.current = false;
        setIsPlaying(false);
        
        // Add playback time to total
        if (playbackStartTimeRef.current) {
          const playbackDuration = (Date.now() - playbackStartTimeRef.current) / 1000;
          totalPlayTimeRef.current += playbackDuration;
          playbackStartTimeRef.current = null;
        }
      });
      
      // Time update event (fires every ~250ms during playback)
      player.on('timeupdate', (data: { seconds: number; duration: number }) => {
        const newTime = data.seconds;
        setCurrentTime(newTime);
        
        // Update max position
        if (newTime > maxPositionRef.current) {
          maxPositionRef.current = newTime;
        }
        
        // Detect seeks (jumps > 2 seconds)
        if (Math.abs(newTime - lastTimeRef.current) > 2 && lastTimeRef.current > 0) {
          seekCountRef.current++;
          console.log(`⏭️ [PlayerJS] Seek detected: ${lastTimeRef.current.toFixed(1)}s → ${newTime.toFixed(1)}s`);
          
          // Start new segment after seek
          if (isPlayingRef.current) {
            watchedSegmentsRef.current.push([newTime, newTime]);
          }
        } else if (isPlayingRef.current && Math.abs(newTime - lastTimeRef.current) <= 2) {
          // Continuous playback - update segment
          if (watchedSegmentsRef.current.length === 0) {
            // Start first segment
            watchedSegmentsRef.current.push([newTime, newTime]);
          } else {
            // Update last segment
            const lastSegment = watchedSegmentsRef.current[watchedSegmentsRef.current.length - 1];
            lastSegment[1] = newTime;
          }
        }
        
        lastTimeRef.current = newTime;
      });
      
      // Ended event
      player.on('ended', () => {
        console.log('🏁 [PlayerJS] Video ended');
        isPlayingRef.current = false;
        setIsPlaying(false);
        
        // Final report
        reportProgress();
      });
      
      // Error handling
      player.on('error', (error: any) => {
        console.error('❌ [PlayerJS] Player error:', error);
        setError('Video playback error');
      });
      
    } catch (err: any) {
      console.error('❌ [PlayerJS] Initialization failed:', err);
      setError(err.message);
    }
  }, [videoId, autoPlay, reportProgress]);

  /**
   * Setup periodic progress reporting (every 10 seconds)
   */
  useEffect(() => {
    if (!isReady) return;
    
    console.log('⏱️ [PlayerJS] Starting periodic reporting (10s interval)');
    
    reportIntervalRef.current = window.setInterval(() => {
      if (isPlayingRef.current && duration > 0) {
        reportProgress();
      }
    }, 10000); // Report every 10 seconds
    
    return () => {
      if (reportIntervalRef.current) {
        clearInterval(reportIntervalRef.current);
        reportIntervalRef.current = null;
      }
    };
  }, [isReady, duration, reportProgress]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      console.log('🧹 [PlayerJS] Cleanup');
      
      if (reportIntervalRef.current) {
        clearInterval(reportIntervalRef.current);
      }
      
      // Final report before unmount
      if (isReady && duration > 0) {
        reportProgress();
      }
      
      // Destroy player
      if (playerRef.current) {
        playerRef.current.off('ready');
        playerRef.current.off('play');
        playerRef.current.off('pause');
        playerRef.current.off('timeupdate');
        playerRef.current.off('ended');
        playerRef.current.off('error');
        playerRef.current = null;
      }
    };
  }, [isReady, duration, reportProgress]);

  const embedUrl = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}?autoplay=${autoPlay}&loop=false&muted=false&preload=true&responsive=true`;

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-[#00FF88]/20">
      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="text-center p-8">
            <h3 className="text-2xl font-bold text-red-500 mb-2">
              ❌ Ошибка воспроизведения
            </h3>
            <p className="text-white/60">{error}</p>
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-40">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#00FF88] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/60">Загрузка плеера...</p>
          </div>
        </div>
      )}
      
      {/* Debug Overlay (Development Only) */}
      {process.env.NODE_ENV === 'development' && isReady && (
        <div className="absolute top-2 right-2 z-50 bg-black/90 text-[#00FF88] px-3 py-2 rounded-lg text-xs font-mono border border-[#00FF88]/30 space-y-1">
          <div>{isPlaying ? '▶️ Playing' : '⏸️ Paused'}</div>
          <div>Time: {currentTime.toFixed(1)}s / {duration.toFixed(1)}s</div>
          <div>Segments: {watchedSegmentsRef.current.length}</div>
          <div>Seeks: {seekCountRef.current}</div>
          <div>Progress: {((currentTime / duration) * 100).toFixed(1)}%</div>
        </div>
      )}
      
      {/* Bunny Iframe */}
      <iframe
        ref={iframeRef}
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

// TypeScript declaration for player.js
declare global {
  interface Window {
    playerjs: {
      Player: new (iframe: HTMLIFrameElement) => {
        on: (event: string, callback: (data?: any) => void) => void;
        off: (event: string) => void;
        play: () => void;
        pause: () => void;
        getDuration: (callback: (duration: number) => void) => void;
        getCurrentTime: (callback: (time: number) => void) => void;
        setCurrentTime: (time: number) => void;
      };
    };
  }
}

