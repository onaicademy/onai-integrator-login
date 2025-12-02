import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles } from "lucide-react";
import { useState } from "react";

export const AIAssistant = () => {
  const [isActivating, setIsActivating] = useState(false);

  const handleActivate = () => {
    setIsActivating(true);
    setTimeout(() => setIsActivating(false), 2000);
    console.log("AI Assistant activation initiated");
  };

  return (
    <div className="relative">
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="relative bg-gradient-to-r from-neon/5 via-[#111111]/70 to-[hsl(195,100%,50%)]/5 backdrop-blur-md border border-neon/30 rounded-2xl p-8 overflow-hidden"
        style={{
          boxShadow: "0 0 40px rgba(177, 255, 50, 0.1), 0 0 40px rgba(0, 200, 255, 0.1)",
        }}
      >
        {/* Animated background */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-0 right-0 w-64 h-64 bg-neon/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-0 left-0 w-64 h-64 bg-[hsl(195,100%,50%)]/20 rounded-full blur-3xl"
        />

        <div className="relative z-10 space-y-6">
          <div className="flex items-start gap-6">
            {/* Robot icon with animation */}
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <div className="absolute inset-0 bg-neon/30 rounded-2xl blur-xl" />
              <div className="relative p-4 bg-neon/10 border border-neon/30 rounded-2xl">
                <Bot className="w-12 h-12 text-neon" strokeWidth={1.5} />
              </div>
            </motion.div>

            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-foreground">AI-помощник</h3>
                <Sparkles className="w-5 h-5 text-[hsl(195,100%,50%)]" />
              </div>
              <p className="text-sm text-muted-foreground">Персональный наставник</p>
              <p className="text-foreground leading-relaxed">
                Твой персональный AI-наставник помогает быстрее прокачивать навыки.
                Активируй интеллектуальные подсказки и начни обучение с поддержкой ИИ.
              </p>
            </div>
          </div>

          {/* Activation button */}
          <motion.div
            animate={isActivating ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Button
              onClick={handleActivate}
              disabled={isActivating}
              className="w-full bg-gradient-to-r from-neon to-neon/80 text-background hover:from-neon/90 hover:to-neon/70 font-bold py-6 text-lg relative overflow-hidden group"
              style={{
                boxShadow: "0 0 30px rgba(177, 255, 50, 0.3)",
              }}
            >
              {isActivating ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Инициализация ИИ...
                </span>
              ) : (
                "Активировать AI-помощника"
              )}
              
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
