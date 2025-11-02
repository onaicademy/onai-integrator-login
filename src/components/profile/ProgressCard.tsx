import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ProgressCardProps {
  title: string;
  progress: number;
  icon: string;
  delay?: number;
}

export const ProgressCard = ({ title, progress, icon, delay = 0 }: ProgressCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-br from-card to-secondary border border-border rounded-lg p-6 space-y-4 shadow-lg hover:shadow-neon/30 hover:border-neon/50 transition-all duration-300 group"
    >
      <div className="flex items-center gap-3">
        <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
          {icon}
        </span>
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Завершено</span>
          <span className="text-neon font-semibold">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2 bg-secondary/50" />
      </div>

      <Button 
        variant="neon" 
        className="w-full shadow-lg shadow-neon/20"
      >
        Продолжить курс
      </Button>
    </motion.div>
  );
};
