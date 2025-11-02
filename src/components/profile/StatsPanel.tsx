import { motion } from "framer-motion";
import { CheckCircle2, Clock, Flame } from "lucide-react";
import { useEffect, useState } from "react";

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  delay: number;
}

const StatItem = ({ icon, label, value, color, delay }: StatItemProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="flex items-center gap-3 p-4 rounded-xl bg-card/40 border border-border/30 hover:border-border/60 transition-colors"
  >
    <div className={`p-2 rounded-lg ${color}`}>
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  </motion.div>
);

export const StatsPanel = () => {
  const [stats, setStats] = useState({
    completedLessons: 0,
    totalLessons: 0,
    hoursLearned: 0,
    streak: 0,
  });

  useEffect(() => {
    // Load from localStorage or API
    const completed = parseInt(localStorage.getItem("completedLessons") || "0");
    const total = parseInt(localStorage.getItem("totalLessons") || "10");
    const hours = parseInt(localStorage.getItem("hoursLearned") || "0");
    const streak = parseInt(localStorage.getItem("streak") || "0");
    
    setStats({
      completedLessons: completed,
      totalLessons: total,
      hoursLearned: hours,
      streak,
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-3"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">Статистика</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatItem
          icon={<CheckCircle2 className="w-5 h-5 text-neon" />}
          label="Уроки"
          value={`${stats.completedLessons} / ${stats.totalLessons}`}
          color="bg-neon/10"
          delay={0.1}
        />
        
        <StatItem
          icon={<Clock className="w-5 h-5 text-[hsl(var(--cyber-blue))]" />}
          label="Время в обучении"
          value={`${stats.hoursLearned} ч`}
          color="bg-[hsl(var(--cyber-blue))]/10"
          delay={0.2}
        />
        
        <StatItem
          icon={
            <motion.div
              animate={{
                scale: stats.streak > 0 ? [1, 1.2, 1] : 1,
              }}
              transition={{
                duration: 2,
                repeat: stats.streak > 0 ? Infinity : 0,
                ease: "easeInOut",
              }}
            >
              <Flame className="w-5 h-5 text-orange-500" />
            </motion.div>
          }
          label="Streak"
          value={`${stats.streak} дней`}
          color="bg-orange-500/10"
          delay={0.3}
        />
      </div>
    </motion.div>
  );
};
