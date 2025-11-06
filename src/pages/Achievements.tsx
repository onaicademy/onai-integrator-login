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
  Sparkles
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
    const totalXpEarned = achievementsWithProgress
      .filter(a => a.isCompleted)
      .reduce((sum, a) => sum + a.xpReward, 0);
    
    const inProgress = achievementsWithProgress.filter(
      a => !a.isCompleted && a.currentValue > 0
    ).length;

    const nearest = achievementsWithProgress
      .filter(a => !a.isCompleted && !a.hidden)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);

    return {
      completed,
      total,
      percentage: (completed / total) * 100,
      totalXpEarned,
      inProgress,
      nearest
    };
  }, [achievementsWithProgress]);

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

        {/* Достижения дня - ближайшие к разблокировке */}
        {stats.nearest.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Target className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <CardTitle className="text-xl">Достижения дня</CardTitle>
                    <CardDescription>
                      Ближайшие к разблокировке - сосредоточьтесь на них!
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 border-primary text-primary">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Рекомендуем
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {stats.nearest.map((achievement, index) => (
                    <div key={achievement.id} className="relative">
                      <AchievementCard
                        achievement={achievement}
                        currentValue={achievement.currentValue}
                        isCompleted={achievement.isCompleted}
                      />
                      {index === 0 && (
                        <div className="absolute -top-2 -right-2">
                          <Badge className="bg-primary text-primary-foreground shadow-lg">
                            <Star className="h-3 w-3 mr-1" />
                            Почти готово!
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                      <div className="flex items-center gap-3 mb-4">
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
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {achievements.map(achievement => (
                          <AchievementCard
                            key={achievement.id}
                            achievement={achievement}
                            currentValue={achievement.currentValue}
                            isCompleted={achievement.isCompleted}
                          />
                        ))}
                      </div>
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

