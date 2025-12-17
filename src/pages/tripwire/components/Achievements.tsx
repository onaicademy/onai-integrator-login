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
    icon: 'fluent:target-arrow-24-filled',
    title: 'ПУТЬ НАЙДЕН',
    description: 'Определено направление в AI',
    badge: '01',
    color: '#00FF88',
    shadowColor: 'rgba(0, 255, 136, 0.15)',
    gradient: 'from-[#00FF88]/5 via-transparent to-transparent',
    rarity: 'epic', // ✅ ДОБАВЛЕНО
    category: 'Обучение', // ✅ ДОБАВЛЕНО
  },
  {
    id: 'second_module_complete',
    icon: 'fluent:brain-circuit-24-filled',
    title: 'AI ИНТЕГРАТОР',
    description: 'Создан первый GPT-бот',
    badge: '02',
    color: '#00FF88',
    shadowColor: 'rgba(0, 255, 136, 0.15)',
    gradient: 'from-[#00FF88]/5 via-transparent to-transparent',
    rarity: 'epic', // ✅ ДОБАВЛЕНО
    category: 'Практика', // ✅ ДОБАВЛЕНО
  },
  {
    id: 'third_module_complete',
    icon: 'fluent:video-clip-24-filled',
    title: 'CREATOR',
    description: 'Освоено создание вирусных Reels',
    badge: '03',
    color: '#00FF88',
    shadowColor: 'rgba(0, 255, 136, 0.15)',
    gradient: 'from-[#00FF88]/5 via-transparent to-transparent',
    rarity: 'legendary', // ✅ ДОБАВЛЕНО (последний модуль - легендарный!)
    category: 'Мастерство', // ✅ ДОБАВЛЕНО
  }
];

/**
 * Конвертация данных из базы в формат премиальных достижений
 */
function convertToAchievements(
  dbAchievements: TripwireAchievement[]
): Achievement[] {
  // 🔍 DEBUG: Логируем что приходит из БД
  console.log('🔍 [Achievements] DB data:', dbAchievements);
  
  return ACHIEVEMENT_CONFIG.map((config) => {
    const dbAchievement = dbAchievements.find(
      (a) => a.achievement_id === config.id
    );

    // 🔍 DEBUG: Логируем каждое достижение
    console.log(`🔍 [Achievement] ${config.id}:`, {
      found: !!dbAchievement,
      is_completed: dbAchievement?.is_completed,
      unlocked: dbAchievement?.unlocked,
      unlocked_at: dbAchievement?.unlocked_at
    });

    // ✅ FALLBACK: Если достижение в БД и либо is_completed=true, либо unlocked=true
    const isUnlocked = dbAchievement 
      ? (dbAchievement.is_completed || dbAchievement.unlocked || false)
      : false;

    console.log(`✅ [Achievement] ${config.id} final unlocked:`, isUnlocked);

    return {
      id: config.id,
      title: config.title,
      description: config.description,
      icon: config.iconLucide || 'trophy',
      iconify: config.icon,
      rarity: config.rarity,
      category: config.category,
      unlocked: isUnlocked,
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
      )}
    </>
  );
}
