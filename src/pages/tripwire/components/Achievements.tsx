/**
 * 🏆 ACHIEVEMENTS - PREMIUM SYSTEM 4.0
 * Премиальная система достижений с красивыми анимациями и интерактивностью
 */

import { TripwireAchievement } from '@/lib/tripwire-utils';
import { useState, useEffect } from 'react';
import { AchievementGrid } from './achievements/AchievementGrid';
import { AchievementNotification } from './achievements/AchievementNotification';
import { Achievement, AchievementConfig } from './achievements/achievements.types';

interface AchievementsProps {
  achievements: TripwireAchievement[];
}

// 🎨 КОНФИГУРАЦИЯ ДОСТИЖЕНИЙ
const ACHIEVEMENT_CONFIG: AchievementConfig[] = [
  {
    id: 'first_module_complete',
<<<<<<< Updated upstream
    icon: 'fluent:target-arrow-24-filled',  // Премиум иконка: цель/направление
    title: 'ПУТЬ НАЙДЕН',
    description: 'Определено направление в AI',
    badge: '01',
    color: '#00FF88',
    shadowColor: 'rgba(0, 255, 136, 0.15)',
    gradient: 'from-[#00FF88]/5 via-transparent to-transparent',
  },
  {
    id: 'second_module_complete',
    icon: 'fluent:brain-circuit-24-filled',  // Премиум иконка: AI интеграция
    title: 'AI ИНТЕГРАТОР',
    description: 'Создан первый GPT-бот',
    badge: '02',
    color: '#00FF88',
    shadowColor: 'rgba(0, 255, 136, 0.15)',
    gradient: 'from-[#00FF88]/5 via-transparent to-transparent',
  },
  {
    id: 'third_module_complete',
    icon: 'fluent:video-clip-24-filled',  // Премиум иконка: вирусное видео
    title: 'CREATOR',
    description: 'Освоено создание вирусных Reels',
    badge: '03',
    color: '#00FF88',
    shadowColor: 'rgba(0, 255, 136, 0.15)',
    gradient: 'from-[#00FF88]/5 via-transparent to-transparent',
=======
    icon: 'carbon:chart-network',
    iconLucide: 'target',
    title: 'ПУТЬ НАЙДЕН',
    description: 'Определено твое направление в AI',
    color: '#00D9FF',
    shadowColor: 'rgba(0, 217, 255, 0.8)',
    gradient: 'from-cyan-400/40 via-blue-500/30 to-transparent',
    rarity: 'rare',
    category: 'learning',
  },
  {
    id: 'second_module_complete',
    icon: 'mdi:robot-outline',
    iconLucide: 'zap',
    title: 'AI ИНТЕГРАТОР',
    description: 'Создан первый GPT-бот',
    color: '#B794F6',
    shadowColor: 'rgba(183, 148, 246, 0.8)',
    gradient: 'from-purple-400/40 via-violet-500/30 to-transparent',
    rarity: 'epic',
    category: 'learning',
  },
  {
    id: 'third_module_complete',
    icon: 'tabler:video-plus',
    iconLucide: 'award',
    title: 'ВИРУСНЫЙ CREATOR',
    description: 'Освоено создание вирусных Reels',
    color: '#FFD700',
    shadowColor: 'rgba(255, 215, 0, 0.8)',
    gradient: 'from-yellow-400/40 via-amber-500/30 to-transparent',
    rarity: 'legendary',
    category: 'learning',
>>>>>>> Stashed changes
  }
];

/**
 * Конвертация данных из базы в формат премиальных достижений
 */
function convertToAchievements(
  dbAchievements: TripwireAchievement[]
): Achievement[] {
  return ACHIEVEMENT_CONFIG.map((config) => {
    const dbAchievement = dbAchievements.find(
      (a) => a.achievement_id === config.id
    );

    return {
      id: config.id,
      title: config.title,
      description: config.description,
      icon: config.iconLucide || 'trophy',
      iconify: config.icon,
      rarity: config.rarity,
      category: config.category,
      unlocked: dbAchievement?.is_completed || false,
      unlockedAt: dbAchievement?.unlocked_at || null,
      color: config.color,
      shadowColor: config.shadowColor,
      gradient: config.gradient,
    };
  });
}

export default function Achievements({ achievements }: AchievementsProps) {
  const [premiumAchievements, setPremiumAchievements] = useState<Achievement[]>([]);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  // Конвертация данных
  useEffect(() => {
    const converted = convertToAchievements(achievements);
    setPremiumAchievements(converted);
  }, [achievements]);

  // 🎉 ОТСЛЕЖИВАНИЕ НОВЫХ ДОСТИЖЕНИЙ
  useEffect(() => {
    const previousUnlockedIds = JSON.parse(
      localStorage.getItem('unlocked_achievements') || '[]'
    );
    const currentUnlockedIds = achievements
      .filter((a) => a.is_completed)
      .map((a) => a.achievement_id);

    // Находим новые достижения
    const newIds = currentUnlockedIds.filter(
      (id) => !previousUnlockedIds.includes(id)
    );

    if (newIds.length > 0) {
      console.log('🎉 [Achievements] Новые достижения:', newIds);

      // Показываем уведомление для первого нового достижения
      const newAchievement = premiumAchievements.find(
        (a) => newIds.includes(a.id)
      );
      if (newAchievement) {
        setNewAchievement(newAchievement);
        setShowNotification(true);

        // Скрываем через 4 секунды
        setTimeout(() => {
          setShowNotification(false);
          setTimeout(() => setNewAchievement(null), 500);
        }, 4000);
      }
    }

    // Сохраняем текущий список
    localStorage.setItem(
      'unlocked_achievements',
      JSON.stringify(currentUnlockedIds)
    );
  }, [achievements, premiumAchievements]);

  return (
    <>
      {/* GRID С ДОСТИЖЕНИЯМИ */}
      <AchievementGrid achievements={premiumAchievements} />

      {/* NOTIFICATION */}
      {newAchievement && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <AchievementNotification
            achievement={newAchievement}
            visible={showNotification}
          />
        </div>
<<<<<<< Updated upstream

        <div className="text-right">
          <div className="text-4xl font-bold text-white font-['JetBrains_Mono']">
            {unlockedCount}
            <span className="text-[#00FF94]">/{totalCount}</span>
          </div>
          <span className="text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase tracking-widest">
            ПОЛУЧЕНО
          </span>
        </div>
      </div>

      {/* Achievements Grid - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ACHIEVEMENT_CONFIG.map((config) => {
          // ✅ FIX: Use achievement_id instead of achievement_type
          const achievement = achievements.find(a => a.achievement_id === config.id);
          // ✅ FIX: Use is_completed instead of unlocked
          const isUnlocked = achievement?.is_completed || false;

          const isNewlyUnlocked = newlyUnlockedIds.includes(config.id);

          return (
            <motion.div 
              key={config.id} 
              className="relative group h-full"
              initial={{ scale: 1 }}
              animate={isNewlyUnlocked ? { 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              } : { scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              {/* 🎉 АНИМАЦИЯ РАЗБЛОКИРОВКИ */}
              {isNewlyUnlocked && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.5, 1.5, 2] }}
                  transition={{ duration: 2 }}
                  className="absolute inset-0 rounded-full blur-3xl z-10 pointer-events-none"
                  style={{ backgroundColor: config.color }}
                />
              )}

              {/* Outer glow - visible only when unlocked */}
              {isUnlocked && (
                <div 
                  className={`absolute -inset-4 bg-gradient-to-br ${config.gradient} rounded-3xl 
                            blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500`}
                />
              )}

              {/* Card container - Premium cyber style */}
              <motion.div 
                className={`
                  relative rounded-2xl overflow-hidden transition-all duration-500 h-full
                  flex flex-col backdrop-blur-xl
                  ${isUnlocked 
                    ? 'bg-[#0A0A0A]/90 border-2 hover:scale-[1.02]' 
                    : 'bg-[#0A0A0A]/60 border'
                  }
                `}
                   style={{
                     borderColor: isUnlocked ? config.color : 'rgba(255,255,255,0.05)',
                     boxShadow: isUnlocked ? `0 0 40px ${config.shadowColor}, inset 0 0 20px rgba(0,255,136,0.05)` : 'none'
                   }}>
                
                {/* Image/Icon Area */}
                <div className="relative h-40 flex items-center justify-center bg-gradient-to-b from-[#00FF88]/5 to-transparent">
                   {/* Lock overlay */}
                   {!isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                        <Lock className="w-12 h-12 text-white/20" />
                      </div>
                   )}

                   <div className={`relative transition-transform duration-500 ${isUnlocked ? 'scale-110' : 'scale-90 grayscale opacity-40'}`}>
                      {isUnlocked && (
                        <div className="absolute inset-0 blur-2xl opacity-60" style={{ backgroundColor: config.color }} />
                      )}
                      <Icon 
                        icon={config.icon} 
                        style={{ 
                          fontSize: '80px',
                          color: isUnlocked ? config.color : '#444',
                          filter: isUnlocked ? `drop-shadow(0 0 30px ${config.color})` : 'none'
                        }}
                      />
                   </div>
                </div>

                {/* Text Content Area - Premium Cyber */}
                <div className="p-6 pt-4 flex-1 flex flex-col text-center bg-gradient-to-b from-transparent to-[#00FF88]/[0.02]">
                  <h3 className={`text-xl font-bold font-['JetBrains_Mono'] mb-2 uppercase leading-tight tracking-wider
                                ${isUnlocked ? 'text-white' : 'text-white/30'}`}
                      style={isUnlocked ? { textShadow: '0 0 20px rgba(0,255,136,0.3)' } : {}}>
                    {config.title}
                  </h3>
                  <p className={`text-sm leading-relaxed font-['Manrope']
                                ${isUnlocked ? 'text-[#9CA3AF]' : 'text-[#444]'}`}>
                    {config.description}
                  </p>
                  
                  {/* Unlocked Date */}
                  {isUnlocked && achievement.unlocked_at && (
                    <div className="mt-auto pt-4">
                      <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#00FF94]">
                        {new Date(achievement.unlocked_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  )}
                  
                  {!isUnlocked && (
                     <div className="mt-auto pt-4">
                        <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-white/20">
                           ЗАБЛОКИРОВАНО
                        </span>
                     </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )
        })}
      </div>
    </div>
=======
      )}
    </>
>>>>>>> Stashed changes
  );
}
