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

  // Группировка по рарности
  const grouped = {
    legendary: achievements.filter((a) => a.rarity === 'legendary'),
    epic: achievements.filter((a) => a.rarity === 'epic'),
    rare: achievements.filter((a) => a.rarity === 'rare'),
    uncommon: achievements.filter((a) => a.rarity === 'uncommon'),
    common: achievements.filter((a) => a.rarity === 'common'),
  };

  const rarityLabels = {
    legendary: { label: 'Легендарные', emoji: '⭐' },
    epic: { label: 'Эпические', emoji: '🟣' },
    rare: { label: 'Редкие', emoji: '🔵' },
    uncommon: { label: 'Необычные', emoji: '🟢' },
    common: { label: 'Обычные', emoji: '⚪' },
  };

  return (
    <div className="w-full space-y-12">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 
            className="text-3xl font-bold text-white font-['JetBrains_Mono'] uppercase tracking-wider mb-2"
            style={{ textShadow: '0 0 30px rgba(0, 255, 148, 0.4)' }}
          >
            ДОСТИЖЕНИЯ
          </h2>
          <p className="text-sm text-[#9CA3AF] font-['JetBrains_Mono'] uppercase">
            /// ВАША КОЛЛЕКЦИЯ НАГРАД
          </p>
        </div>

        <div className="text-right">
          {/* Progress Counter */}
          <div className="text-4xl font-bold text-white font-['JetBrains_Mono']">
            {unlockedCount}
            <span className="text-[#00FF94]">/{totalCount}</span>
          </div>
          <span className="text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase tracking-widest">
            ПОЛУЧЕНО
          </span>
          
          {/* Progress dots */}
          <div className="flex gap-1 mt-2 justify-end">
            {[...Array(totalCount)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'h-2 w-2 rounded-full',
                  i < unlockedCount 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-400/50' 
                    : 'bg-gray-700'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* SECTIONS BY RARITY */}
      {Object.entries(grouped).map(
        ([rarity, items]) =>
          items.length > 0 && (
            <motion.div 
              key={rarity} 
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {/* Section Header */}
              <h3 className="text-xl font-bold capitalize font-['JetBrains_Mono'] text-white/90 uppercase tracking-wider">
                {rarityLabels[rarity as keyof typeof rarityLabels].emoji}{' '}
                {rarityLabels[rarity as keyof typeof rarityLabels].label}
              </h3>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((achievement, idx) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                  >
                    <AchievementCard
                      achievement={achievement}
                      onClick={() => setSelectedAchievement(achievement)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )
      )}

      {/* MODAL */}
      <AchievementModal
        achievement={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
      />
    </div>
  );
}



