import { Button } from "@/components/ui/button";
import { OnAILogo } from "@/components/OnAILogo";
import { motion } from "framer-motion";

interface StickyHeaderProps {
  onOpenModal: () => void;
  spotsLeft: number;
}

const StickyHeader = ({ onOpenModal, spotsLeft }: StickyHeaderProps) => {
  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 border-b border-[#b2ff2e]/10 backdrop-blur-md"
      style={{
        background: "linear-gradient(180deg, rgba(42, 42, 42, 0.25) 0%, rgba(26, 26, 26, 0.2) 100%)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
      }}
    >
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-7xl 2xl:max-w-[1920px] flex items-center justify-between">
        {/* Full Logo - Compact */}
        <div className="flex items-center h-full">
          <OnAILogo className="h-8 sm:h-9 md:h-10 w-auto" variant="full" />
        </div>

        {/* CTA Button */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          {/* Счетчик мест - ВИДИМЫЙ НА ВСЕХ устройствах */}
          <span className="block text-xs sm:text-sm">
            <span className="hidden sm:inline text-white font-medium">Осталось</span>
            {" "}
            <motion.span 
              key={spotsLeft}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-[#b2ff2e] font-bold text-base sm:text-lg inline-block"
            >
              {spotsLeft}
            </motion.span>
            {" "}
            <span className="text-gray-400 font-light text-xs sm:text-sm">мест</span>
          </span>
          <Button
            onClick={onOpenModal}
            className="group bg-gradient-to-b from-white to-gray-100 hover:from-gray-50 hover:to-gray-200 text-black font-medium text-xs sm:text-sm py-1.5 sm:py-2 px-3 sm:px-4 h-auto tracking-wide relative overflow-visible rounded-lg transition-all duration-300 hover:scale-105"
            style={{
              fontFamily: "'Inter', sans-serif",
              boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.08)",
            }}
          >
            <span className="relative inline-flex items-center gap-2">
              {/* Отпечаток пальца */}
              <svg 
                className="w-3 h-3 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                <path d="M2 12a10 10 0 0 1 18-6" />
                <path d="M2 16h.01" />
                <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
              </svg>
              
              Занять место
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default StickyHeader;

