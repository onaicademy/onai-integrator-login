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

// Mock данные для демонстрации (позже заменим на данные из Supabase)
const MOCK_USER_PROGRESS = {
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

export default function Achievements() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [timeUntilReset, setTimeUntilReset] = useState(formatTimeUntilReset());
  
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
      const currentValue = MOCK_USER_PROGRESS[achievement.requirement.type as keyof typeof MOCK_USER_PROGRESS] || 0;
      const isCompleted = currentValue >= achievement.requirement.value;
      
      return {
        ...achievement,
        currentValue,
        isCompleted,
        progress: Math.min((currentValue / achievement.requirement.value) * 100, 100)
      };
    });
  }, []);

  // Статистика
  const stats = useMemo(() => {
    const completed = achievementsWithProgress.filter(a => a.isCompleted).length;
    const total = achievementsWithProgress.length;
    
    // Подсчёт XP с учётом бонуса за "достижения дня"
    const totalXpEarned = achievementsWithProgress
      .filter(a => a.isCompleted)
      .reduce((sum, a) => {
        const isDaily = isDailyAchievement(a.id);
        return sum + getAchievementXP(a, isDaily);
      }, 0);
    
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
  }, [achievementsWithProgress, dailyAchievements]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl">
              <Trophy className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Достижения
              </h1>
              <p className="text-muted-foreground mt-2">
                Отслеживайте свой прогресс и получайте награды
              </p>
            </div>
          </div>

          {/* Overall Progress Badge */}
          <Badge
            variant="outline"
            className="text-lg px-4 py-2 border-primary text-primary"
          >
            {stats.completed} / {stats.total}
          </Badge>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Общий прогресс</p>
                    <h3 className="text-3xl font-bold text-primary">
                      {Math.round(stats.percentage)}%
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.completed} разблокировано
                    </p>
                  </div>
                  <CircularProgress
                    percentage={stats.percentage}
                    size={80}
                    color="#b1ff32"
                    glowColor="rgba(177, 255, 50, 0.4)"
                    showPercentage={false}
                    icon="🎯"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Заработано XP</p>
                    <h3 className="text-3xl font-bold text-yellow-500">
                      {stats.totalXpEarned}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      от достижений
                    </p>
                  </div>
                  <Zap className="h-12 w-12 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">В процессе</p>
                    <h3 className="text-3xl font-bold text-blue-500">
                      {stats.inProgress}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      достижений
                    </p>
                  </div>
                  <TrendingUp className="h-12 w-12 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Редкие</p>
                    <h3 className="text-3xl font-bold text-purple-500">
                      {achievementsWithProgress.filter(a => a.isCompleted && (a.rarity === 'epic' || a.rarity === 'legendary')).length}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      разблокировано
                    </p>
                  </div>
                  <Crown className="h-12 w-12 text-purple-500" />
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
            <Card className="bg-gradient-to-br from-orange-500/10 via-primary/5 to-purple-500/10 border-orange-500/40 relative overflow-hidden">
              {/* Animated glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-primary/10 to-purple-500/5 animate-pulse" />
              
              <CardHeader className="relative z-10">
                <div className="flex items-center gap-3 flex-wrap">
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
                      <Flame className="h-6 w-6 text-orange-500" />
                    </motion.div>
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        Достижения дня
                        <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                          x{DAILY_ACHIEVEMENT_BONUS_MULTIPLIER} XP
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Выполни до полуночи и получи двойной XP! 🔥
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-orange-500/10 border-orange-500 text-orange-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeUntilReset}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div 
                  className="grid grid-cols-1 lg:grid-cols-3 gap-4"
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
                  className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg"
                >
                  <p className="text-sm text-muted-foreground text-center">
                    💡 <span className="font-medium text-orange-500">Совет:</span> Достижения дня обновляются каждый день в полночь. 
                    Выполни их сегодня, чтобы получить <span className="font-bold text-primary">x{DAILY_ACHIEVEMENT_BONUS_MULTIPLIER} XP</span>!
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters and Search */}
        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск достижений..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs by Category */}
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
          <TabsList className="w-full flex-wrap h-auto bg-card/50 p-2 gap-2">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Все ({achievementsWithProgress.filter(a => !a.hidden).length})
            </TabsTrigger>
            {Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, cat]) => {
              const count = achievementsWithProgress.filter(
                a => a.category === key && !a.hidden
              ).length;
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  {cat.name} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            {/* Achievement Grid */}
            {filteredAchievements.length === 0 ? (
              <Card className="bg-card/50">
                <CardContent className="py-12 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Достижения не найдены
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* По редкости */}
                {Object.entries(achievementsByRarity).map(([rarity, achievements]) => {
                  if (achievements.length === 0) return null;
                  
                  const rarityConfig = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG];
                  
                  return (
                    <div key={rarity}>
                      <motion.div 
                        className="flex items-center gap-3 mb-4"
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <div
                          className="w-1 h-6 rounded"
                          style={{ backgroundColor: rarityConfig.color }}
                        />
                        <h2 className="text-xl font-semibold" style={{ color: rarityConfig.color }}>
                          {rarityConfig.name}
                        </h2>
                        <Badge variant="outline" style={{ borderColor: rarityConfig.color, color: rarityConfig.color }}>
                          {achievements.length}
                        </Badge>
                      </motion.div>
                      <motion.div 
                        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
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
      </div>
    </div>
  );
}

