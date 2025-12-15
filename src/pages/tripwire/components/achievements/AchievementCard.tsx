import { motion } from 'framer-motion';
import { Trophy, Zap, Target, Flame, Award, Star, Lock } from 'lucide-react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { Achievement } from './achievements.types';

interface AchievementCardProps {
  achievement: Achievement;
  onClick?: () => void;
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
    border: 'border-gray-400',
    glow: 'shadow-gray-400/30',
    bgGradient: 'from-gray-400/20 via-gray-500/10 to-transparent',
  },
  uncommon: {
    gradient: 'from-green-400 to-green-600',
    border: 'border-green-400',
    glow: 'shadow-green-400/30',
    bgGradient: 'from-green-400/20 via-green-500/10 to-transparent',
  },
  rare: {
    gradient: 'from-blue-400 to-blue-600',
    border: 'border-blue-400',
    glow: 'shadow-blue-400/30',
    bgGradient: 'from-blue-400/20 via-blue-500/10 to-transparent',
  },
  epic: {
    gradient: 'from-purple-400 to-purple-600',
    border: 'border-purple-400',
    glow: 'shadow-purple-400/30',
    bgGradient: 'from-purple-400/20 via-purple-500/10 to-transparent',
  },
  legendary: {
    gradient: 'from-yellow-300 to-orange-500',
    border: 'border-yellow-300',
    glow: 'shadow-yellow-300/50',
    bgGradient: 'from-yellow-300/20 via-orange-400/10 to-transparent',
  },
};

export function AchievementCard({ achievement, onClick }: AchievementCardProps) {
  const LucideIcon = achievement.icon ? iconMap[achievement.icon] : Trophy;
  const isUnlocked = achievement.unlocked;

  return (
    <motion.div
      whileHover={isUnlocked ? { y: -8, scale: 1.02 } : { scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="relative group cursor-pointer"
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* PREMIUM CYBER CARD */}
      <div
        className={cn(
          'relative w-[340px] h-[200px] rounded-xl overflow-hidden',
          'border transition-all duration-500',
          isUnlocked
            ? 'bg-gradient-to-br from-[#0A0A0A] via-[#0F0F0F] to-[#0A0A0A] border-[#00FF88]/40'
            : 'bg-[#0A0A0A]/60 border-[#2A2A2A]/40'
        )}
      >
        {/* Animated glow effect */}
        {isUnlocked && (
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 136, 0.15), transparent 70%)'
            }}
          />
        )}

        {/* Top cyber accent line */}
        {isUnlocked && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00FF88] to-transparent" />
        )}

        {/* Locked overlay */}
        {!isUnlocked && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-3">
              <Lock className="w-10 h-10 text-white/20" strokeWidth={1.5} />
              <span className="text-[10px] font-['JetBrains_Mono'] text-white/30 uppercase tracking-[0.2em]">
                LOCKED
              </span>
            </div>
          </div>
        )}

        {/* Content Layout: Icon Left + Text Right */}
        <div className="relative h-full flex items-center gap-6 p-6">
          {/* LEFT: Icon Section */}
          <div className="flex-shrink-0 relative">
            {/* Glow behind icon */}
            {isUnlocked && (
              <motion.div
                className="absolute inset-0 blur-2xl"
                style={{ backgroundColor: achievement.color || '#00FF88' }}
                animate={{ 
                  opacity: [0.2, 0.4, 0.2],
                  scale: [0.9, 1.1, 0.9]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            {/* Icon */}
            <motion.div
              animate={isUnlocked ? { 
                rotate: [0, 3, -3, 0]
              } : undefined}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-10"
            >
              {achievement.iconify ? (
                <Icon
                  icon={achievement.iconify}
                  className={cn(
                    'text-[72px]',
                    isUnlocked ? 'text-[#00FF88]' : 'text-[#2A2A2A]'
                  )}
                  style={{
                    filter: isUnlocked ? 'drop-shadow(0 0 20px rgba(0, 255, 136, 0.6))' : 'none'
                  }}
                />
              ) : (
                <LucideIcon
                  size={72}
                  strokeWidth={1.5}
                  className={cn(
                    isUnlocked ? 'text-[#00FF88]' : 'text-[#2A2A2A]'
                  )}
                  style={{
                    filter: isUnlocked ? 'drop-shadow(0 0 20px rgba(0, 255, 136, 0.6))' : 'none'
                  }}
                />
              )}
            </motion.div>
          </div>

          {/* RIGHT: Text Content */}
          <div className="flex-1 flex flex-col justify-center space-y-2">
            {/* Title */}
            <h3 className={cn(
              "text-base font-bold leading-tight uppercase tracking-wide",
              "font-['JetBrains_Mono']",
              isUnlocked ? 'text-white' : 'text-[#404040]'
            )}
            style={{
              textShadow: isUnlocked ? '0 0 20px rgba(0, 255, 136, 0.3)' : 'none'
            }}
            >
              {achievement.title}
            </h3>

            {/* Description */}
            <p className={cn(
              "text-xs leading-relaxed",
              "font-['Manrope']",
              isUnlocked ? 'text-white/70' : 'text-[#404040]'
            )}>
              {achievement.description}
            </p>

            {/* Bottom info: date or progress */}
            {isUnlocked && achievement.unlockedAt ? (
              <div className="flex items-center gap-2 pt-2">
                <div className="h-[1px] w-6 bg-[#00FF88]/30" />
                <p className="text-[10px] opacity-60 font-['JetBrains_Mono'] text-[#00FF88] uppercase tracking-wider">
                  {new Date(achievement.unlockedAt).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit'
                  })}
                </p>
              </div>
            ) : achievement.progress && !isUnlocked ? (
              <div className="mt-2 space-y-1">
                <div className="bg-[#1A1A1A] rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="bg-[#00FF88]/60 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(achievement.progress.current / achievement.progress.max) * 100}%`,
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[10px] opacity-50 font-['JetBrains_Mono'] text-white">
                  {achievement.progress.current}/{achievement.progress.max}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Corner accent (unlocked only) */}
        {isUnlocked && (
          <div className="absolute bottom-0 right-0 w-16 h-16 opacity-20">
            <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-[#00FF88] to-transparent" />
            <div className="absolute bottom-0 right-0 h-full w-[1px] bg-gradient-to-t from-[#00FF88] to-transparent" />
          </div>
        )}
      </div>

      {/* External glow on hover */}
      {isUnlocked && (
        <motion.div
          className="absolute -inset-2 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 -z-10"
          style={{
            background: 'radial-gradient(circle, rgba(0, 255, 136, 0.3), transparent 70%)'
          }}
        />
      )}
    </motion.div>
  );
}



