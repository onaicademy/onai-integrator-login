import { motion } from "framer-motion";
import { Bot, Code, Puzzle, MessageCircle, TrendingUp, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  completed: boolean;
  rarity: "common" | "rare" | "epic";
}

export const AchievementsGrid = () => {
  const achievements: Achievement[] = [
    { 
      id: 1, 
      title: "Первый бот", 
      description: "Создал первого бота",
      icon: Bot, 
      completed: true,
      rarity: "common"
    },
    { 
      id: 2, 
      title: "API Master", 
      description: "Подключил внешний API",
      icon: Code, 
      completed: true,
      rarity: "rare"
    },
    { 
      id: 3, 
      title: "Модульность", 
      description: "Разблокировал новый модуль",
      icon: Puzzle, 
      completed: true,
      rarity: "common"
    },
    { 
      id: 4, 
      title: "Обратная связь", 
      description: "Получил отзыв куратора",
      icon: MessageCircle, 
      completed: true,
      rarity: "rare"
    },
    { 
      id: 5, 
      title: "Прогресс", 
      description: "Достиг уровня 2",
      icon: TrendingUp, 
      completed: true,
      rarity: "epic"
    },
    { 
      id: 6, 
      title: "Стрик", 
      description: "Прошёл 3 урока подряд",
      icon: Flame, 
      completed: false,
      rarity: "rare"
    },
  ];

  const getRarityColors = (rarity: Achievement["rarity"]) => {
    switch (rarity) {
      case "epic":
        return {
          border: "border-purple-500/50",
          bg: "from-purple-500/20 to-purple-500/5",
          glow: "bg-purple-500/20",
          text: "text-purple-400",
        };
      case "rare":
        return {
          border: "border-[hsl(var(--cyber-blue))]/50",
          bg: "from-[hsl(var(--cyber-blue))]/20 to-[hsl(var(--cyber-blue))]/5",
          glow: "bg-[hsl(var(--cyber-blue))]/20",
          text: "text-[hsl(var(--cyber-blue))]",
        };
      default:
        return {
          border: "border-neon/50",
          bg: "from-neon/20 to-neon/5",
          glow: "bg-neon/20",
          text: "text-neon",
        };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-foreground">Достижения</h3>
        <span className="text-xs text-muted-foreground">
          {achievements.filter(a => a.completed).length} из {achievements.length}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {achievements.map((achievement, index) => {
          const Icon = achievement.icon;
          const colors = getRarityColors(achievement.rarity);
          
          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -8, scale: 1.05 }}
              className="group relative"
            >
              <div
                className={`relative bg-[#1B1B1B]/80 backdrop-blur-md border rounded-2xl p-4 transition-all duration-300 ${
                  achievement.completed
                    ? `${colors.border} hover:${colors.border.replace("/50", "/80")}`
                    : "border-border/30 opacity-50 hover:opacity-70"
                }`}
              >
                {/* Glow effect on hover */}
                {achievement.completed && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className={`absolute inset-0 ${colors.glow} rounded-2xl blur-xl`} />
                  </div>
                )}

                <div className="relative z-10 flex flex-col items-center space-y-3">
                  {/* Icon */}
                  <div
                    className={`p-3 rounded-xl border transition-all duration-300 ${
                      achievement.completed
                        ? `bg-gradient-to-br ${colors.bg} ${colors.border}`
                        : "bg-secondary/50 border-border/30"
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        achievement.completed ? colors.text : "text-muted-foreground"
                      }`}
                    />
                  </div>

                  {/* Title */}
                  <div className="text-center space-y-0.5">
                    <p
                      className={`text-xs font-bold ${
                        achievement.completed ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {achievement.title}
                    </p>
                    {achievement.completed && (
                      <span className={`text-[10px] ${colors.text} font-medium uppercase tracking-wide`}>
                        {achievement.rarity}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-card border border-border/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-20 backdrop-blur-md">
                  <p className="text-xs text-foreground font-medium">{achievement.title}</p>
                  <p className="text-[10px] text-muted-foreground">{achievement.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
