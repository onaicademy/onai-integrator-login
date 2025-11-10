import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
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
    console.log('🔐 ProtectedRoute: Начало проверки авторизации');
    
    try {
      // Устанавливаем таймаут на всю проверку (5 секунд)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth check timeout')), 5000)
      );

      const authCheckPromise = (async () => {
        console.log('📡 ProtectedRoute: Запрос getUser...');
        const { data: { user }, error } = await supabase.auth.getUser();
        
        console.log('📥 ProtectedRoute: Ответ getUser:', { user: !!user, error });
        
        if (error || !user) {
          console.log('❌ ProtectedRoute: Пользователь не авторизован');
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        console.log('✅ ProtectedRoute: Пользователь авторизован:', user.email);
        setIsAuthenticated(true);
        
        // Проверка роли админа - ТОЛЬКО для saint@onaiacademy.kz
        if (user.email === 'saint@onaiacademy.kz') {
          console.log('👑 ProtectedRoute: Это CEO - admin доступ разрешён');
          setIsAdmin(true);
        } else {
          console.log('👤 ProtectedRoute: Обычный пользователь');
          setIsAdmin(false);
        }
        
        console.log('✅ ProtectedRoute: Проверка завершена');
        setIsLoading(false);
      })();

      await Promise.race([authCheckPromise, timeoutPromise]);
      
    } catch (error: any) {
      console.error('🚨 ProtectedRoute: Ошибка проверки авторизации:', error.message);
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

