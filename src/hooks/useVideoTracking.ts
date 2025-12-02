import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * 🎥 Video Tracking Hook для onAI Platform
 * Сохраняет прогресс видео в таблицу video_tracking
 * Синхронизируется с базой и загружает предыдущий прогресс при входе
 */
export const useVideoTracking = (lessonId: number, userId: string | undefined) => {
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [lastPosition, setLastPosition] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedProgressRef = useRef(0);

  // 📥 Загружаем предыдущий прогресс при монтировании
  useEffect(() => {
    const loadProgress = async () => {
      if (!userId || !lessonId) return;

      try {
        console.log('📥 [VideoTracking] Loading progress for:', { lessonId, userId });
        
        const { data, error } = await supabase
          .from('video_tracking')
          .select('watch_percentage, last_position_seconds, is_qualified_for_completion')
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .limit(1);

        if (error) {
          console.error('❌ [VideoTracking] Error loading progress:', error);
          return;
        }

        // Берём первый элемент если есть
        const record = data && data.length > 0 ? data[0] : null;
        
        if (record) {
          console.log('✅ [VideoTracking] Loaded progress:', record);
          setProgress(Number(record.watch_percentage) || 0);
          setLastPosition(record.last_position_seconds || 0);
          setIsCompleted(record.is_qualified_for_completion || false);
          lastSavedProgressRef.current = Number(record.watch_percentage) || 0;
        } else {
          console.log('ℹ️ [VideoTracking] No previous progress found');
        }
        
        setIsLoaded(true);
      } catch (e) {
        console.error('❌ [VideoTracking] Load error:', e);
        setIsLoaded(true);
      }
    };

    loadProgress();
  }, [lessonId, userId]);

  // 💾 Функция отправки данных в базу
  const syncProgress = useCallback(async (currentTime: number, totalDuration: number) => {
    if (!userId || !lessonId || totalDuration === 0) return;

    const percentage = Math.min(100, Math.round((currentTime / totalDuration) * 100));
    
    // Не сохраняем если прогресс не изменился значительно (экономим запросы)
    if (Math.abs(percentage - lastSavedProgressRef.current) < 2 && percentage < 80) {
      return;
    }
    
    // Если прогресс > 80%, считаем что можно завершать
    const qualified = percentage >= 80;

    console.log('💾 [VideoTracking] Saving progress:', { percentage, currentTime, totalDuration, qualified });

    try {
      const { error } = await supabase
        .from('video_tracking')
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          video_duration_seconds: Math.round(totalDuration),
          last_position_seconds: Math.round(currentTime),
          watch_percentage: percentage,
          is_qualified_for_completion: qualified,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,lesson_id' });

      if (error) {
        console.error('❌ [VideoTracking] Save error:', error);
        return;
      }
      
      console.log('✅ [VideoTracking] Progress saved:', percentage + '%');
      lastSavedProgressRef.current = percentage;
      
      if (qualified && !isCompleted) {
        setIsCompleted(true);
        console.log('🎉 [VideoTracking] Lesson qualified for completion!');
      }
    } catch (e) {
      console.error('❌ [VideoTracking] Exception:', e);
    }
  }, [userId, lessonId, isCompleted]);

  // 🎬 Обработчик обновления времени видео
  const handleTimeUpdate = useCallback((currentTime: number, totalDuration: number) => {
    if (totalDuration === 0) return;
    
    const percentage = (currentTime / totalDuration) * 100;
    setProgress(percentage);
    setLastPosition(currentTime);

    // Троттлинг: отправляем запрос не чаще чем раз в 5 секунд
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    
    updateTimeoutRef.current = setTimeout(() => {
      syncProgress(currentTime, totalDuration);
    }, 5000);
  }, [syncProgress]);

  // 🔄 Cleanup при уходе со страницы
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return { 
    progress, 
    isCompleted, 
    lastPosition,
    isLoaded,
    handleTimeUpdate 
  };
};
