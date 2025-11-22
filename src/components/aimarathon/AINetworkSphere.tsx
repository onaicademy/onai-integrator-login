import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const AINetworkSphere = () => {
  const [numbers, setNumbers] = useState<number[]>([]);

  useEffect(() => {
    // Генерация случайных чисел для эффекта нейросети
    const interval = setInterval(() => {
      setNumbers(Array.from({ length: 20 }, () => Math.random()));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Основная жидкая сфера */}
      <motion.div
        className="relative w-40 h-40 xs:w-48 xs:h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 xl:w-96 xl:h-96"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        {/* Жидкий blob с градиентом */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, 
              rgba(177, 255, 50, 0.4), 
              rgba(177, 255, 50, 0.2), 
              rgba(177, 255, 50, 0.05))`,
            filter: "blur(40px)",
          }}
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Внутренний blob */}
        <motion.div
          className="absolute inset-8 rounded-full"
          style={{
            background: `radial-gradient(circle at 70% 70%, 
              rgba(177, 255, 50, 0.6), 
              rgba(177, 255, 50, 0.3), 
              transparent)`,
            filter: "blur(30px)",
          }}
          animate={{
            scale: [1, 1.3, 1],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Текущие цифры (нейросетевой эффект) */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 360) / 12;
          const radius = 120 + (i % 3) * 20;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;

          return (
            <motion.div
              key={i}
              className="absolute text-[#00ff00] font-mono text-xs xl:text-sm opacity-60"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.6, 0],
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2 + (i % 3),
                repeat: Infinity,
                delay: i * 0.2,
              }}
            >
              {Math.floor(Math.random() * 10)}
              {Math.floor(Math.random() * 10)}
              {Math.floor(Math.random() * 10)}
            </motion.div>
          );
        })}

        {/* Центральное ядро */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="relative">
            {/* Неоновое свечение */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: "#00ff00",
                filter: "blur(20px)",
                width: "80px",
                height: "80px",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
              animate={{
                opacity: [0.4, 0.8, 0.4],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* AI текст в центре */}
            <motion.div
              className="relative text-3xl xs:text-4xl sm:text-5xl md:text-6xl xl:text-8xl font-black text-[#00ff00]"
              style={{
                textShadow:
                  "0 0 20px rgba(177, 255, 50, 0.8), 0 0 40px rgba(177, 255, 50, 0.4)",
              }}
              animate={{
                textShadow: [
                  "0 0 20px rgba(177, 255, 50, 0.8), 0 0 40px rgba(177, 255, 50, 0.4)",
                  "0 0 30px rgba(177, 255, 50, 1), 0 0 60px rgba(177, 255, 50, 0.6)",
                  "0 0 20px rgba(177, 255, 50, 0.8), 0 0 40px rgba(177, 255, 50, 0.4)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              AI
            </motion.div>
          </div>
        </motion.div>

        {/* Орбитальные частицы */}
        {[...Array(8)].map((_, i) => {
          const orbitRadius = 140;
          const orbitDuration = 8 + i * 0.5;

          return (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-2 h-2 bg-[#00ff00] rounded-full"
              style={{
                left: "50%",
                top: "50%",
                boxShadow: "0 0 10px rgba(177, 255, 50, 0.8)",
              }}
              animate={{
                x: [
                  Math.cos((i * 360 * Math.PI) / (8 * 180)) * orbitRadius,
                  Math.cos(((i * 360 + 360) * Math.PI) / (8 * 180)) *
                    orbitRadius,
                ],
                y: [
                  Math.sin((i * 360 * Math.PI) / (8 * 180)) * orbitRadius,
                  Math.sin(((i * 360 + 360) * Math.PI) / (8 * 180)) *
                    orbitRadius,
                ],
              }}
              transition={{
                duration: orbitDuration,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          );
        })}
      </motion.div>

      {/* Дополнительные эффекты: нейронные связи */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.3 }}
      >
        {[...Array(6)].map((_, i) => {
          const startAngle = (i * 360) / 6;
          const endAngle = ((i + 2) * 360) / 6;
          const radius = 120;

          const x1 = `${50 + Math.cos((startAngle * Math.PI) / 180) * radius}%`;
          const y1 = `${50 + Math.sin((startAngle * Math.PI) / 180) * radius}%`;
          const x2 = `${50 + Math.cos((endAngle * Math.PI) / 180) * radius}%`;
          const y2 = `${50 + Math.sin((endAngle * Math.PI) / 180) * radius}%`;

          return (
            <motion.line
              key={`line-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#00ff00"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 0], opacity: [0, 0.4, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};

export default AINetworkSphere;

