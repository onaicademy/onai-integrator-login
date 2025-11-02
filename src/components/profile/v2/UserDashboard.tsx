import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { User, Edit3 } from "lucide-react";
import { useState, useEffect } from "react";

export const UserDashboard = () => {
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("selectedAvatar");
    if (saved) setAvatarUrl(saved);
  }, []);

  const xp = 1240;
  const maxXp = 2000;
  const level = 3;
  const percentage = (xp / maxXp) * 100;

  // Circle parameters
  const size = 200;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="sticky top-6">
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="relative bg-[#1B1B1B]/80 backdrop-blur-md border border-border/50 rounded-2xl p-6 overflow-hidden"
      >
        {/* Glow effects */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-neon/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[hsl(var(--cyber-blue))]/10 rounded-full blur-2xl" />

        <div className="relative z-10 space-y-6">
          {/* Avatar with Circular Progress */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {/* SVG Progress Ring */}
              <svg 
                width={size} 
                height={size} 
                className="transform -rotate-90"
              >
                {/* Background circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="hsl(var(--border))"
                  strokeWidth={strokeWidth}
                  fill="none"
                  opacity={0.2}
                />
                {/* Progress circle with gradient */}
                <motion.circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="url(#gradient)"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--neon))" />
                    <stop offset="100%" stopColor="hsl(var(--cyber-blue))" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Avatar in center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <div className="absolute inset-0 bg-neon/20 rounded-full blur-xl animate-pulse" />
                  <Avatar className="relative h-28 w-28 border-4 border-background">
                    <AvatarImage src={avatarUrl} alt="Аватар пользователя" />
                    <AvatarFallback className="bg-gradient-to-br from-neon/20 to-[hsl(var(--cyber-blue))]/20 text-2xl text-neon">
                      <User className="w-12 h-12" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Level badge */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-neon to-[hsl(var(--cyber-blue))] rounded-full shadow-lg"
              >
                <span className="text-sm font-bold text-background">Уровень {level}</span>
              </motion.div>
            </div>
          </div>

          {/* User Info */}
          <div className="text-center space-y-3">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Александр</h2>
              <p className="text-sm text-neon font-medium">Интегратор I</p>
            </div>

            {/* XP Display */}
            <div className="bg-secondary/50 backdrop-blur-sm border border-border/30 rounded-xl p-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Опыт</span>
                <span className="text-neon font-bold">{percentage.toFixed(0)}%</span>
              </div>
              <div className="relative h-2 bg-background rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-neon to-[hsl(var(--cyber-blue))] rounded-full"
                  style={{
                    boxShadow: "0 0 10px hsl(var(--neon) / 0.5)",
                  }}
                />
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{xp}</span>
                <span>/</span>
                <span>{maxXp}</span>
                <span>XP</span>
              </div>
            </div>
          </div>

          {/* Change Avatar Button */}
          <Button
            onClick={() => navigate("/avatar")}
            variant="outline"
            className="w-full border-neon/40 hover:bg-neon/10 hover:border-neon group transition-all duration-300"
          >
            <Edit3 className="w-4 h-4 mr-2 group-hover:text-neon transition-colors" />
            Сменить аватар
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
