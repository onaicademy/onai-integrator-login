import { motion } from "framer-motion";
import { CourseModules } from "@/components/profile/v2/CourseModules";
import { AchievementsGrid } from "@/components/profile/v2/AchievementsGrid";
import { AIAssistantPanel } from "@/components/profile/v2/AIAssistantPanel";

const Profile = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="relative z-10 w-full">
        {/* HERO PROFILE SECTION */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative bg-gradient-to-b from-[#00ff00]/5 via-black to-black border-b border-gray-800"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
              {/* Avatar Section */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative"
              >
                <div className="relative group">
                  {/* Animated Ring */}
                  <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)]" viewBox="0 0 200 200">
                    <defs>
                      <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00ff00" />
                        <stop offset="50%" stopColor="#00cc00" />
                        <stop offset="100%" stopColor="#00ff00" />
                      </linearGradient>
                    </defs>
                    <motion.circle
                      cx="100"
                      cy="100"
                      r="95"
                      fill="none"
                      stroke="url(#ring-gradient)"
                      strokeWidth="3"
                      strokeDasharray="596.9"
                      strokeDashoffset="149.2"
                      initial={{ strokeDashoffset: 596.9 }}
                      animate={{ strokeDashoffset: 149.2 }}
                      transition={{ duration: 2, ease: "easeOut" }}
                    />
                  </svg>
                  
                  {/* Avatar */}
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-black shadow-2xl shadow-[#00ff00]/20">
                    <div className="w-full h-full bg-gradient-to-br from-[#00ff00]/20 to-[#00cc00]/10 flex items-center justify-center">
                      <span className="text-5xl sm:text-6xl font-bold text-[#00ff00]">А</span>
                    </div>
                  </div>
                  
                  {/* Level Badge */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute -bottom-2 -right-2 bg-gradient-to-br from-[#00ff00] to-[#00cc00] text-black font-bold rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-4 border-black shadow-lg"
                  >
                    <span className="text-lg sm:text-xl">3</span>
                  </motion.div>
                </div>
              </motion.div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-3"
                >
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Александр</h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <span className="px-3 py-1 bg-[#00ff00]/20 border border-[#00ff00]/30 rounded-full text-sm font-medium text-[#00ff00]">
                        Интегратор I
                      </span>
                      <span className="text-gray-400 text-sm">•</span>
                      <span className="text-gray-400 text-sm">Уровень 3</span>
                      <span className="text-gray-400 text-sm">•</span>
                      <span className="text-[#00ff00] text-sm font-medium">1,240 XP</span>
                    </div>
                  </div>

                  {/* XP Progress Bar */}
                  <div className="max-w-md mx-auto md:mx-0">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>Прогресс до уровня 4</span>
                      <span>1,240 / 2,000 XP</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "62%" }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                        className="h-full bg-gradient-to-r from-[#00ff00] to-[#00cc00] rounded-full relative"
                        style={{ boxShadow: "0 0 10px rgba(0, 255, 0, 0.5)" }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex gap-4 sm:gap-6"
              >
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">12</div>
                  <div className="text-xs text-gray-400">Уроков</div>
                </div>
                <div className="w-px bg-gray-800" />
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-[#00ff00] mb-1">45%</div>
                  <div className="text-xs text-gray-400">Прогресс</div>
                </div>
                <div className="w-px bg-gray-800" />
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">7</div>
                  <div className="text-xs text-gray-400">Дней</div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Quick Actions & Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8"
          >
            {[
              { label: "Всего XP", value: "1,240", icon: "📊", color: "green" },
              { label: "Энергия", value: "78%", icon: "⚡", color: "yellow" },
              { label: "Стрик", value: "7 дней", icon: "🔥", color: "orange" },
              { label: "Статус", value: "Онлайн", icon: "🟢", color: "green" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-[#1a1a24] border border-gray-800 rounded-xl p-4 hover:border-[#00ff00]/50 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{stat.icon}</span>
                  <div className="w-2 h-2 rounded-full bg-[#00ff00] animate-pulse" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Courses Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <CourseModules />
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <AchievementsGrid />
          </motion.div>

          {/* AI Assistant */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <AIAssistantPanel />
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="border-t border-gray-800 py-8 text-center"
        >
          <div className="max-w-7xl mx-auto px-4">
            <h3 className="text-lg font-bold mb-2">
              <span className="text-[#00ff00]">onAI</span>
              <span className="text-white"> Academy</span>
            </h3>
            <p className="text-xs text-gray-400">
              Powered by Neural Education Systems © 2025
            </p>
          </div>
        </motion.footer>
      </div>
      
      {/* Добавляем стили для shimmer анимации */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default Profile;
