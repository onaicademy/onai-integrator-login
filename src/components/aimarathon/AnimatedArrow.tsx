import { motion } from "framer-motion";

interface AnimatedArrowProps {
  className?: string;
  color?: string;
}

const AnimatedArrow = ({ 
  className = "w-12 h-12", 
  color = "#b2ff2e" 
}: AnimatedArrowProps) => {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Главная стрелка - ВНИЗ (падение цены) */}
      <motion.path
        d="M20 20 L80 80 M80 80 L55 80 M80 80 L80 55"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ 
          pathLength: 1, 
          opacity: 1 
        }}
        transition={{ 
          duration: 1.2, 
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: 0.5
        }}
      />

      {/* Дополнительные линии для фактуры - верхняя */}
      <motion.path
        d="M30 30 L70 70"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ 
          pathLength: 1, 
          opacity: 0.6 
        }}
        transition={{ 
          duration: 1.2, 
          ease: "easeInOut",
          delay: 0.2,
          repeat: Infinity,
          repeatDelay: 0.5
        }}
      />

      {/* Дополнительные линии для фактуры - нижняя */}
      <motion.path
        d="M25 25 L65 65"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ 
          pathLength: 1, 
          opacity: 0.4 
        }}
        transition={{ 
          duration: 1.2, 
          ease: "easeInOut",
          delay: 0.4,
          repeat: Infinity,
          repeatDelay: 0.5
        }}
      />

      {/* Пульсирующие частицы вдоль стрелки - ВНИЗ */}
      {[...Array(5)].map((_, i) => {
        const delay = i * 0.15;
        const x1 = 20 + (60 / 5) * i;
        const y1 = 20 + (60 / 5) * i; // Изменено: теперь идет вниз

        return (
          <motion.circle
            key={`particle-${i}`}
            cx={x1}
            cy={y1}
            r="2"
            fill={color}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{ 
              duration: 1.5, 
              ease: "easeInOut",
              delay: delay,
              repeat: Infinity,
              repeatDelay: 0.5
            }}
          />
        );
      })}

      {/* Светящийся наконечник стрелки - ВНИЗ */}
      <motion.circle
        cx="80"
        cy="80"
        r="4"
        fill={color}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 1.2, 1],
          opacity: [0, 1, 0.8],
        }}
        transition={{ 
          duration: 1.2, 
          ease: "easeOut",
          repeat: Infinity,
          repeatDelay: 0.5
        }}
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
      />

      {/* Пульсирующее свечение фона - ВНИЗ */}
      <motion.circle
        cx="80"
        cy="80"
        r="15"
        fill={color}
        opacity="0.2"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: [0.5, 1.5, 1.8],
          opacity: [0, 0.3, 0],
        }}
        transition={{ 
          duration: 1.5, 
          ease: "easeOut",
          repeat: Infinity,
          repeatDelay: 0.3
        }}
        style={{ filter: "blur(10px)" }}
      />
    </motion.svg>
  );
};

export default AnimatedArrow;

