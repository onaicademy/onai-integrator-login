import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isInitialized, userRole, isLoading } = useAuth();

  console.log('🔐 AdminGuard: Проверка авторизации...');
  console.log('  isInitialized:', isInitialized);
  console.log('  userRole:', userRole);
  console.log('  isLoading:', isLoading);

  // 1️⃣ Пока инициализируется - ждём
  if (isLoading || !isInitialized) {
    console.log('⏳ AdminGuard: Ожидание инициализации...');
    return <div className="flex items-center justify-center h-screen">Загрузка...</div>;
  }

  // 2️⃣ Если не админ - РЕДИРЕКТ на /login
  if (userRole !== 'admin') {
    console.log('❌ AdminGuard: Доступ запрещён. userRole:', userRole);
    console.log('🔄 AdminGuard: Редирект на /login...');
    return <Navigate to="/login" replace />;
  }

  // 3️⃣ Админ авторизован - показываем контент
  console.log('✅ AdminGuard: Админ авторизован');
  return <>{children}</>;
}
