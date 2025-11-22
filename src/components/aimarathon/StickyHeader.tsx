import { Button } from "@/components/ui/button";
import { OnAILogo } from "@/components/OnAILogo";
import { motion } from "framer-motion";

interface StickyHeaderProps {
  onOpenModal: () => void;
  spotsLeft: number;
}

const StickyHeader = ({ onOpenModal, spotsLeft }: StickyHeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 border-b border-[#B1FF32]/10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Full Logo - Compact */}
        <div className="flex items-center">
          <OnAILogo className="h-7 sm:h-8 w-auto" variant="full" />
        </div>

        {/* CTA Button */}
        <div className="flex items-center gap-4">
          <span className="hidden md:block text-sm text-gray-400">
            Осталось{" "}
            <motion.span 
              key={spotsLeft}
              initial={{ scale: 1.5, color: "#B1FF32" }}
              animate={{ scale: 1, color: "#B1FF32" }}
              transition={{ duration: 0.5 }}
              className="text-[#B1FF32] font-bold inline-block"
            >
              {spotsLeft}
            </motion.span>
            {" "}мест
          </span>
          <Button
            onClick={onOpenModal}
            className="bg-[#B1FF32] hover:bg-[#B1FF32]/90 text-black font-bold"
          >
            Занять место
          </Button>
        </div>
      </div>
    </header>
  );
};

export default StickyHeader;

