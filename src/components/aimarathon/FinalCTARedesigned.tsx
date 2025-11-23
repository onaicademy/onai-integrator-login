import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Users, Clock } from "lucide-react";
import { useAlmatyTimer } from "@/hooks/useAlmatyTimer";
import { useSpotsCounter } from "@/hooks/useSpotsCounter";

interface FinalCTAProps {
  onOpenModal: () => void;
}

const FinalCTARedesigned = ({ onOpenModal }: FinalCTAProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const timeLeft = useAlmatyTimer();
  const { spotsLeft, enrolledToday } = useSpotsCounter();

  const formatTime = (num: number) => String(num).padStart(2, '0');

  return (
    <section 
      ref={ref} 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ 
        background: "linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 30%, #151515 50%, #0f0f0f 80%, #050505 100%)",
      }}
    >
      {/* Графитовый фон как в Hero */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Центральное зеленое свечение */}
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 1000px 800px at 50% 50%, rgba(178, 255, 46, 0.15) 0%, rgba(178, 255, 46, 0.08) 35%, transparent 70%)",
          }}
        />
        
        {/* Графитовые линии */}
        <div 
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255, 255, 255, 0.06) 1px, rgba(255, 255, 255, 0.06) 2px, transparent 2px, transparent 8px)",
          }}
        />
        
        {/* Зернистость */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noisefinal'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noisefinal)' opacity='0.5'/%3E%3C/svg%3E')",
            backgroundSize: "150px 150px",
            mixBlendMode: "soft-light",
          }}
        />

        {/* 3D плавающие геометрические фигуры - псевдо-3D */}
        {[
          { shape: "cube", x: "15%", y: "20%", size: 80 },
          { shape: "pyramid", x: "85%", y: "30%", size: 100 },
          { shape: "sphere", x: "10%", y: "70%", size: 70 },
          { shape: "octahedron", x: "90%", y: "75%", size: 90 },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: item.x,
              top: item.y,
              transformStyle: "preserve-3d",
            }}
            animate={{
              y: [0, -25, 0],
              rotateX: [0, 360],
              rotateY: [0, 360],
              rotateZ: [0, 360],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {item.shape === "cube" && (
              <svg width={item.size} height={item.size} viewBox="0 0 100 100" fill="none">
                <path d="M50 10 L80 25 L80 55 L50 70 L20 55 L20 25 Z" stroke="#b2ff2e" strokeWidth="1" fill="#b2ff2e" opacity="0.05"/>
                <path d="M50 10 L50 40 L20 55 L20 25 Z" fill="#b2ff2e" opacity="0.08"/>
                <path d="M50 10 L80 25 L50 40 Z" fill="#b2ff2e" opacity="0.12"/>
                <path d="M50 40 L80 55 L80 25 L50 40" fill="#b2ff2e" opacity="0.10"/>
              </svg>
            )}
            {item.shape === "pyramid" && (
              <svg width={item.size} height={item.size} viewBox="0 0 100 100" fill="none">
                <path d="M50 15 L85 75 L15 75 Z" stroke="#b2ff2e" strokeWidth="1" fill="#b2ff2e" opacity="0.06"/>
                <path d="M50 15 L85 75 L50 55 Z" fill="#b2ff2e" opacity="0.10"/>
                <path d="M50 15 L15 75 L50 55 Z" fill="#b2ff2e" opacity="0.08"/>
              </svg>
            )}
            {item.shape === "sphere" && (
              <svg width={item.size} height={item.size} viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="35" stroke="#b2ff2e" strokeWidth="1" fill="#b2ff2e" opacity="0.05"/>
                <ellipse cx="50" cy="50" rx="35" ry="15" stroke="#b2ff2e" strokeWidth="1" fill="none" opacity="0.15"/>
                <ellipse cx="50" cy="50" rx="15" ry="35" stroke="#b2ff2e" strokeWidth="1" fill="none" opacity="0.15"/>
              </svg>
            )}
            {item.shape === "octahedron" && (
              <svg width={item.size} height={item.size} viewBox="0 0 100 100" fill="none">
                <path d="M50 10 L80 50 L50 90 L20 50 Z" stroke="#b2ff2e" strokeWidth="1" fill="#b2ff2e" opacity="0.05"/>
                <path d="M50 10 L80 50 L50 50 Z" fill="#b2ff2e" opacity="0.12"/>
                <path d="M50 50 L80 50 L50 90 Z" fill="#b2ff2e" opacity="0.08"/>
                <path d="M50 10 L20 50 L50 50 Z" fill="#b2ff2e" opacity="0.10"/>
              </svg>
            )}
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 relative z-10 max-w-6xl py-12 sm:py-16">
        
        {/* Заголовок - драматичный */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 sm:mb-14 md:mb-16"
        >
          <h2 
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase leading-none mb-4"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              background: "linear-gradient(135deg, #e8e8e8 0%, #ffffff 50%, #b2ff2e 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 40px rgba(178, 255, 46, 0.2))",
            }}
          >
            ПОСЛЕДНИЙ
            <br />
            ШАНС
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-400" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
            попасть в <span className="text-[#b2ff2e] font-bold">3-й поток</span>
          </p>
        </motion.div>

        {/* Премиальная центральная карточка */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div 
            className="relative bg-gradient-to-br from-[#1f1f1f] via-[#151515] to-[#0a0a0a] rounded-3xl overflow-hidden border border-white/10"
            style={{
              boxShadow: `
                0 60px 120px rgba(0, 0, 0, 0.6),
                0 30px 60px rgba(0, 0, 0, 0.4),
                inset 0 3px 0 rgba(255, 255, 255, 0.05),
                inset 0 -3px 0 rgba(0, 0, 0, 0.6),
                0 0 120px rgba(178, 255, 46, 0.12)
              `,
            }}
          >
            {/* Светящаяся линия сверху */}
            <div 
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: "linear-gradient(90deg, transparent 0%, #b2ff2e 20%, #b2ff2e 80%, transparent 100%)",
                boxShadow: "0 0 30px rgba(178, 255, 46, 0.8), 0 5px 20px rgba(178, 255, 46, 0.4)",
              }}
            />

            <div className="p-8 sm:p-10 md:p-14 lg:p-16 space-y-8 sm:space-y-10">
              
              {/* Timer - премиум блоки */}
              <div>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Clock className="w-5 h-5 text-[#b2ff2e]" />
                  <span className="text-sm uppercase tracking-widest text-gray-500" style={{ fontFamily: "'Inter', sans-serif" }}>
                    До закрытия набора
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 max-w-3xl mx-auto">
                  {[
                    { value: timeLeft.hours, label: "ЧАСОВ" },
                    { value: timeLeft.minutes, label: "МИНУТ" },
                    { value: timeLeft.seconds, label: "СЕКУНД" },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="relative bg-black/60 rounded-2xl p-4 sm:p-5 md:p-6 border-2 border-[#b2ff2e]/25"
                      style={{
                        boxShadow: `
                          inset 0 2px 0 rgba(178, 255, 46, 0.1),
                          inset 0 -2px 0 rgba(0, 0, 0, 0.8),
                          0 10px 30px rgba(0, 0, 0, 0.5)
                        `,
                      }}
                    >
                      <motion.div
                        key={item.value}
                        initial={{ scale: 1.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-center leading-none mb-2"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          color: "#ffffff",
                          textShadow: "0 0 40px rgba(178, 255, 46, 0.3), 0 5px 15px rgba(0, 0, 0, 0.8)",
                        }}
                      >
                        {formatTime(item.value)}
                      </motion.div>
                      <div 
                        className="text-xs sm:text-sm font-bold text-gray-500 text-center uppercase tracking-wider"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {item.label}
                      </div>

                      {/* Тонкая зеленая подсветка снизу */}
                      <div 
                        className="absolute bottom-0 left-1/4 right-1/4 h-px bg-[#b2ff2e]/40"
                        style={{
                          boxShadow: "0 0 10px rgba(178, 255, 46, 0.5)",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Цена - ЭКСКЛЮЗИВНЫЙ блок */}
              <div className="relative">
                <div 
                  className="relative bg-gradient-to-br from-black/80 to-black/40 rounded-2xl border-2 border-[#b2ff2e]/40 p-6 sm:p-8 md:p-10 overflow-hidden"
                  style={{
                    boxShadow: `
                      0 30px 80px rgba(0, 0, 0, 0.6),
                      inset 0 2px 0 rgba(178, 255, 46, 0.15),
                      inset 0 -2px 0 rgba(0, 0, 0, 0.8),
                      0 0 100px rgba(178, 255, 46, 0.2)
                    `,
                  }}
                >
                  {/* Декоративные углы */}
                  <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-[#b2ff2e]/60 rounded-tl-2xl" />
                  <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-[#b2ff2e]/60 rounded-br-2xl" />
                  
                  <div className="relative z-10 text-center">
                    <p className="text-sm sm:text-base text-gray-500 uppercase tracking-widest mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Эксклюзивная цена
                    </p>
                    <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8">
                      <span 
                        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          textShadow: "0 5px 20px rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        $10
                      </span>
                      <div 
                        className="text-3xl sm:text-4xl font-light text-gray-500"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        /
                      </div>
                      <span 
                        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          textShadow: "0 5px 20px rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        5000₸
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Статистика - горизонтальная линия */}
              <div className="flex items-stretch justify-center gap-1">
                {/* Осталось мест */}
                <div 
                  className="flex-1 max-w-xs relative bg-gradient-to-br from-black/70 to-black/30 backdrop-blur-sm rounded-xl p-5 sm:p-6 border border-[#b2ff2e]/20"
                  style={{
                    boxShadow: "inset 0 1px 0 rgba(178, 255, 46, 0.1), 0 5px 20px rgba(0, 0, 0, 0.4)",
                  }}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#b2ff2e]/5 rounded-full blur-2xl" />
                  <div className="relative z-10 text-center">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Осталось
                    </p>
                    <motion.div 
                      key={spotsLeft}
                      initial={{ scale: 1.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-5xl sm:text-6xl md:text-7xl font-black text-[#b2ff2e] mb-1"
                      style={{ 
                        fontFamily: "'Inter', sans-serif",
                        textShadow: "0 0 30px rgba(178, 255, 46, 0.5)",
                      }}
                    >
                      {spotsLeft}
                    </motion.div>
                    <p className="text-sm text-gray-400" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
                      мест
                    </p>
                  </div>
                </div>

                {/* Вертикальный разделитель */}
                <div className="w-px bg-gradient-to-b from-transparent via-[#b2ff2e]/30 to-transparent my-4" />

                {/* Записались сегодня */}
                <div 
                  className="flex-1 max-w-xs relative bg-gradient-to-br from-black/70 to-black/30 backdrop-blur-sm rounded-xl p-5 sm:p-6 border border-[#b2ff2e]/20"
                  style={{
                    boxShadow: "inset 0 1px 0 rgba(178, 255, 46, 0.1), 0 5px 20px rgba(0, 0, 0, 0.4)",
                  }}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#b2ff2e]/5 rounded-full blur-2xl" />
                  <div className="relative z-10 text-center">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Сегодня
                    </p>
                    <motion.div 
                      key={enrolledToday}
                      initial={{ scale: 1.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-5xl sm:text-6xl md:text-7xl font-black text-white mb-1"
                      style={{ 
                        fontFamily: "'Inter', sans-serif",
                        textShadow: "0 5px 20px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      {enrolledToday}
                    </motion.div>
                    <p className="text-sm text-gray-400" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
                      записались
                    </p>
                  </div>
                </div>
              </div>

              {/* Массивная CTA кнопка */}
              <div>
                <Button
                  onClick={onOpenModal}
                  className="w-full py-8 sm:py-10 md:py-12 lg:py-14 text-xl sm:text-2xl md:text-3xl font-black text-black transition-all duration-300 rounded-2xl group relative overflow-hidden"
                  style={{
                    background: "linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)",
                    fontFamily: "'Inter', sans-serif",
                    border: "none",
                    letterSpacing: "0.03em",
                  }}
                >
                  <span className="relative z-10 uppercase tracking-wider">
                    Забронировать место
                  </span>
                  {/* Animated shine */}
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%)",
                    }}
                    animate={{
                      x: ["-100%", "200%"],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 1,
                      ease: "linear",
                    }}
                  />
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center justify-center gap-3 text-sm sm:text-base text-gray-500" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
                <div className="flex -space-x-3">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-10 h-10 rounded-full border-2 border-black bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center"
                    >
                      <Users className="w-4 h-4 text-gray-500" />
                    </div>
                  ))}
                </div>
                <span>
                  Присоединяйтесь к <span className="text-white font-semibold">{enrolledToday}</span> участникам
                </span>
              </div>
            </div>

            {/* Графитовая текстура поверх */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-[0.02]"
              style={{
                backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255, 255, 255, 0.1) 2px, rgba(255, 255, 255, 0.1) 4px)",
              }}
            />
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default FinalCTARedesigned;
