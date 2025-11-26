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
import { motion, AnimatePresence } from "motion/react";
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
              <OnAILogo variant="icon" className="w-12 h-12 text-[#00FF00]" />
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
              "px-3 mb-3 text-[10px] font-mono font-medium uppercase tracking-widest text-gray-500 flex items-center gap-2",
              isCollapsed && "opacity-0"
            )}
          >
            <Lightning size={14} weight="regular" className="text-[#00FF00]" />
            <span>НАВИГАЦИЯ</span>
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
                                ? "text-[#00FF00] bg-black/40 border border-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.3)]"
                                : "text-gray-500 hover:text-white hover:bg-[#00FF00]/5 hover:scale-[1.01] border border-transparent"
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
                                  isActive && "drop-shadow-[0_0_6px_rgba(0,255,0,0.6)]"
                                )}
                              />
                              
                              {/* Text - Enhanced */}
                              {!isCollapsed && (
                                <span className={cn(
                                  "text-sm font-medium transition-all duration-300",
                                  isActive && "drop-shadow-[0_0_4px_rgba(0,255,0,0.4)]"
                                )}>
                                  {item.title}
                                </span>
                              )}
                              
                              {/* Active glow effect */}
                              {isActive && (
                                <motion.div
                                  className="absolute inset-0 rounded-lg bg-[#00FF00]/5 pointer-events-none"
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
                      boxShadow: ['0 0 4px #00FF00', '0 0 8px #00FF00', '0 0 4px #00FF00'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="w-2 h-2 rounded-full bg-[#00FF00]"
                  />
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                    СИСТЕМА АКТИВНА
                  </span>
                </div>
              </div>
              
              <div className="px-3 space-y-1">
                <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-2">
                  <Robot size={14} weight="duotone" className="text-[#00FF00]" />
                  <span>© 2025 onAI Academy</span>
                </p>
                <p className="text-[10px] font-medium text-gray-500 pl-5">
                  Premium Learning Platform
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SidebarFooter>
    </Sidebar>
  );
}
