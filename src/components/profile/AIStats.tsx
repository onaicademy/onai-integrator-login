import { motion } from "framer-motion";
import { Activity, Zap, TrendingUp } from "lucide-react";

export const AIStats = () => {
  const stats = [
    { label: "XP", value: "1240", icon: TrendingUp, color: "neon" },
    { label: "Энергия", value: "78%", icon: Zap, color: "cyber-blue" },
    { label: "Статус", value: "Онлайн", icon: Activity, color: "neon" },
  ];

  return (
    <div className="relative bg-[#111111]/70 backdrop-blur-md border border-border/30 rounded-2xl p-6 overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(195,100%,50%)]/10 rounded-full blur-3xl" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">AI Statistics</h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-neon rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.05 }}
                className="relative group"
              >
                <div className="relative bg-secondary/50 backdrop-blur-sm border border-border/30 rounded-xl p-4 space-y-2 transition-all duration-300 group-hover:border-neon/50">
                  <div className="flex justify-between items-start">
                    <Icon 
                      className={`w-5 h-5 text-${stat.color}`}
                      style={{ color: `hsl(var(--${stat.color}))` }}
                    />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          AI-ассистент отслеживает твой прогресс
        </p>
      </div>
    </div>
  );
};
