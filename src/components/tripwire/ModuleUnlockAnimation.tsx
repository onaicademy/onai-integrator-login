import { motion, AnimatePresence } from "framer-motion";
import { Unlock, Zap, Sparkles, Rocket, Target, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

interface ModuleUnlockAnimationProps {
  moduleNumber: number;
  onClose: () => void;
  onNavigate: () => void;
}

// 🎯 Tripwire Modules Config
const TRIPWIRE_MODULES = {
  16: { name: "Введение в холодный трафик", icon: Rocket },
  17: { name: "Инструменты и стратегии", icon: Target },
  18: { name: "Монетизация и масштабирование", icon: Trophy }
};

/**
 * 🎮 GAMIFICATION: Module Unlock Animation
 * 
 * Показывается ЕДИНОЖДЫ когда модуль разблокируется.
 * Эффекты:
 * - 🔓 Замочек взрывается
 * - ✨ Neon glow expanding
 * - 🎉 Confetti explosion
 * - 💚 Cyber-themed particles
 */
export function ModuleUnlockAnimation({
  moduleNumber,
  onClose,
  onNavigate
}: ModuleUnlockAnimationProps) {
  const [stage, setStage] = useState<'lock' | 'unlock' | 'glow' | 'complete'>('lock');
  
  // Получаем данные модуля из конфига
  const moduleData = TRIPWIRE_MODULES[moduleNumber as keyof typeof TRIPWIRE_MODULES] || {
    name: `Модуль ${moduleNumber}`,
    icon: Unlock
  };
  
  const moduleName = moduleData.name;
  const Icon = moduleData.icon;

  useEffect(() => {
    // 🎬 STAGE 1: Замочек трясётся (0.5s)
    const timer1 = setTimeout(() => setStage('unlock'), 500);

    // 🎬 STAGE 2: Замочек взрывается, confetti (1s)
    const timer2 = setTimeout(() => {
      setStage('glow');
      
      // 🎉 Confetti explosion
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#00FF88', '#00cc88', '#FFFFFF', '#00FFAA']
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#00FF88', '#00cc88', '#FFFFFF', '#00FFAA']
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }, 1000);

    // 🎬 STAGE 3: Glow effect (1.5s)
    const timer3 = setTimeout(() => setStage('complete'), 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(0, 255, 136, 0.1) 0%, rgba(3, 3, 3, 0.95) 70%)'
        }}
      >
        {/* Cyber Grid Background */}
        <div className="absolute inset-0 opacity-20">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />
        </div>

        {/* Main Animation Container */}
        <motion.div
          className="relative flex flex-col items-center gap-8 z-10"
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {/* Lock/Unlock Icon */}
          <div className="relative">
            {stage === 'lock' && (
              <motion.div
                animate={{ 
                  rotate: [-5, 5, -5, 5, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                }}
                transition={{ duration: 0.5, times: [0, 0.25, 0.5, 0.75, 1] }}
                className="w-32 h-32 rounded-full bg-red-500/20 border-4 border-red-500 flex items-center justify-center"
              >
                <Unlock className="w-16 h-16 text-red-500 rotate-180" strokeWidth={2.5} />
              </motion.div>
            )}

            {stage === 'unlock' && (
              <motion.div
                initial={{ scale: 1 }}
                animate={{ 
                  scale: [1, 1.3, 0],
                  rotate: [0, 180, 360],
                  opacity: [1, 1, 0]
                }}
                transition={{ duration: 0.5 }}
                className="w-32 h-32 rounded-full bg-[#00FF88]/20 border-4 border-[#00FF88] flex items-center justify-center"
              >
                <Unlock className="w-16 h-16 text-[#00FF88]" strokeWidth={2.5} />
              </motion.div>
            )}

            {(stage === 'glow' || stage === 'complete') && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                {/* Pulsing Glow Rings */}
                <motion.div
                  animate={{ 
                    scale: [1, 2, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 w-32 h-32 rounded-full bg-[#00FF88] blur-xl"
                />

                {/* Icon Container */}
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                    scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[#00FF88] to-[#00cc88] flex items-center justify-center shadow-[0_0_60px_rgba(0,255,136,0.6)]"
                >
                  <Icon className="w-16 h-16 text-black" strokeWidth={2.5} />
                </motion.div>

                {/* Sparkles */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Sparkles className="absolute -top-4 w-8 h-8 text-[#00FF88]" />
                  <Sparkles className="absolute -bottom-4 w-8 h-8 text-[#00FF88]" />
                  <Sparkles className="absolute -left-4 w-8 h-8 text-[#00FF88]" />
                  <Sparkles className="absolute -right-4 w-8 h-8 text-[#00FF88]" />
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Module Name & Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="text-center space-y-2"
          >
            <motion.div
              animate={{ 
                textShadow: [
                  "0 0 20px rgba(0,255,136,0.5)",
                  "0 0 40px rgba(0,255,136,0.8)",
                  "0 0 20px rgba(0,255,136,0.5)"
                ]
              }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              className="text-[#00FF88] text-sm font-mono font-bold uppercase tracking-wider"
            >
              /// МОДУЛЬ РАЗБЛОКИРОВАН
            </motion.div>
            
            <motion.h2
              className="text-4xl font-bold text-white font-['Space_Grotesk'] uppercase"
              animate={{ 
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            >
              {moduleName}
            </motion.h2>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="h-1 bg-gradient-to-r from-transparent via-[#00FF88] to-transparent"
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-gray-400 text-sm font-['Manrope']"
            >
              Новый модуль доступен для изучения
            </motion.p>
          </motion.div>

          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2 }}
            className="flex items-center gap-2 text-[#00FF88] text-xs font-mono"
          >
            <Zap className="w-4 h-4 animate-pulse" />
            <span>СИСТЕМА АКТИВИРОВАНА</span>
            <Zap className="w-4 h-4 animate-pulse" />
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5 }}
            className="flex flex-col sm:flex-row gap-3 mt-8 pointer-events-auto"
          >
            <motion.button
              onClick={onNavigate}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 px-6 py-3 bg-[#00FF88] text-black font-bold uppercase tracking-wider rounded-lg hover:shadow-[0_0_30px_rgba(0,255,136,0.6)] transition-all duration-300"
              style={{ transform: 'skewX(-5deg)' }}
            >
              <span className="flex items-center justify-center gap-2" style={{ transform: 'skewX(5deg)' }}>
                <Unlock className="w-5 h-5" />
                <span>Перейти к модулю</span>
              </span>
            </motion.button>
            
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-transparent border-2 border-[#00FF88]/30 text-[#00FF88] font-bold uppercase tracking-wider rounded-lg hover:bg-[#00FF88]/10 hover:border-[#00FF88] transition-all duration-300"
              style={{ transform: 'skewX(-5deg)' }}
            >
              <span className="flex items-center justify-center gap-2" style={{ transform: 'skewX(5deg)' }}>
                <span>Позже</span>
              </span>
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}




















