import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Target, Flame, Award, Star, X, Sparkles } from 'lucide-react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { Achievement } from './achievements.types';
import confetti from 'canvas-confetti';
import React from 'react';

interface AchievementModalProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const iconMap = {
  trophy: Trophy,
  zap: Zap,
  target: Target,
  flame: Flame,
  award: Award,
  star: Star,
};

const rarityStyles = {
  common: {
    gradient: 'from-gray-400 to-gray-600',
    textColor: 'text-gray-400',
    label: 'Обычное',
    emoji: '⚪',
  },
  uncommon: {
    gradient: 'from-green-400 to-green-600',
    textColor: 'text-green-400',
    label: 'Необычное',
    emoji: '🟢',
  },
  rare: {
    gradient: 'from-blue-400 to-blue-600',
    textColor: 'text-blue-400',
    label: 'Редкое',
    emoji: '🔵',
  },
  epic: {
    gradient: 'from-purple-400 to-purple-600',
    textColor: 'text-purple-400',
    label: 'Эпическое',
    emoji: '🟣',
  },
  legendary: {
    gradient: 'from-yellow-300 to-orange-500',
    textColor: 'text-yellow-300',
    label: 'Легендарное',
    emoji: '⭐',
  },
};

function AchievementModal({ achievement, onClose }: AchievementModalProps) {
  if (!achievement) return null;

  const LucideIcon = achievement.icon ? iconMap[achievement.icon] : Trophy;
  const style = rarityStyles[achievement.rarity];

  // 🎉 EPIC CONFETTI на открытии
  React.useEffect(() => {
    if (achievement.unlocked) {
      // Задержка перед конфетти для синхронизации с анимацией
      setTimeout(() => {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min: number, max: number) => {
          return Math.random() * (max - min) + min;
        };

        const interval = setInterval(() => {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          
          // Золотое конфетти для легендарных, зеленое для остальных
          const colors = achievement.rarity === 'legendary' 
            ? ['#FFD700', '#FFA500', '#FFFF00', '#FF8C00']
            : ['#00FF88', '#00cc88', '#FFFFFF', '#00FFAA'];

          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors
          });
        }, 250);

        return () => clearInterval(interval);
      }, 300);
    }
  }, [achievement.unlocked, achievement.rarity]);

  return (
    <AnimatePresence>
      {achievement && (
        <>
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* MODAL */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50, rotate: -10 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0, 
                rotate: 0,
                boxShadow: achievement.unlocked 
                  ? '0 0 80px rgba(0, 255, 136, 0.4), 0 0 40px rgba(0, 255, 136, 0.2)'
                  : '0 0 20px rgba(255, 255, 255, 0.1)'
              }}
              exit={{ scale: 0.5, opacity: 0, y: 50, rotate: 10 }}
              transition={{ 
                type: 'spring',
                stiffness: 200,
                damping: 20,
                duration: 0.6
              }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-gradient-to-br from-gray-900 to-black border-2 border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              {/* ANIMATED PARTICLES BACKGROUND */}
              {achievement.unlocked && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-[#00FF88] rounded-full"
                      initial={{ 
                        x: Math.random() * 100 + '%', 
                        y: -20,
                        opacity: 0 
                      }}
                      animate={{ 
                        y: '100vh',
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0]
                      }}
                      transition={{
                        duration: Math.random() * 2 + 2,
                        repeat: Infinity,
                        delay: Math.random() * 2
                      }}
                    />
                  ))}
                </div>
              )}

              {/* CLOSE BUTTON */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>

              {/* RARITY BADGE */}
              <div className="flex items-center justify-center mb-6">
                <div className={cn(
                  'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider',
                  'bg-gradient-to-r',
                  style.gradient,
                  'text-white shadow-lg'
                )}>
                  {style.emoji} {style.label}
                </div>
              </div>

              {/* ICON */}
              <div className="flex items-center justify-center mb-6 relative">
                {/* Glow */}
                {achievement.unlocked && (
                  <motion.div
                    className={cn(
                      'absolute inset-0 blur-3xl opacity-50',
                      style.textColor
                    )}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                {achievement.iconify ? (
                  <Icon
                    icon={achievement.iconify}
                    className={cn(
                      'text-[120px]',
                      achievement.unlocked ? 'text-white' : 'text-gray-600'
                    )}
                  />
                ) : (
                  <LucideIcon
                    size={120}
                    className={cn(
                      achievement.unlocked ? 'text-white' : 'text-gray-600'
                    )}
                  />
                )}
              </div>

              {/* TITLE */}
              <h2 className="text-3xl font-bold text-white text-center mb-3 font-['JetBrains_Mono'] uppercase">
                {achievement.title}
              </h2>

              {/* DESCRIPTION */}
              <p className="text-center text-gray-300 mb-6 font-['Manrope'] text-lg">
                {achievement.description}
              </p>

              {/* STATUS & ACTION BUTTON */}
              <div className="border-t border-white/10 pt-6 space-y-6">
                {achievement.unlocked && achievement.unlockedAt ? (
                  <>
                    <div className="text-center space-y-2">
                      <p className="text-sm text-gray-400 uppercase tracking-wider">
                        Разблокировано
                      </p>
                      <p className="text-xl text-white font-['JetBrains_Mono']">
                        {new Date(achievement.unlockedAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    
                    {/* EPIC BUTTON */}
                    <motion.button
                      onClick={onClose}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full py-4 px-6 rounded-xl font-bold uppercase tracking-wider text-lg
                                 bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black
                                 shadow-[0_0_30px_rgba(0,255,136,0.3)]
                                 hover:shadow-[0_0_50px_rgba(0,255,136,0.5)]
                                 transition-all duration-300
                                 flex items-center justify-center gap-3
                                 font-['Manrope']"
                    >
                      <Sparkles className="w-6 h-6" />
                      КРУТО!
                      <Sparkles className="w-6 h-6" />
                    </motion.button>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-500 uppercase tracking-wider text-sm">
                      🔒 Заблокировано
                    </p>
                    {achievement.progress && (
                      <div className="mt-4">
                        <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
                          <motion.div
                            className={cn(
                              'h-full rounded-full bg-gradient-to-r',
                              style.gradient
                            )}
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(achievement.progress.current / achievement.progress.max) * 100}%`,
                            }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                        <p className="text-sm text-gray-400 mt-2">
                          Прогресс: {achievement.progress.current} / {achievement.progress.max}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Default export
export default AchievementModal;
