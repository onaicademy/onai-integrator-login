import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { useRef, useState, useEffect } from "react";
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

const ProgramSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.1 });
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Parallax effect
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -15]);

  // Mouse move effect for 3D cards
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section ref={ref} className="relative py-16 sm:py-20 px-4 bg-black overflow-hidden">
      {/* 3D Background layers with parallax */}
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        style={{ y }}
      >
        <div className="absolute top-10 left-10 w-96 h-96 bg-[#B1FF32]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </motion.div>

      {/* Floating emoji particles */}
      {['💡', '⚡', '🔮', '💎', '🌟', '🎯'].map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl opacity-20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        >
          {emoji}
        </motion.div>
      ))}

      <div className="container mx-auto relative z-10 max-w-7xl">
        {/* Section Header with 3D effect */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <motion.h2
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black mb-6 text-white relative"
            style={{
              fontFamily: "'Russo One', sans-serif",
              textShadow: "0 0 60px rgba(177, 255, 50, 0.4)",
            }}
            initial={{ opacity: 0, scale: 0.8, rotateX: 45 }}
            animate={isInView ? { opacity: 1, scale: 1, rotateX: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
          >
            <span className="inline-block" style={{ transform: `perspective(1000px) rotateX(${rotateX}deg)` }}>
              3 ДНЯ ОБУЧЕНИЯ
            </span>
            <br />
            <span className="text-[#B1FF32] inline-block mt-2">
              С ДОМАШНИМИ ЗАДАНИЯМИ
            </span>
          </motion.h2>
        </motion.div>

        {/* Cards Grid with 3D hover effects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {programData.map((item, index) => {
            const cardRef = useRef<HTMLDivElement>(null);
            const cardInView = useInView(cardRef, { once: false, amount: 0.3 });

            return (
              <motion.div
                key={index}
                ref={cardRef}
                initial={{ opacity: 0, scale: 0.5, y: 100 }}
                animate={cardInView ? { 
                  opacity: 1, 
                  scale: 1,
                  y: 0,
                  transition: {
                    type: "spring",
                    bounce: 0.6,
                    duration: 1.2,
                    delay: 0.15 * index,
                  }
                } : { opacity: 0, scale: 0.5, y: 100 }}
                whileHover={{
                  scale: 1.05,
                  y: -10,
                  transition: {
                    type: "spring",
                    bounce: 0.5,
                    duration: 0.6,
                  }
                }}
                onHoverStart={() => setHoveredCard(index)}
                onHoverEnd={() => setHoveredCard(null)}
                style={{
                  transformStyle: "preserve-3d",
                  perspective: "1000px",
                }}
              >
                <motion.div
                  className="relative h-full"
                  whileHover={{
                    rotateX: 5,
                    rotateY: -5,
                    z: 50,
                    transition: {
                      type: "spring",
                      bounce: 0.4,
                      duration: 0.5,
                    }
                  }}
                  style={{
                    transformStyle: "preserve-3d",
                  }}
                >
                  <Card className={`relative bg-gradient-to-br ${item.gradient} backdrop-blur-xl border-2 border-[#B1FF32]/20 p-6 h-full hover:border-[#B1FF32]/60 transition-all overflow-hidden group`}>
                    {/* Glow effect on hover */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${item.color}20, transparent 70%)`,
                      }}
                    />

                    {/* Animated emoji */}
                    <motion.div
                      className="text-6xl mb-4 relative z-10"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={cardInView ? {
                        scale: 1,
                        rotate: 0,
                        transition: {
                          type: "spring",
                          bounce: 0.7,
                          duration: 1,
                          delay: 0.15 * index + 0.3,
                        }
                      } : { scale: 0, rotate: -180 }}
                      whileHover={{
                        rotate: [0, -15, 15, -15, 0],
                        scale: 1.3,
                        transition: {
                          type: "spring",
                          bounce: 0.6,
                          duration: 0.6,
                        }
                      }}
                    >
                      {item.emoji}
                    </motion.div>

                    {/* Badge */}
                    <motion.div
                      initial={{ scale: 0, y: -20 }}
                      animate={cardInView ? {
                        scale: 1,
                        y: 0,
                        transition: {
                          type: "spring",
                          bounce: 0.7,
                          duration: 0.8,
                          delay: 0.15 * index + 0.2,
                        }
                      } : { scale: 0, y: -20 }}
                    >
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
                    </motion.div>

                    {/* Title */}
                    <motion.h3 
                      className="text-xl font-bold text-white mb-2 relative z-10"
                      style={{
                        fontFamily: "'Russo One', sans-serif",
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={cardInView ? {
                        opacity: 1,
                        y: 0,
                        transition: {
                          type: "spring",
                          bounce: 0.4,
                          delay: 0.15 * index + 0.35,
                        }
                      } : { opacity: 0, y: 20 }}
                    >
                      {item.title}
                    </motion.h3>

                    {/* Description */}
                    <p className="text-sm text-gray-400 mb-4 relative z-10">
                      {item.description}
                    </p>

                    {/* Highlight */}
                    {item.highlight && (
                      <motion.div
                        className="text-3xl font-black mb-4 relative z-10"
                        style={{
                          color: item.color,
                          textShadow: `0 0 30px ${item.color}80`,
                          fontFamily: "'Russo One', sans-serif",
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={cardInView ? {
                          scale: 1,
                          opacity: 1,
                          transition: {
                            type: "spring",
                            bounce: 0.8,
                            duration: 1,
                            delay: 0.15 * index + 0.5,
                          }
                        } : { scale: 0, opacity: 0 }}
                        whileHover={{
                          scale: [1, 1.2, 1.1, 1.2, 1.1],
                          textShadow: `0 0 50px ${item.color}`,
                          transition: {
                            duration: 0.8,
                            repeat: Infinity,
                          }
                        }}
                      >
                        {item.highlight}
                      </motion.div>
                    )}

                    {/* Details with animated icons */}
                    <div className="space-y-2 relative z-10">
                      {item.details.map((detail, idx) => (
                        <motion.div
                          key={idx}
                          className="flex items-start gap-2 text-sm text-gray-300"
                          initial={{ opacity: 0, x: -50, scale: 0.5 }}
                          animate={cardInView ? { 
                            opacity: 1, 
                            x: 0,
                            scale: 1,
                            transition: {
                              type: "spring",
                              bounce: 0.5,
                              delay: 0.15 * index + 0.6 + idx * 0.1,
                            }
                          } : { opacity: 0, x: -50, scale: 0.5 }}
                        >
                          <motion.span
                            className="text-lg"
                            whileHover={{
                              rotate: 360,
                              scale: 1.5,
                              transition: {
                                type: "spring",
                                bounce: 0.6,
                                duration: 0.6,
                              }
                            }}
                          >
                            {detail.icon}
                          </motion.span>
                          <span>{detail.text}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* 3D depth layers */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ transform: "translateZ(-10px)" }}
                    />
                  </Card>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA hint with floating animation */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8 }}
        >
          <motion.p
            className="text-gray-400 text-lg"
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            💎 Нажми на карточку для деталей
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default ProgramSection;
