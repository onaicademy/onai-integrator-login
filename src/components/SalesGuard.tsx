import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface SalesGuardProps {
  children: ReactNode;
}

/**
 * SalesGuard - защита для Sales Manager Dashboard
 * Разрешает доступ только admin и sales ролям
 */
export function SalesGuard({ children }: SalesGuardProps) {
  const { isInitialized, userRole, isLoading } = useAuth();

  console.log('🔐 SalesGuard: Проверка авторизации...');
  console.log('  isInitialized:', isInitialized);
  console.log('  userRole:', userRole);
  console.log('  isLoading:', isLoading);

  // ШАГ 1: Пока инициализируется - показываем загрузку
  if (isLoading || !isInitialized) {
    console.log('⏳ SalesGuard: Ожидание инициализации...');
    return (
      <div className="flex items-center justify-center h-screen bg-[#030303]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FF94] mx-auto mb-4"></div>
          <p className="text-white font-['Space_Grotesk'] text-xl">ЗАГРУЗКА...</p>
        </div>
      </div>
    );
  }

  // ШАГ 2: Если не авторизован - редирект на ОСНОВНОЙ Login (НЕ Tripwire!)
  const { user } = useAuth();
  if (isInitialized && !user) {
    console.log('❌ SalesGuard: Не авторизован, редирект на /login');
    return <Navigate to="/login" replace />;
  }

  // ШАГ 3: Если авторизован НО роль не admin/sales - редирект на access-denied
  if (isInitialized && user && userRole !== 'admin' && userRole !== 'sales') {
    console.log('❌ SalesGuard: Доступ запрещён. userRole:', userRole);
    return <Navigate to="/access-denied" replace />;
  }

  // ШАГ 4: Admin или Sales авторизован - показываем контент
  console.log('✅ SalesGuard: Admin или Sales авторизован');
  return <>{children}</>;
}

