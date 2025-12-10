import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { tripwireSupabase } from '@/lib/supabase-tripwire';
import { Loader2 } from 'lucide-react';

interface StudentGuardProps {
  children: ReactNode;
}

/**
 * StudentGuard - защита для студенческих маршрутов
 * Разрешает доступ только student, admin и sales ролям
 * (admin и sales могут видеть студенческий интерфейс для проверки)
 */
export function StudentGuard({ children }: StudentGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔐 StudentGuard: Проверка Tripwire auth...');
      
      const { data: { session }, error } = await tripwireSupabase.auth.getSession();

      if (error || !session) {
        console.log('❌ StudentGuard: Нет сессии');
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Получаем роль из user_metadata
      const role = session.user.user_metadata?.role || null;
      setUserRole(role);

      console.log('✅ StudentGuard: Пользователь:', session.user.email);
      console.log('  Роль:', role);

      // Разрешаем доступ student, admin и sales
      if (role === 'student' || role === 'admin' || role === 'sales') {
        console.log('✅ StudentGuard: Доступ разрешён');
        setIsAuthorized(true);
      } else {
        console.log('❌ StudentGuard: Доступ запрещён. Роль:', role);
        setIsAuthorized(false);
      }

    } catch (err) {
      console.error('❌ StudentGuard: Ошибка проверки auth:', err);
      setIsAuthorized(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#030303]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#00FF94] mx-auto" />
          <p className="text-white font-['JetBrains_Mono'] text-xl tracking-wider uppercase">ЗАГРУЗКА...</p>
        </div>
      </div>
    );
  }

  // Если не авторизован - редирект на Integrator Login
  if (!isAuthorized || !userRole) {
    console.log('❌ StudentGuard: Редирект на /integrator/login');
    return <Navigate to="/integrator/login" replace />;
  }

  // Доступ разрешён
  return <>{children}</>;
}

