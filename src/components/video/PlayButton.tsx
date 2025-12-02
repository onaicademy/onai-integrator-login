import { Play, Pause } from 'lucide-react';

interface PlayButtonProps {
  isPlaying: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'center' | 'control';
}

/**
 * PlayButton - Кнопка воспроизведения без анимаций масштаба
 * 
 * ✅ БЕЗ transform, scale, translate анимаций
 * ✅ Только transition-colors (цвет меняется плавно)
 * ✅ Статична - не двигается при hover
 * ✅ Cyber-Architecture дизайн
 */
export default function PlayButton({ 
  isPlaying, 
  onClick, 
  size = 'md',
  variant = 'center'
}: PlayButtonProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };
  
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  // Разные стили для центральной кнопки и контрольной панели
  if (variant === 'center') {
    return (
      <button
        onClick={onClick}
        className={`
          ${sizeClasses[size]}
          rounded-full
          bg-black/60 backdrop-blur-sm
          border-2 border-white/20
          flex items-center justify-center
          cursor-pointer
          
          /* ✅ ТОЛЬКО ЦВЕТ МЕНЯЕТСЯ */
          transition-colors duration-200
          hover:bg-[#00FF94]/20
          hover:border-[#00FF94]
          active:bg-[#00FF94]/30
          
          /* ❌ БЕЗ АНИМАЦИЙ МАСШТАБА/ПОЗИЦИИ */
          /* НЕ ИСПОЛЬЗУЕМ: transform, scale, translate */
        `}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause 
            className={`${iconSizes[size]} text-white transition-colors duration-200`}
            fill="white"
          />
        ) : (
          <Play 
            className={`${iconSizes[size]} text-white transition-colors duration-200 ml-0.5`}
            fill="white"
          />
        )}
      </button>
    );
  }

  // Вариант для контрольной панели (меньше, квадратный)
  return (
    <button
      onClick={onClick}
      className="
        w-10 h-10
        rounded-lg
        bg-transparent
        flex items-center justify-center
        cursor-pointer
        
        transition-colors duration-200
        hover:bg-[#00FF94]/10
        active:bg-[#00FF94]/20
      "
      aria-label={isPlaying ? 'Pause' : 'Play'}
    >
      {isPlaying ? (
        <Pause 
          className="w-5 h-5 text-[#00FF94] transition-colors duration-200"
        />
      ) : (
        <Play 
          className="w-5 h-5 text-[#00FF94] transition-colors duration-200"
        />
      )}
    </button>
  );
}

