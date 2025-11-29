import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useVideoTracking = (lessonId: number, userId: string | undefined) => {
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [duration, setDuration] = useState(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  // Функция отправки данных в базу
  const syncProgress = async (currentTime: number, totalDuration: number) => {
    if (!userId || !lessonId) return;

    const percentage = Math.min(100, Math.round((currentTime / totalDuration) * 100));
    
    // Если прогресс > 80%, считаем что можно завершать
    const qualified = percentage >= 80;

    try {
      const { error } = await supabase.from('video_tracking').upsert({
        user_id: userId,
        lesson_id: lessonId,
        video_duration_seconds: Math.round(totalDuration),
        last_position_seconds: Math.round(currentTime),
        watch_percentage: percentage,
        is_qualified_for_completion: qualified,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, lesson_id' });

      if (error) console.error('Tracking error:', error);
      
      if (qualified && !isCompleted) {
        setIsCompleted(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTimeUpdate = (currentTime: number, totalDuration: number) => {
    setDuration(totalDuration);
    const percentage = (currentTime / totalDuration) * 100;
    setProgress(percentage);

    // Троттлинг: отправляем запрос не чаще чем раз в 5 секунд
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    
    updateTimeoutRef.current = setTimeout(() => {
      syncProgress(currentTime, totalDuration);
    }, 5000);
  };

  return { progress, isCompleted, handleTimeUpdate };
};

