import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const navigate = useNavigate();
  const { isInitialized, userRole } = useAuth();

  useEffect(() => {
    if (!isInitialized) {
      console.log('⏳ AdminGuard: Ожидание инициализации...');
      return;
    }

    console.log('🔐 AdminGuard: Проверка авторизации...');

    if (userRole !== 'admin') {
      console.log('🚫 AdminGuard: Доступ запрещен. Роль:', userRole);
      navigate('/courses');
    } else {
      console.log('✅ AdminGuard: Админ авторизован');
    }
  }, [isInitialized, userRole, navigate]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return null;
  }

  return <>{children}</>;
}
