import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lock, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Achievement, RARITY_CONFIG } from '@/lib/achievements-config';

interface AchievementCardProps {
  achievement: Achievement;
  currentValue: number;
  isCompleted: boolean;
  isLocked?: boolean;
  onClick?: () => void;
  showExpandHint?: boolean;
}

export function AchievementCard({
  achievement,
  currentValue,
  isCompleted,
  isLocked = false,
  onClick,
  showExpandHint = true
}: AchievementCardProps) {
  const progress = Math.min((currentValue / achievement.requirement.value) * 100, 100);
  const rarity = RARITY_CONFIG[achievement.rarity];

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <Card
        className={cn(
          'relative overflow-hidden border-2 transition-all duration-300',
          isCompleted && 'bg-gradient-to-br from-primary/5 to-primary/10',
          !isCompleted && !isLocked && 'border-border hover:border-primary/50',
          isLocked && 'opacity-60 grayscale'
        )}
        style={{
          borderColor: isCompleted ? rarity.color : undefined,
          boxShadow: isCompleted ? `0 0 20px ${rarity.glow}` : undefined
        }}
      >
        {/* Rarity glow effect */}
        {isCompleted && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${rarity.color}, transparent 70%)`
            }}
          />
        )}

        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="relative flex-shrink-0">
              <div
                className={cn(
                  'w-16 h-16 rounded-xl flex items-center justify-center text-3xl transition-transform',
                  isCompleted && 'animate-pulse'
                )}
                style={{
                  backgroundColor: isCompleted ? `${rarity.color}20` : 'rgba(255,255,255,0.05)',
                  boxShadow: isCompleted ? `0 0 20px ${rarity.glow}` : 'none'
                }}
              >
                {isLocked ? <Lock className="w-6 h-6 text-muted-foreground" /> : achievement.icon}
              </div>
              
              {/* Completed check */}
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: rarity.color }}
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    {isLocked ? '???' : achievement.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {isLocked ? 'Секретное достижение' : achievement.description}
                  </p>
                </div>
                
                <Badge
                  variant="outline"
                  className="flex-shrink-0"
                  style={{
                    borderColor: rarity.color,
                    color: rarity.color
                  }}
                >
                  {rarity.name}
                </Badge>
              </div>

              {/* Progress */}
              {!isLocked && (
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground truncate flex-1 min-w-0">
                      {achievement.requirement.description}
                    </span>
                    <span className="font-medium text-foreground whitespace-nowrap flex-shrink-0">
                      {currentValue} / {achievement.requirement.value}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* XP Reward */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-1 text-sm flex-1">
                  <span className="text-primary font-semibold">+{achievement.xpReward}</span>
                  <span className="text-muted-foreground">XP</span>
                </div>
                {isCompleted ? (
                  <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30">
                    ✓ Разблокировано
                  </Badge>
                ) : showExpandHint && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors"
                  >
                    <span>Подробнее</span>
                    <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

