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

  async function loadUserRole() {
    try {
      console.log('🔍 MainLayout: Начало загрузки роли...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ Ошибка getUser:', userError);
        setUserRole("student");
        return;
      }
      
      if (!user) {
        console.log('⚠️ Нет пользователя');
        setUserRole("student");
        return;
      }

      console.log('👤 User ID:', user.id);
      console.log('📧 Email:', user.email);

      // Загружаем профиль из БД
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Ошибка загрузки профиля:', profileError);
        setUserRole("student");
        return;
      }

      if (profile) {
        console.log('✅ Профиль найден, роль:', profile.role);
        setUserRole(profile.role);
      } else {
        console.log('⚠️ Профиль не найден, роль по умолчанию: student');
        setUserRole("student");
      }
      
    } catch (error) {
      console.error('❌ Исключение в loadUserRole:', error);
      setUserRole("student");
    }
  }

  useEffect(() => {
    loadUserRole();
  }, []);

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
