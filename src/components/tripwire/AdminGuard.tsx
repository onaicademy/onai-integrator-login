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
        console.log('❌ AdminGuard: Нет сессии - редирект на /login');
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      console.log('✅ AdminGuard: Пользователь:', session.user.email);

      // 🔥 КРИТИЧНО: Загружаем роль из таблицы users (НЕ из user_metadata!)
      const { data: userData, error: userError } = await tripwireSupabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData) {
        console.error('❌ AdminGuard: Не удалось загрузить роль:', userError);
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      const role = userData.role;
      setUserRole(role);
      
      console.log('  Роль из БД:', role);

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
          <p className="text-white font-['JetBrains_Mono'] text-xl tracking-wider uppercase">ЗАГРУЗКА...</p>
        </div>
      </div>
    );
  }

  // Если нет сессии - редирект на логин
  if (!isAuthorized && !userRole) {
    console.log('❌ AdminGuard: Нет сессии. Редирект на /login');
    return <Navigate to="/login" replace />;
  }

  // Если не admin - редирект на access-denied
  if (!isAuthorized || userRole !== 'admin') {
    console.log('❌ AdminGuard: Доступ запрещён. Редирект на /access-denied');
    return <Navigate to="/access-denied" replace />;
  }

  // Admin доступ разрешён
  return <>{children}</>;
}

