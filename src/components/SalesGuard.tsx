import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { tripwireSupabase } from '@/lib/supabase-tripwire';

interface SalesGuardProps {
  children: ReactNode;
}

/**
 * SalesGuard - защита для Sales Manager Dashboard
 * Проверяет Tripwire Supabase auth (отдельная база данных)
 * Разрешает доступ только admin и sales ролям
 */
export function SalesGuard({ children }: SalesGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔥🔥🔥 SALESGUARD VERSION 2.0 - DIRECT POSTGRES - DEC 4 01:40 🔥🔥🔥');
      console.log('🔐 SalesGuard: Проверка Tripwire auth...');
      
      const { data: { session }, error } = await tripwireSupabase.auth.getSession();

      if (error || !session) {
        console.log('❌ SalesGuard: Нет сессии в Tripwire');
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Получаем роль из user_metadata
      const role = session.user.user_metadata?.role || null;
      setUserRole(role);

      console.log('✅ SalesGuard: Пользователь:', session.user.email);
      console.log('  Роль:', role);

      // Разрешаем доступ только admin и sales
      if (role === 'admin' || role === 'sales') {
        console.log('✅ SalesGuard: Доступ разрешён');
        setIsAuthorized(true);
      } else {
        console.log('❌ SalesGuard: Доступ запрещён. Роль:', role);
        setIsAuthorized(false);
      }

    } catch (err) {
      console.error('❌ SalesGuard: Ошибка проверки auth:', err);
      setIsAuthorized(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ШАГ 1: Загрузка
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#030303]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FF94] mx-auto mb-4"></div>
          <p className="text-white font-['Space_Grotesk'] text-xl">ЗАГРУЗКА...</p>
        </div>
      </div>
    );
  }

  // ШАГ 2: Если не авторизован - редирект на Tripwire Login
  if (!isAuthorized || !userRole) {
    console.log('❌ SalesGuard: Редирект на /tripwire/login');
    return <Navigate to="/tripwire/login" replace />;
  }

  // ШАГ 3: Проверяем роль
  if (userRole !== 'admin' && userRole !== 'sales') {
    console.log('❌ SalesGuard: Доступ запрещён. Роль:', userRole);
    return <Navigate to="/access-denied" replace />;
  }

  // ШАГ 4: Доступ разрешён
  return <>{children}</>;
}

