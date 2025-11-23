import { useState, useEffect } from "react";

const INITIAL_SPOTS = 47;
const FINAL_SPOTS = 7;
const COUNTDOWN_DURATION = 240000; // 4 минуты в миллисекундах
const STORAGE_KEY = "aimarathon_spots_start";

export const useSpotsCounter = () => {
  const [spotsLeft, setSpotsLeft] = useState(INITIAL_SPOTS);
  const [enrolledToday, setEnrolledToday] = useState(53); // 100 - 47 = 53

  useEffect(() => {
    // Проверяем, есть ли сохраненное время старта
    const savedStart = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    
    let startTime: number;
    
    if (savedStart) {
      startTime = parseInt(savedStart);
      const elapsed = now - startTime;
      
      // Если прошло больше минуты, сбрасываем
      if (elapsed >= COUNTDOWN_DURATION) {
        startTime = now;
        localStorage.setItem(STORAGE_KEY, startTime.toString());
      }
    } else {
      // Новый пользователь
      startTime = now;
      localStorage.setItem(STORAGE_KEY, startTime.toString());
    }

    // Функция обновления счетчика
    const updateCounter = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / COUNTDOWN_DURATION, 1);
      
      // Линейное уменьшение от INITIAL_SPOTS до FINAL_SPOTS
      const currentSpots = Math.round(
        INITIAL_SPOTS - (INITIAL_SPOTS - FINAL_SPOTS) * progress
      );
      
      setSpotsLeft(currentSpots);
      setEnrolledToday(100 - currentSpots);
    };

    // Обновляем сразу
    updateCounter();

    // Обновляем каждую секунду
    const interval = setInterval(updateCounter, 1000);

    return () => clearInterval(interval);
  }, []);

  return { spotsLeft, enrolledToday };
};

