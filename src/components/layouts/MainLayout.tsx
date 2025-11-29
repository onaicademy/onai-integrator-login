import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isInitialized, userRole, isLoading } = useAuth();

  console.log('📊 MainLayout render:', { isInitialized, userRole, isLoading });

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">
          Пожалуйста, войдите в систему
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar role={userRole} />
        <div className="flex-1 flex flex-col w-full">
          <header className="sticky top-0 z-10 flex h-14 sm:h-16 items-center gap-4 border-b border-gray-800 bg-[#18181b] px-4 sm:px-6">
            <SidebarTrigger className="text-white hover:text-[#00FF88] transition-colors" />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
