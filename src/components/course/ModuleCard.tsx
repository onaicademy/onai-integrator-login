import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ModuleCardProps {
  id: number;
  title: string;
  progress: number;
  iconUrl: string;
  index: number;
}

export const ModuleCard = ({ id, title, progress, iconUrl, index }: ModuleCardProps) => {
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
          className="absolute inset-0 opacity-20"
          style={{
            background: "radial-gradient(circle at center, rgba(99, 102, 241, 0.4), rgba(139, 92, 246, 0.3), transparent 70%)"
          }}
        />
        
        <motion.div 
          className="relative z-10"
          animate={{ 
            y: [0, -6, 0, -4, 0],
            rotateY: [0, 2, -2, 3, -3, 0],
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
          style={{
            transformStyle: "preserve-3d",
            perspective: "1000px"
          }}
        >
          <motion.img
            src={iconUrl}
            alt=""
            className="w-32 h-32 object-contain"
            style={{
              filter: "drop-shadow(0 10px 30px rgba(99, 102, 241, 0.5)) drop-shadow(0 0 20px rgba(139, 92, 246, 0.4))"
            }}
            animate={{
              filter: [
                "drop-shadow(0 10px 30px rgba(99, 102, 241, 0.5)) drop-shadow(0 0 20px rgba(139, 92, 246, 0.4))",
                "drop-shadow(0 10px 35px rgba(99, 102, 241, 0.7)) drop-shadow(0 0 25px rgba(139, 92, 246, 0.6))",
                "drop-shadow(0 10px 30px rgba(99, 102, 241, 0.5)) drop-shadow(0 0 20px rgba(139, 92, 246, 0.4))"
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
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
