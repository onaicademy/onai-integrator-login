import { Button } from "@/components/ui/button";
import { OnAILogo } from "@/components/OnAILogo";
import { motion } from "framer-motion";
import { Fingerprint } from "lucide-react";

interface StickyHeaderProps {
  onOpenModal: () => void;
  spotsLeft: number;
}

const StickyHeader = ({ onOpenModal, spotsLeft }: StickyHeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 border-b border-[#00ff00]/10">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-7xl 2xl:max-w-[1920px] flex items-center justify-between">
        {/* Full Logo - Compact */}
        <div className="flex items-center h-full">
          <OnAILogo className="h-8 sm:h-9 md:h-10 w-auto" variant="full" />
        </div>

        {/* CTA Button */}
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden md:block text-sm text-gray-400">
            Осталось{" "}
            <motion.span 
              key={spotsLeft}
              initial={{ scale: 1.5, color: "#00ff00" }}
              animate={{ scale: 1, color: "#00ff00" }}
              transition={{ duration: 0.5 }}
              className="text-[#00ff00] font-bold inline-block"
            >
              {spotsLeft}
            </motion.span>
            {" "}мест
          </span>
          <Button
            onClick={onOpenModal}
            className="bg-[#00ff00] hover:bg-[#00ff00]/90 text-black font-bold text-xs sm:text-sm py-1.5 sm:py-2 px-3 sm:px-4 h-auto uppercase tracking-wide relative overflow-visible"
            style={{
              fontFamily: "'Russo One', sans-serif",
            }}
          >
            <span className="relative inline-flex items-center gap-2">
              {/* Отпечаток пальца */}
              <span className="relative inline-block">
                <Fingerprint className="w-4 h-4 sm:w-5 sm:h-5" />
                
                {/* Анимированное подчеркивание - появляется, пауза 2с, появляется, пауза 3с */}
                <motion.span
                  className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-black"
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{
                    scaleX: [0, 1, 1, 0, 0, 0, 1, 1, 0, 0],
                    opacity: [0, 1, 1, 0, 0, 0, 1, 1, 0, 0]
                  }}
                  transition={{
                    duration: 7,
                    times: [0, 0.07, 0.11, 0.14, 0.43, 0.57, 0.64, 0.68, 0.71, 1],
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{ transformOrigin: "left" }}
                />
              </span>
              
              Занять место
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default StickyHeader;

