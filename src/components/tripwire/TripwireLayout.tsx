import { useState } from "react";
import { TripwireSidebar } from "./TripwireSidebar";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { List } from "@phosphor-icons/react";
import { useIsMobile } from "@/hooks/use-mobile";

interface TripwireLayoutProps {
  children: React.ReactNode;
}

/**
 * 🎯 TRIPWIRE LAYOUT
 * - Fixed sidebar on desktop
 * - Sheet (hamburger) menu on mobile
 * - Dark cyber-architecture aesthetic
 */
export function TripwireLayout({ children }: TripwireLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#00FF88]/30">
      {/* Sidebar - добавили z-[100] чтобы был поверх всего */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 h-screen w-80 border-r border-white/5 bg-[#050505]/95 backdrop-blur-xl z-[100] hidden lg:block">
          <TripwireSidebar />
        </aside>
      )}

      {/* Mobile Sidebar - Sheet */}
      {isMobile && (
        <>
          {/* Mobile Header with Hamburger */}
          <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md px-6 py-4 lg:hidden flex items-center"
            style={{
              background: 'rgba(10, 10, 10, 0.8)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <List size={28} weight="bold" />
            </Button>
          </header>

          {/* Sheet Sidebar */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent 
              side="left" 
              className="p-0 w-64 border-r border-white/10"
              hideClose={true}
              style={{
                background: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(30px)',
              }}
            >
              <TripwireSidebar onClose={() => setSidebarOpen(false)} isMobile={true} />
            </SheetContent>
          </Sheet>
        </>
      )}

      {/* Main Content - добавили relative и z-0 */}
      <main className={`relative z-0 min-h-screen transition-all duration-300 ${isMobile ? 'pt-16' : 'lg:ml-80'}`}>
        {/* Desktop Header - тоже поднимаем z-index если он есть */}
        {!isMobile && (
          <header className="sticky top-0 z-50 flex h-14 sm:h-16 items-center gap-4 border-b border-white/10 px-4 sm:px-6"
            style={{
              background: 'rgba(10, 10, 10, 0.8)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Toggle sidebar by animating it off-screen
                const sidebar = document.querySelector('aside');
                const main = document.querySelector('main');
                if (sidebar && main) {
                  if (sidebar.style.transform === 'translateX(-100%)') {
                    sidebar.style.transform = 'translateX(0)';
                    main.style.marginLeft = '320px';
                  } else {
                    sidebar.style.transform = 'translateX(-100%)';
                    main.style.marginLeft = '0';
                  }
                }
              }}
              className="text-white/70 hover:text-[#00FF88] hover:bg-white/10 transition-colors"
            >
              <List size={24} weight="bold" />
            </Button>
          </header>
        )}
        
        <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

