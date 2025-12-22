/**
 * Welcome Modal for Onboarding
 * Приветственное модальное окно перед началом онбординга
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeModalProps {
  onStart: () => void;
  onSkip: () => void;
  userName?: string;
}

export const WelcomeModal = ({ onStart, onSkip, userName = 'Таргетолог' }: WelcomeModalProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already seen the onboarding
    const hasSeenOnboarding = localStorage.getItem('traffic_onboarding_completed');
    
    if (!hasSeenOnboarding) {
      // Show modal after a short delay
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const handleStart = () => {
    setIsVisible(false);
    setTimeout(onStart, 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    localStorage.setItem('traffic_onboarding_skipped', 'true');
    onSkip();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9998]"
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-[#00FF88]/30 rounded-3xl shadow-2xl shadow-[#00FF88]/20 overflow-hidden">
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#00FF88]/5 to-transparent opacity-50" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#00FF88]/10 rounded-full blur-3xl" />
              
              {/* Close Button */}
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors z-10"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>

              {/* Content */}
              <div className="relative p-8 md:p-12">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#00FF88] to-[#00DD70] rounded-2xl mb-6"
                >
                  <Sparkles className="w-8 h-8 text-black" />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl md:text-4xl font-bold text-white mb-4"
                >
                  Добро пожаловать, {userName}! 🎯
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg text-gray-300 mb-8 leading-relaxed"
                >
                  Сейчас я покажу вам <span className="text-[#00FF88] font-semibold">как работает</span> платформа таргетологов.<br />
                  Это займет всего <span className="text-[#00FF88] font-semibold">2 минуты</span> и поможет быстрее разобраться.
                </motion.p>

                {/* Features List */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3 mb-8"
                >
                  {[
                    'Главные метрики и как их читать',
                    'Фильтр "Мои результаты" для таргетологов',
                    'Детальная аналитика рекламных кампаний',
                    'Настройки и интеграция Facebook Ads',
                    'Выбор кампаний для трекинга окупаемости'
                  ].map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="flex items-center gap-3 text-gray-300"
                    >
                      <CheckCircle2 className="w-5 h-5 text-[#00FF88] flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <Button
                    onClick={handleStart}
                    className="flex-1 h-14 bg-gradient-to-r from-[#00FF88] to-[#00DD70] hover:from-[#00DD70] hover:to-[#00BB58] text-black font-bold text-lg rounded-xl shadow-lg shadow-[#00FF88]/30 transition-all hover:scale-105"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Начать экскурсию
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  
                  <Button
                    onClick={handleSkip}
                    variant="ghost"
                    className="h-14 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                  >
                    Пропустить
                  </Button>
                </motion.div>

                {/* Footer Note */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="mt-6 text-xs text-gray-500 text-center"
                >
                  Вы всегда можете пройти экскурсию позже в настройках
                </motion.p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
