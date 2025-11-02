import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { useState, useEffect } from "react";

export const AIDashboard = () => {
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("selectedAvatar");
    if (saved) setAvatarUrl(saved);
  }, []);

  const xp = 1240;
  const maxXp = 2000;
  const percentage = (xp / maxXp) * 100;
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative">
      {/* Holographic card */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="relative bg-[#111111]/70 backdrop-blur-md border border-neon/30 rounded-2xl p-8 overflow-hidden"
        style={{
          boxShadow: "0 0 30px rgba(177, 255, 50, 0.1), inset 0 0 20px rgba(177, 255, 50, 0.05)",
        }}
      >
        {/* Glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-neon/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[hsl(195,100%,50%)]/20 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-6">
          {/* Avatar with holographic ring */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {/* Animated XP ring */}
              <svg className="absolute -inset-4 w-[200px] h-[200px]" style={{ transform: "rotate(-90deg)" }}>
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="70"
                  stroke="hsl(var(--border))"
                  strokeWidth="3"
                  fill="none"
                  opacity="0.3"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="100"
                  cy="100"
                  r="70"
                  stroke="hsl(var(--neon))"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  style={{
                    filter: "drop-shadow(0 0 8px hsl(var(--neon) / 0.8))",
                  }}
                />
              </svg>

              {/* Avatar */}
              <div className="relative">
                <div className="absolute inset-0 bg-neon/30 rounded-full blur-xl animate-pulse" />
                <Avatar className="relative h-32 w-32 border-2 border-neon/50">
                  <AvatarImage src={avatarUrl} alt="User avatar" />
                  <AvatarFallback className="bg-secondary text-2xl text-neon">
                    <User className="w-12 h-12" />
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Level badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-neon/20 to-[hsl(195,100%,50%)]/20 border border-neon/50 rounded-full backdrop-blur-sm"
              >
                <span className="text-xs font-bold text-neon">Уровень 3</span>
              </motion.div>
            </div>

            {/* User info */}
            <div className="mt-8 text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Александр</h2>
              <p className="text-sm text-neon">Интегратор I</p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>{xp} XP</span>
                <span>/</span>
                <span>{maxXp} XP</span>
              </div>
            </div>
          </div>

          {/* Change avatar button */}
          <Button
            onClick={() => navigate("/avatar")}
            variant="outline"
            className="w-full border-neon/40 hover:bg-neon/10 hover:border-neon/70 transition-all duration-300 backdrop-blur-sm group"
          >
            <User className="w-4 h-4 mr-2 group-hover:text-neon transition-colors" />
            Сменить аватар
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
