import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Zap, Users, ChevronDown, Globe } from "lucide-react";
import StickyHeader from "./StickyHeader";
import WelcomeVideoPlayer from "./WelcomeVideoPlayer";
import AnimatedArrow from "./AnimatedArrow";
import { useSpotsCounter } from "@/hooks/useSpotsCounter";

interface HeroSectionProps {
  onOpenModal: () => void;
}

const HeroSection = ({ onOpenModal }: HeroSectionProps) => {
  const { spotsLeft, enrolledToday } = useSpotsCounter();

  return (
    <>
      <StickyHeader onOpenModal={onOpenModal} spotsLeft={spotsLeft} />
      
      <section className="relative min-h-screen flex items-center overflow-hidden bg-black pt-24">
        {/* Background Elements */}
        <div className="absolute inset-0">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#b2ff2e]/10 via-transparent to-transparent" />

          {/* Particles */}
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[#b2ff2e]/30 rounded-full"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Main Content - Split Screen */}
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 z-10 max-w-7xl 2xl:max-w-[1920px]">
          <div className="grid xl:grid-cols-2 gap-6 sm:gap-8 md:gap-10 xl:gap-16 2xl:gap-24 items-center min-h-[80vh]">
            
            {/* LEFT SIDE - Content */}
            <motion.div 
              className="order-1 xl:order-1 space-y-5 sm:space-y-6 md:space-y-7"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Badge с неоном */}
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-block"
              >
                <Badge 
                  className="text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-2.5 bg-[#b2ff2e] text-black font-black uppercase tracking-wider inline-flex items-center"
                  style={{
                    boxShadow: "0 0 12px rgba(178, 255, 46, 0.25), inset 0 0 10px rgba(0, 0, 0, 0.2)"
                  }}
                >
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  3-Й ПОТОК САМОГО КАССОВОГО ОБУЧЕНИЯ ОТ ONAI ACADEMY
                </Badge>
              </motion.div>

              {/* Заголовок */}
              <div className="space-y-3 sm:space-y-4">
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-black text-white leading-tight tracking-tight"
                  style={{
                    fontFamily: "'Russo One', sans-serif",
                    textShadow: "0 0 26px rgba(178, 255, 46, 0.19)",
                  }}
                >
                  Интеграторы: 2000$/мес на ChatGPT
                </motion.h1>
                
              </div>


              {/* Цена */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="relative"
              >
                <Card className="bg-gradient-to-br from-[#0a1f0a] via-black to-[#0a1f0a] border-[#b2ff2e] border-2 p-6 sm:p-8 hover:border-[#b2ff2e] hover:shadow-[0_0_30px_rgba(178,255,46,0.3)] transition-all group">
                  <div className="text-center">
                    <p className="text-lg sm:text-xl text-gray-300 mb-4">Цена:</p>
                    <div className="flex items-center justify-center gap-4 sm:gap-6">
                      <div>
                        <span
                          className="text-4xl sm:text-5xl md:text-6xl font-black text-[#b2ff2e] leading-none block"
                          style={{
                            fontFamily: "'Russo One', sans-serif",
                            textShadow: "0 0 24px rgba(178, 255, 46, 0.5)",
                          }}
                        >
                          $10
                        </span>
                      </div>
                      <span className="text-2xl sm:text-3xl text-gray-400 font-medium">или</span>
                      <div>
                        <span
                          className="text-4xl sm:text-5xl md:text-6xl font-black text-[#b2ff2e] leading-none block"
                          style={{
                            fontFamily: "'Russo One', sans-serif",
                            textShadow: "0 0 24px rgba(178, 255, 46, 0.5)",
                          }}
                        >
                          5000₸
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="space-y-3 sm:space-y-4"
              >
                <Button
                  onClick={onOpenModal}
                  className="w-full py-6 sm:py-7 md:py-8 text-base sm:text-lg md:text-xl font-black bg-[#b2ff2e] hover:bg-[#b2ff2e]/90 text-black transition-all duration-300"
                  style={{
                    boxShadow: "0 0 20px rgba(178, 255, 46, 0.3)",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700
                  }}
                >
                  Занять место
                </Button>
              </motion.div>
            </motion.div>

            {/* RIGHT SIDE - Video Player */}
            <motion.div 
              className="order-2 xl:order-2 relative flex items-center justify-center"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              {/* Welcome Video Player */}
              <WelcomeVideoPlayer className="w-full" />
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-16 sm:bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-0"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#b2ff2e]/40" />
          </motion.div>
        </motion.div>
      </section>
    </>
  );
};

export default HeroSection;
