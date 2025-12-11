import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Checkbox removed - auto-fill from email URL param
import { tripwireLoginSchema, type TripwireLoginFormData } from '@/lib/validation';
import { useTripwireAuth } from '@/hooks/useTripwireAuth';
import type { ButtonState } from '@/types/tripwire';

// Auto-fill email from URL params (from welcome email link)

interface TripwireLoginFormProps {
  onForgotPassword: () => void;
}

export function TripwireLoginForm({ onForgotPassword }: TripwireLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, buttonState, clearError } = useTripwireAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TripwireLoginFormData>({
    resolver: zodResolver(tripwireLoginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  useEffect(() => {
    // Автоматически заполняем email из URL параметра (из welcome письма)
    const urlParams = new URLSearchParams(window.location.search);
    const emailFromUrl = urlParams.get('email');
    
    if (emailFromUrl) {
      setValue('email', emailFromUrl);
      console.log('✅ Email автоматически заполнен из ссылки:', emailFromUrl);
    }
  }, [setValue]);

  const onSubmit = async (data: TripwireLoginFormData) => {
    clearError();
    await login({
      email: data.email,
      password: data.password,
      remember: data.remember,
    });
  };

  const getButtonContent = (state: ButtonState) => {
    switch (state) {
      case 'loading':
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Вход...</span>
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="w-5 h-5" />
            <span>Ошибка входа</span>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle2 className="w-5 h-5" />
            <span>Добро пожаловать!</span>
          </>
        );
      default:
        return (
          <>
            <ArrowRight className="w-5 h-5" />
            <span>ВОЙТИ</span>
          </>
        );
    }
  };

  const getButtonStyles = (state: ButtonState) => {
    switch (state) {
      case 'error':
        return 'bg-[#FF3366] hover:bg-[#FF3366]/90 text-white';
      case 'success':
        return 'bg-[#00FF88] text-black';
      default:
        return 'bg-[#00FF88] hover:bg-[#00cc88] text-black hover:scale-[1.02]';
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Email Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Mail size={16} />
          <span>Email</span>
        </label>
        <Input
          {...register('email')}
          type="email"
          placeholder="your@email.com"
          disabled={isLoading}
          className={`h-12 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 transition-all duration-200
            ${
              errors.email
                ? 'border-[#FF3366] animate-shake'
                : 'focus:border-[#00FF88] focus:ring-2 focus:ring-[#00FF88]/20'
            }
            ${
              !errors.email && watch('email')
                ? 'focus:shadow-[0_0_20px_rgba(0,255,148,0.3)]'
                : ''
            }`}
          style={{
            boxShadow: errors.email
              ? '0 0 0 2px rgba(255, 51, 102, 0.2)'
              : undefined,
          }}
        />
        <AnimatePresence>
          {errors.email && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[#FF3366] text-sm mt-1 flex items-center gap-1"
            >
              <span>⚠</span> {errors.email.message}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Password Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Lock size={16} />
          <span>Пароль</span>
        </label>
        <div className="relative">
          <Input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            disabled={isLoading}
            className={`h-12 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 pr-12 transition-all duration-200
              ${
                errors.password
                  ? 'border-[#FF3366] animate-shake'
                  : 'focus:border-[#00FF88] focus:ring-2 focus:ring-[#00FF88]/20'
              }
              ${
                !errors.password && watch('password')
                  ? 'focus:shadow-[0_0_20px_rgba(0,255,136,0.3)]'
                  : ''
              }`}
            style={{
              boxShadow: errors.password
                ? '0 0 0 2px rgba(255, 51, 102, 0.2)'
                : undefined,
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#00FF88] transition-colors"
            disabled={isLoading}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <AnimatePresence>
          {errors.password && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[#FF3366] text-sm mt-1 flex items-center gap-1"
            >
              <span>⚠</span> {errors.password.message}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Remember & Forgot */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center"
      >
        {/* Remember checkbox removed - auto-fill from URL */}

        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-[#00FF88] hover:text-[#00cc88] transition-colors"
        >
          Забыли пароль?
        </button>
      </motion.div>

      {/* General Error Message */}
      <AnimatePresence>
        {error && error.field === 'general' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-3 bg-[#FF3366]/10 border border-[#FF3366]/30 rounded-lg"
          >
            <p className="text-[#FF3366] text-sm flex items-center gap-2">
              <XCircle size={16} />
              {error.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          type="submit"
          disabled={isLoading || buttonState === 'success'}
          className={`w-full h-14 font-semibold text-lg transition-all duration-300 ${getButtonStyles(
            buttonState
          )}`}
          style={{
            boxShadow:
              buttonState === 'default'
                ? '0 0 30px rgba(0, 255, 136, 0.4)'
                : buttonState === 'error'
                ? '0 0 30px rgba(255, 51, 102, 0.4)'
                : undefined,
            textShadow:
              buttonState === 'default'
                ? '0 0 10px rgba(0, 0, 0, 0.5)'
                : undefined,
          }}
        >
          <span className="flex items-center justify-center gap-2">
            {getButtonContent(buttonState)}
          </span>
        </Button>
      </motion.div>
    </form>
  );
}

