import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const programData = [
  {
    day: "ДЕНЬ 1",
    emoji: "🎯",
    title: "Вводный модуль",
    description: "Определим какое направление в ИИ твое",
    details: [
      { icon: "🧠", text: "Анализ твоих навыков" },
      { icon: "🎪", text: "Выбор ниши" },
      { icon: "🛠️", text: "Первые AI инструменты" }
    ],
    color: "#B1FF32",
    gradient: "from-[#B1FF32]/20 to-[#B1FF32]/5"
  },
  {
    day: "ДЕНЬ 2",
    emoji: "🤖",
    title: "Практика по созданию GPT-бота",
    description: "Instagram, WhatsApp | Стоимость от 500$",
    highlight: "$500",
    details: [
      { icon: "⚙️", text: "Настройка ChatGPT API" },
      { icon: "📱", text: "Интеграция с мессенджерами" },
      { icon: "💰", text: "Первый клиент" }
    ],
    color: "#9945FF",
    gradient: "from-purple-500/20 to-purple-500/5"
  },
  {
    day: "ДЕНЬ 3",
    emoji: "🎬",
    title: "Создание видео на 100K+ просмотров",
    description: "Сценарий, создание, монтаж",
    highlight: "100K+",
    details: [
      { icon: "✍️", text: "AI генерация сценариев" },
      { icon: "🎞️", text: "Автомонтаж видео" },
      { icon: "🔥", text: "Вирусные форматы" }
    ],
    color: "#14F195",
    gradient: "from-green-400/20 to-green-400/5"
  },
  {
    day: "LIVE ЭФИР",
    emoji: "🚀",
    title: "Платформа стоимостью $10,000",
    description: "Без навыков программирования",
    highlight: "$10,000",
    details: [
      { icon: "🏗️", text: "No-code платформы" },
      { icon: "⚡", text: "Автоматизация продаж" },
      { icon: "📈", text: "Масштабирование бизнеса" }
    ],
    color: "#F59E0B",
    gradient: "from-amber-500/20 to-amber-500/5"
  },
];

const ProgramSectionOptimized = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Легкий parallax только для фона
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <section ref={ref} className="relative py-12 sm:py-16 px-4 bg-black overflow-hidden">
      {/* Минимальный фон - без анимаций */}
      <motion.div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{ y }}
      >
        <div className="absolute top-10 left-10 w-96 h-96 bg-[#B1FF32]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </motion.div>

      {/* Летающие эмоджи - только в фоне */}
      {['💡', '⚡', '🔮', '💎', '🌟', '🎯'].map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl sm:text-4xl opacity-10 pointer-events-none"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
            rotate: [0, 180, 360],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8 + Math.random() * 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {emoji}
        </motion.div>
      ))}

      <div className="container mx-auto relative z-10 max-w-7xl">
        {/* Заголовок - простая анимация */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black mb-6 text-white"
            style={{
              fontFamily: "'Russo One', sans-serif",
              textShadow: "0 0 40px rgba(177, 255, 50, 0.3)",
            }}
          >
            3 ДНЯ ОБУЧЕНИЯ
            <br />
            <span className="text-[#B1FF32] mt-2 inline-block">
              С ДОМАШНИМИ ЗАДАНИЯМИ
            </span>
          </h2>
        </motion.div>

        {/* Карточки - оптимизированные анимации */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {programData.map((item, index) => {
            const cardRef = useRef<HTMLDivElement>(null);
            
            // Scroll effect для мобильного zoom
            const { scrollYProgress: cardScrollProgress } = useScroll({
              target: cardRef,
              offset: ["start end", "center center", "end start"]
            });
            
            // Mobile: zoom от 0.8 до 1 при приближении к центру
            const mobileScale = useTransform(
              cardScrollProgress,
              [0, 0.5, 1],
              [0.85, 1, 0.85]
            );

            return (
              <motion.div
                key={index}
                ref={cardRef}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { 
                  opacity: 1, 
                  y: 0,
                  transition: {
                    duration: 0.4,
                    delay: 0.1 * index,
                    ease: "easeOut"
                  }
                } : {}}
                // Desktop: 3D hover
                whileHover={{
                  scale: 1.05,
                  rotateX: 5,
                  rotateY: -5,
                  z: 50,
                  transition: {
                    duration: 0.3,
                    ease: "easeOut"
                  }
                }}
                onHoverStart={() => setHoveredCard(index)}
                onHoverEnd={() => setHoveredCard(null)}
                style={{
                  // Mobile: применяем zoom при скролле
                  scale: window.innerWidth < 768 ? mobileScale : 1,
                  transformStyle: "preserve-3d",
                  perspective: "1000px",
                }}
                className="md:scale-100"
              >
                <Card className={`relative bg-gradient-to-br ${item.gradient} backdrop-blur-xl border-2 border-[#B1FF32]/20 p-6 h-full hover:border-[#B1FF32]/60 transition-colors duration-300 overflow-hidden group`}>
                  {/* Glow эффект при hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${item.color}20, transparent 70%)`,
                    }}
                  />

                  {/* Эмоджи - анимация только при hover */}
                  <motion.div
                    className="text-5xl sm:text-6xl mb-4 relative z-10"
                    whileHover={{
                      rotate: [0, -10, 10, -10, 0],
                      scale: 1.2,
                      transition: {
                        duration: 0.5,
                      }
                    }}
                  >
                    {item.emoji}
                  </motion.div>

                  {/* Badge - статичный */}
                  <Badge 
                    className="mb-3 text-xs font-black"
                    style={{
                      backgroundColor: item.color,
                      color: "black",
                      fontFamily: "'Orbitron', sans-serif",
                    }}
                  >
                    {item.day}
                  </Badge>

                  {/* Текст - полностью статичный */}
                  <h3 
                    className="text-xl font-bold text-white mb-2 relative z-10"
                    style={{
                      fontFamily: "'Russo One', sans-serif",
                    }}
                  >
                    {item.title}
                  </h3>

                  <p className="text-sm text-gray-400 mb-4 relative z-10">
                    {item.description}
                  </p>

                  {/* Highlight - статичный */}
                  {item.highlight && (
                    <div
                      className="text-3xl font-black mb-4 relative z-10"
                      style={{
                        color: item.color,
                        textShadow: `0 0 20px ${item.color}80`,
                        fontFamily: "'Russo One', sans-serif",
                      }}
                    >
                      {item.highlight}
                    </div>
                  )}

                  {/* Details - иконки летают при hover */}
                  <div className="space-y-2 relative z-10">
                    {item.details.map((detail, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-sm text-gray-300"
                      >
                        <motion.span
                          className="text-lg"
                          whileHover={{
                            rotate: 360,
                            scale: 1.3,
                            transition: {
                              duration: 0.4,
                            }
                          }}
                        >
                          {detail.icon}
                        </motion.span>
                        <span>{detail.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* 3D depth layer */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ transform: "translateZ(-10px)" }}
                  />
                </Card>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default ProgramSectionOptimized;

