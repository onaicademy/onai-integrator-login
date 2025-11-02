import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const motivationalQuotes = [
  "Каждый день — новый шаг к цели",
  "AI — твой лучший напарник",
  "Знания — это сила будущего",
  "Учись сегодня, твори завтра",
  "Твой потенциал безграничен",
];

export const WelcomeBanner = () => {
  const [quote, setQuote] = useState("");
  const userName = localStorage.getItem("userName") || "Ученик";

  useEffect(() => {
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setQuote(randomQuote);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-sm border border-neon/20 p-6 md:p-8"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-neon/5 via-transparent to-[hsl(var(--cyber-blue))]/5 pointer-events-none" />
      
      <div className="relative z-10">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-3xl md:text-4xl font-bold mb-3"
        >
          Добро пожаловать, <span className="text-neon">{userName}</span>!
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-muted-foreground text-sm md:text-base italic"
        >
          "{quote}"
        </motion.p>
      </div>

      {/* Animated border glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "linear-gradient(90deg, hsl(var(--neon)) 0%, hsl(var(--cyber-blue)) 100%)",
          opacity: 0.1,
        }}
        animate={{
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
};
