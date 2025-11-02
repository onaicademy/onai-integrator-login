import { motion } from "framer-motion";
import { TrendingUp, Zap, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Stat {
  label: string;
  value: string;
  icon: LucideIcon;
  color: "neon" | "cyber-blue" | "foreground";
  progress?: number;
}

export const LearningStats = () => {
  const stats: Stat[] = [
    { label: "Всего XP", value: "1,240", icon: TrendingUp, color: "neon", progress: 62 },
    { label: "Энергия", value: "78%", icon: Zap, color: "cyber-blue", progress: 78 },
    { label: "Статус", value: "Онлайн", icon: Activity, color: "neon" },
  ];

  return (
    <div className="bg-[#1B1B1B]/80 backdrop-blur-md border border-border/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-foreground">Статистика обучения</h3>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-neon"></span>
          </span>
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClass = stat.color === "neon" ? "text-neon" : stat.color === "cyber-blue" ? "text-[hsl(var(--cyber-blue))]" : "text-foreground";
          const borderColor = stat.color === "neon" ? "border-neon/30" : stat.color === "cyber-blue" ? "border-[hsl(var(--cyber-blue))]/30" : "border-border/30";
          
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.03 }}
              className="group relative"
            >
              <div className={`bg-secondary/50 backdrop-blur-sm border ${borderColor} rounded-xl p-4 transition-all duration-300 hover:bg-secondary/70`}>
                {/* Icon */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color === "neon" ? "from-neon/20 to-neon/5" : "from-[hsl(var(--cyber-blue))]/20 to-[hsl(var(--cyber-blue))]/5"}`}>
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                  </div>
                </div>

                {/* Value */}
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>

                {/* Optional progress bar */}
                {stat.progress !== undefined && (
                  <div className="mt-3 h-1 bg-background rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.progress}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className={`h-full ${stat.color === "neon" ? "bg-neon" : "bg-[hsl(var(--cyber-blue))]"} rounded-full`}
                      style={{
                        boxShadow: `0 0 8px ${stat.color === "neon" ? "hsl(var(--neon) / 0.5)" : "hsl(var(--cyber-blue) / 0.5)"}`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className={`absolute inset-0 ${stat.color === "neon" ? "bg-neon/5" : "bg-[hsl(var(--cyber-blue))]/5"} rounded-xl blur-xl`} />
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        AI-ассистент отслеживает твой прогресс
      </p>
    </div>
  );
};
