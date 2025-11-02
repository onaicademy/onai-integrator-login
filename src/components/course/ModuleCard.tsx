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
      <div className="relative h-48 flex items-center justify-center p-8 bg-gradient-to-br from-card/20 to-transparent overflow-hidden">
        {/* AI Glow Background */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(circle at center, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.2), transparent 70%)"
          }}
        />
        
        <motion.div 
          className="relative z-10"
          animate={{ 
            rotateY: [0, 3, -3, 5, -5, 0],
            rotateZ: [0, -1, 1, -0.5, 0.5, 0],
            scale: [1, 1.02, 0.99, 1.03, 0.98, 1]
          }}
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          whileHover={{ 
            scale: 1.15,
            transition: { duration: 0.3 }
          }}
          style={{
            transformStyle: "preserve-3d",
            perspective: "1000px"
          }}
        >
          <div 
            className="relative p-8 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))"
            }}
          >
            <motion.div
              animate={{
                y: [0, -6, 0, -4, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.div
                animate={{
                  opacity: [0.9, 1, 0.9],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="relative">
                  {/* Gradient overlay for AI effect */}
                  <div 
                    className="absolute inset-0 rounded-lg blur-xl"
                    style={{
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)",
                      opacity: 0.6
                    }}
                  />
                  <Icon 
                    className="relative w-24 h-24 text-white" 
                    strokeWidth={2}
                    aria-hidden="true"
                    style={{
                      filter: "drop-shadow(0 0 20px rgba(139, 92, 246, 0.8))",
                      stroke: "url(#aiGradient)"
                    }}
                  />
                  {/* SVG Gradient Definition */}
                  <svg width="0" height="0" style={{ position: 'absolute' }}>
                    <defs>
                      <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
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
