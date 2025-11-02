import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LucideIcon } from "lucide-react";

interface ProgressCardProps {
  title: string;
  progress: number;
  Icon: LucideIcon;
  delay?: number;
}

export const ProgressCard = ({ title, progress, Icon, delay = 0 }: ProgressCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.02, rotateY: 2 }}
      className="bg-[#111111]/80 backdrop-blur-md border border-border/50 rounded-2xl p-6 space-y-4 shadow-2xl hover:shadow-neon/30 hover:border-neon/70 transition-all duration-500 group"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-neon/10 border border-neon/30 group-hover:bg-neon/20 transition-colors">
          <Icon className="w-6 h-6 text-neon" />
        </div>
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
        className="w-full shadow-lg shadow-neon/20 hover:shadow-neon/40"
      >
        Продолжить курс
      </Button>
    </motion.div>
  );
};
