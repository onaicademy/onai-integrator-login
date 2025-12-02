import { Brain, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export const ProfileHeader = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-[#00FF88]/30 rounded-lg sm:rounded-xl blur-lg" />
          <div className="relative bg-gradient-to-br from-[#00FF88]/20 to-[#00cc88]/10 border border-[#00FF88]/30 rounded-lg sm:rounded-xl p-2 sm:p-3">
            <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-[#00FF88]" strokeWidth={1.5} />
          </div>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
            <span className="text-[#00FF88]">onAI</span>
            <span className="text-white"> Academy</span>
          </h1>
          <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 flex items-center gap-1 sm:gap-1.5">
            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 text-[#00FF88]" />
            <span className="truncate">Интеллектуальная платформа обучения</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};
