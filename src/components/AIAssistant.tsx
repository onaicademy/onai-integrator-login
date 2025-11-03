import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIChat } from "./AIChat";

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const savedPosition = localStorage.getItem("ai-assistant-position");
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isOpen) return;

    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    longPressTimer.current = setTimeout(() => {
      setIsDragging(true);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isOpen) return;

    const touch = e.touches[0];
    dragStart.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };

    longPressTimer.current = setTimeout(() => {
      setIsDragging(true);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    if (isDragging) {
      localStorage.setItem("ai-assistant-position", JSON.stringify(position));
      setIsDragging(false);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;

    const maxX = window.innerWidth - 56;
    const maxY = window.innerHeight - 56;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.current.x;
    const newY = touch.clientY - dragStart.current.y;

    const maxX = window.innerWidth - 56;
    const maxY = window.innerHeight - 56;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [isDragging, position]);

  const getChatPosition = () => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const chatWidth = 400;
    const chatHeight = 600;

    const showLeft = position.x + 56 + chatWidth > windowWidth;
    const showTop = position.y + chatHeight > windowHeight;

    return {
      right: showLeft ? windowWidth - position.x : "auto",
      left: showLeft ? "auto" : position.x + 56 + 12,
      bottom: showTop ? windowHeight - position.y - 56 : "auto",
      top: showTop ? "auto" : position.y,
    };
  };

  const chatPosition = getChatPosition();

  return (
    <>
      <Button
        ref={buttonRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        className={`h-14 w-14 rounded-full bg-[#B1FF32] hover:bg-[#B1FF32]/90 text-black shadow-lg z-50 transition-all duration-300 ${
          isDragging
            ? "scale-110 animate-pulse"
            : "hover:scale-110"
        }`}
        size="icon"
      >
        {isDragging ? (
          <Move className="h-6 w-6" />
        ) : isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>

      {!isDragging && !isOpen && (
        <div
          style={{
            position: "fixed",
            left: `${position.x + 70}px`,
            top: `${position.y + 10}px`,
          }}
          className="bg-zinc-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none opacity-0 hover:opacity-100 transition-opacity z-40"
        >
          Зажми чтобы передвинуть
        </div>
      )}

      {isOpen && !isDragging && (
        <div
          style={{
            position: "fixed",
            ...chatPosition,
            width: "400px",
            height: "600px",
          }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="bg-zinc-800/50 p-4 border-b border-zinc-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#B1FF32] flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">AI Помощник</h3>
                  <p className="text-xs text-zinc-400">Всегда на связи</p>
                </div>
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <AIChat />
        </div>
      )}
    </>
  );
};

