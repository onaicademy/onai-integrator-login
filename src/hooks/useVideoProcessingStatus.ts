import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@/utils/apiClient';

export interface VideoStatusData {
  status: string;
  bunnyStatus: number;
  progress: number;
  availableResolutions: string;
  duration?: number;
  error?: string;
}

/**
 * 🎬 Custom Hook для отслеживания статуса обработки видео на BunnyCDN
 * 
 * Features:
 * - ✅ Polling каждые 3 секунды
 * - ✅ Auto-stop при завершении обработки
 * - ✅ Memory leak prevention
 * - ✅ TypeScript support
 * 
 * @param videoId - BunnyCDN video ID (guid)
 * @param enabled - Включить/выключить polling
 */
export const useVideoProcessingStatus = (
  videoId: string | null,
  enabled: boolean = true
) => {
  const [statusData, setStatusData] = useState<VideoStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Переводим BunnyCDN статус в читаемый формат
  const getStatusLabel = useCallback((bunnyStatus: number, progress: number) => {
    switch (bunnyStatus) {
      case 0:
        return 'Создано';
      case 1:
        return 'Загружено';
      case 2:
      case 3:
        return progress > 0 ? `Кодирование ${progress}%` : 'Обработка...';
      case 4:
      case 5:
        return 'Готово!';
      case 6:
        return 'Ошибка при обработке';
      default:
        return 'Обработка...';
    }
  }, []);

  // Одинарный fetch статуса
  const fetchStatus = useCallback(async () => {
    if (!videoId || !enabled) return;

    try {
      setIsLoading(true);
      console.log(`🔍 [VideoProcessing] Checking status for: ${videoId}`);
      
      const response = await api.get(`/api/videos/bunny-status/${videoId}`);

      if (isMountedRef.current) {
        console.log(`📊 [VideoProcessing] Status:`, response);
        setStatusData(response);
        setError(null);

        // Если видео готово или ошибка — останавливаем polling
        if (
          response.bunnyStatus === 4 ||
          response.bunnyStatus === 5 ||
          response.bunnyStatus === 6
        ) {
          console.log(`✅ [VideoProcessing] Video ready or failed, stopping polling`);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }
    } catch (err: any) {
      console.error('❌ [VideoProcessing] Error:', err);
      if (isMountedRef.current) {
        setError(
          err?.response?.data?.message || 'Ошибка при проверке статуса'
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [videoId, enabled]);

  // Запуск polling
  useEffect(() => {
    if (!videoId || !enabled) return;

    console.log(`🎬 [VideoProcessing] Starting polling for: ${videoId}`);
    
    // Сразу первый fetch
    fetchStatus();

    // Потом polling каждые 3 сек
    intervalRef.current = setInterval(fetchStatus, 3000);

    return () => {
      console.log(`🛑 [VideoProcessing] Stopping polling for: ${videoId}`);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [videoId, enabled, fetchStatus]);

  // Cleanup на unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    statusData,
    isLoading,
    error,
    statusLabel: statusData
      ? getStatusLabel(statusData.bunnyStatus, statusData.progress)
      : null,
    isProcessing: statusData
      ? [1, 2, 3].includes(statusData.bunnyStatus)
      : false,
    isReady: statusData
      ? [4, 5].includes(statusData.bunnyStatus)
      : false,
    isFailed: statusData ? statusData.bunnyStatus === 6 : false,
    refetch: fetchStatus,
  };
};


