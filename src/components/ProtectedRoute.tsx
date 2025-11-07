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
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
      
      // Проверка роли админа из таблицы public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, is_ceo')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user role:', userError);
        // Если ошибка - считаем что не админ
        setIsAdmin(false);
      } else {
        setIsAdmin(userData?.role === 'admin' || userData?.is_ceo === true);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
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

