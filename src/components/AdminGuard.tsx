import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isInitialized, userRole, isLoading } = useAuth();

  console.log('🔐 AdminGuard: Проверка авторизации...');
  console.log('  isInitialized:', isInitialized);
  console.log('  userRole:', userRole);
  console.log('  isLoading:', isLoading);

  // ШАГ 1: Пока инициализируется - показываем загрузку
  if (isLoading || !isInitialized) {
    console.log('⏳ AdminGuard: Ожидание инициализации...');
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  // ШАГ 2: Если инициализирована И не админ - редирект
  if (isInitialized && userRole !== 'admin') {
    console.log('❌ AdminGuard: Доступ запрещён. userRole:', userRole);
    return <Navigate to="/login" replace />;
  }

  // ШАГ 3: Админ авторизован - показываем контент
  console.log('✅ AdminGuard: Админ авторизован');
  return <>{children}</>;
}
