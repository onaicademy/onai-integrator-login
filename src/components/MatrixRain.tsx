import { useEffect, useRef } from 'react';

interface MatrixRainProps {
  opacity?: number; // 0-1, default 0.03 (едва заметный)
}

/**
 * 🔢 MATRIX RAIN EFFECT - Падающие цифры в стиле "Матрицы"
 * Едва заметный киберпанк эффект для фона
 */
export function MatrixRain({ opacity = 0.03 }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Настройка canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Символы для падения (цифры и киберсимволы)
    const chars = '0123456789ABCDEF<>[]{}()=/\\|_-+*';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    
    // Массив для позиций падающих символов
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // Начальная позиция
    }

    // Анимация
    const draw = () => {
      // Полупрозрачный чёрный для эффекта "следа"
      ctx.fillStyle = 'rgba(3, 3, 3, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Зелёный цвет для текста (едва заметный)
      ctx.fillStyle = `rgba(0, 255, 136, ${opacity})`;
      ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

      // Рисуем символы
      for (let i = 0; i < drops.length; i++) {
        // Случайный символ
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillText(char, x, y);

        // Случайный сброс позиции
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Падение
        drops[i]++;
      }
    };

    // Запуск анимации (30 FPS для оптимизации)
    const interval = setInterval(draw, 50);

    // Ресайз
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: opacity * 20 }} // Дополнительная регулировка видимости
    />
  );
}
