import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  console.log('✅ MainLayout: Рендерим БЕЗ ПРОВЕРОК');
  
  // ХАРДКОД: всегда admin
  const userRole = "admin";

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
