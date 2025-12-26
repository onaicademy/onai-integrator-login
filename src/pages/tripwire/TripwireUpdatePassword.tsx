import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { tripwireSupabase } from '@/lib/supabase-tripwire'; // 🔥 НОВЫЙ КЛИЕНТ
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OnAILogo } from '@/components/OnAILogo';
import { AnimatedBackground } from '@/components/tripwire/AnimatedBackground';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';

/**
 * 🔐 TRIPWIRE UPDATE PASSWORD PAGE
 * 
 * ✅ ИЗОЛИРОВАННАЯ БАЗА ДАННЫХ: Использует tripwireSupabase
 * ✅ Обновляет пароль только в Tripwire базе
 * ✅ НЕ затрагивает Main Platform пользователей
 */

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Пароль должен быть минимум 8 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

export default function TripwireUpdatePassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
  });

  // Check if user has valid session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await tripwireSupabase.auth.getSession();
      
      if (!session) {
        console.error('❌ No active session for password update');
        toast.error('Ссылка недействительна или истекла');
        setTimeout(() => {
          navigate('/integrator/login');
        }, 2000);
      } else {
        console.log('✅ Valid session for password update:', session.user.email);
      }
    };

    checkSession();
  }, [navigate]);

  const onSubmit = async (data: UpdatePasswordFormData) => {
    setIsLoading(true);

    try {
      console.log('🔐 [TripwireUpdatePassword] Updating password...');

      // Update password in Tripwire Supabase
      const { error } = await tripwireSupabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw error;
      }

      console.log('✅ [TripwireUpdatePassword] Password updated successfully');
      
      // 🔥 ВАЖНО: Принудительно выходим из сессии после смены пароля
      // Иначе пользователь останется залогиненным со старым токеном
      await tripwireSupabase.auth.signOut();
      console.log('✅ [TripwireUpdatePassword] Session terminated');
      
      setIsSuccess(true);
      toast.success('Пароль успешно изменен');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/integrator/login');
      }, 2000);
    } catch (error: any) {
      console.error('❌ [TripwireUpdatePassword] Error:', error);
      toast.error(error.message || 'Не удалось обновить пароль');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center bg-[#030303]">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <OnAILogo variant="full" className="h-12 w-auto text-white" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-3 font-display">
            {isSuccess ? 'ПАРОЛЬ ИЗМЕНЕН!' : 'СОЗДАНИЕ НОВОГО ПАРОЛЯ'}
          </h1>
          <p className="text-gray-400 text-sm">
            {isSuccess 
              ? 'Перенаправляем на страницу входа...' 
              : 'Введите новый пароль для вашего аккаунта'}
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          {/* Card Glow */}
          <div
            className="absolute inset-0 rounded-2xl blur-xl opacity-50"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(0, 180, 255, 0.2))',
            }}
          />

          {/* Card Content */}
          <div className="relative bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-8">
            {!isSuccess ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Password Input */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <Lock size={16} />
                    <span>Новый пароль</span>
                  </label>
                  <div className="relative">
                    <Input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Минимум 8 символов"
                      disabled={isLoading}
                      className={`h-14 bg-[#1a1a24] border-gray-700 text-white pr-12 ${
                        errors.password ? 'border-[#FF3366] animate-shake' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[#FF3366] text-sm mt-1">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <Lock size={16} />
                    <span>Повторите пароль</span>
                  </label>
                  <div className="relative">
                    <Input
                      {...register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Повторите пароль"
                      disabled={isLoading}
                      className={`h-14 bg-[#1a1a24] border-gray-700 text-white pr-12 ${
                        errors.confirmPassword ? 'border-[#FF3366] animate-shake' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[#FF3366] text-sm mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-[#00FF88] hover:bg-[#00cc88] text-black font-semibold text-lg transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)',
                  }}
                >
                  {isLoading ? 'Сохранение...' : 'СОХРАНИТЬ И ВОЙТИ'}
                </Button>
              </form>
            ) : (
              /* Success State */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#00FF88]/20 mb-6"
                >
                  <CheckCircle size={40} className="text-[#00FF88]" />
                </motion.div>

                <h3 className="text-2xl font-bold text-white mb-2">
                  Готово!
                </h3>
                <p className="text-gray-400 text-sm">
                  Ваш пароль успешно обновлен. Перенаправляем на страницу входа...
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Back to Login */}
        {!isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-6"
          >
            <button
              onClick={() => navigate('/integrator/login')}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Вернуться на страницу входа
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

