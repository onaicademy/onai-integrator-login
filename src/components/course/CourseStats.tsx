import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Package } from "lucide-react";

interface CourseStatsProps {
  courseProgress: number;
  studyTime: string;
  modulesCount: string;
}

export const CourseStats = ({ courseProgress, studyTime, modulesCount }: CourseStatsProps) => {
  const stats = [
    {
      icon: BookOpen,
      label: "Прогресс по курсу",
      value: `${courseProgress}%`,
      color: "neon",
      delay: 0.1,
      showProgress: true
    },
    {
      icon: Clock,
      label: "Время обучения",
      value: studyTime,
      color: "cyber-blue",
      delay: 0.2,
      showProgress: false
    },
    {
      icon: Package,
      label: "Модулей",
      value: modulesCount,
      color: "neon",
      delay: 0.3,
      showProgress: false
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="region" aria-label="Статистика курса">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const colorClass = stat.color === "neon" ? "text-neon" : "text-[hsl(var(--cyber-blue))]";
        const bgClass = stat.color === "neon" ? "bg-neon/10" : "bg-[hsl(var(--cyber-blue))]/10";
        const borderClass = stat.color === "neon" ? "border-neon/30" : "border-[hsl(var(--cyber-blue))]/30";
        const hoverBorderClass = stat.color === "neon" ? "hover:border-neon/50" : "hover:border-[hsl(var(--cyber-blue))]/50";

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: stat.delay }}
            className={`bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 ${hoverBorderClass} transition-all group`}
            role="article"
            aria-label={`${stat.label}: ${stat.value}`}
          >
            <div className="flex items-center gap-4 mb-4">
              <motion.div 
                className={`p-3 rounded-xl ${bgClass} border ${borderClass} group-hover:scale-110 transition-transform`}
                style={{
                  transform: "perspective(1000px) rotateX(8deg) rotateY(-8deg)",
                  boxShadow: stat.color === "neon" 
                    ? "0 8px 20px -4px rgba(177, 255, 50, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)"
                    : "0 8px 20px -4px rgba(0, 200, 255, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)"
                }}
                whileHover={{
                  rotateY: 0,
                  rotateX: 0,
                  boxShadow: stat.color === "neon"
                    ? "0 12px 30px -4px rgba(177, 255, 50, 0.5), inset 0 2px 0 0 rgba(255, 255, 255, 0.2)"
                    : "0 12px 30px -4px rgba(0, 200, 255, 0.5), inset 0 2px 0 0 rgba(255, 255, 255, 0.2)"
                }}
              >
                <Icon className={`w-6 h-6 ${colorClass} drop-shadow-[0_0_8px_currentColor]`} aria-hidden="true" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className={`text-3xl font-bold ${colorClass}`} aria-live="polite">
                  {stat.value}
                </p>
              </div>
            </div>
            {stat.showProgress && (
              <Progress 
                value={courseProgress} 
                className="h-2" 
                aria-label={`Общий прогресс: ${courseProgress}%`}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
