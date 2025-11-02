import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  id: number;
  title: string;
  progress: number;
  icon: LucideIcon;
  index: number;
}

export const ModuleCard = ({ id, title, progress, icon: Icon, index }: ModuleCardProps) => {
  const isCompleted = progress === 100;
  const isStarted = progress > 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      className="relative bg-black border border-border/30 rounded-xl sm:rounded-2xl overflow-hidden group cursor-pointer"
      role="article"
      aria-label={`Модуль ${id}: ${title}, прогресс ${progress}%`}
    >
      {/* Module Number Badge */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20">
        <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
          модуль {id}
        </span>
      </div>

      {/* Action Button */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
        <Button 
          size="sm"
          className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/20 rounded-full px-2 sm:px-3 md:px-4 font-medium text-[10px] sm:text-xs md:text-sm"
          aria-label={`${isCompleted ? 'Повторить' : isStarted ? 'Продолжить' : 'Пройти'} модуль: ${title}`}
        >
          <span className="hidden sm:inline">{isCompleted ? "повторить" : isStarted ? "продолжить" : "пройти"}</span>
          <span className="sm:hidden">{isCompleted ? "↻" : isStarted ? "→" : "▶"}</span>
          <span className="ml-1 sm:ml-2 text-sm sm:text-lg hidden sm:inline">→</span>
        </Button>
      </div>

      {/* 3D Icon/Image Container */}
      <div className="relative h-36 sm:h-40 md:h-48 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-card/20 to-transparent overflow-hidden">
        {/* Cyberpunk Background Glow */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: "radial-gradient(circle at center, rgba(177, 255, 50, 0.3), rgba(99, 102, 241, 0.2), transparent 70%)"
          }}
        />
        
        <motion.div 
          className="relative z-10"
          animate={{ 
            y: [0, -6, 0, -4, 0],
            rotateZ: [0, 1, -1, 2, -2, 0],
            scale: [1, 1.02, 0.99, 1.03, 0.98, 1]
          }}
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          whileHover={{ 
            scale: 1.15,
            y: -10,
            transition: { duration: 0.3 }
          }}
        >
          <motion.div
            animate={{
              filter: [
                "drop-shadow(0 0 20px rgba(177, 255, 50, 0.6)) drop-shadow(0 0 40px rgba(99, 102, 241, 0.3))",
                "drop-shadow(0 0 30px rgba(177, 255, 50, 0.8)) drop-shadow(0 0 50px rgba(99, 102, 241, 0.5))",
                "drop-shadow(0 0 20px rgba(177, 255, 50, 0.6)) drop-shadow(0 0 40px rgba(99, 102, 241, 0.3))"
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Icon 
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 text-neon" 
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </motion.div>
        </motion.div>
       </div>

       {/* Module Info */}
      <div className="p-4 sm:p-5 md:p-6 pt-3 sm:pt-4">
        <h3 className="font-bold text-white text-sm sm:text-base md:text-lg leading-tight mb-2 sm:mb-3">
          {title}
        </h3>
        
        {/* Progress Bar */}
        {isStarted && (
          <div className="mt-3 sm:mt-4">
            <Progress 
              value={progress} 
              className="h-1 sm:h-1.5" 
              aria-label={`Прогресс модуля: ${progress}%`}
            />
          </div>
        )}
      </div>
    </motion.article>
  );
};
