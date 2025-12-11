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
  const style = rarityStyles[achievement.rarity];

  return (
    <motion.div
      whileHover={isUnlocked ? { scale: 1.05, y: -8 } : undefined}
      whileTap={isUnlocked ? { scale: 0.98 } : undefined}
      className="relative group cursor-pointer h-full"
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* BACKGROUND GLOW */}
      {isUnlocked && (
        <motion.div
          className={cn(
            'absolute -inset-3 bg-gradient-to-r rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500',
            style.glow
          )}
          animate={{ 
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.05, 1]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* CARD */}
      <div
        className={cn(
          'relative w-full h-full min-h-[280px] rounded-2xl border-2 p-6 flex flex-col items-center justify-between transition-all duration-500',
          'backdrop-blur-sm',
          isUnlocked
            ? cn(
                'bg-gradient-to-br',
                style.gradient,
                'text-white',
                style.border,
                'shadow-2xl'
              )
            : 'bg-gray-900/80 border-gray-800 text-gray-500'
        )}
      >
        {/* LOCKED OVERLAY */}
        {!isUnlocked && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Lock className="w-12 h-12 text-white/30" />
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Заблокировано
              </span>
            </div>
          </div>
        )}

        {/* TOP SECTION - ICON */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Glow behind icon */}
          {isUnlocked && (
            <motion.div
              className="absolute inset-0 blur-2xl opacity-50"
              style={{ backgroundColor: achievement.color || '#fff' }}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}

          {/* ICON */}
          <motion.div
            animate={isUnlocked ? { 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            } : undefined}
            transition={{ duration: 3, repeat: Infinity }}
            className="relative z-10"
          >
            {achievement.iconify ? (
              <Icon
                icon={achievement.iconify}
                className={cn(
                  'text-[80px]',
                  isUnlocked ? 'text-white drop-shadow-2xl' : 'text-gray-700'
                )}
                style={{
                  filter: isUnlocked ? 'drop-shadow(0 0 20px rgba(255,255,255,0.5))' : 'none'
                }}
              />
            ) : (
              <LucideIcon
                size={80}
                className={cn(
                  isUnlocked ? 'text-white drop-shadow-2xl' : 'text-gray-700'
                )}
                style={{
                  filter: isUnlocked ? 'drop-shadow(0 0 20px rgba(255,255,255,0.5))' : 'none'
                }}
              />
            )}
          </motion.div>
        </div>

        {/* BOTTOM SECTION - TEXT */}
        <div className="w-full text-center space-y-2">
          {/* TITLE */}
          <h3 className={cn(
            "text-lg font-bold leading-tight uppercase tracking-wide",
            "font-['JetBrains_Mono']",
            isUnlocked ? 'text-white' : 'text-gray-600'
          )}>
            {achievement.title}
          </h3>

          {/* DESCRIPTION */}
          <p className={cn(
            "text-sm leading-relaxed",
            "font-['Manrope']",
            isUnlocked ? 'text-white/90' : 'text-gray-700'
          )}>
            {achievement.description}
          </p>

          {/* PROGRESS BAR (если есть) */}
          {achievement.progress && !isUnlocked && (
            <div className="mt-3 w-full space-y-1">
              <div className="bg-black/30 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-white/80 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(achievement.progress.current / achievement.progress.max) * 100}%`,
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs opacity-80">
                {achievement.progress.current}/{achievement.progress.max}
              </p>
            </div>
          )}

          {/* UNLOCK DATE */}
          {isUnlocked && achievement.unlockedAt && (
            <p className="text-xs opacity-80 font-['JetBrains_Mono'] pt-2">
              {new Date(achievement.unlockedAt).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}



