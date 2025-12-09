import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { OnAILogo } from "@/components/OnAILogo";
import { motion, AnimatePresence } from "framer-motion";
import { 
  House, 
  Brain, 
  User, 
  Trophy, 
  GridNine, 
  ChartBar,
  Lightning,
  Robot
} from '@phosphor-icons/react';
import { type Icon } from '@phosphor-icons/react';

type UserRole = "admin" | "student";

interface MenuItem {
  title: string;
  url: string;
  icon: Icon;
}

const studentMenuItems: MenuItem[] = [
  { title: "Главная", url: "/courses", icon: House },
  { title: "NeuroHUB", url: "/neurohub", icon: Brain },
  { title: "Мой профиль", url: "/profile", icon: User },
  { title: "Достижения", url: "/achievements", icon: Trophy },
  { title: "onAIgram", url: "/messages", icon: GridNine },
  { title: "Админ панель", url: "/admin", icon: ChartBar },
];

interface AppSidebarProps {
  role: UserRole | null;
}

/**
 * 🎨 ПРЕМИУМ SIDEBAR с GLASSMORPHISM
 * - Matrix Rain фон
 * - 3D иконки из Phosphor Icons
 * - Glassmorphism эффекты
 * - Футуристичные анимации
 */
export function AppSidebarPremium({ role }: AppSidebarProps) {
  console.log('📋 AppSidebarPremium роль:', role);
  
  if (!role) {
    console.log("⏳ AppSidebarPremium: Роль не определена, ждём...");
    return null;
  }

  const { state } = useSidebar();

  const menuItems = studentMenuItems.filter(item => {
    if (role === "student" && item.url === "/admin") {
      console.log('🚫 Скрываем админ-панель для студента');
      return false;
    }
    return true;
  });

  const isCollapsed = state === "collapsed";

  console.log('✅ Показываем пунктов:', menuItems.length, 'для роли:', role);

  return (
    <Sidebar 
      collapsible="offcanvas" 
      className="border-r border-white/5 relative overflow-hidden glass-panel"
      style={{
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Minimalist - No decorative animations */}

      <SidebarHeader className="border-b border-white/5 px-4 sm:px-6 py-4 sm:py-6 relative overflow-hidden">
        
        <div className={cn(
          "flex items-center transition-all duration-500 relative z-10",
          isCollapsed ? "justify-center" : "justify-start gap-3"
        )}>
          {/* ЛОГОТИП - MINIMALIST (No animations) */}
          <div className="relative">
            {isCollapsed ? (
              <OnAILogo variant="icon" className="w-12 h-12 text-[#00FF88]" />
            ) : (
              <OnAILogo variant="full" className="h-10 w-auto text-white" />
            )}
          </div>
        </div>

      </SidebarHeader>

      <SidebarContent className="px-3 sm:px-4 relative">
        <SidebarGroup>
          <SidebarGroupLabel 
            className={cn(
              "px-3 mb-4 text-sm font-semibold uppercase text-white flex items-center gap-2.5",
              isCollapsed && "opacity-0"
            )}
          >
            <Lightning size={20} weight="fill" className="text-[#00FF88] drop-shadow-[0_0_8px_rgba(0,255,136,0.6)]" />
            <span className="drop-shadow-[0_0_10px_rgba(0,255,136,0.3)]">НАВИГАЦИЯ</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              <AnimatePresence mode="popLayout">
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ delay: index * 0.05, type: "spring" }}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className={({ isActive }) =>
                            cn(
                              "group relative flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-300",
                              isActive 
                                ? "text-[#00FF88] bg-[#00FF88]/10 border-l-2 border-l-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                                : "text-gray-400 hover:text-white hover:bg-white/5 hover:translate-x-1 border-l-2 border-l-transparent"
                            )
                          }
                          style={{
                            backdropFilter: 'blur(10px)',
                          }}
                        >
                          {({ isActive }) => (
                            <>
                              {/* Icon - WOW Effect */}
                              <item.icon 
                                size={22}
                                weight={isActive ? "fill" : "duotone"}
                                className={cn(
                                  "flex-shrink-0 transition-all duration-300",
                                  isActive && "drop-shadow-[0_0_6px_rgba(0,255,136,0.6)]"
                                )}
                              />
                              
                              {/* Text - Brand Code 3.0 (Manrope) */}
                              {!isCollapsed && (
                                <span className={cn(
                                  "text-sm font-sans font-semibold transition-all duration-300",
                                  isActive && "drop-shadow-[0_0_6px_rgba(0,255,136,0.5)]"
                                )}>
                                  {item.title}
                                </span>
                              )}
                              
                              {/* Active glow effect */}
                              {isActive && (
                                <motion.div
                                  className="absolute inset-0 rounded-lg bg-[#00FF88]/5 pointer-events-none"
                                  animate={{
                                    opacity: [0.3, 0.5, 0.3],
                                  }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                  }}
                                />
                              )}
                            </>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </motion.div>
                ))}
              </AnimatePresence>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 sm:px-6 py-4 sm:py-5 border-t border-white/5 relative overflow-hidden">
        
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative z-10 space-y-3"
            >
              {/* System Status - Minimalist */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{
                      boxShadow: ['0 0 6px #00FF88', '0 0 12px #00FF88', '0 0 6px #00FF88'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="w-2 h-2 rounded-full bg-[#00FF88]"
                  />
                  <span className="text-[11px] font-mono font-semibold text-[#00FF88]/80 uppercase tracking-widest drop-shadow-[0_0_4px_rgba(0,255,136,0.3)]">
                    СИСТЕМА АКТИВНА
                  </span>
                </div>
              </div>
              
              <div className="px-3 space-y-1">
                <p className="text-[11px] font-sans font-semibold text-gray-400 flex items-center gap-2">
                  <Robot size={14} weight="duotone" className="text-[#00FF88]" />
                  <span>© 2025 onAI Academy</span>
                </p>
                <p className="text-[10px] font-mono font-medium text-gray-600 tracking-wide pl-5">
                  PREMIUM LEARNING PLATFORM
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SidebarFooter>
    </Sidebar>
  );
}
