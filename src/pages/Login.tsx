import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || '/courses';

  // Генерируем звёзды ОДИН РАЗ при монтировании компонента
  const stars = useMemo(() => {
    return [...Array(50)].map((_, i) => {
      const startX = Math.random() * 100;
      const startY = Math.random() * 100;
      const moveX = (Math.random() - 0.5) * 30;
      const moveY = (Math.random() - 0.5) * 30;
      const duration = Math.random() * 5 + 3;
      const delay = Math.random() * 2;
      
      return { startX, startY, moveX, moveY, duration, delay };
    });
  }, []); // Пустой массив зависимостей = создаётся ОДИН РАЗ

  // Проверка авторизации при загрузке
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      console.log('🔍 Проверка авторизации...');
      setIsCheckingAuth(true);
      
      // БЕЗ таймаута - просто ждём ответа!
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Ошибка getSession:', error);
        return;
      }
      
      if (session) {
        console.log('✅ Сессия найдена:', session.user.email);
        console.log('🔄 Редирект на:', from);
        navigate(from, { replace: true });
      } else {
        console.log('ℹ️ Нет сессии, показываем форму');
      }
    } catch (error) {
      console.error('❌ Исключение в checkAuth:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    // 🔍 ДИАГНОСТИКА: Логируем попытку входа
    console.group('🔐 ПОПЫТКА ВХОДА')
    console.log('📧 Email:', email.trim())
    console.log('🔑 Password length:', password.length)
    console.log('📊 Request payload:', {
      email: email.trim(),
      password: '***' + password.slice(-3)
    })

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      // 🔍 ДИАГНОСТИКА: Логируем ответ
      console.log('📥 Response data:', data)
      console.log('❌ Response error:', error)
      console.groupEnd()

      if (error) {
        let errorMessage = 'Произошла ошибка при входе';
        
        // 🔍 ДИАГНОСТИКА: Детальная ошибка
        console.error('🚨 ОШИБКА SUPABASE:', {
          message: error.message,
          status: error.status,
          name: error.name,
          fullError: error
        })
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Неверный email или пароль';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email не подтверждён. Проверьте вашу почту.';
        } else if (error.message.includes('No API key')) {
          errorMessage = 'Ошибка конфигурации: API ключ не найден';
        }

        toast({
          title: '❌ Ошибка входа',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      if (data.user) {
        console.log('✅ ВХОД УСПЕШЕН:', {
          userId: data.user.id,
          email: data.user.email
        })
        
        // ПРОВЕРКА СТАТУСА АККАУНТА
        console.log('🔍 Проверка статуса аккаунта...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_active, account_expires_at, deactivation_reason')
          .eq('id', data.user.id)
          .single();
        
        if (profileError) {
          console.error('❌ Ошибка загрузки профиля:', profileError);
        } else if (profile) {
          console.log('📊 Профиль:', profile);
          
          // ПРОВЕРКА 1: Аккаунт деактивирован?
          if (!profile.is_active) {
            console.log('❌ Аккаунт деактивирован');
            
            // Выход из системы
            await supabase.auth.signOut();
            
            let deactivationMessage = 'Ваш аккаунт был деактивирован.';
            if (profile.deactivation_reason === 'expired') {
              deactivationMessage = 'Срок действия вашего аккаунта истёк.';
            } else if (profile.deactivation_reason === 'manual') {
              deactivationMessage = 'Ваш аккаунт был деактивирован администратором.';
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
              console.log('❌ Срок действия аккаунта истёк:', expiresAt);
              
              // Деактивируем аккаунт
              await supabase
                .from('profiles')
                .update({ 
                  is_active: false,
                  deleted_at: now.toISOString(),
                  deactivation_reason: 'expired'
                })
                .eq('id', data.user.id);
              
              // Выход из системы
              await supabase.auth.signOut();
              
              toast({
                title: '⏰ Срок действия истёк',
                description: 'Срок действия вашего аккаунта истёк. Обратитесь к администратору для продления.',
                variant: 'destructive',
                duration: 10000,
              });
              return;
            }
            
            // ПРЕДУПРЕЖДЕНИЕ: Скоро истечёт срок (менее 7 дней)
            const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 7 && daysLeft > 0) {
              console.log(`⚠️ Осталось ${daysLeft} дней до истечения`);
              toast({
                title: '⚠️ Внимание!',
                description: `Срок действия вашего аккаунта истекает через ${daysLeft} дней. Обратитесь к администратору.`,
                variant: 'default',
                duration: 8000,
              });
            }
          }
        }
        
        // ВАЖНО: Очищаем старый кеш при новом входе
        sessionStorage.clear();
        
        toast({
          title: '✅ Добро пожаловать!',
          description: 'Вы успешно вошли в систему',
        });
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА:', error);
      console.groupEnd()
      
      toast({
        title: '❌ Ошибка',
        description: 'Не удалось войти в систему',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-[#00ff00]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex flex-col">
      {/* Космический фон с плавающими светлыми пятнами */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Летающие звезды */}
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

        {/* Плавающие светлые пятна (blur blobs) - кислотно-зеленые */}
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-gradient-to-br from-[#00ff00]/20 to-transparent blur-3xl"
          style={{ top: '10%', left: '10%' }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#00ff00]/15 to-transparent blur-3xl"
          style={{ top: '50%', right: '10%' }}
          animate={{
            x: [0, -30, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute w-80 h-80 rounded-full bg-gradient-to-br from-[#00ff00]/10 to-transparent blur-3xl"
          style={{ bottom: '20%', left: '20%' }}
          animate={{
            x: [0, 40, 0],
            y: [0, -20, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Контент */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Хедер */}
        <header className="flex items-center justify-between px-4 sm:px-8 py-6 flex-shrink-0">
          <div className="flex items-center gap-4 sm:gap-12">
            <h1 className="text-xl sm:text-2xl font-bold tracking-wider leading-tight">
              <span className="text-[#00ff00]">ONAI</span><br />
              <span className="text-white">ACADEMY</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-gray-300 hover:text-[#00ff00] transition">
              🌐
            </button>
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
                <h2 className="text-4xl sm:text-5xl font-bold text-white">ВХОД</h2>
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
                    href="https://threads.net/@onaiacademy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-gray-800 hover:bg-[#00ff00] transition flex items-center justify-center text-lg"
                    title="Threads"
                  >
                    🧵
                  </a>
                  <a
                    href="https://t.me/onaiacademy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-gray-800 hover:bg-[#00ff00] transition flex items-center justify-center text-lg"
                    title="Telegram"
                  >
                    ✈️
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
  );
}
