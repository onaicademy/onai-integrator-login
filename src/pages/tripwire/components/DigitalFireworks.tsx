import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface DigitalFireworksProps {
  onComplete: () => void;
}

/**
 * 🎉 DIGITAL FIREWORKS
 * Цифровой салют при разблокировке достижения
 * - Частицы: #00FF94, #00CC6A, #FFFFFF
 * - Формы: square, circle (цифровой стиль)
 * - Длительность: 3-5 секунд
 */
export default function DigitalFireworks({ onComplete }: DigitalFireworksProps) {
  useEffect(() => {
    const duration = 4000; // 4 секунды
    const animationEnd = Date.now() + duration;

    const colors = ['#00FF94', '#00CC6A', '#FFFFFF'];

    const frame = () => {
      // Салют слева
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: colors,
        shapes: ['square', 'circle'],
        gravity: 1.2,
        scalar: 1.2,
        ticks: 200,
      });

      // Салют справа
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: colors,
        shapes: ['square', 'circle'],
        gravity: 1.2,
        scalar: 1.2,
        ticks: 200,
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      } else {
        setTimeout(onComplete, 500);
      }
    };

    frame();
  }, [onComplete]);

  return null;
}


















