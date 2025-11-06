import { useState } from "react";
import { Bot } from "lucide-react";
import { motion } from "framer-motion";
import { AIChatDialog } from "./profile/v2/AIChatDialog";
import { useLocation } from "react-router-dom";

export const FloatingAIButton = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const location = useLocation();

  // Скрываем на /login и /welcome
  const hiddenPaths = ["/login", "/welcome", "/"];
  const shouldHide = hiddenPaths.includes(location.pathname);

  if (shouldHide) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 z-50 group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Пульсация слой 1 */}
        <motion.div
          className="absolute inset-0 rounded-full bg-neon/30"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.2, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Пульсация слой 2 */}
        <motion.div
          className="absolute inset-0 rounded-full bg-neon/20"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 0, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />

        {/* Основная кнопка */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-neon via-neon to-[hsl(var(--cyber-blue))] rounded-full flex items-center justify-center shadow-lg shadow-neon/50 hover:shadow-xl hover:shadow-neon/60 transition-shadow overflow-hidden">
          {/* Сфера для вращения */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), transparent 50%)",
            }}
            animate={{
              rotateY: [0, 360],
              rotateX: [0, 360],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          {/* Иконка бота с вращением */}
          <motion.div
            animate={{
              rotateY: [0, 360],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-background relative z-10" strokeWidth={2} />
          </motion.div>
          
          {/* Индикатор online */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background">
            <motion.div
              className="absolute inset-0 rounded-full bg-green-400"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </div>

        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-secondary/95 backdrop-blur-sm border border-border/40 rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
            <p className="text-xs font-medium text-foreground">AI-куратор</p>
            <p className="text-xs text-muted-foreground">Задай вопрос 💬</p>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-secondary/95 border-r border-b border-border/40 rotate-45" />
        </div>
      </motion.button>

      {/* Chat Dialog */}
      <AIChatDialog open={isChatOpen} onOpenChange={setIsChatOpen} />
    </>
  );
};

