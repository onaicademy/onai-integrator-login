import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LucideIcon, Clock, BookOpen } from "lucide-react";

interface ModuleCardProps {
  id: number;
  title: string;
  description?: string;
  progress: number;
  icon: LucideIcon;
  index: number;
  order_index: number;
  lessons?: number;
  duration?: string;
  stats?: {
    total_lessons: number;
    total_minutes: number;
    total_hours: number;
    formatted_duration: string;
  };
  isLocked?: boolean;
  onClick?: () => void;
}

export const ModuleCard = ({ 
  id, 
  title, 
  description,
  progress, 
  icon: Icon, 
  index,
  order_index,
  lessons,
  duration,
  stats,
  isLocked = false,
  onClick 
}: ModuleCardProps) => {
  const isCompleted = progress === 100;
  const isStarted = progress > 0;
  
  // 📊 Используем stats если есть, иначе fallback на старые props
  const displayLessons = stats?.total_lessons ?? lessons;
  const displayDuration = stats?.formatted_duration ?? duration;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={!isLocked ? { x: 4, borderColor: "rgba(0, 255, 136, 0.4)" } : {}}
      onClick={isLocked ? undefined : onClick}
      className={`relative bg-[#0a0a0f] border rounded-2xl overflow-hidden group transition-all duration-300 ${
        isLocked
          ? 'border-gray-800/30 opacity-50 cursor-not-allowed'
          : 'border-gray-800/50 cursor-pointer hover:shadow-lg hover:shadow-[#00FF88]/10'
      }`}
      role="article"
      aria-label={`Модуль ${id}: ${title}, прогресс ${progress}%${isLocked ? ' (Заблокирован)' : ''}`}
    >
      {/* Horizontal Layout */}
      <div className="flex items-center gap-4 p-5 sm:p-6">
        {/* Icon Section */}
        <div className="flex-shrink-0">
          <motion.div 
            className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-[#00FF88]/10 to-[#00cc88]/5 border border-[#00FF88]/20 flex items-center justify-center"
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Icon 
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#00FF88]" 
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </motion.div>
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          {/* Module Number + Title */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-semibold text-[#00FF88]/60 uppercase tracking-wider">
              Модуль {order_index + 1}
            </span>
          </div>
          
          <h3 className="font-bold text-white text-base sm:text-lg leading-tight mb-2">
            {title}
          </h3>
          
          {description && (
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-3">
              {description}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex items-center gap-4 text-[11px] sm:text-xs text-gray-500">
            {displayLessons !== undefined && displayLessons !== null && (
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>
                  {displayLessons} {displayLessons === 1 ? 'урок' : displayLessons < 5 ? 'урока' : 'уроков'}
                </span>
              </div>
            )}
            {displayDuration && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{displayDuration}</span>
              </div>
            )}
            {isStarted && (
              <div className="flex items-center gap-1.5 text-[#00FF88]">
                <span className="font-semibold">{progress}%</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {isStarted && (
            <div className="mt-3">
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00FF88] to-[#00cc88]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex-shrink-0">
          <Button 
            size="sm"
            disabled={isLocked}
            className={`${
              isLocked
                ? "bg-gray-800/50 text-gray-500 cursor-not-allowed"
                : isCompleted 
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700" 
                  : isStarted 
                    ? "bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 hover:bg-[#00FF88]/20" 
                    : "bg-[#00FF88] text-black hover:bg-[#00cc88]"
            } font-semibold rounded-xl px-4 py-2 text-xs sm:text-sm transition-all`}
            aria-label={`${isLocked ? 'Заблокирован' : isCompleted ? 'Повторить' : isStarted ? 'Продолжить' : 'Начать'} модуль: ${title}`}
          >
            {isLocked ? "🔒 Заблокирован" : isCompleted ? "Повторить" : isStarted ? "Продолжить" : "Начать"}
          </Button>
        </div>
      </div>
    </motion.article>
  );
};
