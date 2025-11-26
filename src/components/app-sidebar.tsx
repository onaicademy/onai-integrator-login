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
  ChartBar,
  Lightning,
  Sparkle
} from '@phosphor-icons/react';
import { type Icon } from '@phosphor-icons/react';
import { OnAIgramIcon } from '@/components/icons/OnAIgramIcon';

type UserRole = "admin" | "student";

interface MenuItem {
  title: string;
  url: string;
  icon: Icon | React.FC<any>;
  isCustomIcon?: boolean;
}

const studentMenuItems: MenuItem[] = [
  { title: "Главная", url: "/courses", icon: House },
  { title: "NeuroHUB", url: "/neurohub", icon: Brain },
  { title: "Мой профиль", url: "/profile", icon: User },
  { title: "Достижения", url: "/achievements", icon: Trophy },
  { title: "onAIgram", url: "/messages", icon: OnAIgramIcon, isCustomIcon: true },
  { title: "Админ панель", url: "/admin", icon: ChartBar },
];

interface AppSidebarProps {
  role: UserRole | null;
}

export function AppSidebar({ role }: AppSidebarProps) {
  console.log('📋 AppSidebar роль:', role);
  
  // Не рендерим пока роль не определена
  if (!role) {
    console.log("⏳ AppSidebar: Роль не определена, ждём...");
    return null;
  }

  const { state, setOpenMobile, isMobile } = useSidebar();

  // ВСЕГДА показываем studentMenuItems, просто фильтруем для студентов
  const menuItems = studentMenuItems.filter(item => {
    // Если студент - скрываем админ-панель
    if (role === "student" && item.url === "/admin") {
      console.log('🚫 Скрываем админ-панель для студента');
      return false;
    }
    // Для админов показываем ВСЁ (включая админ-панель)
    return true;
  });

  const isCollapsed = state === "collapsed";

  console.log('✅ Показываем пунктов:', menuItems.length, 'для роли:', role);

  return (
    <Sidebar 
      collapsible="offcanvas" 
      className="border-r border-[#00FF00]/10"
      style={{
        background: 'rgb(10, 10, 10)',
      }}
    >
          
      <SidebarHeader className="border-b border-[#00FF00]/10 px-4 sm:px-6 py-4 sm:py-6">
        <div className={cn(
          "flex items-center transition-all duration-300",
          isCollapsed ? "justify-center" : "justify-start gap-3"
        )}>
          {/* ЛОГОТИП */}
          <div className="relative">
            {isCollapsed ? (
              <OnAILogo variant="icon" className="w-12 h-12 text-[#00FF00]" />
            ) : (
              <OnAILogo variant="full" className="h-10 w-auto text-white" />
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 sm:px-4">
        <SidebarGroup>
          <SidebarGroupLabel 
            className={cn(
              "px-3 mb-4 text-sm font-mono font-bold uppercase tracking-widest text-gray-300 flex items-center gap-2 transition-all duration-300",
              isCollapsed && "opacity-0"
            )}
          >
            <Lightning size={18} weight="fill" className="text-[#00FF00]" />
            <span>НАВИГАЦИЯ</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, type: "spring" }}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          onClick={() => {
                            // Автоматически закрываем sidebar на мобильных после клика
                            if (isMobile) {
                              setOpenMobile(false);
                            }
                          }}
                          className={({ isActive }) =>
                            cn(
                              "group relative flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-300 overflow-hidden",
                              isActive 
                                ? "text-[#00FF00] bg-black/50 border border-[#00FF00]/50 shadow-[0_0_12px_rgba(0,255,0,0.4)]"
                                : "text-gray-400 hover:text-white hover:bg-[#00FF00]/5 hover:scale-[1.02] hover:shadow-[0_0_8px_rgba(0,255,0,0.15)] border border-transparent hover:border-[#00FF00]/20"
                            )
                          }
                        >
                          {({ isActive }) => {
                            const IconComponent = item.icon;
                            return (
                              <>
                                {/* Icon - Enhanced WOW Effect */}
                                {item.isCustomIcon ? (
                                  <IconComponent
                                    size={22}
                                    weight={isActive ? "fill" : "duotone"}
                                    className={cn(
                                      "flex-shrink-0 transition-all duration-300",
                                      isActive 
                                        ? "drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] scale-110" 
                                        : "group-hover:scale-105 group-hover:drop-shadow-[0_0_4px_rgba(0,255,0,0.4)]"
                                    )}
                                  />
                                ) : (
                                  <IconComponent 
                                    size={22}
                                    weight={isActive ? "fill" : "duotone"}
                                    className={cn(
                                      "flex-shrink-0 transition-all duration-300",
                                      isActive 
                                        ? "drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] scale-110" 
                                        : "group-hover:scale-105 group-hover:drop-shadow-[0_0_4px_rgba(0,255,0,0.4)]"
                                    )}
                                  />
                                )}
                                
                                {/* Text - Enhanced with glow */}
                                {!isCollapsed && (
                                  <span className={cn(
                                    "text-sm font-semibold truncate transition-all duration-300",
                                    isActive && "drop-shadow-[0_0_6px_rgba(0,255,0,0.5)]"
                                  )}>
                                    {item.title}
                                  </span>
                                )}
                                
                                {/* Active pulsing glow effect */}
                                {isActive && (
                                  <>
                                    <motion.div
                                      className="absolute inset-0 rounded-xl bg-[#00FF00]/5 pointer-events-none"
                                      animate={{
                                        opacity: [0.3, 0.5, 0.3],
                                      }}
                                      transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                      }}
                                    />
                                    {/* Sparkle effect on active */}
                                    <Sparkle 
                                      size={14} 
                                      weight="fill"
                                      className="absolute top-2 right-2 text-[#00FF00] animate-pulse"
                                    />
                                  </>
                                )}

                                {/* Hover tactile effect */}
                                <motion.div
                                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00FF00]/0 via-[#00FF00]/10 to-[#00FF00]/0 pointer-events-none opacity-0 group-hover:opacity-100"
                                  transition={{ duration: 0.3 }}
                                />
                              </>
                            );
                          }}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </motion.div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 sm:px-6 py-4 border-t border-[#00FF00]/10">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00FF00]/5">
                <div className="w-2 h-2 rounded-full bg-[#00FF00] animate-pulse" />
                <span className="text-xs font-semibold text-[#00FF00]">СИСТЕМА АКТИВНА</span>
              </div>
              
              <p className="text-[11px] text-gray-500 px-3">
                © 2025 onAI Academy
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </SidebarFooter>
    </Sidebar>
  );
}
