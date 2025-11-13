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

          {/* Fingerprint SVG */}
          <svg
            className="w-8 h-8 relative z-10 mb-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00ff00"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" opacity="0.8"/>
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" opacity="0.9"/>
            <path d="M17.29 21c.83-2.35 1.48-8.79.48-11.88" opacity="0.7"/>
            <path d="M2 12a10 10 0 0 1 18-6" opacity="0.6"/>
            <path d="M2 16h.01" opacity="0.5"/>
            <path d="M21.8 16c.2-2 .131-5.354 0-6" opacity="0.6"/>
            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" opacity="0.7"/>
            <path d="M8.65 22c.21-.66.45-1.32.57-2" opacity="0.8"/>
            <path d="M9 6.8a6 6 0 0 1 9 5.2v2" opacity="0.6"/>
          </svg>

          {/* AI text */}
          <motion.span
            className="text-sm font-black text-[#00ff00] relative z-10 tracking-wider"
            style={{
              fontFamily: "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              textShadow: "0 0 10px rgba(0,255,0,0.5), 0 0 20px rgba(0,255,0,0.3)",
            }}
            animate={{
              textShadow: [
                "0 0 10px rgba(0,255,0,0.5), 0 0 20px rgba(0,255,0,0.3)",
                "0 0 15px rgba(0,255,0,0.8), 0 0 30px rgba(0,255,0,0.5)",
                "0 0 10px rgba(0,255,0,0.5), 0 0 20px rgba(0,255,0,0.3)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            AI
          </motion.span>

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
