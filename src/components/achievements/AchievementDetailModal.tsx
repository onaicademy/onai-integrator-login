import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Check, 
  Lock, 
  Zap, 
  Target, 
  TrendingUp,
  Sparkles,
  Flame
} from 'lucide-react';
import { Achievement, RARITY_CONFIG } from '@/lib/achievements-config';
import { CircularProgress } from './CircularProgress';
import { cn } from '@/lib/utils';

interface AchievementDetailModalProps {
  achievement: Achievement;
  currentValue: number;
  isCompleted: boolean;
  isLocked?: boolean;
  isDaily?: boolean;
  bonusXP?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AchievementDetailModal({
  achievement,
  currentValue,
  isCompleted,
  isLocked = false,
  isDaily = false,
  bonusXP = 0,
  open,
  onOpenChange
}: AchievementDetailModalProps) {
  const progress = Math.min((currentValue / achievement.requirement.value) * 100, 100);
  const rarity = RARITY_CONFIG[achievement.rarity];
  const totalXP = achievement.xpReward + bonusXP;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header с иконкой */}
          <div className="relative mb-6">
            {/* Background glow */}
            <div 
              className="absolute inset-0 opacity-20 blur-3xl"
              style={{ 
                background: `radial-gradient(circle, ${rarity.color}, transparent 70%)`
              }}
            />
            
            <div className="relative flex items-start gap-6">
              {/* Большая иконка */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="relative flex-shrink-0"
              >
                <div
                  className={cn(
                    "w-24 h-24 rounded-2xl flex items-center justify-center text-5xl",
                    isCompleted && "animate-pulse"
                  )}
                  style={{
                    backgroundColor: isCompleted ? `${rarity.color}20` : 'rgba(255,255,255,0.05)',
                    boxShadow: isCompleted ? `0 0 40px ${rarity.glow}` : 'none'
                  }}
                >
                  {isLocked ? <Lock className="w-12 h-12 text-muted-foreground" /> : achievement.icon}
                </div>
                
                {/* Status badge */}
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: rarity.color }}
                  >
                    <Check className="w-5 h-5 text-white" />
                  </motion.div>
                )}
              </motion.div>

              {/* Title and badges */}
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-3xl font-bold mb-2">
                  {isLocked ? '???' : achievement.title}
                </DialogTitle>
                
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: rarity.color,
                      color: rarity.color
                    }}
                  >
                    {rarity.name}
                  </Badge>
                  
                  {isDaily && (
                    <Badge className="bg-orange-500 text-white">
                      <Flame className="h-3 w-3 mr-1" />
                      Достижение дня
                    </Badge>
                  )}
                  
                  {isCompleted && (
                    <Badge className="bg-primary/20 text-primary">
                      <Check className="h-3 w-3 mr-1" />
                      Разблокировано
                    </Badge>
                  )}
                </div>

                {/* XP Reward */}
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold text-primary">+{totalXP}</span>
                  <span className="text-muted-foreground">XP</span>
                  {bonusXP > 0 && (
                    <Badge variant="outline" className="bg-orange-500/10 border-orange-500 text-orange-500">
                      +{bonusXP} бонус
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Description */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Описание
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {isLocked 
                  ? 'Это секретное достижение. Продолжай исследовать платформу, чтобы разблокировать его!'
                  : achievement.description
                }
              </p>
            </div>

            {/* Progress Section */}
            {!isLocked && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Прогресс
                </h3>
                
                <div className="flex items-center gap-6 mb-4">
                  <CircularProgress
                    percentage={progress}
                    size={100}
                    color={rarity.color}
                    glowColor={rarity.glow}
                    icon={achievement.icon}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {achievement.requirement.description}
                      </span>
                      <span className="font-bold text-lg">
                        {currentValue} / {achievement.requirement.value}
                      </span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    
                    {!isCompleted && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Осталось: <span className="font-medium text-foreground">
                          {achievement.requirement.value - currentValue}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Motivational Section */}
            {!isCompleted && !isLocked && (
              <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Как получить
                </h3>
                <p className="text-sm text-muted-foreground">
                  {getMotivationalTip(achievement)}
                </p>
              </div>
            )}

            {/* Completion Message */}
            {isCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-lg p-6 text-center"
              >
                <Check className="h-12 w-12 text-primary mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-2">Поздравляем! 🎉</h3>
                <p className="text-muted-foreground">
                  Вы разблокировали это достижение и получили <span className="font-bold text-primary">{totalXP} XP</span>!
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

// Мотивационные советы для достижений
function getMotivationalTip(achievement: Achievement): string {
  const tips: Record<string, string> = {
    'first-lesson': '🎯 Начните с любого урока! Выберите тему, которая вас интересует, и сделайте первый шаг.',
    'lessons-5': '📚 Продолжайте в том же духе! Каждый урок приближает вас к цели.',
    'lessons-10': '💪 Вы уже на правильном пути! Сохраняйте темп и изучайте новые темы.',
    'streak-3': '🔥 Учитесь каждый день! Даже 10 минут в день создают привычку.',
    'streak-7': '⭐ Целая неделя! Войдите в систему и завершите хотя бы один урок каждый день.',
    'perfect-lesson': '💯 Внимательно изучите материал перед тестированием. Вы можете это сделать!',
    'speed-1': '⚡ Попробуйте короткие уроки! Сосредоточьтесь и завершите быстро.',
    'marathon': '🏃 Выделите время для интенсивного обучения. Погрузитесь в материал!',
    'first-message': '💬 Не стесняйтесь! Задайте вопрос или поделитесь мыслями в чате.',
    'ai-chat-10': '🤖 AI-куратор всегда готов помочь! Общайтесь и получайте персональные советы.',
    'profile-complete': '👤 Заполните все поля профиля, чтобы получить персонализированный опыт.'
  };

  return tips[achievement.id] || 
    `✨ Выполните требование "${achievement.requirement.description}" для получения этого достижения!`;
}

