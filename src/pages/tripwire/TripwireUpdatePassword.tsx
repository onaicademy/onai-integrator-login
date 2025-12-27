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
import { Eye, EyeOff, Lock, CheckCircle, Loader2 } from 'lucide-react';

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

  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 🔥 FIX: Handle both PKCE code exchange AND hash fragment parsing
  // This fixes mobile browser issues where email clients open links in different browsers
  useEffect(() => {
    let isMounted = true;
    
    console.log('🔐 [TripwireUpdatePassword] Component mounted');
    console.log('🔗 Current URL:', window.location.href);
    console.log('🔗 Hash:', window.location.hash);
    console.log('🔗 Search:', window.location.search);
    
    // Listen for auth state changes (PASSWORD_RECOVERY event)
    const { data: { subscription } } = tripwireSupabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('🔐 Auth event:', event, session?.user?.email);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('✅ Password recovery event detected');
        setIsValidSession(true);
        setIsCheckingSession(false);
      } else if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in:', session.user.email);
        setIsValidSession(true);
        setIsCheckingSession(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('✅ Token refreshed:', session.user.email);
        setIsValidSession(true);
        setIsCheckingSession(false);
      }
    });
    
    // 📱 MOBILE FIX: Handle PKCE code exchange and hash fragments
    const initializeSession = async () => {
      try {
        // Step 1: Check for PKCE code in URL query params (?code=xxx)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorCode = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        // Handle Supabase error in URL
        if (errorCode) {
          console.error('❌ Supabase error in URL:', errorCode, errorDescription);
          setErrorMessage(errorDescription || 'Ссылка недействительна');
          setIsCheckingSession(false);
          return;
        }
        
        // PKCE code exchange (for mobile browsers)
        if (code) {
          console.log('🔑 Found PKCE code, exchanging for session...');
          const { data, error } = await tripwireSupabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('❌ Code exchange failed:', error.message);
            setErrorMessage('Ссылка истекла или уже была использована. Запросите новую.');
            setIsCheckingSession(false);
            return;
          }
          
          if (data.session) {
            console.log('✅ PKCE session established:', data.session.user.email);
            setIsValidSession(true);
            setIsCheckingSession(false);
            
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }
        }
        
        // Step 2: Check for hash fragment (#access_token=xxx)
        const hash = window.location.hash;
        if (hash && (hash.includes('access_token') || hash.includes('type=recovery'))) {
          console.log('🔑 Found hash fragment, waiting for Supabase to parse...');
          // Wait longer for mobile browsers
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // No token in URL, wait a bit for any delayed processing
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // Step 3: Check if session was established
        const { data: { session } } = await tripwireSupabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session) {
          console.log('✅ Valid session found:', session.user.email);
          setIsValidSession(true);
        } else {
          console.error('❌ No active session for password update');
          setErrorMessage('Ссылка недействительна или истекла. Попробуйте запросить новую ссылку.');
        }
        
        setIsCheckingSession(false);
        
      } catch (error: any) {
        if (!isMounted) return;
        console.error('❌ Session initialization error:', error);
        setErrorMessage('Произошла ошибка. Попробуйте ещё раз.');
        setIsCheckingSession(false);
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
            {isCheckingSession ? 'ПРОВЕРКА ССЫЛКИ...' : isSuccess ? 'ПАРОЛЬ ИЗМЕНЕН!' : 'СОЗДАНИЕ НОВОГО ПАРОЛЯ'}
          </h1>
          <p className="text-gray-400 text-sm">
            {isCheckingSession 
              ? 'Подождите, проверяем вашу ссылку...'
              : isSuccess 
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
            {/* Loading State - while checking session */}
            {isCheckingSession ? (
              <div className="text-center py-8">
                <Loader2 size={40} className="text-[#00FF88] animate-spin mx-auto mb-4" />
                <p className="text-gray-400 text-sm">Проверка ссылки...</p>
              </div>
            ) : !isValidSession ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
                  <Lock size={32} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ссылка недействительна</h3>
                <p className="text-gray-400 text-sm mb-4">
                  {errorMessage || 'Ссылка для сброса пароля истекла или недействительна.'}
                </p>
                <Button
                  onClick={() => navigate('/integrator/login')}
                  className="bg-[#00FF88] hover:bg-[#00cc88] text-black font-semibold"
                >
                  Запросить новую ссылку
                </Button>
              </div>
            ) : !isSuccess ? (
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
            ) : isSuccess && (
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

