import { useState, useRef, useEffect, useCallback } from 'react';
// ✅ FIX #2: Используем Tripwire Supabase вместо Main Platform
import { tripwireSupabase as supabase } from '@/lib/supabase-tripwire';

/**
 * 🎥 Честный Video Tracking Hook
 * 
 * Архитектура: Сегментное отслеживание
 * - Записывает ТОЛЬКО реально просмотренные секунды
 * - НЕ учитывает перемотку видео
 * - Хранит массив сегментов [start, end] для каждого непрерывного просмотра
 * - Прогресс = сумма уникальных просмотренных секунд / длительность видео
 * 
 * Принцип работы:
 * 1. При начале воспроизведения - записываем startTime
 * 2. При паузе/перемотке - сохраняем сегмент [startTime, currentTime]
 * 3. При перемотке - начинаем новый сегмент
 * 4. Сегменты объединяются для расчёта уникального времени просмотра
 */

interface WatchedSegment {
  start: number; // секунды
  end: number;   // секунды
}

interface VideoTrackingState {
  segments: WatchedSegment[];
  totalWatchedSeconds: number;
  videoDuration: number;
  lastPosition: number;
}

// Функция объединения перекрывающихся сегментов
const mergeSegments = (segments: WatchedSegment[]): WatchedSegment[] => {
  if (segments.length === 0) return [];
  
  // Сортируем по началу сегмента
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const merged: WatchedSegment[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    
    // Если сегменты перекрываются или смежные - объединяем
    if (current.start <= last.end + 1) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }
  
  return merged;
};

// Функция расчёта общего времени просмотра из сегментов
const calculateTotalWatched = (segments: WatchedSegment[]): number => {
  const merged = mergeSegments(segments);
  return merged.reduce((total, seg) => total + (seg.end - seg.start), 0);
};

export const useHonestVideoTracking = (
  lessonId: number, 
  userId: string | undefined,
  tableName: 'video_tracking' | 'tripwire_progress' = 'video_tracking'
) => {
  // Состояние
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [totalWatchedSeconds, setTotalWatchedSeconds] = useState(0);
  // ✅ FIX #3: Новый флаг для отслеживания квалификации (остается даже при откате прогресса)
  const [isQualifiedForCompletion, setIsQualifiedForCompletion] = useState(false);
  
  // Refs для отслеживания
  const segmentsRef = useRef<WatchedSegment[]>([]);
  const currentSegmentStartRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const videoDurationRef = useRef(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef(0);
  
  // Определяем поля в зависимости от таблицы
  const userIdField = tableName === 'tripwire_progress' ? 'tripwire_user_id' : 'user_id';
  
  // 📥 Загружаем предыдущий прогресс при монтировании
  useEffect(() => {
    const loadProgress = async () => {
      if (!userId || !lessonId) return;
      
      // 🚀 ОПТИМИЗАЦИЯ: Пропускаем загрузку для tripwire_progress (таблица не существует)
      if (tableName === 'tripwire_progress') {
        console.log('⚠️ [HonestTracking] Skipping load - tripwire_progress table does not exist');
        setIsLoaded(true);
        return;
      }
      
      try {
        console.log('📥 [HonestTracking] Loading progress for:', { lessonId, userId, tableName });
        
        // Определяем какие поля загружать
        const selectFields = tableName === 'tripwire_progress'
          ? 'watched_segments, total_watched_seconds, video_duration, video_progress_percent, is_completed, video_qualified_for_completion'
          : 'watched_segments, total_watched_seconds, video_duration_seconds, watch_percentage, is_qualified_for_completion';
        
        const { data, error } = await supabase
          .from(tableName)
          .select(selectFields)
          .eq(userIdField, userId)
          .eq('lesson_id', lessonId)
          .limit(1);
        
        if (error) {
          console.error('❌ [HonestTracking] Load error:', error);
          setIsLoaded(true);
          return;
        }
        
        const record = data && data.length > 0 ? data[0] : null;
        
        if (record) {
          // Загружаем сегменты
          if (record.watched_segments) {
            try {
              const segments = typeof record.watched_segments === 'string' 
                ? JSON.parse(record.watched_segments) 
                : record.watched_segments;
              segmentsRef.current = segments || [];
            } catch (e) {
              console.warn('⚠️ [HonestTracking] Could not parse segments:', e);
              segmentsRef.current = [];
            }
          }
          
          // Загружаем прогресс
          const progressPercent = tableName === 'tripwire_progress'
            ? record.video_progress_percent
            : record.watch_percentage;
          
          const completed = tableName === 'tripwire_progress'
            ? record.is_completed
            : record.is_qualified_for_completion;
          
          // ✅ FIX #3: Загружаем флаг квалификации
          const qualified = tableName === 'tripwire_progress'
            ? (record.video_qualified_for_completion || false)
            : (record.is_qualified_for_completion || false);
          
          setProgress(Number(progressPercent) || 0);
          setTotalWatchedSeconds(record.total_watched_seconds || 0);
          setIsCompleted(completed || false);
          setIsQualifiedForCompletion(qualified);
          lastSavedRef.current = Number(progressPercent) || 0;
          videoDurationRef.current = (tableName === 'tripwire_progress' 
            ? record.video_duration 
            : record.video_duration_seconds) || 0;
          
          console.log('✅ [HonestTracking] Loaded:', {
            progress: progressPercent,
            segments: segmentsRef.current.length,
            totalWatched: record.total_watched_seconds
          });
        } else {
          console.log('ℹ️ [HonestTracking] No previous progress found');
        }
        
        setIsLoaded(true);
      } catch (e) {
        console.error('❌ [HonestTracking] Exception:', e);
        setIsLoaded(true);
      }
    };
    
    loadProgress();
  }, [lessonId, userId, tableName, userIdField]);
  
  // 💾 Функция сохранения в базу
  const syncProgress = useCallback(async () => {
    if (!userId || !lessonId || videoDurationRef.current === 0) return;
    
    // Объединяем сегменты и считаем общее время
    const merged = mergeSegments(segmentsRef.current);
    const totalWatched = calculateTotalWatched(merged);
    const percentage = Math.min(100, Math.round((totalWatched / videoDurationRef.current) * 100));
    
    // Не сохраняем если изменение < 2%
    if (Math.abs(percentage - lastSavedRef.current) < 2 && percentage < 80) {
      return;
    }
    
    const qualified = percentage >= 80;
    
    console.log('💾 [HonestTracking] Saving:', {
      percentage,
      totalWatched,
      duration: videoDurationRef.current,
      segments: merged.length,
      qualified
    });
    
    try {
      // Формируем данные в зависимости от таблицы
      const upsertData = tableName === 'tripwire_progress'
        ? {
            tripwire_user_id: userId,
            lesson_id: lessonId,
            watched_segments: JSON.stringify(merged),
            total_watched_seconds: Math.round(totalWatched),
            video_duration: Math.round(videoDurationRef.current),
            video_progress_percent: percentage,
            last_position_seconds: Math.round(lastTimeRef.current),
            is_completed: qualified,
            // ✅ FIX #3: Сохраняем флаг квалификации (остается навсегда!)
            video_qualified_for_completion: qualified,
            updated_at: new Date().toISOString()
          }
        : {
            user_id: userId,
            lesson_id: lessonId,
            watched_segments: JSON.stringify(merged),
            total_watched_seconds: Math.round(totalWatched),
            video_duration_seconds: Math.round(videoDurationRef.current),
            watch_percentage: percentage,
            last_position_seconds: Math.round(lastTimeRef.current),
            is_qualified_for_completion: qualified,
            updated_at: new Date().toISOString()
          };
      
      const conflictField = tableName === 'tripwire_progress' 
        ? 'tripwire_user_id,lesson_id' 
        : 'user_id,lesson_id';
      
      const { error } = await supabase
        .from(tableName)
        .upsert(upsertData as any, { onConflict: conflictField });
      
      if (error) {
        console.error('❌ [HonestTracking] Save error:', error);
        return;
      }
      
      console.log('✅ [HonestTracking] Saved:', percentage + '%');
      lastSavedRef.current = percentage;
      setProgress(percentage);
      setTotalWatchedSeconds(totalWatched);
      
      if (qualified && !isQualifiedForCompletion) {
        setIsQualifiedForCompletion(true);
        setIsCompleted(true);
        console.log('🎉 [HonestTracking] Lesson qualified for completion!');
      }
    } catch (e) {
      console.error('❌ [HonestTracking] Exception:', e);
    }
  }, [userId, lessonId, tableName, isCompleted, isQualifiedForCompletion]);
  
  // 🎬 Начало воспроизведения
  const handlePlay = useCallback(() => {
    console.log('▶️ [HonestTracking] Play at:', lastTimeRef.current);
    isPlayingRef.current = true;
    currentSegmentStartRef.current = lastTimeRef.current;
  }, []);
  
  // ⏸️ Пауза
  const handlePause = useCallback(() => {
    console.log('⏸️ [HonestTracking] Pause at:', lastTimeRef.current);
    
    // Сохраняем текущий сегмент
    if (isPlayingRef.current && currentSegmentStartRef.current !== null) {
      const segment: WatchedSegment = {
        start: currentSegmentStartRef.current,
        end: lastTimeRef.current
      };
      
      // Добавляем только если сегмент > 1 секунды
      if (segment.end - segment.start >= 1) {
        segmentsRef.current.push(segment);
        console.log('📍 [HonestTracking] Segment added:', segment);
      }
    }
    
    isPlayingRef.current = false;
    currentSegmentStartRef.current = null;
    
    // Сохраняем в базу
    syncProgress();
  }, [syncProgress]);
  
  // ⏩ Перемотка началась (seeking)
  const handleSeeking = useCallback(() => {
    console.log('⏩ [HonestTracking] Seeking started at:', lastTimeRef.current);
    
    // Если играло - сохраняем текущий сегмент до перемотки
    if (isPlayingRef.current && currentSegmentStartRef.current !== null) {
      const segment: WatchedSegment = {
        start: currentSegmentStartRef.current,
        end: lastTimeRef.current
      };
      
      if (segment.end - segment.start >= 1) {
        segmentsRef.current.push(segment);
        console.log('📍 [HonestTracking] Segment before seek:', segment);
      }
    }
    
    // Сбрасываем текущий сегмент - перемотка НЕ засчитывается
    currentSegmentStartRef.current = null;
  }, []);
  
  // ⏩ Перемотка завершена (seeked)
  const handleSeeked = useCallback((newTime: number) => {
    console.log('⏩ [HonestTracking] Seeked to:', newTime);
    lastTimeRef.current = newTime;
    
    // Если было воспроизведение - начинаем новый сегмент с новой позиции
    if (isPlayingRef.current) {
      currentSegmentStartRef.current = newTime;
      console.log('📍 [HonestTracking] New segment started at:', newTime);
    }
  }, []);
  
  // 🎬 Обработчик обновления времени (вызывается каждую секунду примерно)
  const handleTimeUpdate = useCallback((currentTime: number, totalDuration: number) => {
    if (totalDuration === 0) return;
    
    videoDurationRef.current = totalDuration;
    lastTimeRef.current = currentTime;
    
    // Обновляем UI прогресс на основе реальных сегментов
    const tempSegments = [...segmentsRef.current];
    
    // Если сейчас играет - добавляем временный текущий сегмент
    if (isPlayingRef.current && currentSegmentStartRef.current !== null) {
      tempSegments.push({
        start: currentSegmentStartRef.current,
        end: currentTime
      });
    }
    
    const totalWatched = calculateTotalWatched(tempSegments);
    const percentage = Math.min(100, Math.round((totalWatched / totalDuration) * 100));
    
    setProgress(percentage);
    setTotalWatchedSeconds(totalWatched);
    
    // ✅ НОВАЯ ЛОГИКА: Если пользователь перемотал на 80%+, автоматически разрешаем завершение
    const currentPositionPercent = (currentTime / totalDuration) * 100;
    const isQualifiedBySkip = currentPositionPercent >= 80;
    const isQualifiedByWatch = percentage >= 80;
    
    if ((isQualifiedBySkip || isQualifiedByWatch) && !isQualifiedForCompletion) {
      console.log('🎉 [HonestTracking] Qualified for completion!', {
        bySkip: isQualifiedBySkip,
        byWatch: isQualifiedByWatch,
        currentPosition: currentPositionPercent.toFixed(1) + '%',
        watchedProgress: percentage + '%'
      });
      // ✅ FIX #3: Устанавливаем флаг квалификации (остается навсегда!)
      setIsQualifiedForCompletion(true);
      setIsCompleted(true);
    }
    
    // Троттлинг автосохранения
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    
    updateTimeoutRef.current = setTimeout(() => {
      // Сохраняем текущий сегмент перед записью в базу
      if (isPlayingRef.current && currentSegmentStartRef.current !== null) {
        const segment: WatchedSegment = {
          start: currentSegmentStartRef.current,
          end: currentTime
        };
        if (segment.end - segment.start >= 1) {
          segmentsRef.current.push(segment);
          currentSegmentStartRef.current = currentTime; // Начинаем новый
        }
      }
      syncProgress();
    }, 10000); // Сохраняем каждые 10 секунд
  }, [syncProgress, isCompleted]);
  
  // 🔄 Cleanup при уходе со страницы
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      // Финальное сохранение при уходе
      if (isPlayingRef.current && currentSegmentStartRef.current !== null) {
        const segment: WatchedSegment = {
          start: currentSegmentStartRef.current,
          end: lastTimeRef.current
        };
        if (segment.end - segment.start >= 1) {
          segmentsRef.current.push(segment);
        }
      }
    };
  }, []);
  
  return {
    progress,
    isCompleted,
    isLoaded,
    totalWatchedSeconds,
    videoDuration: videoDurationRef.current,
    // ✅ FIX #3: Возвращаем флаг квалификации
    isQualifiedForCompletion,
    handleTimeUpdate,
    handlePlay,
    handlePause,
    handleSeeking,
    handleSeeked
  };
};

