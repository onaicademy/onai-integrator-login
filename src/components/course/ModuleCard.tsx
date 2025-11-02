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
          whileHover={{ 
            scale: 1.1,
            rotateY: 15,
            rotateX: -10,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{
            transformStyle: "preserve-3d",
            perspective: "1000px"
          }}
        >
          <div 
            className="relative p-8 rounded-2xl"
            style={{
              transform: "perspective(1000px) rotateX(5deg) rotateY(-5deg)",
              filter: `
                drop-shadow(0 20px 40px rgba(177, 255, 50, 0.3))
                drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5))
              `
            }}
          >
            <Icon 
              className="w-24 h-24 text-white/90" 
              strokeWidth={1.5}
              aria-hidden="true"
            />
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
