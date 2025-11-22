import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Rocket, Users } from "lucide-react";
import { useAlmatyTimer } from "@/hooks/useAlmatyTimer";
import { useSpotsCounter } from "@/hooks/useSpotsCounter";

interface FinalCTAProps {
  onOpenModal: () => void;
}

const FinalCTA = ({ onOpenModal }: FinalCTAProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const timeLeft = useAlmatyTimer();
  const { enrolledToday } = useSpotsCounter();

  const formatTime = (num: number) => String(num).padStart(2, '0');

  return (
    <section ref={ref} className="relative py-32 px-4 overflow-hidden bg-black">

      <div className="container mx-auto text-center relative z-10">
        {/* Simple Icon with animation */}
        <motion.div 
          className="inline-block mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={isInView ? { scale: 1, rotate: 0 } : {}}
          transition={{ 
            duration: 0.8,
            type: "spring",
            stiffness: 200
          }}
        >
          <motion.div 
            className="w-24 h-24 rounded-full bg-[#00ff00] flex items-center justify-center"
            whileHover={{ scale: 1.1, rotate: 10 }}
            transition={{ type: "spring", stiffness: 300 }}
            style={{
              boxShadow: "0 0 40px rgba(177, 255, 50, 0.4)",
            }}
          >
            <Rocket className="w-12 h-12 text-black" />
          </motion.div>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-7xl font-bold mb-8 text-white"
        >
          Последний шанс попасть в поток
        </motion.h2>

        {/* Countdown Timer - minimal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-8"
        >
          <p className="text-xl text-gray-500 mb-6">До закрытия набора</p>
          
          <div className="flex items-center justify-center gap-4 md:gap-8">
            {/* Hours */}
            <div className="bg-[#0F0F0F] border border-[#00ff00]/30 rounded-lg p-6 md:p-8 min-w-[100px] md:min-w-[140px]">
              <div className="text-5xl md:text-7xl font-bold text-[#00ff00]">
                {formatTime(timeLeft.hours)}
              </div>
              <div className="text-sm md:text-base text-gray-600 mt-2">ЧАСОВ</div>
            </div>

            <span className="text-4xl md:text-6xl text-[#00ff00]">:</span>

            {/* Minutes */}
            <div className="bg-[#0F0F0F] border border-[#00ff00]/30 rounded-lg p-6 md:p-8 min-w-[100px] md:min-w-[140px]">
              <div className="text-5xl md:text-7xl font-bold text-[#00ff00]">
                {formatTime(timeLeft.minutes)}
              </div>
              <div className="text-sm md:text-base text-gray-600 mt-2">МИНУТ</div>
            </div>

            <span className="text-4xl md:text-6xl text-[#00ff00]">:</span>

            {/* Seconds */}
            <div className="bg-[#0F0F0F] border border-[#00ff00]/30 rounded-lg p-6 md:p-8 min-w-[100px] md:min-w-[140px]">
              <div className="text-5xl md:text-7xl font-bold text-[#00ff00]">
                {formatTime(timeLeft.seconds)}
              </div>
              <div className="text-sm md:text-base text-gray-600 mt-2">СЕКУНД</div>
            </div>
          </div>
        </motion.div>

        {/* Price Reminder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mb-10"
        >
          <p className="text-6xl md:text-8xl font-bold text-[#00ff00]">
            $10 (5000₸)
          </p>
        </motion.div>

        {/* CTA Button - magnetic */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mb-8"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Button
              onClick={onOpenModal}
              size="lg"
              className="text-2xl px-16 py-10 bg-[#00ff00] hover:bg-[#00ff00] text-black font-bold relative overflow-hidden group"
              style={{
                boxShadow: "0 0 40px rgba(177, 255, 50, 0.4)",
              }}
            >
              <span className="relative z-10">Занять место сейчас →</span>
              <motion.div
                className="absolute inset-0 bg-white"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.5 }}
                style={{ opacity: 0.2 }}
              />
            </Button>
          </motion.div>
        </motion.div>

        {/* Social Proof - Динамический счетчик */}
        <motion.div 
          className="flex items-center justify-center gap-3"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 1.2 }}
        >
          <Users className="w-6 h-6 text-[#00ff00]" />
          <p className="text-base sm:text-lg text-gray-500">
            <motion.span 
              key={enrolledToday}
              initial={{ scale: 1.5, color: "#00ff00" }}
              animate={{ scale: 1, color: "#00ff00" }}
              transition={{ duration: 0.5 }}
              className="text-[#00ff00] font-bold text-xl sm:text-2xl"
            >
              {enrolledToday}
            </motion.span>
            {" "}человек записались сегодня 🎉
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;

