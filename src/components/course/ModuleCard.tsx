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
  lessons?: number;
  duration?: string;
  stats?: {
    total_lessons: number;
    total_minutes: number;
    total_hours: number;
    formatted_duration: string;
  };
  onClick?: () => void;
}

export const ModuleCard = ({ 
  id, 
  title, 
  description,
  progress, 
  icon: Icon, 
  index, 
  lessons,
  duration,
  stats,
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
      whileHover={{ x: 4, borderColor: "rgba(0, 255, 0, 0.4)" }}
      onClick={onClick}
      className="relative bg-[#0a0a0f] border border-gray-800/50 rounded-2xl overflow-hidden group cursor-pointer hover:shadow-lg hover:shadow-[#00ff00]/10 transition-all duration-300"
      role="article"
      aria-label={`Модуль ${id}: ${title}, прогресс ${progress}%`}
    >
      {/* Horizontal Layout */}
      <div className="flex items-center gap-4 p-5 sm:p-6">
        {/* Icon Section */}
        <div className="flex-shrink-0">
          <motion.div 
            className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-[#00ff00]/10 to-[#00cc00]/5 border border-[#00ff00]/20 flex items-center justify-center"
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Icon 
              className="w-7 h-7 sm:w-8 sm:h-8 text-[#00ff00]" 
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </motion.div>
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          {/* Module Number + Title */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-semibold text-[#00ff00]/60 uppercase tracking-wider">
              Модуль {id}
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
              <div className="flex items-center gap-1.5 text-[#00ff00]">
                <span className="font-semibold">{progress}%</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {isStarted && (
            <div className="mt-3">
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00ff00] to-[#00cc00]"
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
            className={`${
              isCompleted 
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700" 
                : isStarted 
                  ? "bg-[#00ff00]/10 text-[#00ff00] border border-[#00ff00]/30 hover:bg-[#00ff00]/20" 
                  : "bg-[#00ff00] text-black hover:bg-[#00cc00]"
            } font-semibold rounded-xl px-4 py-2 text-xs sm:text-sm transition-all`}
            aria-label={`${isCompleted ? 'Повторить' : isStarted ? 'Продолжить' : 'Начать'} модуль: ${title}`}
          >
            {isCompleted ? "Повторить" : isStarted ? "Продолжить" : "Начать"}
          </Button>
        </div>
      </div>
    </motion.article>
  );
};
