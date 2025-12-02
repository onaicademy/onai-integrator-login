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
        className="relative bg-[#1a1a24] backdrop-blur-md border border-gray-800 rounded-2xl p-6 overflow-hidden hover:border-[#00FF88]/50 transition-all duration-300"
      >
        {/* Glow effects */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00FF88]/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#00FF88]/10 rounded-full blur-2xl" />

        <div className="relative z-10 space-y-4 sm:space-y-6">
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
                  stroke="#333333"
                  strokeWidth={strokeWidth}
                  fill="none"
                  opacity={0.3}
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
                    <stop offset="0%" stopColor="#00FF88" />
                    <stop offset="100%" stopColor="#00cc88" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Avatar in center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#00FF88]/20 rounded-full blur-xl animate-pulse" />
                  <Avatar className="relative h-28 w-28 border-4 border-black">
                    <AvatarImage src={avatarUrl} alt="Аватар пользователя" />
                    <AvatarFallback className="bg-gradient-to-br from-[#00FF88]/20 to-[#00cc88]/10 text-2xl text-[#00FF88]">
                      <User className="w-12 h-12" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

            </div>
          </div>

          {/* User Info */}
          <div className="text-center space-y-2 sm:space-y-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Александр</h2>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-1">
                <p className="text-xs sm:text-sm text-[#00FF88] font-medium">Интегратор I</p>
                <span className="text-gray-500 text-xs sm:text-sm">•</span>
                <p className="text-xs sm:text-sm text-gray-400 font-medium">Уровень {level}</p>
              </div>
            </div>

            {/* XP Display */}
            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-2.5 sm:p-3">
              <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
                <span className="text-gray-400">Опыт</span>
                <span className="text-[#00FF88] font-bold">{percentage.toFixed(0)}%</span>
              </div>
              <div className="relative h-1.5 sm:h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00FF88] to-[#00cc88] rounded-full"
                  style={{
                    boxShadow: "0 0 10px rgba(0, 255, 136, 0.5)",
                  }}
                />
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-1">
                <span className="font-medium text-white">{xp}</span>
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
            className="w-full border-[#00FF88]/40 hover:bg-[#00FF88]/10 hover:border-[#00FF88] group transition-all duration-300 text-white"
          >
            <Edit3 className="w-4 h-4 mr-2 group-hover:text-[#00FF88] transition-colors" />
            Сменить аватар
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
