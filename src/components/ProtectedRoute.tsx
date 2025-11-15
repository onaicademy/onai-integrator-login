import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, userRole, isInitialized, isLoading } = useAuth();
  const location = useLocation();

  // ШАГ 1: Пока инициализируется - показываем загрузку
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  // ШАГ 2: Если не авторизован - редирект на логин
  if (!user) {
    console.log('❌ ProtectedRoute: Пользователь не авторизован, редирект на /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ШАГ 3: Если требуется админ, но пользователь не админ
  if (requireAdmin && userRole !== 'admin') {
    console.log('❌ ProtectedRoute: Требуется админ, но роль:', userRole);
    return <Navigate to="/access-denied" replace />;
  }

  // ШАГ 4: Всё ОК - показываем контент
  console.log('✅ ProtectedRoute: Доступ разрешён');
  return <>{children}</>;
}

