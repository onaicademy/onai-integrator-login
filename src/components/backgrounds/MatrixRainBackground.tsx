import { MatrixRainingLetters } from 'react-mdr';
import { motion } from 'framer-motion';

interface MatrixRainBackgroundProps {
  opacity?: number;
  color?: string;
}

/**
 * 🎨 ПРЕМИУМ: Matrix Rain Background
 * Падающие цифры как в фильме "Матрица"
 * Используется библиотека react-mdr
 */
export function MatrixRainBackground({ 
  opacity = 0.15, // Очень слабо заметный фон (15% от яркости)
  color = '#00FF88' 
}: MatrixRainBackgroundProps) {
  return (
    <>
      {/* Matrix rain effect */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none w-full h-full"
        style={{ opacity }}
      >
        <MatrixRainingLetters 
          custom_class="w-full h-full"
          style={{
            filter: `hue-rotate(0deg) brightness(0.8)`,
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      {/* Темный оверлей для контраста */}
      <div 
        className="fixed inset-0 pointer-events-none z-0" 
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0, 0, 0, 0.3) 100%)',
        }}
      />

      {/* Дополнительные падающие частицы для эффекта глубины */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-[1px] h-[1px] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: color,
              boxShadow: `0 0 ${2 + Math.random() * 3}px ${color}`,
            }}
            animate={{
              y: ['-10%', '110vh'],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 10,
              delay: Math.random() * 5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>
    </>
  );
}

