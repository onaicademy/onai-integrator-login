/**
 * 🎉 ACHIEVEMENT NOTIFICATION
 * Toast уведомления при разблокировке достижений
 */

import { motion } from 'framer-motion';
import { Trophy, Zap, Target, Flame, Award, Star } from 'lucide-react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { Achievement } from './achievements.types';

const iconMap = {
  trophy: Trophy,
  zap: Zap,
  target: Target,
  flame: Flame,
  award: Award,
  star: Star,
};

const rarityColors = {
  common: 'bg-gray-600',
  uncommon: 'bg-green-600',
  rare: 'bg-blue-600',
  epic: 'bg-purple-600',
  legendary: 'bg-gradient-to-r from-yellow-400 to-orange-500',
};

interface AchievementNotificationProps {
  achievement: Achievement;
  visible: boolean;
}

export function AchievementNotification({ achievement, visible }: AchievementNotificationProps) {
  const LucideIcon = achievement.icon ? iconMap[achievement.icon] : Trophy;

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.5 }}
      className={cn(
        'px-6 py-4 rounded-xl text-white shadow-2xl flex items-center gap-4',
        'border-2 border-white/20',
        rarityColors[achievement.rarity]
      )}
    >
      {/* ICON with rotation animation */}
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ duration: 1, ease: 'easeInOut' }}
        className="flex-shrink-0"
      >
        {achievement.iconify ? (
          <Icon icon={achievement.iconify} className="text-[40px]" />
        ) : (
          <LucideIcon size={40} />
        )}
      </motion.div>

      {/* TEXT */}
      <div className="flex-1">
        <p className="font-bold text-lg mb-1 font-['JetBrains_Mono']">
          🎉 Новое достижение!
        </p>
        <p className="text-sm opacity-90 font-['Manrope']">
          {achievement.title}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Хелпер для показа уведомления через toast (если используется библиотека)
 * Для использования с react-hot-toast после установки:
 */

// import toast from 'react-hot-toast';
// 
// export function showAchievementNotification(achievement: Achievement) {
//   toast.custom((t) => (
//     <AchievementNotification achievement={achievement} visible={t.visible} />
//   ), {
//     duration: 4000,
//     position: 'top-center',
//   });
// }



