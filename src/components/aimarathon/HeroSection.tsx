import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Zap, Users, ChevronDown } from "lucide-react";
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
          <div className="absolute inset-0 bg-gradient-to-br from-[#B1FF32]/10 via-transparent to-transparent" />
          
          {/* Particles */}
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[#B1FF32]/30 rounded-full"
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
              className="order-1 xl:order-1 space-y-6 md:space-y-8"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Badge с неоном */}
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <Badge 
                  className="text-sm px-6 py-2.5 bg-[#B1FF32] text-black font-black uppercase tracking-wider"
                  style={{
                    boxShadow: "0 0 30px rgba(177, 255, 50, 0.6), inset 0 0 10px rgba(0, 0, 0, 0.2)"
                  }}
                >
                  <Zap className="w-4 h-4 inline mr-2" />
                  3-Й ПОТОК
                </Badge>
              </motion.div>

              {/* Киберпанк заголовок */}
              <div className="space-y-4">
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl xl:text-7xl 2xl:text-8xl font-black text-white leading-none tracking-tight"
                  style={{
                    fontFamily: "'Russo One', sans-serif",
                    textShadow: "0 0 40px rgba(177, 255, 50, 0.3)",
                  }}
                >
                  ИНТЕГРАТОРЫ
                </motion.h1>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="relative inline-block"
                >
                  {/* Неоновое свечение за текстом */}
                  <div 
                    className="absolute inset-0 blur-3xl opacity-60"
                    style={{
                      background: "radial-gradient(circle, #B1FF32 0%, transparent 70%)",
                    }}
                  />
                  <h2
                    className="relative text-5xl xs:text-6xl sm:text-7xl md:text-8xl xl:text-9xl font-black text-[#B1FF32]"
                    style={{
                      fontFamily: "'Russo One', sans-serif",
                      textShadow: "0 0 80px rgba(177, 255, 50, 0.8), 0 0 120px rgba(177, 255, 50, 0.4)",
                      WebkitTextStroke: "2px rgba(177, 255, 50, 0.3)",
                    }}
                  >
                    2000$
                  </h2>
                </motion.div>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-base xs:text-lg sm:text-xl md:text-2xl xl:text-3xl text-gray-300 font-bold"
                  style={{
                    fontFamily: "'Orbitron', sans-serif",
                    letterSpacing: "0.05em",
                  }}
                >
                  В МЕСЯЦ НА CHATGPT
                </motion.p>
              </div>

              {/* Геймификация: статистика */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="grid grid-cols-3 gap-4"
              >
                <Card className="bg-black/60 border-[#B1FF32]/30 p-4 text-center hover:border-[#B1FF32] transition-colors">
                  <div className="text-3xl font-black text-[#B1FF32]">4</div>
                  <div className="text-xs text-gray-400 mt-1">ДНЯ</div>
                </Card>
                <Card className="bg-black/60 border-[#B1FF32]/30 p-4 text-center hover:border-[#B1FF32] transition-colors">
                  <div className="text-3xl font-black text-[#B1FF32]">100</div>
                  <div className="text-xs text-gray-400 mt-1">МЕСТ</div>
                </Card>
                <Card className="bg-black/60 border-[#B1FF32]/30 p-4 text-center hover:border-[#B1FF32] transition-colors">
                  <motion.div 
                    key={spotsLeft}
                    initial={{ scale: 1.3, color: "#B1FF32" }}
                    animate={{ scale: 1, color: "#B1FF32" }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="text-3xl font-black text-[#B1FF32]"
                  >
                    {spotsLeft}
                  </motion.div>
                  <div className="text-xs text-gray-400 mt-1">ОСТАЛОСЬ</div>
                </Card>
              </motion.div>

              {/* Цена - Двойной блок */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="relative grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {/* 5000₸ - Главная цена для Казахстана */}
                <Card className="bg-gradient-to-br from-[#0a1f0a] via-black to-[#0a1f0a] border-[#B1FF32] border-2 p-6 hover:border-[#B1FF32] hover:shadow-[0_0_30px_rgba(177,255,50,0.3)] transition-all group relative overflow-hidden">
                  {/* Badge "🇰🇿" + Скидка */}
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-2">
                    <Badge className="bg-[#B1FF32] text-black text-xs font-bold">🇰🇿 KZ</Badge>
                    <Badge className="bg-red-500 text-white text-xs font-bold">-97% 🔥</Badge>
                  </div>
                  
                  <div className="flex flex-col items-start">
                    <span className="text-red-500/80 line-through text-xl font-bold">150,000₸</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span
                        className="text-5xl xl:text-6xl font-black text-[#B1FF32]"
                        style={{
                          textShadow: "0 0 40px rgba(177, 255, 50, 0.6)",
                          fontFamily: "'Russo One', sans-serif",
                        }}
                      >
                        5000₸
                      </span>
                      <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                        <AnimatedArrow className="w-8 h-8" color="#B1FF32" />
                      </div>
                    </div>
                    <p className="text-[#B1FF32]/80 mt-2 text-sm font-medium">
                      Цена для Казахстана
                    </p>
                  </div>
                </Card>

                {/* $10 - Международная цена */}
                <Card className="bg-gradient-to-br from-black to-[#0a1f0a] border-[#B1FF32] border-2 p-6 hover:border-[#B1FF32] hover:shadow-[0_0_30px_rgba(177,255,50,0.3)] transition-all group relative overflow-hidden">
                  {/* Badge "WORLD" + Скидка */}
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-2">
                    <Badge className="bg-white text-black text-xs font-bold">🌍 WORLD</Badge>
                    <Badge className="bg-red-500 text-white text-xs font-bold">-97% 🔥</Badge>
                  </div>
                  
                  <div className="flex flex-col items-start">
                    <span className="text-red-500/80 line-through text-xl font-bold">$300</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span
                        className="text-5xl xl:text-6xl font-black text-white"
                        style={{
                          textShadow: "0 0 30px rgba(255, 255, 255, 0.4)",
                          fontFamily: "'Russo One', sans-serif",
                        }}
                      >
                        $10
                      </span>
                      <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                        <AnimatedArrow className="w-8 h-8" color="white" />
                      </div>
                    </div>
                    <p className="text-gray-400 mt-2 text-sm font-medium">
                      💫 Международная цена
                    </p>
                  </div>
                </Card>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="space-y-4"
              >
                <Button
                  onClick={onOpenModal}
                  className="w-full py-8 text-xl font-black bg-[#B1FF32] hover:bg-[#9FE62C] text-black transition-all duration-300 uppercase tracking-wider"
                  style={{
                    boxShadow: "0 0 40px rgba(177, 255, 50, 0.4), inset 0 0 20px rgba(0, 0, 0, 0.1)",
                    fontFamily: "'Russo One', sans-serif",
                  }}
                >
                  <Zap className="w-6 h-6 inline mr-3" />
                  ЗАНЯТЬ МЕСТО →
                </Button>
                
                <motion.div 
                  className="flex items-center justify-center gap-2 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                >
                  <Users className="w-5 h-5 text-[#B1FF32]" />
                  <span className="text-gray-400">
                    <motion.span 
                      key={enrolledToday}
                      initial={{ scale: 1.5, color: "#B1FF32" }}
                      animate={{ scale: 1, color: "#9CA3AF" }}
                      transition={{ duration: 0.5 }}
                      className="font-bold text-[#B1FF32]"
                    >
                      {enrolledToday}
                    </motion.span>
                    {" "}человек записались сегодня 🎉
                  </span>
                </motion.div>
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

        {/* Scroll Indicator - Moved higher to avoid text overlap */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-0"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="w-8 h-8 text-[#B1FF32]/40" />
          </motion.div>
        </motion.div>
      </section>
    </>
  );
};

export default HeroSection;
