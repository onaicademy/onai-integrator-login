import { motion } from "framer-motion";
import { Bot, Code, Puzzle, MessageCircle, TrendingUp, Zap, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  completed: boolean;
}

export const Achievements = () => {
  const achievements: Achievement[] = [
    { 
      id: 1, 
      title: "Интеллект", 
      description: "Пройдены первые 5 уроков",
      icon: Bot, 
      completed: true 
    },
    { 
      id: 2, 
      title: "Скорость", 
      description: "Курс пройден за 7 дней",
      icon: Code, 
      completed: true 
    },
    { 
      id: 3, 
      title: "Непрерывность", 
      description: "Streak 7+ дней",
      icon: Flame, 
      completed: true 
    },
    { 
      id: 4, 
      title: "Мастер", 
      description: "Все уроки пройдены на 100%",
      icon: MessageCircle, 
      completed: false 
    },
    { 
      id: 5, 
      title: "Новатор", 
      description: "Создан первый AI-проект",
      icon: TrendingUp, 
      completed: true 
    },
    { 
      id: 6, 
      title: "Энергия", 
      description: "3 урока за один день",
      icon: Zap, 
      completed: false 
    },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-foreground">Достижения</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {achievements.map((achievement, index) => {
            const Icon = achievement.icon;
            
            return (
              <Tooltip key={achievement.id}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -8, scale: 1.05 }}
                    className="group relative cursor-pointer"
                  >
                    <div
                      className={`relative bg-card/70 backdrop-blur-md border rounded-2xl p-4 transition-all duration-300 ${
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
                        <motion.div
                          className={`p-3 rounded-xl ${
                            achievement.completed
                              ? "bg-neon/10 border border-neon/30"
                              : "bg-secondary/50"
                          }`}
                          animate={achievement.completed ? {
                            rotate: [0, 5, -5, 0],
                          } : {}}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          <Icon
                            className={`w-6 h-6 ${
                              achievement.completed ? "text-neon" : "text-muted-foreground"
                            }`}
                          />
                        </motion.div>
                        <p
                          className={`text-xs text-center font-medium ${
                            achievement.completed ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {achievement.title}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{achievement.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};
