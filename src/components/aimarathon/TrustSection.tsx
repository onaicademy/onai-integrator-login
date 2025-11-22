import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Users, Trophy, UsersRound, Calendar } from "lucide-react";

const statsData = [
  {
    icon: Users,
    number: 750,
    label: "учеников с Казахстана и стран СНГ",
    suffix: "+",
  },
  {
    icon: Trophy,
    number: 100,
    label: "Успешных кейсов",
    suffix: "+",
  },
  {
    icon: UsersRound,
    number: 15,
    label: "Человек в команде",
    suffix: "+",
  },
  {
    icon: Calendar,
    number: 2024,
    label: "Обучаем нейросетям с",
    suffix: "",
  },
];

const AnimatedNumber = ({ value, suffix, isInView }: { value: number; suffix: string; isInView: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, isInView]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
};

const TrustSection = () => {
  const sectionRef = useRef(null);
  const sectionInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section ref={sectionRef} className="relative py-12 sm:py-16 md:py-20 px-3 sm:px-4 bg-black overflow-hidden">
      <div className="container mx-auto max-w-7xl 2xl:max-w-[1920px]">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={sectionInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ 
            type: "spring",
            bounce: 0.5,
            duration: 1 
          }}
          className="text-center mb-12 sm:mb-16 md:mb-20"
        >
          <motion.h2 
            className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black mb-4 sm:mb-6 text-white"
            style={{
              fontFamily: "'Russo One', sans-serif",
              textShadow: "0 0 40px rgba(177, 255, 50, 0.3)",
            }}
            whileHover={{
              scale: 1.05,
              textShadow: "0 0 60px rgba(177, 255, 50, 0.5)",
              transition: { duration: 0.3 }
            }}
          >
            Кто такие onAI
          </motion.h2>
          <motion.div 
            className="w-16 sm:w-20 md:w-24 h-1 bg-[#B1FF32] mx-auto"
            initial={{ width: 0 }}
            animate={sectionInView ? { width: "auto" } : {}}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{
              boxShadow: "0 0 20px rgba(177, 255, 50, 0.6)",
            }}
          />
        </motion.div>

        {/* Stats Grid - with bounce animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {statsData.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5, y: 100 }}
                animate={sectionInView ? { 
                  opacity: 1, 
                  scale: 1,
                  y: 0,
                  transition: {
                    type: "spring",
                    bounce: 0.6,
                    duration: 1.2,
                    delay: 0.1 * index,
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
              >
                <Card className="relative p-6 sm:p-8 bg-[#0F0F0F]/80 backdrop-blur-xl border-2 border-[#B1FF32]/20 hover:border-[#B1FF32] transition-all duration-300 group h-full">
                  {/* Icon */}
                  <motion.div 
                    className="mb-4 sm:mb-6"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={sectionInView ? {
                      scale: 1,
                      rotate: 0,
                      transition: {
                        type: "spring",
                        bounce: 0.7,
                        duration: 1,
                        delay: 0.1 * index + 0.3,
                      }
                    } : { scale: 0, rotate: -180 }}
                    whileHover={{
                      rotate: [0, -15, 15, -15, 0],
                      scale: 1.2,
                      transition: {
                        type: "spring",
                        bounce: 0.6,
                        duration: 0.6,
                      }
                    }}
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#B1FF32] flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_40px_rgba(177,255,50,0.6)]">
                      <stat.icon className="w-7 h-7 sm:w-8 sm:h-8 text-black" />
                    </div>
                  </motion.div>

                  {/* Number */}
                  <motion.div 
                    className="text-4xl xs:text-5xl sm:text-5xl md:text-6xl font-black text-[#B1FF32] mb-3 sm:mb-4"
                    style={{
                      fontFamily: "'Russo One', sans-serif",
                      textShadow: "0 0 30px rgba(177, 255, 50, 0.6)",
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={sectionInView ? {
                      scale: 1,
                      opacity: 1,
                      transition: {
                        type: "spring",
                        bounce: 0.8,
                        duration: 1,
                        delay: 0.1 * index + 0.5,
                      }
                    } : { scale: 0, opacity: 0 }}
                    whileHover={{
                      scale: [1, 1.15, 1.1, 1.15, 1.1],
                      textShadow: "0 0 50px rgba(177, 255, 50, 1)",
                      transition: {
                        duration: 0.8,
                        repeat: Infinity,
                      }
                    }}
                  >
                    <AnimatedNumber value={stat.number} suffix={stat.suffix} isInView={sectionInView} />
                  </motion.div>

                  {/* Label */}
                  <motion.p 
                    className="text-base sm:text-lg text-gray-400 leading-relaxed"
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={sectionInView ? {
                      opacity: 1,
                      y: 0,
                      transition: {
                        delay: 0.1 * index + 0.7,
                      }
                    } : { opacity: 0, y: 20 }}
                  >
                    {stat.label}
                  </motion.p>

                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: "radial-gradient(circle at center, rgba(177, 255, 50, 0.1) 0%, transparent 70%)",
                    }}
                  />
                </Card>
              </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;

