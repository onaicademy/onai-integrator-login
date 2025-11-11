// src/components/layouts/MainLayout.tsx
// ✅ ИСПРАВЛЕННАЯ ВЕРСИЯ - Решает проблему с зависанием

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

type UserRole = 'admin' | 'student' | 'curator' | 'tech_support' | null;

export function MainLayout({ children }: MainLayoutProps) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Получаем сессию ВНЕ onAuthStateChange
    // Это предотвращает deadlock
    const initializeRole = async () => {
      try {
        console.log('🔍 MainLayout: Инициализация...');

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ MainLayout: Ошибка получения сессии', error);
          setUserRole(null);
          setIsLoading(false);
          return;
        }

        if (!session) {
          console.log('❌ MainLayout: Нет активной сессии');
          setUserRole(null);
          setIsLoading(false);
          return;
        }

        // 2. КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Берем роль из JWT metadata
        // НИКАКИХ запросов к БД! Это предотвращает зависание
        const role = session.user.user_metadata?.role || 
                     session.user.app_metadata?.role || 
                     'student';

        console.log('✅ MainLayout: Роль определена -', role);
        setUserRole(role as UserRole);
        setIsLoading(false);

      } catch (error) {
        console.error('❌ MainLayout: Неожиданная ошибка', error);
        setUserRole(null);
        setIsLoading(false);
      }
    };

    initializeRole();

    // 3. КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: НЕ используем await внутри onAuthStateChange!
    // Это вызывает deadlock согласно документации Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔍 MainLayout auth event:', event);

        if (event === 'SIGNED_OUT') {
          setUserRole(null);
          return;
        }

        if (session) {
          // НЕ используем await! Берем роль из session напрямую
          const role = session.user.user_metadata?.role || 
                       session.user.app_metadata?.role || 
                       'student';

          console.log('🔄 MainLayout: Роль обновлена -', role);
          setUserRole(role as UserRole);
        }
      }
    );

    return () => {
      console.log('🧹 MainLayout: Отписка от auth events');
      subscription.unsubscribe();
    };
  }, []);

  // Показываем loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="text-lg text-muted-foreground">Загрузка...</div>
        </div>
      </div>
    );
  }

  // Если нет роли, показываем сообщение
  if (!userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="text-lg text-muted-foreground">
            Пожалуйста, войдите в систему
          </div>
        </div>
      </div>
    );
  }

  // Рендерим layout с sidebar
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar role={userRole} />
        <div className="flex-1 flex flex-col w-full">
          <header className="sticky top-0 z-10 flex h-14 sm:h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
            <SidebarTrigger className="text-foreground hover:text-primary transition-colors" />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
