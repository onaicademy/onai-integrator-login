import { ReactNode, useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/lib/supabase";

interface MainLayoutProps {
  children: ReactNode;
  role?: "admin" | "student";
}

export function MainLayout({ children, role: initialRole = "student" }: MainLayoutProps) {
  const [userRole, setUserRole] = useState<"admin" | "student">(initialRole);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let roleChecked = false; // ЗАЩИТА от повторного вызова

    async function loadUserRole() {
      if (roleChecked) {
        console.log('⏭️ Роль уже проверена, пропускаем');
        return;
      }
      
      roleChecked = true;
      
      try {
        console.log('🔍 MainLayout: Загрузка роли...');
        
        // ОПТИМИЗАЦИЯ: Проверяем sessionStorage сначала
        const cachedRole = sessionStorage.getItem('user_role');
        const cachedEmail = sessionStorage.getItem('user_email');
        
        if (cachedRole && cachedEmail) {
          console.log('✅ MainLayout: Роль из кеша:', cachedRole);
          if (isMounted) {
            setUserRole(cachedRole as "admin" | "student");
            setIsLoading(false);
          }
          return;
        }

        // Если нет кеша - делаем запрос
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (!isMounted) return;
        
        if (userError || !user) {
          console.log('⚠️ Нет пользователя, роль: student');
          if (isMounted) {
            setUserRole("student");
            setIsLoading(false);
          }
          return;
        }

        console.log('👤 User ID:', user.id);
        console.log('📧 Email:', user.email);

        // Определяем роль
        const role = user.user_metadata?.role || 
                     user.raw_user_meta_data?.role || 
                     (user.email === 'saint@onaiacademy.kz' ? 'admin' : 'student');
        
        const finalRole = role === 'admin' ? 'admin' : 'student';
        
        // Кешируем на время сессии
        sessionStorage.setItem('user_role', finalRole);
        sessionStorage.setItem('user_email', user.email || '');
        
        console.log('✅ Роль определена и закеширована:', finalRole);
        
        if (isMounted) {
          setUserRole(finalRole);
          setIsLoading(false);
        }
        
      } catch (error) {
        console.error('❌ Исключение в loadUserRole:', error);
        if (isMounted) {
          setUserRole("student");
          setIsLoading(false);
        }
      }
    }

    // Запускаем ТОЛЬКО ОДИН РАЗ
    loadUserRole();

    return () => {
      isMounted = false;
    };
  }, []); // Пустой массив = ТОЛЬКО при mount

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar role={userRole} />
        <div className="flex-1 flex flex-col w-full">
          <header className="sticky top-0 z-10 flex h-14 sm:h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
            <SidebarTrigger className="text-foreground hover:text-primary transition-colors" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
