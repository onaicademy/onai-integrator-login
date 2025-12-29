import { Dialog, DialogContent } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { CheckCircle, Award, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Module3CompleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 🎉 MODULE 3 COMPLETE MODAL
 * 
 * Показывается после завершения урока 69 (3-й модуль)
 * Уведомляет о доступе к сертификату и финальному эфиру
 */
export function Module3CompleteModal({ open, onOpenChange }: Module3CompleteModalProps) {
  const navigate = useNavigate();

  const handleGetCertificate = () => {
    onOpenChange(false);
    navigate('/profile');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0A0A0A] border border-[#00FF88]/30 p-0">
        <div className="text-center space-y-6 p-8">
          {/* Animated Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="flex justify-center"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-[#00FF88]/20 rounded-full blur-2xl" />
              
              {/* Icon container */}
              <div className="relative w-24 h-24 bg-gradient-to-br from-[#00FF88]/20 to-[#00FF88]/5 rounded-full flex items-center justify-center border-2 border-[#00FF88]/50">
                <CheckCircle className="w-12 h-12 text-[#00FF88]" />
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white font-['JetBrains_Mono'] uppercase mb-2">
              🎉 Поздравляем!
            </h2>
            <p className="text-xl md:text-2xl text-[#00FF88] font-['JetBrains_Mono'] font-bold">
              Все модули завершены!
            </p>
          </motion.div>

          {/* Content Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3 text-left"
          >
            {/* Certificate Card */}
            <div className="bg-gradient-to-br from-[#00FF88]/10 to-transparent border border-[#00FF88]/30 rounded-xl p-4 hover:border-[#00FF88]/50 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-[#00FF88]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 text-[#00FF88]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-['JetBrains_Mono'] font-bold text-lg mb-1">
                    Доступ к сертификату
                  </h3>
                  <p className="text-gray-400 text-sm font-['Manrope'] leading-relaxed">
                    Теперь вы можете получить официальный сертификат о прохождении курса
                  </p>
                </div>
              </div>
            </div>
            
            {/* Live Stream Card */}
            <div className="bg-gradient-to-br from-[#FF3366]/10 to-transparent border border-[#FF3366]/30 rounded-xl p-4 hover:border-[#FF3366]/50 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-[#FF3366]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Radio className="w-6 h-6 text-[#FF3366]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-['JetBrains_Mono'] font-bold text-lg mb-1">
                    Завершающий эфир
                  </h3>
                  <p className="text-gray-400 text-sm font-['Manrope'] leading-relaxed">
                    Присоединяйтесь к финальному live-stream с разбором вопросов и Q&A
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pt-4"
          >
            <button
              onClick={handleGetCertificate}
              className="w-full h-14 bg-[#00FF88] text-black font-bold font-['JetBrains_Mono'] uppercase tracking-wider rounded-xl hover:bg-[#00CC6A] transition-all shadow-[0_0_30px_rgba(0,255,136,0.3)] hover:shadow-[0_0_40px_rgba(0,255,136,0.5)] transform hover:scale-[1.02]"
            >
              ПОЛУЧИТЬ СЕРТИФИКАТ
            </button>
          </motion.div>

          {/* Footer Note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-gray-500 font-['Manrope']"
          >
            Вы можете найти сертификат в разделе{' '}
            <span className="text-[#00FF88] font-bold">Мой профиль</span>
          </motion.p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
