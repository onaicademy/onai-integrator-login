import { useState, useRef, useEffect } from "react";
import { Bot } from "lucide-react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { AIChatDialog } from "./profile/v2/AIChatDialog";
import { useLocation } from "react-router-dom";

export const FloatingAIButton = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggable, setIsDraggable] = useState(false);
  const location = useLocation();
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const holdTimer = useRef<any>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Скрываем на /login и /welcome
  const hiddenPaths = ["/login", "/welcome", "/"];
  const shouldHide = hiddenPaths.includes(location.pathname);

  useEffect(() => {
    // Сброс позиции при смене страницы
    x.set(0);
    y.set(0);
    setIsDraggable(false);
  }, [location.pathname]);

  const handlePointerDown = () => {
    // Запускаем таймер на 0.5 сек
    holdTimer.current = setTimeout(() => {
      setIsDraggable(true);
      setIsDragging(true);
    }, 500);
  };

  const handlePointerUp = () => {
    // Отменяем таймер
    clearTimeout(holdTimer.current);
    
    // Если не было перетаскивания - открываем чат
    if (!isDragging && !isDraggable) {
      setIsChatOpen(true);
    }
    
    setTimeout(() => {
      setIsDragging(false);
      // Сбрасываем режим перетаскивания после завершения
      if (isDraggable) {
        setIsDraggable(false);
      }
    }, 100);
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    // Сбрасываем режим перетаскивания, чтобы снова можно было кликать
    setTimeout(() => {
      setIsDraggable(false);
    }, 200);
  };

  if (shouldHide) {
    return null;
  }

  return (
    <>
      {/* Constraints для drag */}
      <div
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none z-40"
      />

      {/* Floating Button */}
      <motion.button
        drag={isDraggable}
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onDragEnd={handleDragEnd}
        style={{ x, y }}
        className={`
          fixed bottom-6 right-6 z-50 group
          ${isDragging ? "cursor-grabbing" : isDraggable ? "cursor-grab" : "cursor-pointer"}
        `}
        whileHover={!isDragging ? { scale: 1.05 } : {}}
        whileTap={!isDragging ? { scale: 0.95 } : {}}
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: isDragging ? 1.1 : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Tooltip: AI-куратор / Удерживайте для перемещения */}
        {!isDraggable && !isDragging && (
          <div className="absolute bottom-full mb-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-secondary/95 backdrop-blur-sm border border-border/40 rounded-lg px-3 py-2 shadow-lg"
            >
              <p className="text-xs font-medium text-foreground whitespace-nowrap">AI-куратор</p>
              <p className="text-[10px] text-muted-foreground whitespace-nowrap">Удерживайте для перемещения</p>
            </motion.div>
            {/* Стрелка снизу */}
            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-secondary/95 border-r border-b border-border/40 rotate-45" />
          </div>
        )}

        {/* Пульсация слой 1 */}
        {!isDragging && (
          <>
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
          </>
        )}

        {/* Основная кнопка */}
        <div className={`
          relative w-14 h-14 sm:w-16 sm:h-16 
          bg-gradient-to-br from-neon via-neon to-[hsl(var(--cyber-blue))] 
          rounded-full flex items-center justify-center 
          shadow-lg shadow-neon/50 hover:shadow-xl hover:shadow-neon/60 
          transition-shadow overflow-hidden
          ${isDraggable ? "ring-2 ring-neon ring-offset-2 ring-offset-background" : ""}
        `}>
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
        {!isDragging && (
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-secondary/95 backdrop-blur-sm border border-border/40 rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
              <p className="text-xs font-medium text-foreground">AI-куратор</p>
              <p className="text-xs text-muted-foreground">
                {isDraggable ? "Перетащите меня 🖐️" : "Задай вопрос 💬"}
              </p>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-secondary/95 border-r border-b border-border/40 rotate-45" />
          </div>
        )}
      </motion.button>

      {/* Chat Dialog */}
      <AIChatDialog open={isChatOpen} onOpenChange={setIsChatOpen} />
    </>
  );
};
