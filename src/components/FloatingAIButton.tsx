import { useState, useRef, useEffect } from "react";
import { Bot } from "lucide-react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { AIChatDialog } from "./profile/v2/AIChatDialog";
import { useLocation } from "react-router-dom";

const POSITION_STORAGE_KEY = 'floating-ai-button-position';

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

  // Загружаем сохранённую позицию при монтировании
  useEffect(() => {
    try {
      const savedPosition = localStorage.getItem(POSITION_STORAGE_KEY);
      if (savedPosition) {
        const { x: savedX, y: savedY } = JSON.parse(savedPosition);
        x.set(savedX);
        y.set(savedY);
      }
    } catch (error) {
      console.warn('Failed to load button position:', error);
    }
  }, []);

  useEffect(() => {
    // НЕ сбрасываем позицию при смене страницы - сохраняем её!
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
    
    // Сохраняем новую позицию в localStorage
    try {
      const currentX = x.get();
      const currentY = y.get();
      localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ x: currentX, y: currentY }));
    } catch (error) {
      console.warn('Failed to save button position:', error);
    }
    
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
      <motion.div
        drag={isDraggable}
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onDragEnd={handleDragEnd}
        style={{ x, y }}
        whileHover={{ scale: isDraggable ? 1 : 1.05 }}
        whileTap={{ scale: isDraggable ? 1 : 0.95 }}
        className={`
          fixed bottom-6 right-6 z-50 cursor-pointer
          ${isDragging ? "cursor-grabbing" : isDraggable ? "cursor-grab" : "cursor-pointer"}
        `}
      >
        {/* v2.0.FINAL - FINGERPRINT DESIGN */}
        <div className={`
          relative w-16 h-16
          bg-gradient-to-br from-zinc-900 via-zinc-800 to-black
          rounded-2xl flex flex-col items-center justify-center
          shadow-[0_0_30px_rgba(0,255,0,0.3),0_4px_20px_rgba(0,0,0,0.5)]
          hover:shadow-[0_0_50px_rgba(0,255,0,0.5),0_8px_30px_rgba(0,0,0,0.7)]
          transition-all duration-300 overflow-hidden
          border border-[#00ff00]/30
          ${isDraggable ? "ring-2 ring-[#00ff00]/60 ring-offset-2 ring-offset-background scale-105" : ""}
        `}>
          {/* Scan line animation */}
          <motion.div
            className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#00ff00] to-transparent"
            animate={{
              y: ["0%", "100%"],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Bot Icon с пульсацией */}
          <motion.div
            className="relative z-10"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Bot 
              className="w-9 h-9 text-[#00ff00]" 
              strokeWidth={2}
              style={{
                filter: "drop-shadow(0 0 8px rgba(0,255,0,0.6)) drop-shadow(0 0 15px rgba(0,255,0,0.4))",
              }}
            />
          </motion.div>

          {/* Online indicator */}
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-black rounded-full border border-[#00ff00]/50 flex items-center justify-center">
            <motion.div
              className="w-2 h-2 rounded-full bg-[#00ff00]"
              animate={{
                scale: [1, 1.4, 1],
                boxShadow: [
                  "0 0 5px rgba(0,255,0,0.6)",
                  "0 0 12px rgba(0,255,0,1)",
                  "0 0 5px rgba(0,255,0,0.6)",
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          {/* Corner accents */}
          <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-[#00ff00]/40" />
          <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-[#00ff00]/40" />
          <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-[#00ff00]/40" />
          <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-[#00ff00]/40" />
        </div>
      </motion.div>

      {/* Chat Dialog */}
      <AIChatDialog open={isChatOpen} onOpenChange={setIsChatOpen} />
    </>
  );
};
