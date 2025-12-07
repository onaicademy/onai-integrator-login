import { Dialog, DialogContent } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface AchievementModalProps {
  achievement: {
    title: string;
    description: string;
    icon: string;
  } | null;
  open: boolean;
  onClose: () => void;
}

/**
 * 🏆 ACHIEVEMENT MODAL
 * Модальное окно поздравления с разблокировкой достижения
 */
export default function AchievementModal({ achievement, open, onClose }: AchievementModalProps) {
  if (!achievement) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0A0A0A] border-2 border-[#00FF94] shadow-[0_0_40px_rgba(0,255,148,0.6)] max-w-md">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="text-center space-y-6 py-8"
        >
          {/* Анимированная иконка */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="text-8xl"
          >
            {achievement.icon}
          </motion.div>

          {/* Заголовок с glow эффектом */}
          <div>
            <h2 
              className="text-4xl font-bold text-[#00FF94] font-['Space_Grotesk'] mb-2"
              style={{ textShadow: '0 0 20px rgba(0, 255, 148, 0.8)' }}
            >
              Поздравляем!
            </h2>
            <p className="text-xl text-white mb-2 font-semibold">{achievement.title}</p>
            <p className="text-white/70">{achievement.description}</p>
          </div>

          {/* Кнопка закрытия */}
          <Button
            onClick={onClose}
            className="px-8 py-3 bg-[#00FF94] text-black font-bold rounded-xl 
                     hover:shadow-[0_0_30px_rgba(0,255,148,0.8)] transition-all
                     hover:bg-[#00CC6A]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Продолжить
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}


















