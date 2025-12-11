/**
 * 🎯 TRIPWIRE ACHIEVEMENTS TYPES
 * Типы для премиальной системы достижений
 */

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'learning' | 'speed' | 'consistency' | 'community';
export type AchievementIcon = 'trophy' | 'zap' | 'target' | 'flame' | 'award' | 'star';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: AchievementIcon;
  iconify?: string; // Для кастомных iconify иконок
  rarity: AchievementRarity;
  category: AchievementCategory;
  unlocked: boolean;
  unlockedAt?: string | null;
  progress?: {
    current: number;
    max: number;
  };
  color?: string;
  shadowColor?: string;
  gradient?: string;
}

export interface AchievementConfig {
  id: string;
  icon: string; // iconify icon
  iconLucide?: AchievementIcon; // lucide icon fallback
  title: string;
  description: string;
  color: string;
  shadowColor: string;
  gradient: string;
  rarity: AchievementRarity;
  category: AchievementCategory;
}



