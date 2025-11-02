import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export const AIAssistantCard = () => {
  const handleActivate = () => {
    console.log("AI Assistant activation requested");
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-gradient-to-r from-neon/5 via-[#111111]/80 to-[#4D9AEA]/5 backdrop-blur-md border border-neon/50 rounded-2xl p-8 space-y-4 shadow-2xl shadow-neon/20"
    >
      <div className="flex items-center gap-4">
        <div className="p-4 rounded-xl bg-neon/10 border border-neon/30">
          <Bot className="w-8 h-8 text-neon" strokeWidth={1.5} />
        </div>
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
        onClick={handleActivate}
        className="w-full shadow-lg shadow-neon/30 hover:shadow-neon/50 transition-all"
      >
        Активировать AI-помощника
      </Button>
    </motion.div>
  );
};
