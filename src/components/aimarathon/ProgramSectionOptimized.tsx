import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

const programData = [
  {
    day: "ДЕНЬ 1",
    emoji: "🎯",
    title: "Вводный модуль",
    description: "Определим какое направление в ИИ твое",
    color: "#b2ff2e",
    gradient: "from-[#b2ff2e]/20 to-[#b2ff2e]/5"
  },
  {
    day: "ДЕНЬ 2",
    emoji: "🤖",
    title: "Практика по созданию GPT-бота",
    description: "Instagram, WhatsApp | Стоимость от 500$",
    color: "#b2ff2e",
    gradient: "from-[#b2ff2e]/20 to-[#b2ff2e]/5"
  },
  {
    day: "ДЕНЬ 3",
    emoji: "🎬",
    title: "Практика по созданию видео на 100 000 просмотров",
    description: "Сценарий, создание, монтаж",
    color: "#b2ff2e",
    gradient: "from-[#b2ff2e]/20 to-[#b2ff2e]/5"
  },
  {
    day: "LIVE ЭФИР",
    emoji: "🚀",
    title: "Заключительный прямой эфир с основателями академии",
    description: "Как создать платформу стоимостью 10 000$ без навыков программирования",
    color: "#b2ff2e",
    gradient: "from-[#b2ff2e]/20 to-[#b2ff2e]/5"
  },
];

interface ProgramSectionOptimizedProps {
  onOpenModal?: () => void;
}

const ProgramSectionOptimized = ({ onOpenModal }: ProgramSectionOptimizedProps = {}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section 
      ref={ref} 
      className="relative pt-12 sm:pt-16 md:pt-20 lg:pt-24 pb-16 sm:pb-20 md:pb-24 lg:pb-28 px-4 overflow-hidden"
      style={{ 
        background: "linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 50%, #2a2a2a 100%)" 
      }}
    >
      {/* Графитовый фон - как в Hero */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Зеленое свечение */}
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 800px 600px at 50% 50%, rgba(178, 255, 46, 0.08) 0%, rgba(178, 255, 46, 0.04) 35%, transparent 70%)",
          }}
        />
        
        {/* Графитовые линии */}
        <div 
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255, 255, 255, 0.06) 1px, rgba(255, 255, 255, 0.06) 2px, transparent 2px, transparent 8px)",
          }}
        />
        
        {/* Диагональные штрихи */}
        <div 
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 1px, rgba(255, 255, 255, 0.03) 1px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 40px)",
          }}
        />
        
        {/* Зернистость */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise2'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise2)' opacity='0.5'/%3E%3C/svg%3E')",
            backgroundSize: "150px 150px",
            mixBlendMode: "soft-light",
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 relative z-10 max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        {/* Заголовок - минималистичный */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-14 md:mb-16 lg:mb-18"
        >
          <h2
            className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-tight"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              letterSpacing: "-1.5px"
            }}
          >
            3 дня обучения
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-400 mt-3 sm:mt-4 md:mt-6" style={{ fontFamily: "'Inter', sans-serif" }}>
            с домашними заданиями
          </p>
        </motion.div>

        {/* Карточки - минималистичный дизайн */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12 md:gap-14 lg:gap-10 xl:gap-12">
          {programData.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { 
                opacity: 1, 
                y: 0,
                transition: {
                  duration: 0.5,
                  delay: 0.15 * index,
                  ease: "easeOut"
                }
              } : {}}
              className="group"
            >
              {/* Минималистичная карточка без рамок */}
              <div className="space-y-5 sm:space-y-6 md:space-y-7">
                {/* Крутая 3D иконка с градиентами */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-16 lg:h-16 xl:w-18 xl:h-18 flex items-center justify-center relative">
                  {index === 0 && (
                    // День 1 - 3D Target/Compass
                    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: "#b2ff2e", stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: "#7acc00", stopOpacity: 1 }} />
                        </linearGradient>
                        <filter id="shadow1">
                          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#b2ff2e" floodOpacity="0.4"/>
                        </filter>
                      </defs>
                      <circle cx="32" cy="32" r="28" fill="url(#grad1)" opacity="0.1" />
                      <circle cx="32" cy="32" r="20" stroke="url(#grad1)" strokeWidth="2" fill="none" filter="url(#shadow1)" />
                      <circle cx="32" cy="32" r="12" stroke="url(#grad1)" strokeWidth="2.5" fill="none" />
                      <circle cx="32" cy="32" r="4" fill="url(#grad1)" filter="url(#shadow1)" />
                      <path d="M32 8 L32 18 M32 46 L32 56 M8 32 L18 32 M46 32 L56 32" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                  {index === 1 && (
                    // День 2 - 3D Bot/Cube
                    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: "#b2ff2e", stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: "#7acc00", stopOpacity: 1 }} />
                        </linearGradient>
                        <filter id="shadow2">
                          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#b2ff2e" floodOpacity="0.5"/>
                        </filter>
                      </defs>
                      <path d="M16 22 L32 12 L48 22 L48 42 L32 52 L16 42 Z" fill="url(#grad2)" opacity="0.15" />
                      <path d="M16 22 L32 32 L48 22 M32 32 L32 52" stroke="url(#grad2)" strokeWidth="2.5" strokeLinecap="round" filter="url(#shadow2)"/>
                      <path d="M16 22 L32 12 L48 22 L48 42 L32 52 L16 42 Z" stroke="url(#grad2)" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
                      <circle cx="24" cy="28" r="2" fill="url(#grad2)"/>
                      <circle cx="40" cy="28" r="2" fill="url(#grad2)"/>
                      <path d="M26 38 L38 38" stroke="url(#grad2)" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                  {index === 2 && (
                    // День 3 - 3D Play/Film
                    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: "#b2ff2e", stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: "#7acc00", stopOpacity: 1 }} />
                        </linearGradient>
                        <filter id="shadow3">
                          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#b2ff2e" floodOpacity="0.5"/>
                        </filter>
                      </defs>
                      <rect x="8" y="16" width="36" height="32" rx="4" fill="url(#grad3)" opacity="0.15"/>
                      <rect x="8" y="16" width="36" height="32" rx="4" stroke="url(#grad3)" strokeWidth="2.5" fill="none" filter="url(#shadow3)"/>
                      <path d="M48 24 L56 18 L56 46 L48 40 Z" fill="url(#grad3)" opacity="0.8" filter="url(#shadow3)"/>
                      <path d="M48 24 L56 18 L56 46 L48 40 Z" stroke="url(#grad3)" strokeWidth="2" fill="none"/>
                      <circle cx="14" cy="22" r="1.5" fill="url(#grad3)"/>
                      <circle cx="38" cy="22" r="1.5" fill="url(#grad3)"/>
                    </svg>
                  )}
                  {index === 3 && (
                    // Live эфир - 3D Broadcast/Waves
                    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: "#b2ff2e", stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: "#7acc00", stopOpacity: 1 }} />
                        </linearGradient>
                        <filter id="shadow4">
                          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#b2ff2e" floodOpacity="0.5"/>
                        </filter>
                      </defs>
                      <circle cx="32" cy="32" r="6" fill="url(#grad4)" filter="url(#shadow4)"/>
                      <circle cx="32" cy="32" r="12" stroke="url(#grad4)" strokeWidth="2.5" fill="none" opacity="0.7"/>
                      <circle cx="32" cy="32" r="18" stroke="url(#grad4)" strokeWidth="2" fill="none" opacity="0.5"/>
                      <circle cx="32" cy="32" r="24" stroke="url(#grad4)" strokeWidth="1.5" fill="none" opacity="0.3"/>
                      <path d="M20 16 A18 18 0 0 1 44 16" stroke="url(#grad4)" strokeWidth="2.5" strokeLinecap="round" filter="url(#shadow4)"/>
                      <path d="M20 48 A18 18 0 0 0 44 48" stroke="url(#grad4)" strokeWidth="2.5" strokeLinecap="round" filter="url(#shadow4)"/>
                    </svg>
                  )}
                </div>

                {/* День - тонкая типографика */}
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-[#b2ff2e] font-semibold uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {item.day}
                  </p>
                  
                  {/* Тонкая линия разделитель */}
                  <div className="w-12 h-px bg-gradient-to-r from-[#b2ff2e]/50 to-transparent"></div>
                </div>

                {/* Заголовок */}
                <h3 
                  className="text-lg sm:text-xl md:text-2xl lg:text-xl xl:text-2xl font-semibold text-white leading-tight"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {item.title}
                </h3>

                {/* Описание */}
                <p className="text-sm sm:text-base md:text-lg lg:text-base text-gray-400 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA и информация - минималистично */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 sm:mt-14 md:mt-16 lg:mt-18 flex flex-col items-center gap-6 sm:gap-7"
        >
          {/* Кнопка как в Hero */}
          <Button
            onClick={onOpenModal}
            className="group px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6 lg:px-12 lg:py-7 text-sm sm:text-base md:text-lg lg:text-xl font-medium rounded-lg md:rounded-xl flex items-center gap-2 sm:gap-3 hover:scale-105 transition-transform duration-300"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              background: "linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)",
              color: "#000000",
              boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.08)",
              border: "none"
            }}
          >
            {/* Иконка отпечатка пальца */}
            <svg 
              className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 group-hover:scale-110 transition-transform" 
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
          </Button>
          
          {/* Информация о местах - минималистично */}
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-500" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
            Всего <span className="text-white font-semibold">100</span> мест
          </p>
        </motion.div>

      </div>
    </section>
  );
};

export default ProgramSectionOptimized;

