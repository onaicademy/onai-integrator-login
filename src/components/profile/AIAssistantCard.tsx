import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export const AIAssistantCard = () => {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-gradient-to-r from-neon/10 via-card to-neon/10 border border-neon/50 rounded-lg p-8 space-y-4 shadow-2xl shadow-neon/20"
    >
      <div className="flex items-center gap-4">
        <div className="text-6xl">🤖</div>
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-foreground">AI-помощник</h3>
          <p className="text-sm text-muted-foreground">Персональный наставник</p>
        </div>
      </div>

      <p className="text-foreground leading-relaxed">
        Твой персональный AI-наставник помогает быстрее прокачивать навыки.
        Активируй интеллектуальные подсказки и начни обучение с поддержкой ИИ.
      </p>

      <Button 
        variant="neon" 
        size="lg" 
        className="w-full shadow-lg shadow-neon/30 hover:shadow-neon/50 transition-all"
      >
        Активировать AI-помощника
      </Button>
    </motion.div>
  );
};
