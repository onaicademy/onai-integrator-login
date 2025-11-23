import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { OnAILogo } from "@/components/OnAILogo";

interface HeroSectionFigmaProps {
  onOpenModal: () => void;
}

// Новый Hero Section на основе Figma референса (superwhisper style)
const HeroSectionFigma = ({ onOpenModal }: HeroSectionFigmaProps) => {
  return (
    <section 
      className="relative min-h-screen flex items-center justify-center overflow-hidden" 
      style={{ 
        background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 40%, #0f0f0f 80%, rgba(10, 10, 10, 0.8) 100%)" 
      }}
    >
      {/* Background - графитовый с зеленым свечением */}
      <div className="absolute inset-0">
        {/* Центральное зеленое свечение сверху */}
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 800px 600px at 50% 0%, rgba(178, 255, 46, 0.12) 0%, rgba(178, 255, 46, 0.06) 35%, transparent 70%)",
          }}
        />
        
        {/* Дополнительное свечение слева - оптимизировано */}
        <div 
          className="absolute top-1/4 left-0 w-[500px] h-[500px] pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(178, 255, 46, 0.08) 0%, transparent 60%)",
            filter: "blur(60px)",
            willChange: "auto",
          }}
        />
        
        {/* Дополнительное свечение справа - оптимизировано */}
        <div 
          className="absolute top-1/3 right-0 w-[500px] h-[500px] pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(178, 255, 46, 0.06) 0%, transparent 60%)",
            filter: "blur(80px)",
            willChange: "auto",
          }}
        />
        
        {/* Зеленое свечение внизу для перехода к следующему блоку */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 1200px 400px at 50% 100%, rgba(178, 255, 46, 0.08) 0%, rgba(178, 255, 46, 0.04) 50%, transparent 100%)",
          }}
        />
        
        {/* Графитовые горизонтальные штрихи - как карандашные линии */}
        <div 
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255, 255, 255, 0.06) 1px, rgba(255, 255, 255, 0.06) 2px, transparent 2px, transparent 8px)",
          }}
        />
        
        {/* Графитовые вертикальные прорези */}
        <div 
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255, 255, 255, 0.04) 3px, rgba(255, 255, 255, 0.04) 4px, transparent 4px, transparent 120px)",
          }}
        />
        
        {/* Диагональные графитовые штрихи - более заметные */}
        <div 
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 1px, rgba(255, 255, 255, 0.03) 1px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 40px)",
          }}
        />
        
        {/* Графитовая текстура - крупные неровные линии */}
        <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                180deg,
                transparent,
                transparent 6px,
                rgba(255, 255, 255, 0.02) 6px,
                rgba(255, 255, 255, 0.02) 7px,
                rgba(255, 255, 255, 0.04) 7px,
                rgba(255, 255, 255, 0.04) 8px,
                transparent 8px,
                transparent 15px
              )
            `,
          }}
        />
        
        {/* Зернистость как на SuperWhisper (film grain) - оптимизирована */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E')",
            backgroundSize: "150px 150px",
            mixBlendMode: "soft-light",
            willChange: "auto",
          }}
        />
        
        {/* Мелкие графитовые крапинки - оптимизированы */}
        <div 
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='0.5' fill='white' opacity='0.3'/%3E%3Ccircle cx='45' cy='23' r='0.4' fill='white' opacity='0.25'/%3E%3Ccircle cx='78' cy='15' r='0.6' fill='white' opacity='0.2'/%3E%3Ccircle cx='25' cy='67' r='0.5' fill='white' opacity='0.3'/%3E%3C/svg%3E')",
            backgroundSize: "100px 100px",
            willChange: "auto",
          }}
        />

        {/* 3D плавающие фигуры - легковесные, не перегружают */}
        {[
          { shape: "octahedron", x: "12%", y: "25%", size: 60 },
          { shape: "cube", x: "88%", y: "35%", size: 70 },
          { shape: "pyramid", x: "10%", y: "75%", size: 55 },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left: item.x,
              top: item.y,
            }}
            animate={{
              y: [0, -20, 0],
              rotateX: [0, 360],
              rotateY: [0, 360],
            }}
            transition={{
              duration: 15 + i * 3,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {item.shape === "octahedron" && (
              <svg width={item.size} height={item.size} viewBox="0 0 100 100" fill="none">
                <path d="M50 10 L80 50 L50 90 L20 50 Z" stroke="#b2ff2e" strokeWidth="0.5" fill="#b2ff2e" opacity="0.04"/>
                <path d="M50 10 L80 50 L50 50 Z" fill="#b2ff2e" opacity="0.08"/>
                <path d="M50 50 L80 50 L50 90 Z" fill="#b2ff2e" opacity="0.05"/>
              </svg>
            )}
            {item.shape === "cube" && (
              <svg width={item.size} height={item.size} viewBox="0 0 100 100" fill="none">
                <path d="M50 20 L75 35 L75 60 L50 75 L25 60 L25 35 Z" stroke="#b2ff2e" strokeWidth="0.5" fill="#b2ff2e" opacity="0.04"/>
                <path d="M50 20 L50 45 L25 60 L25 35 Z" fill="#b2ff2e" opacity="0.06"/>
                <path d="M50 20 L75 35 L50 45 Z" fill="#b2ff2e" opacity="0.09"/>
              </svg>
            )}
            {item.shape === "pyramid" && (
              <svg width={item.size} height={item.size} viewBox="0 0 100 100" fill="none">
                <path d="M50 20 L80 75 L20 75 Z" stroke="#b2ff2e" strokeWidth="0.5" fill="#b2ff2e" opacity="0.05"/>
                <path d="M50 20 L80 75 L50 60 Z" fill="#b2ff2e" opacity="0.08"/>
              </svg>
            )}
          </motion.div>
        ))}
      </div>

      {/* Main Content Container - больше воздуха на мобилке */}
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 pt-20 sm:pt-24 md:pt-28 lg:pt-32 xl:pt-36 pb-10 sm:pb-12 md:pb-14 lg:pb-16 z-10 max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl overflow-visible">
        <div className="flex flex-col items-center text-center space-y-8 sm:space-y-9 md:space-y-10 lg:space-y-12 xl:space-y-14 overflow-visible">
          
          {/* Logo onAI с 3D тенью градиентом - увеличенные размеры */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 mb-[-8px] sm:mb-[-10px] md:mb-[-12px] lg:mb-[-14px]"
            style={{
              filter: `
                drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.71))
                drop-shadow(0px 8px 16px rgba(0, 0, 0, 0.64))
                drop-shadow(0px 16px 32px rgba(0, 0, 0, 0.53))
                drop-shadow(0px 24px 48px rgba(0, 0, 0, 0.38))
                drop-shadow(0px 36px 72px rgba(0, 0, 0, 0.23))
                drop-shadow(0px 48px 96px rgba(0, 0, 0, 0.11))
              `,
            }}
          >
            <OnAILogo variant="full" className="h-16 xs:h-20 sm:h-24 md:h-28 lg:h-32 xl:h-36 2xl:h-40 w-auto" />
          </motion.div>

          {/* Главный слоган - двухстрочный */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4"
          >
            <h1
              className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[10rem] font-black text-white uppercase tracking-tighter"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 900,
                letterSpacing: "-2px"
              }}
            >
              ИНТЕГРАТОРЫ
            </h1>
            <p
              className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-medium text-gray-300"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                letterSpacing: "-1px"
              }}
            >
              2000$/мес на ChatGPT
            </p>
          </motion.div>

          {/* Информация (цена и поток) - ПЕРЕД кнопкой */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10"
          >
            {/* Цена */}
            <div className="text-center">
              <p className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold text-white mb-0.5 sm:mb-1">$10</p>
              <p className="text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg text-gray-500">или 5000₸</p>
            </div>

            {/* Разделитель - адаптивная высота */}
            <div className="h-10 sm:h-12 md:h-14 lg:h-16 xl:h-20 w-px bg-gradient-to-b from-transparent via-gray-700 to-transparent"></div>

            {/* Поток */}
            <div className="text-center">
              <p className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-medium text-white mb-0.5 sm:mb-1">3-й поток</p>
              <p className="text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg text-[#b2ff2e]">100 мест</p>
            </div>
          </motion.div>

          {/* CTA кнопка - с иконкой отпечатка пальца */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <Button
              onClick={onOpenModal}
              className="group px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6 lg:px-12 lg:py-7 xl:px-14 xl:py-8 text-sm sm:text-base md:text-lg lg:text-xl font-medium rounded-lg md:rounded-xl flex items-center gap-2 sm:gap-3 hover:scale-105 transition-transform duration-300"
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
          </motion.div>

          {/* Видео - В САМОМ КОНЦЕ согласно ТЗ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl bg-[#0F0F0F]/60 backdrop-blur-sm border border-[#b2ff2e]/20 rounded-xl md:rounded-2xl lg:rounded-3xl overflow-hidden mt-2 sm:mt-3 md:mt-4"
            style={{
              boxShadow: "0 0 30px rgba(178, 255, 46, 0.08), inset 0 0 20px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* Изображение прямого эфира */}
            <div className="relative w-full aspect-video">
              <img 
                src="https://images.unsplash.com/photo-1590650046871-92c887180603?w=1200&h=675&fit=crop&q=80" 
                alt="Прямой эфир с основателями"
                className="w-full h-full object-cover"
              />
              {/* Оверлей с градиентом */}
              <div 
                className="absolute inset-0" 
                style={{
                  background: "linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.3) 100%)"
                }}
              />
              {/* YouTube play button - адаптивные размеры */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 rounded-full bg-[#b2ff2e]/90 backdrop-blur-sm flex items-center justify-center cursor-pointer"
                  style={{
                    boxShadow: "0 0 30px rgba(178, 255, 46, 0.4)",
                  }}
                >
                  {/* Треугольник play */}
                  <svg 
                    className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-10 xl:h-10 ml-0.5 sm:ml-1" 
                    viewBox="0 0 24 24" 
                    fill="#000000"
                  >
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </motion.div>
              </div>
              {/* Бейдж "LIVE" */}
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 px-2 py-1 sm:px-3 sm:py-1.5 bg-red-600 text-white text-[10px] sm:text-xs font-bold uppercase rounded flex items-center gap-1 sm:gap-1.5">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></span>
                LIVE
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default HeroSectionFigma;

