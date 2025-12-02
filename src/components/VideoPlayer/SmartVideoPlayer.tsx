import React, { useRef, useEffect, useState, useCallback } from 'react';
import Plyr from 'plyr';
import Hls from 'hls.js';
import 'plyr/dist/plyr.css';

/**
 * Represents a continuous segment of watched video
 */
interface VideoSegment {
  start: number;
  end: number;
  duration: number;
}

/**
 * Video analytics for anti-cheat and heatmap generation
 */
interface VideoAnalytics {
  videoId: string;
  totalWatched: number;
  percentComplete: number;
  watchedSegments: VideoSegment[];
  skippedSegments: VideoSegment[];
  seekCount: number;
  sessionStartTime: number;
  sessionEndTime: number | null;
}

/**
 * Props for SmartVideoPlayer component
 */
interface SmartVideoPlayerProps {
  videoId: string;
  hlsUrl: string;
  onTimeUpdate?: (analytics: VideoAnalytics) => void;
  onComplete?: () => void;
  autoplay?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
}

/**
 * SmartVideoPlayer: Production-ready Plyr + HLS + Analytics Component
 *
 * Features:
 * - HLS adaptive streaming (BunnyCDN)
 * - Real-time watched segment tracking
 * - Skip/seek detection for anti-cheat
 * - Automatic analytics reporting
 * - Proper memory cleanup (no leaks)
 */
export const SmartVideoPlayer: React.FC<SmartVideoPlayerProps> = ({
  videoId,
  hlsUrl,
  onTimeUpdate,
  onComplete,
  autoplay = false,
  preload = 'metadata',
}) => {
  // ===================================
  // REFS (Persisted across re-renders)
  // ===================================

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Analytics state (ref for real-time access)
  const analyticsRef = useRef<VideoAnalytics>({
    videoId,
    totalWatched: 0,
    percentComplete: 0,
    watchedSegments: [],
    skippedSegments: [],
    seekCount: 0,
    sessionStartTime: Date.now(),
    sessionEndTime: null,
  });

  // Track timing state
  const lastTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const analyticsIntervalRef = useRef<number | null>(null);

  // ===================================
  // STATE (React re-render triggers)
  // ===================================

  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // ===================================
  // HELPER FUNCTIONS
  // ===================================

  /**
   * Merge overlapping time ranges
   * Input:  [[0, 10], [8, 20], [25, 30], [28, 35]]
   * Output: [[0, 20], [25, 35]]
   */
  const mergeSegments = useCallback((segments: VideoSegment[]): VideoSegment[] => {
    if (segments.length === 0) return [];

    // Sort by start time
    const sorted = [...segments].sort((a, b) => a.start - b.start);

    // Merge overlapping segments
    const merged: VideoSegment[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (current.start <= last.end) {
        // Overlapping - merge
        last.end = Math.max(last.end, current.end);
        last.duration = last.end - last.start;
      } else {
        // Non-overlapping - add as new segment
        merged.push(current);
      }
    }

    return merged;
  }, []);

  /**
   * Report analytics to parent component
   * Called every 10 seconds during playback
   */
  const reportAnalytics = useCallback(() => {
    if (!onTimeUpdate) return;

    const analytics = analyticsRef.current;
    
    console.log('📊 [SmartVideoPlayer] Analytics update:', {
      totalWatched: analytics.totalWatched.toFixed(1) + 's',
      percentComplete: analytics.percentComplete.toFixed(1) + '%',
      segments: analytics.watchedSegments.length,
      seeks: analytics.seekCount,
    });

    onTimeUpdate({
      ...analytics,
      watchedSegments: mergeSegments(analytics.watchedSegments),
      skippedSegments: mergeSegments(analytics.skippedSegments),
    });
  }, [onTimeUpdate, mergeSegments]);

  /**
   * Clean up resources (critical to prevent memory leaks)
   */
  const cleanup = useCallback(() => {
    console.log('[SmartVideoPlayer] Cleaning up resources...');

    // Clear interval
    if (analyticsIntervalRef.current) {
      clearInterval(analyticsIntervalRef.current);
      analyticsIntervalRef.current = null;
    }

    // Destroy Plyr
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    // Destroy HLS
    if (hlsRef.current) {
      hlsRef.current.stopLoad();
      hlsRef.current.detachMedia();
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    console.log('[SmartVideoPlayer] Cleanup complete');
  }, []);

  /**
   * Initialize Plyr + HLS + Analytics
   * This runs once on mount
   */
  useEffect(() => {
    if (!videoRef.current) {
      setError('Video element not found');
      return;
    }

    try {
      // ============================
      // Step 1: Initialize HLS.js
      // ============================

      if (Hls.isSupported()) {
        hlsRef.current = new Hls({
          debug: false,
          lowLatencyMode: true,
          enableWorker: true,
        });

        hlsRef.current.loadSource(hlsUrl);
        hlsRef.current.attachMedia(videoRef.current);

        hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ [HLS] Manifest parsed successfully');
        });

        hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
          console.error('❌ [HLS] Error:', data);
          if (data.fatal) {
            setError(`HLS error: ${data.details}`);
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        videoRef.current.src = hlsUrl;
        console.log('✅ [HLS] Using native Safari HLS support');
      } else {
        setError('HLS not supported in this browser');
        return;
      }

      // ============================
      // Step 2: Initialize Plyr
      // ============================

      playerRef.current = new Plyr(videoRef.current, {
        autoplay,
        preload,
        controls: [
          'play-large',
          'play',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'settings',
          'pip',
          'fullscreen',
        ],
        settings: ['quality', 'speed'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      });

      console.log('✅ [Plyr] Player initialized');

      // ============================
      // Step 3: Setup Event Listeners
      // ============================

      const analytics = analyticsRef.current;

      // Get video duration
      const handleLoadedMetadata = () => {
        const { duration } = videoRef.current || {};
        if (duration) {
          setDuration(duration);
          console.log(`📺 [Player] Duration: ${duration.toFixed(2)}s`);
        }
      };

      // Track main playback
      const handlePlay = () => {
        isPlayingRef.current = true;
        console.log('▶️ [Player] Play');
      };

      const handlePause = () => {
        isPlayingRef.current = false;
        console.log('⏸️ [Player] Pause');
      };

      // CRITICAL: Real-time timeupdate event
      const handleTimeUpdate = () => {
        if (!videoRef.current) return;

        const { currentTime } = videoRef.current;

        // Detect seeks (jumps > 2 seconds)
        if (Math.abs(currentTime - lastTimeRef.current) > 2) {
          analytics.seekCount++;

          // If seeking forward, log skipped segment
          if (currentTime > lastTimeRef.current) {
            const skipped: VideoSegment = {
              start: lastTimeRef.current,
              end: currentTime,
              duration: currentTime - lastTimeRef.current,
            };
            analytics.skippedSegments.push(skipped);
            console.log(`⏭️ [Player] Skipped: ${skipped.start.toFixed(2)}s → ${skipped.end.toFixed(2)}s`);
          }
        }

        // Track continuous watching
        if (isPlayingRef.current && Math.abs(currentTime - lastTimeRef.current) <= 2) {
          if (analytics.watchedSegments.length === 0) {
            // Start new segment
            analytics.watchedSegments.push({
              start: lastTimeRef.current,
              end: currentTime,
              duration: currentTime - lastTimeRef.current,
            });
          } else {
            // Extend last segment
            const lastSegment = analytics.watchedSegments[analytics.watchedSegments.length - 1];
            lastSegment.end = currentTime;
            lastSegment.duration = currentTime - lastSegment.start;
          }
        }

        // Update total watched and percent
        analytics.totalWatched = analytics.watchedSegments.reduce((sum, seg) => sum + seg.duration, 0);
        analytics.percentComplete = (currentTime / (videoRef.current?.duration || 0)) * 100;

        lastTimeRef.current = currentTime;
      };

      // Final analytics
      const handleEnded = () => {
        analytics.sessionEndTime = Date.now();
        analytics.percentComplete = 100;
        console.log('✅ [Player] Video ended');
        console.log('📊 [Analytics] Final data:', {
          totalWatched: analytics.totalWatched.toFixed(1) + 's',
          percentComplete: analytics.percentComplete.toFixed(1) + '%',
          seekCount: analytics.seekCount,
          watchedSegments: analytics.watchedSegments.length,
          skippedSegments: analytics.skippedSegments.length,
        });

        reportAnalytics();
        onComplete?.();
      };

      // Attach listeners
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoRef.current.addEventListener('play', handlePlay);
      videoRef.current.addEventListener('pause', handlePause);
      videoRef.current.addEventListener('timeupdate', handleTimeUpdate);
      videoRef.current.addEventListener('ended', handleEnded);

      // ============================
      // Step 4: Periodic Analytics
      // ============================

      // Report every 10 seconds
      analyticsIntervalRef.current = window.setInterval(() => {
        if (analytics.percentComplete > 0) {
          reportAnalytics();
        }
      }, 10000);

      console.log('✅ [SmartVideoPlayer] Initialization complete');

      // ============================
      // Step 5: Cleanup on Unmount
      // ============================

      return () => {
        cleanup();
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [SmartVideoPlayer] Initialization failed:', message);
      setError(message);
    }
  }, [hlsUrl, autoplay, preload, reportAnalytics, onComplete, cleanup]);

  // ===================================
  // RENDER
  // ===================================

  return (
    <div className="smart-video-player-wrapper w-full bg-black rounded-xl overflow-hidden shadow-2xl border border-[#00FF88]/20">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 text-sm rounded-lg m-4">
          ❌ Video Player Error: {error}
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-auto"
        crossOrigin="anonymous"
        playsInline
      />

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && duration > 0 && (
        <div className="text-xs text-[#00FF88] font-mono p-2 bg-black/80 border-t border-[#00FF88]/10">
          Duration: {duration.toFixed(0)}s | Watched: {analyticsRef.current.totalWatched.toFixed(0)}s | 
          Complete: {analyticsRef.current.percentComplete.toFixed(1)}% | 
          Seeks: {analyticsRef.current.seekCount}
        </div>
      )}
    </div>
  );
};

export default SmartVideoPlayer;

