import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Settings, Video, Sparkles, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CourseModule {
  id: number;
  title: string;
  subtitle: string;
  progress: number;
  icon: LucideIcon;
  lessons: number;
  duration: string;
}

export const CourseModules = () => {
  const modules: CourseModule[] = [
    {
      id: 1,
      title: "Интегратор 2.0",
      subtitle: "Автоматизация с AI",
      progress: 45,
      icon: Settings,
      lessons: 12,
      duration: "6ч 30м",
    },
    {
      id: 2,
      title: "Creator 1.0",
      subtitle: "Создание контента",
      progress: 20,
      icon: Video,
      lessons: 8,
      duration: "4ч 15м",
    },
    {
      id: 3,
      title: "Future Skills",
      subtitle: "Навыки будущего",
      progress: 5,
      icon: Sparkles,
      lessons: 15,
      duration: "8ч 45м",
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-foreground">Курсы</h3>
        <span className="text-[10px] sm:text-xs text-muted-foreground">{modules.length} модулей</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {modules.map((module, index) => {
          const Icon = module.icon;
          
          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.03, rotateY: 2 }}
              className="group relative"
            >
              <div className="relative bg-[#1B1B1B]/80 backdrop-blur-md border border-border/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 overflow-hidden transition-all duration-500 hover:border-neon/50">
                {/* Background gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-neon/5 via-transparent to-[hsl(var(--cyber-blue))]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Glow effect */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-neon/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10 space-y-3 sm:space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-neon/20 to-neon/5 border border-neon/30 group-hover:border-neon/50 transition-colors">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-neon" />
                    </div>
                    <div className="text-right">
                      <p className="text-xl sm:text-2xl font-bold text-neon">{module.progress}%</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">завершено</p>
                    </div>
                  </div>

                  {/* Module info */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <h4 className="text-sm sm:text-base md:text-lg font-bold text-foreground group-hover:text-neon transition-colors leading-tight">
                      {module.title}
                    </h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{module.subtitle}</p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="h-1 sm:h-1.5 bg-background rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${module.progress}%` }}
                        transition={{ duration: 1, delay: index * 0.2 }}
                        className="h-full bg-gradient-to-r from-neon to-[hsl(var(--cyber-blue))] rounded-full"
                        style={{
                          boxShadow: "0 0 8px hsl(var(--neon) / 0.5)",
                        }}
                      />
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                      <span>{module.lessons} уроков</span>
                      <span>{module.duration}</span>
                    </div>
                  </div>

                  {/* Action button */}
                  <Button
                    variant="outline"
                    className="w-full border-neon/40 hover:bg-neon/10 hover:border-neon group/btn transition-all duration-300 text-xs sm:text-sm"
                  >
                    <span className="truncate">Продолжить курс</span>
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2 group-hover/btn:translate-x-1 transition-transform flex-shrink-0" />
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
