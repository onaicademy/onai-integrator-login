import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface MissionBadgeProps {
  title: string;
  completed: boolean;
  Icon: LucideIcon;
  delay?: number;
}

export const MissionBadge = ({ title, completed, Icon, delay = 0 }: MissionBadgeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -5, scale: 1.03, rotateX: 2 }}
      className={`
        bg-[#111111]/80 backdrop-blur-md border rounded-2xl p-4 space-y-3 shadow-xl
        transition-all duration-500
        ${completed 
          ? "border-neon/50 hover:shadow-neon/40 hover:border-neon/80" 
          : "border-border/50 hover:border-border/70"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${completed ? 'bg-neon/10 border border-neon/30' : 'bg-muted/50'}`}>
          <Icon className={`w-5 h-5 ${completed ? 'text-neon' : 'text-muted-foreground'}`} />
        </div>
        {completed && (
          <Badge variant="default" className="bg-neon/20 text-neon border-neon/40 text-xs">
            Выполнено
          </Badge>
        )}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
    </motion.div>
  );
};
