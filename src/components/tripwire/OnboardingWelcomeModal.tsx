/**
 * 🎉 ONBOARDING WELCOME MODAL
 * 
 * Приветственное модальное окно для новых пользователей Tripwire.
 * Киберпанк-стиль с неоновыми эффектами и анимациями.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap, Sparkles } from 'lucide-react';
import { useTripwireOnboarding } from '@/contexts/TripwireOnboardingContext';

export const OnboardingWelcomeModal: React.FC = () => {
  const { showWelcomeModal, startOnboarding } = useTripwireOnboarding();
  
  return (
    <AnimatePresence>
      {showWelcomeModal && (
        <>
          {/* Backdrop с блюром */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{
              background: 'rgba(3, 3, 3, 0.90)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.4, type: 'spring', damping: 25 }}
              className="relative max-w-2xl w-full"
            >
              {/* Неоновый Glow Background */}
              <div 
                className="absolute inset-0 rounded-3xl opacity-20 blur-3xl"
                style={{
                  background: 'radial-gradient(circle, rgba(0, 255, 136, 0.4) 0%, transparent 70%)',
                }}
              />
              
              {/* Modal Content */}
              <div
                className="relative rounded-3xl border overflow-hidden"
                style={{
                  background: 'rgba(10, 10, 10, 0.95)',
                  borderColor: 'rgba(0, 255, 136, 0.3)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 136, 0.15)',
                }}
              >
                {/* Grid Background Pattern */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `linear-gradient(rgba(0, 255, 136, 0.3) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(0, 255, 136, 0.3) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                  }}
                />
                
                {/* Content */}
                <div className="relative z-10 p-8 sm:p-12">
                  {/* Icon с анимацией */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
                    className="flex justify-center mb-6"
                  >
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'rgba(0, 255, 136, 0.1)',
                        border: '2px solid rgba(0, 255, 136, 0.3)',
                        boxShadow: '0 0 30px rgba(0, 255, 136, 0.3)',
                      }}
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        <Sparkles className="w-10 h-10 text-[#00FF88]" />
                      </motion.div>
                    </div>
                  </motion.div>
                  
                  {/* Title */}
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-3xl sm:text-4xl font-bold text-center mb-4 uppercase tracking-wider"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      color: '#FFFFFF',
                      textShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
                    }}
                  >
                    ДОБРО ПОЖАЛОВАТЬ В
                    <br />
                    <span className="text-[#00FF88]">INTEGRATOR 0 TO $1000</span>
                  </motion.h1>
                  
                  {/* Subtitle */}
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="text-center text-gray-300 text-lg mb-8 leading-relaxed"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    Пройдите быстрый тур (всего 2 минуты) и узнайте
                    <br />
                    <span className="text-[#00FF88] font-semibold">как начать зарабатывать первые деньги с AI</span>
                  </motion.p>
                  
                  {/* Features List */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
                  >
                    {[
                      { icon: '📚', text: 'Обучение' },
                      { icon: '🤖', text: 'AI-инструменты' },
                      { icon: '💰', text: 'Заработок' },
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl"
                        style={{
                          background: 'rgba(0, 255, 136, 0.05)',
                          border: '1px solid rgba(0, 255, 136, 0.15)',
                        }}
                      >
                        <span className="text-3xl">{item.icon}</span>
                        <span className="text-sm text-gray-300 font-medium">{item.text}</span>
                      </div>
                    ))}
                  </motion.div>
                  
                  {/* CTA Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="flex justify-center"
                  >
                    <Button
                      size="lg"
                      onClick={startOnboarding}
                      className="relative overflow-hidden px-12 py-6 text-lg font-bold uppercase tracking-wider group"
                      style={{
                        background: '#00FF88',
                        color: '#000000',
                        fontFamily: "'Space Grotesk', sans-serif",
                        boxShadow: '0 0 40px rgba(0, 255, 136, 0.5)',
                        border: 'none',
                      }}
                    >
                      {/* Hover Shimmer Effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30"
                        animate={{
                          x: ['-100%', '200%'],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          repeatDelay: 0.5,
                        }}
                      />
                      
                      <span className="relative z-10 flex items-center gap-2">
                        <Zap className="w-5 h-5" fill="currentColor" />
                        НАЧАТЬ ТУР
                        <Zap className="w-5 h-5" fill="currentColor" />
                      </span>
                    </Button>
                  </motion.div>
                  
                  {/* Footer Note */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="text-center text-xs text-gray-500 mt-6"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    ⏱️ ЗАЙМЕТ ВСЕГО 2 МИНУТЫ
                  </motion.p>
                </div>
                
                {/* Bottom Glow */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.5), transparent)',
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};




