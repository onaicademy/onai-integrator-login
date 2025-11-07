import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || '/courses';

  // Проверка авторизации при загрузке
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  }

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

        toast({
          title: '❌ Ошибка входа',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      if (data.user) {
        toast({
          title: '✅ Добро пожаловать!',
          description: 'Вы успешно вошли в систему',
        });
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      console.error('Login error:', error);
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
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-[#5fccc9]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Космический фон с плавающими светлыми пятнами */}
      <div className="absolute inset-0">
        {/* Звезды */}
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}

        {/* Плавающие светлые пятна (blur blobs) */}
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-gradient-to-br from-purple-500/30 to-transparent blur-3xl"
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
          className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-500/20 to-transparent blur-3xl"
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
          className="absolute w-80 h-80 rounded-full bg-gradient-to-br from-blue-500/25 to-transparent blur-3xl"
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
      <div className="relative z-10">
        {/* Хедер */}
        <header className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-12">
            <h1 className="text-2xl font-bold text-white tracking-wider">
              ONAI<br />ACADEMY
            </h1>
            <nav className="hidden md:block">
              <a href="/courses" className="text-gray-300 hover:text-white transition">
                Все курсы
              </a>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-gray-300 hover:text-white transition">
              🌐
            </button>
          </div>
        </header>

        {/* Форма входа */}
        <div className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            {/* Заголовок */}
            <div className="text-center mb-12">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-4 mb-4"
              >
                <div className="w-12 h-12 rounded-full border-2 border-[#5fccc9] flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-[#5fccc9]" />
                </div>
                <h2 className="text-5xl font-bold text-white">ВХОД</h2>
              </motion.div>
            </div>

            {/* Форма */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Mail className="w-4 h-4" />
                  Электронная почта
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-14 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#5fccc9] focus:ring-[#5fccc9]/20"
                  placeholder="student@onaiacademy.kz"
                />
              </div>

              {/* Пароль */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Lock className="w-4 h-4" />
                  Пароль
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-14 bg-[#1a1a24] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#5fccc9] focus:ring-[#5fccc9]/20"
                  placeholder="••••••••"
                />
              </div>

              {/* Кнопка входа */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-[#5fccc9] hover:bg-[#4ebbb8] text-[#0a0a0f] font-semibold text-lg transition-all duration-300 hover:scale-[1.02]"
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
            <div className="mt-8 text-center space-y-2">
              <p className="text-sm text-gray-400">
                Нет аккаунта?{' '}
                <span className="text-[#5fccc9] cursor-pointer hover:underline">
                  Обратитесь к администратору
                </span>
              </p>
              <p className="text-sm text-gray-500">
                Забыли пароль? Свяжитесь с поддержкой
              </p>
            </div>
          </motion.div>
        </div>

        {/* Футер */}
        <footer className="absolute bottom-0 left-0 right-0 border-t border-gray-800">
          <div className="container mx-auto px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
              {/* О платформе */}
              <div>
                <h3 className="text-white font-semibold mb-3">О ПЛАТФОРМЕ</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>
                    <a href="#" className="hover:text-[#5fccc9] transition">
                      Публичная оферта
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-[#5fccc9] transition">
                      Политика конфиденциальности
                    </a>
                  </li>
                </ul>
              </div>

              {/* Контакты */}
              <div>
                <h3 className="text-white font-semibold mb-3">КОНТАКТЫ</h3>
                <p className="text-sm text-gray-400">
                  <Mail className="inline w-4 h-4 mr-2" />
                  feedback@onaiacademy.kz
                </p>
              </div>

              {/* Соцсети */}
              <div>
                <h3 className="text-white font-semibold mb-3">СОЦСЕТИ</h3>
                <div className="flex justify-center md:justify-start gap-4">
                  <a
                    href="#"
                    className="w-10 h-10 rounded-full bg-gray-800 hover:bg-[#5fccc9] transition flex items-center justify-center"
                  >
                    📷
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
              © 2025 onAI Academy. Все права защищены.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
