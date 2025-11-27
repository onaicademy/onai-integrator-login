import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { api } from '@/utils/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OnAILogo } from '@/components/OnAILogo';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || '/courses';

  // 🚀 PERFORMANCE FIX: Reduced from 50 to 20 stars for faster rendering
  const stars = useMemo(() => {
    return [...Array(20)].map((_, i) => {
      const startX = Math.random() * 100;
      const startY = Math.random() * 100;
      const moveX = (Math.random() - 0.5) * 30;
      const moveY = (Math.random() - 0.5) * 30;
      const duration = Math.random() * 5 + 3;
      const delay = Math.random() * 2;
      
      return { startX, startY, moveX, moveY, duration, delay };
    });
  }, []); // Пустой массив зависимостей = создаётся ОДИН РАЗ

  // 🔥 ИСПРАВЛЕНИЕ: УБРАЛИ дублирование checkAuth
  // AuthContext уже проверяет сессию, не нужно делать это снова здесь!

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        let errorMessage = 'Произошла ошибка при входе';
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Неверный email или пароль';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email не подтверждён. Проверьте вашу почту.';
        }

        // 🔥 ИСПРАВЛЕНИЕ: Очищаем пароль после ошибки (безопасность)
        setPassword('');

        toast({
          title: '❌ Ошибка входа',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      if (data.user) {
        // ПРОВЕРКА СТАТУСА АККАУНТА
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active, account_expires_at, deactivation_reason')
          .eq('id', data.user.id)
          .single();
        
        if (profile) {
          // ПРОВЕРКА 1: Аккаунт деактивирован?
          if (!profile.is_active) {
            await supabase.auth.signOut();
            
            let deactivationMessage = 'Ваш аккаунт был деактивирован.';
            if (profile.deactivation_reason === 'expired') {
              deactivationMessage = 'Срок действия вашего аккаунта истёк.';
            }
            
            toast({
              title: '⛔ Доступ запрещён',
              description: deactivationMessage + ' Обратитесь к администратору.',
              variant: 'destructive',
              duration: 10000,
            });
            return;
          }
          
          // ПРОВЕРКА 2: Срок действия истёк?
          if (profile.account_expires_at) {
            const expiresAt = new Date(profile.account_expires_at);
            const now = new Date();
            
            if (expiresAt < now) {
              await supabase
                .from('profiles')
                .update({ 
                  is_active: false,
                  deleted_at: now.toISOString(),
                  deactivation_reason: 'expired'
                })
                .eq('id', data.user.id);
              
              await supabase.auth.signOut();
              
              toast({
                title: '⏰ Срок действия истёк',
                description: 'Срок действия вашего аккаунта истёк. Обратитесь к администратору.',
                variant: 'destructive',
                duration: 10000,
              });
              return;
            }
          }
        }
        
        sessionStorage.clear();
        
        // ✅ Проверяем роль пользователя из users таблицы
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, onboarding_completed')
          .eq('id', data.user.id)
          .single();

        console.log('👤 Роль пользователя:', userData?.role);
        console.log('📋 Онбординг завершён:', userData?.onboarding_completed);

        // ✅ ОНБОРДИНГ ТОЛЬКО ДЛЯ СТУДЕНТОВ
        if (userData?.role === 'student' && !userData?.onboarding_completed) {
          console.log('🎯 Студент не прошёл онбординг, редирект на /welcome');
          toast({
            title: '👋 Добро пожаловать!',
            description: 'Давайте познакомимся поближе',
          });
          navigate('/welcome', { replace: true });
          return;
        }
        
        // Для админов, кураторов, тех специалистов - сразу на главную
        toast({
          title: '✅ Добро пожаловать!',
          description: 'Вы успешно вошли в систему',
        });
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      toast({
        title: '❌ Ошибка',
        description: 'Не удалось войти в систему',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // 🔥 ИСПРАВЛЕНИЕ: Убрали isCheckingAuth - AuthContext уже проверил сессию
  // Если мы здесь - значит сессии нет, показываем форму логина
  
  return (
    <>
      {/* Заставка загрузки */}
      <AnimatePresence>
        {showLoadingScreen && (
          <LoadingScreen onComplete={() => setShowLoadingScreen(false)} />
        )}
      </AnimatePresence>

      {/* Основная страница логина */}
      {!showLoadingScreen && (
    <div className="relative min-h-screen bg-black overflow-hidden flex flex-col">
      {/* 🚀 PERFORMANCE FIX: Optimized blur animation - smaller size, longer delay, will-change */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(155,155,155,0.25) 0%, rgba(122,122,122,0.18) 20%, rgba(88,88,88,0.12) 40%, rgba(66,66,66,0.06) 60%, transparent 80%)',
            willChange: 'transform, opacity',
          }}
          animate={{
            x: ['-50%', '110%'],
            y: ['-50%', '110%'],
            opacity: [0, 0.8, 0.8, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatDelay: 8,
            ease: "easeInOut",
            times: [0, 0.2, 0.8, 1],
          }}
        />
      </div>

      {/* Летающие звезды */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${star.startY}%`,
              left: `${star.startX}%`,
            }}
            animate={{
              x: [0, star.moveX, 0],
              y: [0, star.moveY, 0],
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Контент */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Хедер */}
        <header className="flex items-center justify-between px-4 sm:px-8 py-6 flex-shrink-0">
          <div className="flex items-center gap-4 sm:gap-12 relative">
            {/* ЛОГОТИП ONAI ACADEMY */}
            <div className="relative z-10">
              <OnAILogo variant="full" className="h-10 sm:h-12 w-auto text-white" />
            </div>
          </div>
        </header>

        {/* Форма входа */}
        <div className="flex-grow flex items-center justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md mx-auto"
          >
            {/* Заголовок */}
            <div className="text-center mb-8 sm:mb-12">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-3 sm:gap-4 mb-4"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#00ff00] flex items-center justify-center flex-shrink-0">
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-[#00ff00]" />
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold text-white font-display">ВХОД</h2>
              </motion.div>
            </div>

            {/* Форма */}
            <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Электронная почта</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 sm:h-14 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00ff00] focus:ring-[#00ff00]/20"
                  placeholder="student@onaiacademy.kz"
                />
              </div>

              {/* Пароль */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Пароль</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 sm:h-14 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00ff00] focus:ring-[#00ff00]/20 pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#00ff00] transition"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Кнопка входа */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 sm:h-14 bg-[#00ff00] hover:bg-[#00cc00] text-black font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-[#00ff00]/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Вход...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-5 w-5" />
                    Войти
                  </>
                )}
              </Button>
            </form>

            {/* Подсказки */}
            <div className="mt-6 sm:mt-8 text-center space-y-2 px-4">
              <p className="text-xs sm:text-sm text-gray-400">
                Нет аккаунта?{' '}
                <span className="text-[#00ff00] cursor-pointer hover:underline">
                  Обратитесь к администратору
                </span>
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                Забыли пароль? Свяжитесь с поддержкой
              </p>
            </div>
          </motion.div>
        </div>

        {/* Футер */}
        <footer className="relative z-10 border-t border-gray-800 flex-shrink-0 mt-auto">
          <div className="container mx-auto px-4 sm:px-8 py-6 sm:py-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-center sm:text-left">
              {/* О платформе */}
              <div>
                <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">О ПЛАТФОРМЕ</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                  <li>
                    <a href="#" className="hover:text-[#00ff00] transition break-words">
                      Публичная оферта
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-[#00ff00] transition break-words">
                      Политика конфиденциальности
                    </a>
                  </li>
                </ul>
              </div>

              {/* Контакты */}
              <div>
                <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">КОНТАКТЫ</h3>
                <p className="text-xs sm:text-sm text-gray-400 break-all">
                  <Mail className="inline w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  feedback@onaiacademy.kz
                </p>
              </div>

              {/* Соцсети */}
              <div>
                <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">СОЦСЕТИ</h3>
                <div className="flex justify-center sm:justify-start gap-3">
                  <a
                    href="https://instagram.com/onaiacademy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-gray-800 hover:bg-[#00ff00] transition flex items-center justify-center text-lg"
                    title="Instagram"
                  >
                    📷
                  </a>
                  <a
                    href="https://youtube.com/@onaiacademy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-gray-800 hover:bg-[#00ff00] transition flex items-center justify-center text-lg"
                    title="YouTube"
                  >
                    📺
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-800 text-center text-xs sm:text-sm text-gray-500">
              © 2025 onAI Academy. Все права защищены.
            </div>
          </div>
        </footer>
      </div>
    </div>
      )}
    </>
  );
}
