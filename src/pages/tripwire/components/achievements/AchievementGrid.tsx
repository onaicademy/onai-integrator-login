import { useState } from 'react';
import { motion } from 'framer-motion';
import { AchievementCard } from './AchievementCard';
import { AchievementModal } from './AchievementModal';
import { Achievement } from './achievements.types';
import { cn } from '@/lib/utils';

interface AchievementGridProps {
  achievements: Achievement[];
}

export function AchievementGrid({ achievements }: AchievementGridProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="w-full space-y-8">
      {/* PREMIUM HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-6">
        <div className="flex items-center gap-4">
          {/* Cyber accent line */}
          <div className="h-12 w-1 bg-gradient-to-b from-[#00FF88] via-[#00FF88]/50 to-transparent" />
          
          <div>
            <h2 
              className="text-2xl md:text-3xl font-bold text-white font-['JetBrains_Mono'] uppercase tracking-wider mb-1"
              style={{ textShadow: '0 0 30px rgba(0, 255, 136, 0.5)' }}
            >
              ДОСТИЖЕНИЯ
            </h2>
            <p className="text-xs text-[#00FF88]/70 font-['JetBrains_Mono'] uppercase tracking-widest">
              SYSTEM.REWARDS.COLLECTION
            </p>
          </div>
        </div>

        {/* Progress indicator - minimalist */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-3xl font-bold text-white font-['JetBrains_Mono'] tabular-nums">
              {unlockedCount}
              <span className="text-[#00FF88]">/{totalCount}</span>
            </div>
            <span className="text-[10px] font-['JetBrains_Mono'] text-[#9CA3AF] uppercase tracking-[0.2em]">
              UNLOCKED
            </span>
          </div>
          
          {/* Mini progress bars */}
          <div className="flex flex-col gap-1">
            {[...Array(totalCount)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="h-1.5 w-12 rounded-full overflow-hidden bg-[#1A1A1A]"
              >
                <motion.div
                  className={cn(
                    'h-full w-full',
                    i < unlockedCount 
                      ? 'bg-gradient-to-r from-[#00FF88] to-[#00DD77]' 
                      : 'bg-transparent'
                  )}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: i < unlockedCount ? 1 : 0 }}
                  transition={{ delay: i * 0.08 + 0.2, duration: 0.6 }}
                  style={{
                    boxShadow: i < unlockedCount ? '0 0 10px rgba(0, 255, 136, 0.6)' : 'none'
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* PREMIUM HORIZONTAL ROW - Single Row with Scroll */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#030303] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#030303] to-transparent z-10 pointer-events-none" />
        
        {/* Scrollable container */}
        <div className="overflow-x-auto overflow-y-visible pb-6 -mx-4 px-4 cyber-scrollbar">
          <div className="flex gap-6 min-w-max">
            {achievements.map((achievement, idx) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.15, duration: 0.5 }}
                className="flex-shrink-0"
              >
                <AchievementCard
                  achievement={achievement}
                  onClick={() => setSelectedAchievement(achievement)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* MODAL */}
      <AchievementModal
        achievement={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
      />
    </div>
  );
}



