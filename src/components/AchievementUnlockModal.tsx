import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Achievement {
  achievement_id: string;
  achievement_title: string;
  xp_reward: number;
}

interface AchievementUnlockModalProps {
  achievements: Achievement[];
  onClose: () => void;
}

export function AchievementUnlockModal({ achievements, onClose }: AchievementUnlockModalProps) {
  useEffect(() => {
    // Запускаем фейерверк при монтировании
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Запускаем конфетти с двух сторон
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  if (achievements.length === 0) return null;

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
          initial={{ scale: 0.5, opacity: 0, rotateZ: -10 }}
          animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotateZ: 10 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative bg-gradient-to-br from-[#1a1a24] to-[#0f0f15] border-2 border-[#00FF88] rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-[#00FF88]/50"
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
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex justify-center"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-[#00FF88]/20 to-[#00cc88]/10 rounded-full flex items-center justify-center border-4 border-[#00FF88] shadow-lg shadow-[#00FF88]/50">
                <Trophy className="w-12 h-12 text-[#00FF88]" />
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-3xl font-bold text-white mb-2">
                🎉 Достижение разблокировано!
              </h2>
              <p className="text-gray-400">
                Поздравляем с новым успехом!
              </p>
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4"
            >
              {achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.achievement_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="bg-[#0a0a0f] border border-[#00FF88]/30 rounded-xl p-4"
                >
                  <h3 className="text-xl font-bold text-white mb-2">
                    {achievement.achievement_title}
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-[#00FF88] font-bold">
                    <span>+{achievement.xp_reward} XP</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Button
                onClick={onClose}
                className="w-full bg-[#00FF88] text-black hover:bg-[#00cc88] font-bold text-lg py-6 rounded-xl"
              >
                Продолжить обучение
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}



































