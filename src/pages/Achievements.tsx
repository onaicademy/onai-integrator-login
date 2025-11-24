import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import {
  Trophy,
  Target,
  Zap,
  TrendingUp,
  Award,
  Search,
  Star,
  Crown,
  Sparkles,
  Clock,
  Flame
} from 'lucide-react';
import { CircularProgress } from '@/components/achievements/CircularProgress';
import { AchievementCard } from '@/components/achievements/AchievementCard';
import { AchievementDetailModal } from '@/components/achievements/AchievementDetailModal';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  getAchievementsByCategory,
  getVisibleAchievements,
  type AchievementCategory,
  RARITY_CONFIG
} from '@/lib/achievements-config';
import {
  getDailyAchievements,
  isDailyAchievement,
  getAchievementXP,
  formatTimeUntilReset,
  getTimeUntilNextDailyReset,
  DAILY_ACHIEVEMENT_BONUS_MULTIPLIER
} from '@/lib/daily-achievements';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { isDevelopment } from '@/lib/env-utils';

// Mock данные ТОЛЬКО для DEV (на проде будут реальные данные из БД)
const MOCK_USER_PROGRESS_DEV = {
  lessons_completed: 23,
  modules_completed: 2,
  courses_completed: 0,
  streak_days: 7,
  total_xp: 845,
  level: 5,
  perfect_lessons: 3,
  messages_sent: 15,
  ai_conversations: 8,
  profile_completion: 80,
  videos_watched: 12
};

// Пустой прогресс для нового пользователя (PROD)
const EMPTY_USER_PROGRESS = {
  lessons_completed: 0,
  modules_completed: 0,
  courses_completed: 0,
  streak_days: 0,
  total_xp: 0,
  level: 1,
  perfect_lessons: 0,
  messages_sent: 0,
  ai_conversations: 0,
  profile_completion: 0,
  videos_watched: 0
};

export default function Achievements() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [timeUntilReset, setTimeUntilReset] = useState(formatTimeUntilReset());
  const [userProgress, setUserProgress] = useState(isDevelopment() ? MOCK_USER_PROGRESS_DEV : EMPTY_USER_PROGRESS);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [selectedAchievement, setSelectedAchievement] = useState<{
    achievement: any;
    currentValue: number;
    isCompleted: boolean;
    isLocked?: boolean;
    isDaily?: boolean;
    bonusXP?: number;
  } | null>(null);
  
  // Загрузка реального прогресса пользователя из БД
  useEffect(() => {
    loadUserProgress();
  }, []);
  
  async function loadUserProgress() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingProgress(false);
        return;
      }

      // Загружаем статистику пользователя
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Загружаем профиль пользователя из ПРАВИЛЬНОЙ таблицы
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('xp, level, current_streak, longest_streak')
        .eq('id', user.id)
        .single();

      if (statsData && profileData) {
        setUserProgress({
          lessons_completed: statsData.lessons_completed || 0,
          modules_completed: 0, // TODO: добавить в БД
          courses_completed: statsData.courses_completed || 0,
          streak_days: profileData.current_streak || 0,
          total_xp: profileData.xp || 0,
          level: profileData.level || 1,
          perfect_lessons: 0, // TODO: добавить логику
          messages_sent: 0, // TODO: добавить в БД
          ai_conversations: 0, // TODO: добавить в БД
          profile_completion: 0, // TODO: добавить логику
          videos_watched: 0, // TODO: добавить в БД
        });
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
    } finally {
      setIsLoadingProgress(false);
    }
  }
  
  // Обновляем таймер каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilReset(formatTimeUntilReset());
    }, 60000); // каждую минуту
    
    return () => clearInterval(interval);
  }, []);
  
  // Достижения дня
  const dailyAchievements = useMemo(() => getDailyAchievements(), []);
  
  // Расчёт прогресса для каждого достижения
  const achievementsWithProgress = useMemo(() => {
    return ACHIEVEMENTS.map(achievement => {
      const currentValue = userProgress[achievement.requirement.type as keyof typeof userProgress] || 0;
      const isCompleted = currentValue >= achievement.requirement.value;
      
      return {
        ...achievement,
        currentValue,
        isCompleted,
        progress: Math.min((currentValue / achievement.requirement.value) * 100, 100)
      };
    });
  }, [userProgress]);

  // Статистика
  const stats = useMemo(() => {
    const completed = achievementsWithProgress.filter(a => a.isCompleted).length;
    const total = achievementsWithProgress.length;
    
    // ИСПРАВЛЕНО: Показываем ОБЩИЙ XP пользователя из профиля, а не только из достижений
    const totalXpEarned = userProgress.total_xp;
    
    const inProgress = achievementsWithProgress.filter(
      a => !a.isCompleted && a.currentValue > 0
    ).length;

    // Достижения дня с прогрессом
    const dailyWithProgress = dailyAchievements.map(daily => {
      const withProgress = achievementsWithProgress.find(a => a.id === daily.id);
      return withProgress || {
        ...daily,
        currentValue: 0,
        isCompleted: false,
        progress: 0
      };
    });

    return {
      completed,
      total,
      percentage: (completed / total) * 100,
      totalXpEarned,
      inProgress,
      dailyWithProgress
    };
  }, [achievementsWithProgress, dailyAchievements, userProgress.total_xp]);

  // Фильтрация достижений
  const filteredAchievements = useMemo(() => {
    let filtered = achievementsWithProgress.filter(a => !a.hidden);

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.title.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      // Сначала завершённые, потом по прогрессу
      if (a.isCompleted && !b.isCompleted) return -1;
      if (!a.isCompleted && b.isCompleted) return 1;
      return b.progress - a.progress;
    });
  }, [achievementsWithProgress, selectedCategory, searchQuery]);

  // Группировка по редкости
  const achievementsByRarity = useMemo(() => {
    const groups = {
      legendary: filteredAchievements.filter(a => a.rarity === 'legendary'),
      epic: filteredAchievements.filter(a => a.rarity === 'epic'),
      rare: filteredAchievements.filter(a => a.rarity === 'rare'),
      common: filteredAchievements.filter(a => a.rarity === 'common')
    };
    return groups;
  }, [filteredAchievements]);

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-[#00ff00]/20 to-[#00cc00]/10 rounded-xl border border-[#00ff00]/30">
              <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-[#00ff00]" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Достижения
              </h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                Отслеживайте свой прогресс и получайте награды
              </p>
            </div>
          </div>

          {/* Overall Progress Badge */}
          <Badge
            variant="outline"
            className="text-base sm:text-lg px-3 sm:px-4 py-1.5 sm:py-2 border-[#00ff00] text-[#00ff00] bg-[#00ff00]/10"
          >
            {stats.completed} / {stats.total}
          </Badge>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00ff00]/50 transition-all">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="w-full sm:w-auto">
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">Общий прогресс</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-[#00ff00]">
                      {Math.round(stats.percentage)}%
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.completed} разблокировано
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <CircularProgress
                      percentage={stats.percentage}
                      size={60}
                      color="#00ff00"
                      glowColor="rgba(0, 255, 0, 0.4)"
                      showPercentage={false}
                      icon="🎯"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="bg-[#1a1a24] border-gray-800 hover:border-yellow-500/50 transition-all">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">XP</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-yellow-500">
                      {stats.totalXpEarned}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      заработано
                    </p>
                  </div>
                  <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="bg-[#1a1a24] border-gray-800 hover:border-blue-500/50 transition-all">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">В процессе</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-blue-500">
                      {stats.inProgress}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      активных
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="bg-[#1a1a24] border-gray-800 hover:border-purple-500/50 transition-all">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">Редкие</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-purple-500">
                      {achievementsWithProgress.filter(a => a.isCompleted && (a.rarity === 'epic' || a.rarity === 'legendary')).length}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      получено
                    </p>
                  </div>
                  <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Достижения дня */}
        {stats.dailyWithProgress.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-[#1a1a24] border-orange-500/50 relative overflow-hidden hover:border-orange-500 transition-all">
              {/* Animated glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-orange-500/10 to-orange-500/5 animate-pulse" />
              
              <CardHeader className="relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-1">
                    <motion.div
                      animate={{ 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3
                      }}
                    >
                      <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
                    </motion.div>
                    <div className="flex-1">
                      <CardTitle className="text-lg sm:text-xl flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <span className="text-white">Достижения дня</span>
                        <Badge className="bg-orange-500 text-white hover:bg-orange-600 text-xs sm:text-sm">
                          x{DAILY_ACHIEVEMENT_BONUS_MULTIPLIER} XP
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs sm:text-sm text-gray-400">
                        Выполни до полуночи и получи двойной XP! 🔥
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-orange-500/10 border-orange-500 text-orange-500 flex items-center gap-1 text-xs sm:text-sm">
                    <Clock className="h-3 w-3" />
                    {timeUntilReset}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.15,
                        delayChildren: 0.6
                      }
                    }
                  }}
                >
                  {stats.dailyWithProgress.map((achievement, index) => {
                    const bonusXP = achievement.xpReward * (DAILY_ACHIEVEMENT_BONUS_MULTIPLIER - 1);
                    
                    return (
                      <motion.div 
                        key={achievement.id} 
                        className="relative"
                        variants={{
                          hidden: { 
                            opacity: 0, 
                            x: -50,
                            scale: 0.8
                          },
                          visible: { 
                            opacity: 1, 
                            x: 0,
                            scale: 1,
                            transition: {
                              type: "spring",
                              stiffness: 100,
                              damping: 15
                            }
                          }
                        }}
                      >
                        {/* Обёртка с дополнительным свечением */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-lg blur-xl" />
                          <div className="relative">
                            <AchievementCard
                              achievement={achievement}
                              currentValue={achievement.currentValue}
                              isCompleted={achievement.isCompleted}
                              onClick={() => setSelectedAchievement({
                                achievement,
                                currentValue: achievement.currentValue,
                                isCompleted: achievement.isCompleted,
                                isDaily: true,
                                bonusXP: achievement.xpReward * (DAILY_ACHIEVEMENT_BONUS_MULTIPLIER - 1)
                              })}
                            />
                          </div>
                        </div>
                        
                        {/* Бейдж с бонусным XP */}
                        <motion.div 
                          className="absolute -top-2 -right-2 z-10"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.8 + index * 0.1, type: "spring", stiffness: 200 }}
                        >
                          <Badge className="bg-orange-500 text-white shadow-lg border-2 border-orange-400">
                            <Zap className="h-3 w-3 mr-1" />
                            +{bonusXP} бонус
                          </Badge>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </motion.div>
                
                {/* Подсказка */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="mt-4 sm:mt-6 p-3 sm:p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg"
                >
                  <p className="text-xs sm:text-sm text-gray-400 text-center">
                    💡 <span className="font-medium text-orange-500">Совет:</span> Достижения дня обновляются каждый день в полночь. 
                    Выполни их сегодня, чтобы получить <span className="font-bold text-[#00ff00]">x{DAILY_ACHIEVEMENT_BONUS_MULTIPLIER} XP</span>!
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters and Search */}
        <Card className="bg-[#1a1a24] border-gray-800">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск достижений..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-black/40 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00ff00]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs by Category */}
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
          <TabsList className="w-full flex-wrap h-auto bg-[#1a1a24] border border-gray-800 p-2 gap-2">
            <TabsTrigger 
              value="all" 
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-[#00ff00] data-[state=active]:text-black text-white"
            >
              <Award className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Все</span> ({achievementsWithProgress.filter(a => !a.hidden).length})
            </TabsTrigger>
            {Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, cat]) => {
              const count = achievementsWithProgress.filter(
                a => a.category === key && !a.hidden
              ).length;
              return (
                <TabsTrigger 
                  key={key} 
                  value={key} 
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-[#00ff00] data-[state=active]:text-black text-white"
                >
                  <span>{cat.icon}</span>
                  <span className="hidden sm:inline">{cat.name}</span> ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-4 sm:mt-6">
            {/* Achievement Grid */}
            {filteredAchievements.length === 0 ? (
              <Card className="bg-[#1a1a24] border-gray-800">
                <CardContent className="py-8 sm:py-12 text-center">
                  <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-sm sm:text-base">
                    Достижения не найдены
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                {/* По редкости */}
                {Object.entries(achievementsByRarity).map(([rarity, achievements]) => {
                  if (achievements.length === 0) return null;
                  
                  const rarityConfig = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG];
                  
                  return (
                    <div key={rarity}>
                      <motion.div 
                        className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4"
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <div
                          className="w-1 h-5 sm:h-6 rounded"
                          style={{ backgroundColor: rarityConfig.color }}
                        />
                        <h2 className="text-lg sm:text-xl font-semibold" style={{ color: rarityConfig.color }}>
                          {rarityConfig.name}
                        </h2>
                        <Badge variant="outline" style={{ borderColor: rarityConfig.color, color: rarityConfig.color }} className="text-xs sm:text-sm">
                          {achievements.length}
                        </Badge>
                      </motion.div>
                      <motion.div 
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
                        initial="hidden"
                        animate="visible"
                        variants={{
                          visible: {
                            transition: {
                              staggerChildren: 0.08
                            }
                          }
                        }}
                      >
                        {achievements.map((achievement, idx) => (
                          <motion.div
                            key={achievement.id}
                            variants={{
                              hidden: { 
                                opacity: 0, 
                                y: 20,
                                scale: 0.95
                              },
                              visible: { 
                                opacity: 1, 
                                y: 0,
                                scale: 1,
                                transition: {
                                  type: "spring",
                                  stiffness: 100,
                                  damping: 12
                                }
                              }
                            }}
                          >
                            <AchievementCard
                              achievement={achievement}
                              currentValue={achievement.currentValue}
                              isCompleted={achievement.isCompleted}
                              onClick={() => setSelectedAchievement({
                                achievement,
                                currentValue: achievement.currentValue,
                                isCompleted: achievement.isCompleted,
                                isDaily: isDailyAchievement(achievement.id),
                                bonusXP: isDailyAchievement(achievement.id) 
                                  ? achievement.xpReward * (DAILY_ACHIEVEMENT_BONUS_MULTIPLIER - 1) 
                                  : 0
                              })}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Achievement Detail Modal */}
        {selectedAchievement && (
          <AchievementDetailModal
            achievement={selectedAchievement.achievement}
            currentValue={selectedAchievement.currentValue}
            isCompleted={selectedAchievement.isCompleted}
            isLocked={selectedAchievement.isLocked}
            isDaily={selectedAchievement.isDaily}
            bonusXP={selectedAchievement.bonusXP}
            open={!!selectedAchievement}
            onOpenChange={(open) => !open && setSelectedAchievement(null)}
          />
        )}
      </div>
    </div>
  );
}

