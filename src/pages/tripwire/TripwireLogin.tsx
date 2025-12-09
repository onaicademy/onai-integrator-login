import { useState } from 'react';
import { motion } from 'framer-motion';
import { OnAILogo } from '@/components/OnAILogo';
import { AnimatedBackground } from '@/components/tripwire/AnimatedBackground';
import { TripwireLoginForm } from '@/components/tripwire/TripwireLoginForm';
import { PasswordRecoveryModal } from '@/components/tripwire/PasswordRecoveryModal';

export default function TripwireLogin() {
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center bg-[#030303]">
      {/* Animated Background with Canvas */}
      <AnimatedBackground />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 12, delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <OnAILogo 
              variant="full" 
              className="h-12 w-auto text-white" 
            />
          </div>
        </motion.div>

        {/* Title & Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 
            className="text-3xl sm:text-4xl font-bold text-white mb-3 font-display uppercase tracking-wider"
            style={{
              textShadow: '0 0 30px rgba(0, 255, 136, 0.3)',
            }}
          >
            ИНТЕГРАТОР<br />
            <span className="text-[#00FF88]">ОТ 0 ДО 1000$</span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-400 text-sm sm:text-base"
          >
            Начните пробный курс и освойте AI-интеграцию
          </motion.p>
        </motion.div>

        {/* Login Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          {/* Card Glow Effect */}
          <div 
            className="absolute inset-0 rounded-2xl blur-2xl bg-[#00FF88]/10"
            style={{
              animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />

          {/* Card */}
          <div 
            className="relative bg-[#0A0A0A]/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 sm:p-8"
            style={{
              boxShadow: '0 0 60px rgba(0, 255, 136, 0.15)',
            }}
          >
            <TripwireLoginForm onForgotPassword={() => setShowPasswordRecovery(true)} />
          </div>
        </motion.div>

        {/* Bottom Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center space-y-4"
        >
          <p className="text-gray-400 text-sm">
            У вас нет доступа?{' '}
            <a 
              href="mailto:feedback@onaiacademy.kz" 
              className="text-[#00FF88] hover:text-[#00cc88] transition-colors"
            >
              Свяжитесь с нами →
            </a>
          </p>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-gray-600 text-xs">
              © {new Date().getFullYear()} onAI Academy. Все права защищены
            </p>
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-['JetBrains_Mono'] text-xs uppercase tracking-wider">
                Версия платформы:
              </span>
              <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#00FF88] bg-[#00FF88]/10 px-2 py-1 rounded border border-[#00FF88]/20">
                v1.10.00
              </span>
            </div>
          </div>
        </motion.footer>
      </div>

      {/* Password Recovery Modal */}
      <PasswordRecoveryModal
        isOpen={showPasswordRecovery}
        onClose={() => setShowPasswordRecovery(false)}
      />
    </div>
  );
}
