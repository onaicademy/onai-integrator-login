import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface MissionBadgeProps {
  title: string;
  completed: boolean;
  icon: string;
  delay?: number;
}

export const MissionBadge = ({ title, completed, icon, delay = 0 }: MissionBadgeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -5, scale: 1.03 }}
      className={`
        bg-card border rounded-lg p-4 space-y-2 shadow-md
        transition-all duration-300
        ${completed 
          ? "border-neon/50 hover:shadow-neon/30 hover:border-neon" 
          : "border-border hover:border-border/70"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl">{icon}</span>
        {completed && (
          <Badge variant="default" className="bg-neon/20 text-neon border-neon/30">
            Выполнено
          </Badge>
        )}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
    </motion.div>
  );
};
