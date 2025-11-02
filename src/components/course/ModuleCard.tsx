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
      whileHover={{ scale: 1.03, y: -4 }}
      className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:border-neon/50 hover:shadow-[0_0_30px_rgba(177,255,50,0.2)] transition-all group cursor-pointer"
      role="article"
      aria-label={`Модуль ${id}: ${title}, прогресс ${progress}%`}
    >
      <div className="flex items-start gap-4 mb-4">
        <motion.div 
          className="relative p-4 rounded-xl bg-gradient-to-br from-neon/20 to-[hsl(var(--cyber-blue))]/20 border border-neon/30 group-hover:border-neon/50 transition-all"
          style={{
            transform: "perspective(1000px) rotateX(5deg) rotateY(-5deg)",
            boxShadow: "0 10px 25px -5px rgba(177, 255, 50, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)"
          }}
          whileHover={{
            scale: 1.1,
            rotateY: 0,
            rotateX: 0,
            boxShadow: "0 15px 35px -5px rgba(177, 255, 50, 0.5), inset 0 2px 0 0 rgba(255, 255, 255, 0.2)"
          }}
          transition={{ duration: 0.3 }}
        >
          <Icon 
            className="w-7 h-7 text-neon drop-shadow-[0_0_8px_rgba(177,255,50,0.6)]" 
            aria-hidden="true"
          />
        </motion.div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-2 text-lg leading-tight">
            {title}
          </h3>
          <p className="text-sm text-neon font-medium" aria-live="polite">
            {progress}% завершено
          </p>
        </div>
      </div>
      
      <Progress 
        value={progress} 
        className="h-2 mb-4" 
        aria-label={`Прогресс модуля: ${progress}%`}
      />
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full border border-neon/30 hover:bg-neon/10 hover:border-neon/50 text-neon font-medium focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`${isCompleted ? 'Повторить' : isStarted ? 'Продолжить' : 'Начать'} модуль: ${title}`}
      >
        {isCompleted ? "Повторить" : isStarted ? "Продолжить" : "Начать"}
      </Button>
    </motion.article>
  );
};
