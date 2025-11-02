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
      className="relative bg-black border border-border/30 rounded-2xl overflow-hidden group cursor-pointer"
      role="article"
      aria-label={`Модуль ${id}: ${title}, прогресс ${progress}%`}
    >
      {/* Module Number Badge */}
      <div className="absolute top-4 left-4 z-20">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          модуль {id}
        </span>
      </div>

      {/* Action Button */}
      <div className="absolute top-4 right-4 z-20">
        <Button 
          size="sm"
          className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/20 rounded-full px-4 font-medium"
          aria-label={`${isCompleted ? 'Повторить' : isStarted ? 'Продолжить' : 'Пройти'} модуль: ${title}`}
        >
          {isCompleted ? "повторить" : isStarted ? "продолжить" : "пройти"}
          <span className="ml-2 text-lg">→</span>
        </Button>
      </div>

      {/* 3D Icon/Image Container */}
      <div className="relative h-48 flex items-center justify-center p-8 bg-gradient-to-br from-card/20 to-transparent">
        <motion.div 
          className="relative"
          animate={{ 
            rotateY: [0, 5, -5, 10, -10, 0],
            rotateZ: [0, -2, 2, -1, 1, 0],
            scale: [1, 1.03, 0.98, 1.05, 0.97, 1]
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
          whileHover={{ 
            scale: 1.15,
            rotateY: 0,
            rotateZ: 0,
            transition: { duration: 0.2 }
          }}
          style={{
            transformStyle: "preserve-3d",
            perspective: "1000px"
          }}
        >
          <div 
            className="relative p-8 rounded-2xl"
            style={{
              transform: "perspective(1000px) rotateX(5deg) rotateY(-5deg)"
            }}
          >
            <motion.div
              animate={{
                y: [0, -8, 0, -5, 0],
                filter: [
                  "drop-shadow(0 0 20px rgba(177, 255, 50, 0.6)) drop-shadow(0 0 40px rgba(177, 255, 50, 0.3))",
                  "drop-shadow(0 0 30px rgba(177, 255, 50, 0.8)) drop-shadow(0 0 50px rgba(177, 255, 50, 0.5))",
                  "drop-shadow(0 0 20px rgba(177, 255, 50, 0.6)) drop-shadow(0 0 40px rgba(177, 255, 50, 0.3))",
                  "drop-shadow(0 0 35px rgba(177, 255, 50, 0.7)) drop-shadow(0 0 45px rgba(177, 255, 50, 0.4))",
                  "drop-shadow(0 0 20px rgba(177, 255, 50, 0.6)) drop-shadow(0 0 40px rgba(177, 255, 50, 0.3))"
                ]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.div
                animate={{
                  opacity: [1, 0.9, 1, 0.95, 1]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <Icon 
                  className="w-24 h-24 text-neon" 
                  strokeWidth={2.5}
                  aria-hidden="true"
                  style={{
                    filter: "drop-shadow(0 0 10px rgba(177, 255, 50, 0.8))"
                  }}
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Module Info */}
      <div className="p-6 pt-4">
        <h3 className="font-bold text-white text-lg leading-tight mb-3">
          {title}
        </h3>
        
        {/* Progress Bar */}
        {isStarted && (
          <div className="mt-4">
            <Progress 
              value={progress} 
              className="h-1.5" 
              aria-label={`Прогресс модуля: ${progress}%`}
            />
          </div>
        )}
      </div>
    </motion.article>
  );
};
