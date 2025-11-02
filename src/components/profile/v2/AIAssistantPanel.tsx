import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

export const AIAssistantPanel = () => {
  const [isActivating, setIsActivating] = useState(false);

  const handleActivate = () => {
    setIsActivating(true);
    console.log("Активация AI-помощника...");
    
    // Симуляция активации
    setTimeout(() => {
      setIsActivating(false);
    }, 2500);
  };

  return (
    <div className="relative">
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="relative bg-gradient-to-br from-[#1B1B1B]/80 via-[#1B1B1B]/80 to-[#1B1B1B]/80 backdrop-blur-md border border-neon/30 rounded-2xl p-6 sm:p-8 overflow-hidden"
      >
        {/* Animated background gradients */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-0 right-0 w-64 h-64 bg-neon/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
          className="absolute bottom-0 left-0 w-64 h-64 bg-[hsl(var(--cyber-blue))]/20 rounded-full blur-3xl"
        />

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            {/* AI Icon with animation */}
            <motion.div
              animate={{
                y: [0, -8, 0],
                rotate: [0, 5, 0, -5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <div className="absolute inset-0 bg-neon/30 rounded-2xl blur-xl" />
              <div className="relative p-4 bg-gradient-to-br from-neon/20 to-[hsl(var(--cyber-blue))]/20 border-2 border-neon/40 rounded-2xl">
                <Bot className="w-10 h-10 sm:w-12 sm:h-12 text-neon" strokeWidth={1.5} />
                
                {/* Sparkle effects */}
                <motion.div
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-4 h-4 text-[hsl(var(--cyber-blue))]" />
                </motion.div>
              </div>
            </motion.div>

            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground">AI-помощник</h3>
                <span className="px-2 py-0.5 bg-neon/20 border border-neon/30 rounded-full text-xs font-medium text-neon">
                  Beta
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Персональный наставник</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <p className="text-foreground leading-relaxed">
              Твой персональный AI-наставник помогает быстрее прокачивать навыки.
              Активируй интеллектуальные подсказки и начни обучение с поддержкой ИИ.
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {[
                { icon: Zap, text: "Быстрые ответы" },
                { icon: Sparkles, text: "Умные подсказки" },
                { icon: Bot, text: "24/7 поддержка" },
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-secondary/50 backdrop-blur-sm border border-border/30 rounded-lg"
                  >
                    <Icon className="w-4 h-4 text-neon flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{feature.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activation Button */}
          <motion.div
            animate={isActivating ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.5, repeat: isActivating ? Infinity : 0 }}
          >
            <Button
              onClick={handleActivate}
              disabled={isActivating}
              className="w-full bg-gradient-to-r from-neon via-neon to-[hsl(var(--cyber-blue))] text-background hover:from-neon/90 hover:to-[hsl(var(--cyber-blue))]/90 font-bold py-6 text-base sm:text-lg relative overflow-hidden group disabled:opacity-70"
              style={{
                boxShadow: "0 0 30px hsl(var(--neon) / 0.4), 0 0 15px hsl(var(--cyber-blue) / 0.3)",
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
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Активировать AI-помощника
                </span>
              )}

              {/* Animated shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                animate={{ x: ["-200%", "200%"] }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  repeatDelay: 1,
                  ease: "easeInOut"
                }}
              />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
