import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

export const PlayerProgress = () => {
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [nextLevelXp, setNextLevelXp] = useState(100);

  useEffect(() => {
    // Load from localStorage or API
    const savedLevel = parseInt(localStorage.getItem("userLevel") || "1");
    const savedXp = parseInt(localStorage.getItem("userXp") || "0");
    setLevel(savedLevel);
    setXp(savedXp);
    setNextLevelXp(savedLevel * 100);
  }, []);

  const progress = (xp / nextLevelXp) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-6"
    >
      {/* Glow effect on level up */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-neon/10 via-transparent to-[hsl(var(--cyber-blue))]/10 pointer-events-none"
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="relative z-10 space-y-6">
        {/* Level display */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Уровень</h3>
            <p className="text-3xl font-bold text-neon">{level}</p>
          </div>
          
          {/* 3D sphere placeholder - можно заменить на react-three-fiber */}
          <motion.div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-neon to-[hsl(var(--cyber-blue))] flex items-center justify-center shadow-[0_0_30px_rgba(177,255,50,0.3)]"
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 360],
            }}
            transition={{
              scale: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              },
              rotate: {
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              },
            }}
          >
            <span className="text-2xl font-bold text-background">{level}</span>
          </motion.div>
        </div>

        {/* XP Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Опыт</span>
            <span className="text-foreground font-semibold">
              {xp} / {nextLevelXp} XP
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>
      </div>
    </motion.div>
  );
};
