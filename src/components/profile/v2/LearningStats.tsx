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
    <div className="bg-[#1a1a24] backdrop-blur-md border border-gray-800 rounded-2xl p-4 sm:p-6 hover:border-[#00FF88]/50 transition-all duration-300">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">Статистика обучения</h3>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00FF88]"></span>
          </span>
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClass = "text-[#00FF88]";
          const borderColor = "border-gray-800";
          
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.03 }}
              className="group relative"
            >
              <div className={`bg-black/40 backdrop-blur-sm border ${borderColor} rounded-xl p-3 sm:p-4 transition-all duration-300 hover:border-[#00FF88]/50`}>
                {/* Icon */}
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-[#00FF88]/20 to-[#00cc88]/10 border border-[#00FF88]/30">
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colorClass}`} />
                  </div>
                </div>

                {/* Value */}
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400">{stat.label}</p>
                </div>

                {/* Optional progress bar */}
                {stat.progress !== undefined && (
                  <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.progress}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className="h-full bg-gradient-to-r from-[#00FF88] to-[#00cc88] rounded-full"
                      style={{
                        boxShadow: "0 0 8px rgba(0, 255, 136, 0.5)",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="absolute inset-0 bg-[#00FF88]/5 rounded-xl blur-xl" />
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        AI-ассистент отслеживает твой прогресс
      </p>
    </div>
  );
};
