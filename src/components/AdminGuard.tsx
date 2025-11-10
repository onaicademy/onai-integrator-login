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
  const [hasSession, setHasSession] = useState(false);

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
        setHasSession(true);
        setIsLoading(false);
        return;
      }

      // Проверяем есть ли сессия вообще
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('❌ AdminGuard: Нет сессии → редирект на /login');
        setHasSession(false);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      // Если есть сессия - проверяем права
      const { data: { user } } = await supabase.auth.getUser();
      
      setHasSession(true);
      const userIsAdmin = user?.email === 'saint@onaiacademy.kz';
      
      if (userIsAdmin) {
        // Кешируем на время сессии
        sessionStorage.setItem('user_role', 'admin');
        sessionStorage.setItem('user_email', user.email);
        console.log('✅ AdminGuard: Доступ разрешён');
        setIsAdmin(true);
      } else {
        console.log('🚫 AdminGuard: Доступ запрещён (не админ)');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('❌ AdminGuard: Ошибка проверки:', error);
      setHasSession(false);
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

  // НЕТ СЕССИИ → редирект на /login
  if (!hasSession) {
    console.log('🔄 AdminGuard: Редирект на /login');
    return <Navigate to="/login" replace />;
  }

  // ЕСТЬ СЕССИЯ, НО НЕ АДМИН → редирект на /courses
  if (!isAdmin) {
    console.log('🔄 AdminGuard: Редирект на /courses (не админ)');
    return <Navigate to="/courses" replace />;
  }

  return <>{children}</>;
}

