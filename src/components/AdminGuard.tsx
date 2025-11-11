// src/components/AdminGuard.tsx
// ✅ ИСПРАВЛЕННАЯ ВЕРСИЯ - Решает проблему с перезагрузкой страницы

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Используем асинхронный getSession()
    // вместо полагания на INITIAL_SESSION event
    const checkAuth = async () => {
      try {
        console.log('🔐 AdminGuard: Проверка авторизации...');

        // Ждём завершения восстановления сессии из localStorage
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ AdminGuard: Ошибка получения сессии', error);
          navigate('/login');
          setIsLoading(false);
          return;
        }

        if (!session) {
          console.log('❌ AdminGuard: Нет сохранённой сессии');
          navigate('/login');
          setIsLoading(false);
          return;
        }

        console.log('✅ AdminGuard: Сессия найдена для', session.user.email);

        // 2. КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Берем роль из JWT metadata
        // это быстро и не требует запроса к БД
        const role = session.user.user_metadata?.role || 
                     session.user.app_metadata?.role;

        if (role !== 'admin') {
          console.log('🚫 AdminGuard: Пользователь не админ, роль:', role);
          navigate('/courses');
          setIsLoading(false);
          return;
        }

        console.log('✅ AdminGuard: Админ авторизован');
        setIsAdmin(true);
        setIsLoading(false);

      } catch (error) {
        console.error('❌ AdminGuard: Неожиданная ошибка', error);
        navigate('/login');
        setIsLoading(false);
      }
    };

    // Запускаем проверку
    checkAuth();

    // 3. Подписываемся на изменения auth состояния для БУДУЩИХ событий
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 AdminGuard auth event:', event);

        // Пользователь вышел
        if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
          navigate('/login');
          return;
        }

        // Пользователь вошел
        if (event === 'SIGNED_IN' && session) {
          const role = session.user.user_metadata?.role || 
                       session.user.app_metadata?.role;

          if (role === 'admin') {
            setIsAdmin(true);
          } else {
            navigate('/courses');
          }
        }

        // Токен обновлен (игнорируем, сессия уже есть)
        if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Токен обновлен');
        }
      }
    );

    return () => {
      console.log('🧹 AdminGuard: Отписка от auth events');
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Показываем loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="text-lg text-muted-foreground">Проверка доступа...</div>
        </div>
      </div>
    );
  }

  // Если не админ, ничего не рендерим (редирект уже произошёл)
  if (!isAdmin) {
    return null;
  }

  // Пропускаем админа к контенту
  return <>{children}</>;
}
