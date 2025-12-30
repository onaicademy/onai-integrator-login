import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Guard для защиты админских роутов
 * Проверяет что пользователь авторизован И имеет роль admin
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const { user, userRole, isLoading } = useAuth();

  // Пока загрузка - показываем loader
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00FF94] border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 font-mono">Checking access...</p>
        </div>
      </div>
    );
  }

  // Если не авторизован - редирект на логин
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Если не админ/saint - редирект на главную
  if (userRole !== 'admin' && userRole !== 'saint') {
    return <Navigate to="/profile" replace />;
  }

  // Все проверки прошли - показываем контент
  return <>{children}</>;
}
