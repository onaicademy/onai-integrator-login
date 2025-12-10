import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { tripwireSupabase } from '@/lib/supabase-tripwire';

interface TripwireGuardProps {
  children: React.ReactNode;
}

/**
 * TripwireGuard - Authentication Guard for Tripwire Routes
 * 
 * Проверяет Tripwire Supabase auth (отдельная база данных)
 * Если не авторизован, редиректит на /tripwire/login
 */
export function TripwireGuard({ children }: TripwireGuardProps) {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔒 TripwireGuard: Проверка Tripwire auth...');
      console.log('  Path:', location.pathname);
      
      const { data: { session }, error } = await tripwireSupabase.auth.getSession();

      if (error) {
        console.error('❌ TripwireGuard: Ошибка получения сессии:', error);
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      if (!session) {
        console.log('❌ TripwireGuard: Нет сессии');
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Проверяем срок действия токена
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();
      
      if (expiresAt < now) {
        console.error('❌ TripwireGuard: Токен истек');
        localStorage.removeItem('tripwire_supabase_token');
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      console.log('✅ TripwireGuard: Сессия валидна');
      console.log('  Email:', session.user.email);
      console.log('  Expires:', new Date(expiresAt).toLocaleString());
      
      setUserEmail(session.user.email);
      setIsAuthorized(true);

    } catch (err) {
      console.error('❌ TripwireGuard: Ошибка проверки auth:', err);
      setIsAuthorized(false);
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 1: Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030303]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#00FF88] mx-auto" />
          <p className="text-xl text-white">Проверка авторизации...</p>
          <p className="text-sm text-gray-400">Загрузка Tripwire...</p>
        </div>
      </div>
    );
  }

  // STEP 2: Not authorized - redirect to login
  if (!isAuthorized) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    console.log('❌ TripwireGuard: Редирект на /integrator/login');
    
    return (
      <Navigate 
        to={`/integrator/login?returnUrl=${returnUrl}`} 
        replace 
      />
    );
  }

  // STEP 3: Authorized - render children
  console.log('✅ TripwireGuard: Доступ разрешён для', userEmail);
  return <>{children}</>;
}

