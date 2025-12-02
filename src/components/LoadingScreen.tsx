import { motion } from 'framer-motion';
import { OnAILogo } from './OnAILogo';

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4 sm:p-6"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => {
        // ⏱️ Увеличено до 3000ms, чтобы анимация логотипа проиграла полностью
        // (OnAILogo включается через 2 секунды, нужно дать время на просмотр)
        setTimeout(onComplete, 3000);
      }}
    >
      {/* 🚀 PERFORMANCE FIX: Reduced from 20 to 8 particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 sm:w-1 sm:h-1 bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.5, 1.5, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </div>

      {/* Логотип в центре - АДАПТИВНЫЙ */}
      <div className="relative z-10 flex items-center justify-center w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full"
        >
          <OnAILogo 
            variant="full" 
            className="h-16 sm:h-20 md:h-24 lg:h-32 w-auto text-white mx-auto" 
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

