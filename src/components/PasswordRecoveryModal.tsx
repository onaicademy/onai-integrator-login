import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { passwordRecoverySchema, type PasswordRecoveryFormData } from '@/lib/validation';
import { supabase } from '@/lib/supabase'; // 🔥 Main Platform Supabase
import { toast } from 'sonner';

interface PasswordRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordRecoveryModal({ isOpen, onClose }: PasswordRecoveryModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordRecoveryFormData>({
    resolver: zodResolver(passwordRecoverySchema),
  });

  const onSubmit = async (data: PasswordRecoveryFormData) => {
    setIsLoading(true);
    
    try {
      console.log('🔐 [PasswordRecovery] Sending reset email...');
      console.log('📧 Email:', data.email);
      console.log('🔗 Redirect URL:', `${window.location.origin}/update-password`);
      
      // ✅ Main Platform: Отправляем запрос на сброс пароля через Main Platform Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        console.error('❌ Reset password error:', error);
        throw error;
      }

      console.log('✅ Reset email sent successfully');
      setIsSuccess(true);
      toast.success('Письмо отправлено! Проверьте почту');
    } catch (error: any) {
      console.error('❌ Main Platform Password Reset Error:', error);
      toast.error(error.message || 'Не удалось отправить письмо');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setIsSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
          />

          {/* Modal - Perfect centering for all devices */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md"
            >
            <div 
              className="relative bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl"
              style={{
                boxShadow: '0 0 40px rgba(0, 255, 136, 0.2)',
              }}
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              {!isSuccess ? (
                /* Recovery Form */
                <>
                  <h2 className="text-2xl font-bold text-white font-display mb-2">
                    ВОССТАНОВИТЬ ПАРОЛЬ
                  </h2>
                  <p className="text-gray-400 text-sm mb-6">
                    Введите email и мы отправим ссылку для сброса пароля
                  </p>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Email Input */}
                    <div>
                      <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <Mail size={16} />
                        <span>Email</span>
                      </label>
                      <Input
                        {...register('email')}
                        type="email"
                        placeholder="your@email.com"
                        disabled={isLoading}
                        className={`h-12 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00FF88] focus:ring-[#00FF88]/20 ${
                          errors.email ? 'border-[#FF3366] animate-shake' : ''
                        }`}
                      />
                      {errors.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-[#FF3366] text-sm mt-1"
                        >
                          {errors.email.message}
                        </motion.p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 bg-[#00FF88] hover:bg-[#00cc88] text-black font-semibold transition-all duration-300 hover:scale-[1.02]"
                      style={{
                        boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)',
                      }}
                    >
                      {isLoading ? 'Отправка...' : 'Отправить ссылку'}
                    </Button>
                  </form>
                </>
              ) : (
                /* Success State */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00FF88]/20 mb-4"
                  >
                    <CheckCircle size={32} className="text-[#00FF88]" />
                  </motion.div>

                  <h3 className="text-xl font-bold text-white mb-2">
                    Проверьте почту!
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Мы отправили инструкции по восстановлению пароля на вашу почту
                  </p>

                  <Button
                    onClick={handleClose}
                    className="w-full h-12 bg-[#00FF88] hover:bg-[#00cc88] text-black font-semibold"
                  >
                    Понятно
                  </Button>
                </motion.div>
              )}
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
