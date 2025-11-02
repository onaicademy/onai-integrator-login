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
      whileHover={{ scale: 1.02, y: -6 }}
      className="relative bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/30 rounded-3xl p-8 hover:border-neon/40 transition-all group cursor-pointer overflow-hidden"
      style={{
        boxShadow: "0 8px 32px -8px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)"
      }}
      role="article"
      aria-label={`Модуль ${id}: ${title}, прогресс ${progress}%`}
    >
      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon/5 to-[hsl(var(--cyber-blue))]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
      
      <div className="relative z-10">
        <div className="flex items-start gap-5 mb-6">
          {/* Enhanced 3D Icon */}
          <motion.div 
            className="relative flex-shrink-0"
            whileHover={{ 
              scale: 1.15,
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
              className="relative p-5 rounded-2xl bg-gradient-to-br from-neon/25 via-neon/15 to-[hsl(var(--cyber-blue))]/20 border-2 border-neon/40 group-hover:border-neon/70 transition-all duration-300"
              style={{
                transform: "perspective(1000px) rotateX(8deg) rotateY(-8deg)",
                boxShadow: `
                  0 15px 35px -10px rgba(177, 255, 50, 0.4),
                  0 8px 16px -8px rgba(0, 200, 255, 0.3),
                  inset 0 2px 4px 0 rgba(255, 255, 255, 0.15),
                  inset 0 -2px 4px 0 rgba(0, 0, 0, 0.2)
                `,
                backgroundImage: "linear-gradient(135deg, rgba(177, 255, 50, 0.1) 0%, rgba(0, 200, 255, 0.1) 100%)"
              }}
            >
              <Icon 
                className="w-8 h-8 text-neon relative z-10" 
                style={{
                  filter: "drop-shadow(0 0 12px rgba(177, 255, 50, 0.8)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))",
                  transform: "translateZ(20px)"
                }}
                strokeWidth={2.5}
                aria-hidden="true"
              />
              {/* Ambient glow behind icon */}
              <div 
                className="absolute inset-0 bg-neon/30 blur-xl rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity"
                aria-hidden="true"
              />
            </div>
          </motion.div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground mb-2 text-xl leading-tight font-gilroy">
              {title}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-neon animate-pulse" aria-hidden="true" />
                <p className="text-sm text-neon font-semibold" aria-live="polite">
                  {progress}% завершено
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Progress Bar */}
        <div className="mb-6">
          <Progress 
            value={progress} 
            className="h-2.5 mb-2" 
            aria-label={`Прогресс модуля: ${progress}%`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Начало</span>
            <span>Завершено</span>
          </div>
        </div>
        
        {/* Modern CTA Button */}
        <Button 
          variant="ghost" 
          size="default"
          className="w-full border-2 border-neon/40 hover:bg-neon/15 hover:border-neon/70 text-neon font-bold text-base rounded-xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:shadow-[0_0_20px_rgba(177,255,50,0.3)]"
          aria-label={`${isCompleted ? 'Повторить' : isStarted ? 'Продолжить' : 'Начать'} модуль: ${title}`}
        >
          {isCompleted ? "Повторить модуль" : isStarted ? "Продолжить обучение" : "Начать модуль"}
        </Button>
      </div>
    </motion.article>
  );
};
