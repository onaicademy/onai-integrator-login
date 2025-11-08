import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * ОПТИМИЗИРОВАННАЯ проверка: используем sessionStorage для кеша
 * чтобы избежать повторных запросов при обновлении страницы
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      console.log('🔐 AdminGuard: Проверка прав...');
      
      // ОПТИМИЗАЦИЯ: проверяем sessionStorage сначала
      const cachedRole = sessionStorage.getItem('user_role');
      const cachedEmail = sessionStorage.getItem('user_email');
      
      if (cachedRole === 'admin' && cachedEmail === 'saint@onaiacademy.kz') {
        console.log('✅ AdminGuard: Роль из кеша - admin');
        setIsAdmin(true);
        setIsLoading(false);
        return;
      }

      // Если нет кеша - делаем запрос
      const { data: { user } } = await supabase.auth.getUser();
      
      const userIsAdmin = user?.email === 'saint@onaiacademy.kz';
      
      if (userIsAdmin) {
        // Кешируем на время сессии
        sessionStorage.setItem('user_role', 'admin');
        sessionStorage.setItem('user_email', user.email);
        console.log('✅ AdminGuard: Доступ разрешён');
        setIsAdmin(true);
      } else {
        console.log('🚫 AdminGuard: Доступ запрещён');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('❌ AdminGuard: Ошибка проверки:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    // Студенты перенаправляются на главную
    return <Navigate to="/courses" replace />;
  }

  return <>{children}</>;
}

