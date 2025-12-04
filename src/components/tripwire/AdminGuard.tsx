import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { tripwireSupabase } from '@/lib/supabase-tripwire';
import { Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * AdminGuard - защита для админских маршрутов
 * Разрешает доступ ТОЛЬКО admin роли
 * Полный доступ ко всему функционалу платформы
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔐 AdminGuard: Проверка Tripwire auth...');
      
      const { data: { session }, error } = await tripwireSupabase.auth.getSession();

      if (error || !session) {
        console.log('❌ AdminGuard: Нет сессии');
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Получаем роль из user_metadata
      const role = session.user.user_metadata?.role || null;
      setUserRole(role);

      console.log('✅ AdminGuard: Пользователь:', session.user.email);
      console.log('  Роль:', role);

      // Разрешаем доступ ТОЛЬКО admin
      if (role === 'admin') {
        console.log('✅ AdminGuard: Доступ разрешён');
        setIsAuthorized(true);
      } else {
        console.log('❌ AdminGuard: Доступ запрещён. Роль:', role);
        setIsAuthorized(false);
      }

    } catch (err) {
      console.error('❌ AdminGuard: Ошибка проверки auth:', err);
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
          <p className="text-white font-['Space_Grotesk'] text-xl">ЗАГРУЗКА...</p>
        </div>
      </div>
    );
  }

  // Если не admin - редирект на access-denied
  if (!isAuthorized || userRole !== 'admin') {
    console.log('❌ AdminGuard: Доступ запрещён. Редирект на /access-denied');
    return <Navigate to="/access-denied" replace />;
  }

  // Admin доступ разрешён
  return <>{children}</>;
}

