import { useCallback, useRef } from 'react';
import { api } from '@/utils/apiClient';
import { VideoTelemetry } from '@/components/VideoPlayer/BunnyPlayer';

interface UseProgressUpdateProps {
  lessonId?: number;
  videoId?: string; // Bunny video GUID
  onProgressChange?: (percentage: number, qualifiedForCompletion: boolean) => void;
}

/**
 * 🔒 SECURE Hook для отправки прогресса видео на бэкенд
 * userId берётся из JWT токена на backend (NEVER from client)
 * Сохраняет данные в video_tracking table для AI-Наставника
 */
export const useProgressUpdate = ({ 
  lessonId,
  videoId,
  onProgressChange 
}: UseProgressUpdateProps) => {
  const isSendingRef = useRef(false);

  const sendProgressUpdate = useCallback(async (telemetry: VideoTelemetry) => {
    // Guard: prevent multiple concurrent requests
    if (isSendingRef.current) {
      console.log('⏳ [useProgressUpdate] Already sending, skipping...');
      return;
    }

    // Guard: require lessonId
    if (!lessonId) {
      console.warn('⚠️ [useProgressUpdate] Missing lessonId, skipping update');
      return;
    }

    // Guard: valid telemetry
    if (isNaN(telemetry.duration) || telemetry.duration === 0) {
      console.warn('⚠️ [useProgressUpdate] Invalid telemetry:', telemetry);
      return;
    }

    try {
      isSendingRef.current = true;

      console.log('📤 [useProgressUpdate] Sending telemetry to backend:', {
        lessonId,
        percentage: telemetry.percentage.toFixed(1) + '%',
        totalPlayTime: telemetry.totalPlayTime + 's',
        segments: telemetry.watchedSegments.length,
        seekForward: telemetry.seekForwardCount,
        seekBackward: telemetry.seekBackwardCount,
      });

      // 🔒 SECURITY: user_id НЕ отправляется! Берётся из JWT на backend
      const response = await api.post('/api/progress/update', {
        lesson_id: lessonId,
        video_id: videoId,
        video_guid: videoId, // Bunny video GUID
        current_time: telemetry.currentTime,
        percentage: Math.floor(telemetry.percentage),
        duration: telemetry.duration,
        // Advanced Telemetry:
        watched_segments: telemetry.watchedSegments,
        total_play_time: telemetry.totalPlayTime,
        seek_forward_count: telemetry.seekForwardCount,
        seek_backward_count: telemetry.seekBackwardCount,
        playback_speed_avg: telemetry.playbackSpeedAvg,
        max_position_reached: telemetry.maxPositionReached,
      });

      if (response?.success) {
        console.log('✅ [useProgressUpdate] Telemetry saved successfully');
        
        // Notify parent component if callback provided
        if (onProgressChange && response.progress) {
          onProgressChange(
            response.progress.percentage,
            response.progress.qualified_for_completion
          );
        }
      } else {
        console.warn('⚠️ [useProgressUpdate] Unexpected response:', response);
      }
    } catch (error: any) {
      console.error('❌ [useProgressUpdate] Failed to save telemetry:', error);
      // Don't throw - fail silently to not disrupt video playback
    } finally {
      isSendingRef.current = false;
    }
  }, [lessonId, videoId, onProgressChange]);

  return { sendProgressUpdate };
};

