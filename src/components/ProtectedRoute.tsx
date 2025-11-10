import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    logger.log('🔐 ProtectedRoute: Начало проверки авторизации');

    try {
      // Устанавливаем таймаут на всю проверку (5 секунд)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), 5000)
      );

      const authCheckPromise = (async () => {
        logger.log('📡 ProtectedRoute: Запрос getUser...');
        const { data: { user }, error } = await supabase.auth.getUser();

        logger.log('📥 ProtectedRoute: Ответ getUser:', { user: !!user, error });

        if (error || !user) {
          logger.log('❌ ProtectedRoute: Пользователь не авторизован');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        logger.log('✅ ProtectedRoute: Пользователь авторизован:', user.email);
        setIsAuthenticated(true);

        // Проверка роли админа - ТОЛЬКО для saint@onaiacademy.kz
        if (user.email === 'saint@onaiacademy.kz') {
          logger.log('👑 ProtectedRoute: Это CEO - admin доступ разрешён');
          setIsAdmin(true);
        } else {
          logger.log('👤 ProtectedRoute: Обычный пользователь');
          setIsAdmin(false);
        }

        logger.log('✅ ProtectedRoute: Проверка завершена');
        setIsLoading(false);
      })();

      await Promise.race([authCheckPromise, timeoutPromise]);

    } catch (error: any) {
      logger.error('🚨 ProtectedRoute: Ошибка проверки авторизации:', error.message);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Редирект на логин с сохранением предыдущего пути
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    // Если требуется админ, но пользователь не админ
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}

