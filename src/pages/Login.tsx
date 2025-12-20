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
import { PasswordRecoveryModal } from '@/components/PasswordRecoveryModal';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [isPasswordRecoveryOpen, setIsPasswordRecoveryOpen] = useState(false);
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
        // 🔥 AUTO-REDIRECT: Sales менеджеры → Sales Manager Panel
        if (userData?.role === 'sales') {
          console.log('👨‍💼 Sales менеджер, редирект на /integrator/sales-manager');
          toast({
            title: '✅ Добро пожаловать!',
            description: 'Панель управления продажами Tripwire',
          });
          navigate('/integrator/sales-manager', { replace: true });
          return;
        }

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
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#00FF88] flex items-center justify-center flex-shrink-0">
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-[#00FF88]" />
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
                  className="h-12 sm:h-14 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00FF88] focus:ring-[#00FF88]/20"
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
                    className="h-12 sm:h-14 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00FF88] focus:ring-[#00FF88]/20 pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#00FF88] transition"
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
                className="w-full h-12 sm:h-14 bg-[#00FF88] hover:bg-[#00cc88] text-black font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-[#00FF88]/20"
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

            {/* Забыли пароль */}
            <div className="mt-6 sm:mt-8 text-center px-4 space-y-3">
              <button
                onClick={() => setIsPasswordRecoveryOpen(true)}
                className="text-sm text-[#00FF88] hover:text-[#00cc88] transition-colors font-medium"
              >
                Забыли пароль?
              </button>
              
              <p className="text-sm text-gray-400">
                Нет доступа?{' '}
                <a
                  href="https://api.whatsapp.com/send/?phone=77066523203&text&type=phone_number&app_absent=0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00FF88] hover:text-[#00cc88] transition-colors"
                >
                  Свяжитесь с нами →
                </a>
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
                    <a href="#" className="hover:text-[#00FF88] transition break-words">
                      Публичная оферта
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-[#00FF88] transition break-words">
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
                    href="https://wa.me/77089506588"
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
            </div>

            <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-800/50">
              <div className="flex flex-col md:flex-row items-center justify-between gap-2">
                <p className="text-[10px] text-gray-600 text-center md:text-left opacity-50">
                  © {new Date().getFullYear()} onAI Academy. Все права защищены
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-700 font-['JetBrains_Mono'] text-[9px] uppercase tracking-wider opacity-40">
                    Версия платформы:
                  </span>
                  <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[#00FF88] bg-[#00FF88]/5 px-1.5 py-0.5 rounded border border-[#00FF88]/10 opacity-60">
                    v1.10.00
                  </span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
      )}

      {/* Password Recovery Modal */}
      <PasswordRecoveryModal
        isOpen={isPasswordRecoveryOpen}
        onClose={() => setIsPasswordRecoveryOpen(false)}
      />
    </>
  );
}
