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
    project: "Оплата за услуги консультационные в области технологий",
    image: "/images/cases/case1.png",
  },
  {
    id: 2,
    earnings: "250,000₸",
    duration: "04 марта 2025",
    project: "Оплата за профессиональные, научные и технические услуги",
    image: "/images/cases/case2.png",
  },
  {
    id: 3,
    earnings: "300,000₸",
    duration: "3 мин назад",
    project: "Kaspi Gold - Пополнение",
    image: "/images/cases/case3.png",
  },
  {
    id: 4,
    earnings: "250,000₸",
    duration: "Переписка",
    project: "Обсуждение проекта",
    image: "/images/cases/case4.png",
  },
  {
    id: 5,
    earnings: "150,000₸",
    duration: "04 марта 2025",
    project: "За профессиональные, научные и технические услуги. Настройка Whatsapp чатбота",
    image: "/images/cases/case5.png",
  },
  {
    id: 6,
    earnings: "100,000₸",
    duration: "17 февраля 2025",
    project: "Настройка Whatsapp чатбота на базе модуля. Платежи за профессиональные услуги",
    image: "/images/cases/case6.png",
  },
  {
    id: 7,
    earnings: "100,000₸",
    duration: "05 марта 2025",
    project: "Счет на оплату. Платежи за профессиональные, научные и технические услуги",
    image: "/images/cases/case7.png",
  },
  {
    id: 8,
    earnings: "550,000₸",
    duration: "Переговоры",
    project: "Договорился на 550k",
    image: "/images/cases/case8.png",
  },
  {
    id: 9,
    earnings: "150,000₸",
    duration: "Оплата за бота",
    project: "По 120тыс в мес. Бот после подключения и теста 150 000 оплатят",
    image: "/images/cases/case9.png",
  },
  {
    id: 10,
    earnings: "200,000₸",
    duration: "Удаленная оплата",
    project: "Сегодня закрыл своего первого клиента",
    image: "/images/cases/case10.png",
  },
  {
    id: 11,
    earnings: "400,000₸",
    duration: "Договор на бота",
    project: "Еду подписывать документы на бота 400 тыс закрываю",
    image: "/images/cases/case11.png",
  },
  {
    id: 12,
    earnings: "400,000₸",
    duration: "06 декабря 2024",
    project: "Пополнения. Первая победа по продаже ассистента",
    image: "/images/cases/case12.png",
  },
  {
    id: 13,
    earnings: "350,000₸",
    duration: "Продажа бота",
    project: "Продал бота своему клиенту и будет удобно вести бизнес",
    image: "/images/cases/case13.png",
  },
  {
    id: 14,
    earnings: "500,000₸",
    duration: "Проект",
    project: "Крупный проект",
    image: "/images/cases/case14.jpg",
  },
  {
    id: 15,
    earnings: "300,000₸",
    duration: "Разработка",
    project: "Техническая разработка",
    image: "/images/cases/case15.png",
  },
  {
    id: 16,
    earnings: "150,000₸",
    duration: "За бота для клиники",
    project: "Салам всем, клиента закрываем я чето сюда ниче не отправил",
    image: "/images/cases/case16.png",
  },
  {
    id: 17,
    earnings: "100,000₸",
    duration: "Предоплата",
    project: "Пока только пред.оплата на 100k. Пополнение: 100 000 ₸",
    image: "/images/cases/case17.jpg",
  },
  {
    id: 18,
    earnings: "378,000₸",
    duration: "Продажа бота",
    project: "Продал бота для мебельной компании, а в следующем месяце подключим анализ звонков",
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
    <section ref={sectionRef} className="relative py-12 sm:py-16 md:py-20 bg-black overflow-hidden">
      <div className="container mx-auto px-3 sm:px-4 max-w-7xl 2xl:max-w-[1920px]">
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
            className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black mb-4 sm:mb-6 text-white"
            style={{
              fontFamily: "'Russo One', sans-serif",
              textShadow: "0 0 32px rgba(0, 255, 0, 0.24)",
            }}
            whileHover={{
              scale: 1.05,
              textShadow: "0 0 48px rgba(0, 255, 0, 0.4)",
              transition: { duration: 0.3 },
            }}
          >
            Часть наших кейсов
          </motion.h2>
          <motion.p
            className="text-base sm:text-lg md:text-xl text-gray-400 mb-4 sm:mb-6"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
            initial={{ opacity: 0 }}
            animate={sectionInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Реальные результаты реальных людей
          </motion.p>
          <motion.div
            className="w-16 sm:w-20 md:w-24 h-1 bg-[#00ff00] mx-auto"
            initial={{ width: 0 }}
            animate={sectionInView ? { width: "auto" } : {}}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{
              boxShadow: "0 0 20px rgba(177, 255, 50, 0.6)",
            }}
          />
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
                            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#00ff00]"
                            style={{
                              fontFamily: "'Russo One', sans-serif",
                              textShadow: "0 0 16px rgba(0, 255, 0, 0.48)",
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
                          className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#00ff00] via-[#00ff00] to-transparent"
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
              className="w-14 h-14 rounded-full bg-[#00ff00]/20 backdrop-blur-xl border-2 border-[#00ff00]/50 flex items-center justify-center text-[#00ff00] hover:bg-[#00ff00]/40 transition-all pointer-events-auto"
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
              className="w-14 h-14 rounded-full bg-[#00ff00]/20 backdrop-blur-xl border-2 border-[#00ff00]/50 flex items-center justify-center text-[#00ff00] hover:bg-[#00ff00]/40 transition-all pointer-events-auto"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                boxShadow: "0 0 30px rgba(177, 255, 50, 0.4)",
              }}
            >
              <ChevronRight className="w-8 h-8" />
            </motion.button>
          </div>

          {/* Swipe Hint (Mobile) */}
          <motion.div
            className="md:hidden absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-none z-20"
            initial={{ opacity: 0, y: 20 }}
            animate={
              sectionInView
                ? {
                    opacity: [0, 1, 1, 0],
                    y: [20, 0, 0, -10],
                    x: [0, 30, 30, 60],
                  }
                : {}
            }
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
              ease: "easeInOut",
            }}
          >
            <motion.div
              className="text-5xl"
              animate={{
                x: [0, 20, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              👉
            </motion.div>
            <motion.div
              className="w-24 h-1 bg-gradient-to-r from-[#00ff00] to-transparent rounded-full"
              style={{
                boxShadow: "0 0 15px rgba(177, 255, 50, 0.8)",
              }}
              animate={{
                scaleX: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          {/* Dots Indicators */}
          <div className="flex justify-center mt-8 sm:mt-10 gap-2 sm:gap-3">
            {casesData.map((_, index) => (
              <motion.button
                key={index}
                className={`h-2 sm:h-3 rounded-full transition-all duration-300 ${
                  index === selectedIndex
                    ? "bg-[#00ff00] w-8 sm:w-12"
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
