import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Unlock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ModuleUnlockModalProps {
  moduleName: string;
  moduleId: number;
  courseId: number;
  onClose: () => void;
}

export function ModuleUnlockModal({ moduleName, moduleId, courseId, onClose }: ModuleUnlockModalProps) {
  const navigate = useNavigate();

  useEffect(() => {
    // 🎆 Золотой фейерверк для разблокировки модуля
    const duration = 2500;
    const animationEnd = Date.now() + duration;

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 30 * (timeLeft / duration);
      
      // Золотой конфетти (для разблокировки модуля - особое событие!)
      confetti({
        particleCount,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FFFF00', '#00FF88'],
        zIndex: 10000
      });
      confetti({
        particleCount,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FFFF00', '#00FF88'],
        zIndex: 10000
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const handleGoToModule = () => {
    navigate(`/course/${courseId}/module/${moduleId}`);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 100 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: -100 }}
          transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
          className="relative bg-gradient-to-br from-[#1a1a24] via-[#0f0f15] to-[#1a1a24] border-2 border-[#FFD700] rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-[#FFD700]/50"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Content */}
          <div className="text-center space-y-6">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: [0, 1.2, 1], rotate: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex justify-center"
            >
              <div className="w-28 h-28 bg-gradient-to-br from-[#FFD700]/30 to-[#FFA500]/20 rounded-full flex items-center justify-center border-4 border-[#FFD700] shadow-lg shadow-[#FFD700]/60 relative">
                {/* Pulse animation */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 rounded-full border-4 border-[#FFD700]"
                />
                <Unlock className="w-14 h-14 text-[#FFD700]" />
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-4xl font-bold text-white mb-2">
                🔓 Модуль разблокирован!
              </h2>
              <p className="text-gray-400">
                Вы открыли доступ к новому контенту
              </p>
            </motion.div>

            {/* Module Info */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-[#FFD700]/10 to-[#FFA500]/10 border border-[#FFD700]/50 rounded-xl p-6"
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
                <p className="text-sm text-gray-400 uppercase tracking-wider">Следующий модуль</p>
                <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-white">
                {moduleName}
              </h3>
            </motion.div>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-3"
            >
              <Button
                onClick={handleGoToModule}
                className="w-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black hover:from-[#FFA500] hover:to-[#FFD700] font-bold text-lg py-6 rounded-xl shadow-lg shadow-[#FFD700]/30 transition-all"
              >
                <span>Перейти к модулю</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full text-gray-400 hover:text-white hover:bg-white/5"
              >
                Продолжить текущий
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}






































