import { useState, useEffect } from "react";

const ALMATY_TIMEZONE = "Asia/Almaty";
const RESET_HOUR = 20; // 20:00

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

export const useAlmatyTimer = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Текущее время в Алматы
      const now = new Date();
      const almatyTime = new Date(now.toLocaleString("en-US", { timeZone: ALMATY_TIMEZONE }));
      
      // Следующий дедлайн (сегодня в 20:00 или завтра в 20:00)
      const deadline = new Date(almatyTime);
      deadline.setHours(RESET_HOUR, 0, 0, 0);
      
      // Если текущее время уже после 20:00, берем завтрашний день
      if (almatyTime.getHours() >= RESET_HOUR) {
        deadline.setDate(deadline.getDate() + 1);
      }
      
      // Разница в миллисекундах
      const diff = deadline.getTime() - almatyTime.getTime();
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    // Обновляем сразу
    calculateTimeLeft();

    // Обновляем каждую секунду
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, []);

  return timeLeft;
};

