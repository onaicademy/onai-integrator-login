import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Данные кейсов с реальными изображениями
const casesData = [
  {
    id: 1,
    earnings: "1,500,000₸",
    duration: "19 марта 2025",
    project: "Консультация по AI-интеграции для бизнеса",
    image: "/images/cases/case1.png",
  },
  {
    id: 2,
    earnings: "250,000₸",
    duration: "04 марта 2025",
    project: "Продажа WhatsApp бота для автоматизации продаж",
    image: "/images/cases/case2.png",
  },
  {
    id: 3,
    earnings: "300,000₸",
    duration: "3 мин назад",
    project: "Оплата за внедрение GPT-ассистента",
    image: "/images/cases/case3.png",
  },
  {
    id: 4,
    earnings: "250,000₸",
    duration: "Переговоры",
    project: "Договор на автоматизацию бизнеса через Make",
    image: "/images/cases/case4.png",
  },
  {
    id: 5,
    earnings: "150,000₸",
    duration: "04 марта 2025",
    project: "Настройка Telegram бота для клиента",
    image: "/images/cases/case5.png",
  },
  {
    id: 6,
    earnings: "100,000₸",
    duration: "17 февраля 2025",
    project: "Создание AI-чатбота для поддержки клиентов",
    image: "/images/cases/case6.png",
  },
  {
    id: 7,
    earnings: "100,000₸",
    duration: "05 марта 2025",
    project: "Внедрение n8n для автоматизации процессов",
    image: "/images/cases/case7.png",
  },
  {
    id: 8,
    earnings: "550,000₸",
    duration: "Переговоры",
    project: "Договорился на комплексную AI-интеграцию",
    image: "/images/cases/case8.png",
  },
  {
    id: 9,
    earnings: "150,000₸",
    duration: "Оплата за бота",
    project: "Продажа Instagram бота с ежемесячной поддержкой",
    image: "/images/cases/case9.png",
  },
  {
    id: 10,
    earnings: "200,000₸",
    duration: "Удаленная оплата",
    project: "Первый клиент на консультацию по ChatGPT",
    image: "/images/cases/case10.png",
  },
  {
    id: 11,
    earnings: "400,000₸",
    duration: "Договор на бота",
    project: "Подписание контракта на GPT-бота для компании",
    image: "/images/cases/case11.png",
  },
  {
    id: 12,
    earnings: "400,000₸",
    duration: "06 декабря 2024",
    project: "Первая победа — продажа AI-ассистента",
    image: "/images/cases/case12.png",
  },
  {
    id: 13,
    earnings: "350,000₸",
    duration: "Продажа бота",
    project: "Внедрение чат-бота для автоматизации бизнеса",
    image: "/images/cases/case13.png",
  },
  {
    id: 14,
    earnings: "500,000₸",
    duration: "Проект",
    project: "Крупный проект по AI-интеграции",
    image: "/images/cases/case14.jpg",
  },
  {
    id: 15,
    earnings: "300,000₸",
    duration: "Разработка",
    project: "Разработка кастомного AI-решения",
    image: "/images/cases/case15.png",
  },
  {
    id: 16,
    earnings: "150,000₸",
    duration: "За бота для клиники",
    project: "Внедрение бота для медицинской клиники",
    image: "/images/cases/case16.png",
  },
  {
    id: 17,
    earnings: "100,000₸",
    duration: "Предоплата",
    project: "Предоплата за создание Telegram бота",
    image: "/images/cases/case17.jpg",
  },
  {
    id: 18,
    earnings: "378,000₸",
    duration: "Продажа бота",
    project: "WhatsApp бот для мебельной компании + анализ звонков",
    image: "/images/cases/case18.png",
  },
];

const CasesSection = () => {
  const sectionRef = useRef(null);
  const sectionInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    skipSnaps: false,
    dragFree: false,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section 
      ref={sectionRef} 
      className="relative pt-12 sm:pt-16 md:pt-20 lg:pt-24 pb-16 sm:pb-20 md:pb-24 lg:pb-28 px-4 overflow-hidden"
      style={{ 
        background: "linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 30%, #151515 60%, #0f0f0f 90%, #0a0a0a 100%)" 
      }}
    >
      {/* Премиальный графитовый фон */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/3 left-0 right-0 h-2/3"
          style={{
            background: "radial-gradient(ellipse 1200px 600px at 50% 30%, rgba(178, 255, 46, 0.10) 0%, rgba(178, 255, 46, 0.05) 40%, rgba(178, 255, 46, 0.02) 70%, transparent 100%)",
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255, 255, 255, 0.08) 1px, rgba(255, 255, 255, 0.08) 2px, transparent 2px, transparent 12px)",
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise8'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise8)' opacity='0.6'/%3E%3C/svg%3E')",
            backgroundSize: "180px 180px",
            mixBlendMode: "soft-light",
          }}
        />
      </div>

      <div className="container mx-auto px-3 sm:px-4 max-w-7xl 2xl:max-w-[1920px] relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={sectionInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{
            type: "spring",
            bounce: 0.5,
            duration: 1,
          }}
          className="text-center mb-10 sm:mb-12 md:mb-16"
        >
          <motion.h2
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-3"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 900,
              letterSpacing: "-2px",
              background: "linear-gradient(135deg, #ffffff 0%, #f5f5f5 50%, #b2ff2e 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 30px rgba(178, 255, 46, 0.15))",
            }}
          >
            ЧАСТЬ НАШИХ КЕЙСОВ
          </motion.h2>
        </motion.div>

        {/* Carousel */}
        <div className="relative">
          {/* Embla Container */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {casesData.map((caseItem, index) => {
                const isActive = index === selectedIndex;

                return (
                  <motion.div
                    key={caseItem.id}
                    className="flex-[0_0_85%] sm:flex-[0_0_75%] md:flex-[0_0_65%] lg:flex-[0_0_55%] xl:flex-[0_0_45%] min-w-0 px-2 sm:px-3"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={
                      sectionInView
                        ? {
                            opacity: 1,
                            scale: 1,
                            transition: {
                              type: "spring",
                              bounce: 0.4,
                              duration: 0.8,
                              delay: index * 0.05,
                            },
                          }
                        : {}
                    }
                  >
                    <motion.div
                      className="relative h-[550px] sm:h-[600px] md:h-[650px] lg:h-[700px] rounded-3xl overflow-hidden bg-[#0F0F0F]/95 backdrop-blur-xl"
                      animate={
                        isActive
                          ? {
                              scale: 1.05,
                              boxShadow: "0 0 80px rgba(177, 255, 50, 0.4)",
                            }
                          : {
                              scale: 0.95,
                              boxShadow: "0 0 0px rgba(0, 0, 0, 0)",
                            }
                      }
                      transition={{ duration: 0.5 }}
                    >
                      {/* Image */}
                      <div className="absolute inset-0">
                        <img
                          src={caseItem.image}
                          alt={`Case ${caseItem.id}`}
                          className="w-full h-full object-cover"
                          style={{
                            filter: isActive
                              ? "brightness(1.05) contrast(1.05)"
                              : "brightness(0.7) contrast(0.9)",
                          }}
                          loading="lazy"
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                      </div>

                      {/* Text Content */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-10">
                        <motion.div
                          className="flex items-baseline gap-3 mb-3 sm:mb-4"
                          animate={
                            isActive
                              ? { opacity: 1, y: 0 }
                              : { opacity: 0.7, y: 10 }
                          }
                          transition={{ duration: 0.3, delay: 0.1 }}
                        >
                          <span
                            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#b2ff2e]"
                            style={{
                              fontFamily: "'Russo One', sans-serif",
                              textShadow: "0 0 16px rgba(178, 255, 46, 0.48)",
                            }}
                          >
                            {caseItem.earnings}
                          </span>
                          <span
                            className="text-xs sm:text-sm text-gray-400"
                            style={{ fontFamily: "'Orbitron', sans-serif" }}
                          >
                            {caseItem.duration}
                          </span>
                        </motion.div>
                        <motion.p
                          className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed"
                          style={{ fontFamily: "'Orbitron', sans-serif" }}
                          animate={
                            isActive
                              ? { opacity: 1, y: 0 }
                              : { opacity: 0.7, y: 10 }
                          }
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          {caseItem.project}
                        </motion.p>
                      </div>

                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#b2ff2e] via-[#b2ff2e] to-transparent"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.5 }}
                          style={{
                            boxShadow: "0 0 20px rgba(177, 255, 50, 0.8)",
                          }}
                        />
                      )}
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Navigation Arrows (Desktop) */}
          <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 left-0 right-0 justify-between px-4 pointer-events-none z-20">
            <motion.button
              onClick={scrollPrev}
              className="w-14 h-14 rounded-full bg-[#b2ff2e]/20 backdrop-blur-xl border-2 border-[#b2ff2e]/50 flex items-center justify-center text-[#b2ff2e] hover:bg-[#b2ff2e]/40 transition-all pointer-events-auto"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                boxShadow: "0 0 30px rgba(177, 255, 50, 0.4)",
              }}
            >
              <ChevronLeft className="w-8 h-8" />
            </motion.button>
            <motion.button
              onClick={scrollNext}
              className="w-14 h-14 rounded-full bg-[#b2ff2e]/20 backdrop-blur-xl border-2 border-[#b2ff2e]/50 flex items-center justify-center text-[#b2ff2e] hover:bg-[#b2ff2e]/40 transition-all pointer-events-auto"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                boxShadow: "0 0 30px rgba(177, 255, 50, 0.4)",
              }}
            >
              <ChevronRight className="w-8 h-8" />
            </motion.button>
          </div>

          {/* Dots Indicators */}
          <div className="flex justify-center mt-8 sm:mt-10 gap-2 sm:gap-3">
            {casesData.map((_, index) => (
              <motion.button
                key={index}
                className={`h-2 sm:h-3 rounded-full transition-all duration-300 ${
                  index === selectedIndex
                    ? "bg-[#b2ff2e] w-8 sm:w-12"
                    : "bg-gray-600 w-2 sm:w-3"
                }`}
                onClick={() => emblaApi?.scrollTo(index)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                style={{
                  boxShadow:
                    index === selectedIndex
                      ? "0 0 15px rgba(177, 255, 50, 0.6)"
                      : "none",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CasesSection;
