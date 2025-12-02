import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * 🎥 Tripwire Video Tracking Hook
 * Сохраняет прогресс видео в таблицу tripwire_progress (НЕ video_tracking!)
 * Синхронизируется с базой и загружает предыдущий прогресс при входе
 */
export const useTripwireVideoTracking = (lessonId: number, tripwireUserId: string | undefined) => {
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [lastPosition, setLastPosition] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedProgressRef = useRef(0);

  // 📥 Загружаем предыдущий прогресс при монтировании
  useEffect(() => {
    const loadProgress = async () => {
      if (!tripwireUserId || !lessonId) return;

      try {
        console.log('📥 [TripwireTracking] Loading progress for:', { lessonId, tripwireUserId });
        
        const { data, error } = await supabase
          .from('tripwire_progress')
          .select('video_progress_percent, last_position_seconds, is_completed')
          .eq('tripwire_user_id', tripwireUserId)
          .eq('lesson_id', lessonId)
          .limit(1);

        if (error) {
          console.error('❌ [TripwireTracking] Error loading progress:', error);
          return;
        }

        // Берём первый элемент если есть
        const record = data && data.length > 0 ? data[0] : null;
        
        if (record) {
          console.log('✅ [TripwireTracking] Loaded progress:', record);
          setProgress(record.video_progress_percent || 0);
          setLastPosition(record.last_position_seconds || 0);
          setIsCompleted(record.is_completed || false);
          lastSavedProgressRef.current = record.video_progress_percent || 0;
        } else {
          console.log('ℹ️ [TripwireTracking] No previous progress found');
        }
        
        setIsLoaded(true);
      } catch (e) {
        console.error('❌ [TripwireTracking] Load error:', e);
        setIsLoaded(true);
      }
    };

    loadProgress();
  }, [lessonId, tripwireUserId]);

  // 💾 Функция отправки данных в базу
  const syncProgress = useCallback(async (currentTime: number, totalDuration: number) => {
    if (!tripwireUserId || !lessonId || totalDuration === 0) return;

    const percentage = Math.min(100, Math.round((currentTime / totalDuration) * 100));
    
    // Не сохраняем если прогресс не изменился значительно (экономим запросы)
    if (Math.abs(percentage - lastSavedProgressRef.current) < 2 && percentage < 80) {
      return;
    }
    
    // Если прогресс > 80%, считаем что можно завершать
    const qualified = percentage >= 80;

    console.log('💾 [TripwireTracking] Saving progress:', { percentage, currentTime, totalDuration, qualified });

    try {
      const { error } = await supabase
        .from('tripwire_progress')
        .upsert({
          tripwire_user_id: tripwireUserId,
          lesson_id: lessonId,
          video_progress_percent: percentage,
          last_position_seconds: Math.round(currentTime),
          watch_time_seconds: Math.round(currentTime), // Можно улучшить: добавлять к предыдущему
          is_completed: qualified,
          completed_at: qualified ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'tripwire_user_id,lesson_id'
        });

      if (error) {
        console.error('❌ [TripwireTracking] Save error:', error);
        return;
      }
      
      console.log('✅ [TripwireTracking] Progress saved:', percentage + '%');
      lastSavedProgressRef.current = percentage;
      
      if (qualified && !isCompleted) {
        setIsCompleted(true);
        console.log('🎉 [TripwireTracking] Lesson qualified for completion!');
      }
    } catch (e) {
      console.error('❌ [TripwireTracking] Exception:', e);
    }
  }, [tripwireUserId, lessonId, isCompleted]);

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

  // 🔄 Сохраняем прогресс при уходе со страницы
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

