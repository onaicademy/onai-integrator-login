import { motion } from "framer-motion";
import { Bot, Code, Puzzle, MessageCircle, TrendingUp, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Achievement {
  id: number;
  title: string;
  icon: LucideIcon;
  completed: boolean;
}

export const Achievements = () => {
  const achievements: Achievement[] = [
    { id: 1, title: "Создал первого бота", icon: Bot, completed: true },
    { id: 2, title: "Подключил API", icon: Code, completed: true },
    { id: 3, title: "Разблокировал модуль", icon: Puzzle, completed: true },
    { id: 4, title: "Получил отзыв", icon: MessageCircle, completed: true },
    { id: 5, title: "Достиг уровня 2", icon: TrendingUp, completed: true },
    { id: 6, title: "Прошёл 3 урока", icon: Zap, completed: false },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-foreground">Achievements</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {achievements.map((achievement, index) => {
          const Icon = achievement.icon;
          
          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -8, scale: 1.1 }}
              className="group relative"
            >
              <div
                className={`relative bg-[#111111]/70 backdrop-blur-md border rounded-2xl p-4 transition-all duration-300 ${
                  achievement.completed
                    ? "border-neon/50 hover:border-neon/80"
                    : "border-border/30 hover:border-border/50 opacity-50"
                }`}
                style={{
                  boxShadow: achievement.completed
                    ? "0 0 20px rgba(177, 255, 50, 0.1)"
                    : "none",
                }}
              >
                {/* Glow on hover */}
                {achievement.completed && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-neon/10 rounded-2xl blur-xl" />
                  </div>
                )}

                <div className="relative z-10 flex flex-col items-center justify-center space-y-2">
                  <div
                    className={`p-3 rounded-xl ${
                      achievement.completed
                        ? "bg-neon/10 border border-neon/30"
                        : "bg-secondary/50"
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        achievement.completed ? "text-neon" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <p
                    className={`text-xs text-center font-medium ${
                      achievement.completed ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {achievement.title}
                  </p>
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-card border border-neon/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                  <p className="text-xs text-foreground">{achievement.title}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
