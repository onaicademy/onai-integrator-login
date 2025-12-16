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
            className="text-2xl sm:text-3xl font-bold text-white mb-3 font-display tracking-wider"
            style={{
              textShadow: '0 0 30px rgba(0, 255, 136, 0.3)',
            }}
          >
            Добро пожаловать
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-400 text-base sm:text-lg"
          >
            в мир интеграций onAI academy
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
              href="https://api.whatsapp.com/send/?phone=77066523203&text&type=phone_number&app_absent=0"
              target="_blank"
              rel="noopener noreferrer"
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
          className="mt-12 space-y-6"
        >
          {/* Социальные сети */}
          <div className="flex flex-col items-center gap-3">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider">СОЦСЕТИ</h3>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/onai_academy/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-[#00FF88] hover:text-black transition-all duration-300 flex items-center justify-center group"
                title="Instagram"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white group-hover:text-black transition-colors">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0z" fill="currentColor"/>
                  <path d="M12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a3.999 3.999 0 110-7.998 3.999 3.999 0 010 7.998z" fill="currentColor"/>
                  <path d="M18.406 5.594a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" fill="currentColor"/>
                </svg>
              </a>
              <a
                href="https://api.whatsapp.com/send/?phone=77066523203&text&type=phone_number&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-800 hover:bg-[#00FF88] hover:text-black transition-all duration-300 flex items-center justify-center group"
                title="WhatsApp"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white group-hover:text-black transition-colors">
                  <path d="M20.52 3.449C18.24 1.245 15.24 0.01 12.05 0 5.496 0 .16 5.335.16 11.89c0 2.096.547 4.142 1.588 5.946L.05 24l6.304-1.654c1.737.948 3.693 1.447 5.684 1.447h.005c6.554 0 11.89-5.335 11.896-11.893 0-3.18-1.237-6.17-3.42-8.451zM12.053 21.78c-1.78 0-3.525-.478-5.053-1.385l-.36-.214-3.75.984 1.002-3.655-.235-.374a9.86 9.86 0 01-1.512-5.26c.002-5.45 4.437-9.884 9.894-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.992c-.005 5.453-4.44 9.897-9.867 9.897zm5.415-7.398c-.296-.148-1.755-.867-2.027-.966-.272-.1-.47-.148-.667.148-.198.297-.767.966-.94 1.164-.173.198-.346.222-.642.074-.297-.148-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.296-.018-.456.13-.604.134-.133.296-.347.444-.52.149-.173.198-.296.297-.494.099-.198.05-.371-.025-.52-.075-.148-.667-1.608-.914-2.202-.242-.578-.487-.5-.667-.51h-.568c-.198 0-.52.074-.791.37-.272.297-1.037 1.013-1.037 2.472 0 1.46 1.062 2.87 1.21 3.068.148.198 2.086 3.186 5.053 4.468 2.966 1.282 2.966.854 3.51.803.543-.05 1.754-.717 2.001-1.41.247-.692.247-1.286.173-1.41-.074-.123-.272-.197-.568-.346z" fill="currentColor"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Copyright & Version */}
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-gray-700 text-[10px] opacity-40">
              © {new Date().getFullYear()} onAI Academy. Все права защищены
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-800 font-['JetBrains_Mono'] text-[9px] uppercase tracking-wider opacity-30">
                Версия платформы:
              </span>
              <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[#00FF88] bg-[#00FF88]/5 px-1.5 py-0.5 rounded border border-[#00FF88]/10 opacity-50">
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
