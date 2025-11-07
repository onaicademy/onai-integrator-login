import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * ПРОСТАЯ проверка: только saint@onaiacademy.kz может видеть админские страницы
 * Все остальные перенаправляются на /courses
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Только saint@onaiacademy.kz - админ
      if (user?.email === 'saint@onaiacademy.kz') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Ошибка проверки админа:', error);
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

