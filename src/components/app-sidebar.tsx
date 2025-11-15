import { Home, GraduationCap, Award, Bot, MessageSquare, Settings, LayoutDashboard, Users, Puzzle, UserCog, Gauge } from "lucide-react";
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
import { motion } from "framer-motion";

type UserRole = "admin" | "student";

interface MenuItem {
  title: string;
  url: string;
  icon: typeof Home;
}

const studentMenuItems: MenuItem[] = [
  { title: "Главная", url: "/courses", icon: Home },
  { title: "NeuroHUB", url: "/neurohub", icon: Gauge },
  { title: "Мой профиль", url: "/profile", icon: GraduationCap },
  { title: "Достижения", url: "/achievements", icon: Award },
  { title: "Сообщения", url: "/messages", icon: MessageSquare },
  { title: "Админ панель", url: "/admin", icon: LayoutDashboard },
  { title: "Настройки", url: "/settings", icon: Settings },
];

const adminMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Диалоги с AI-куратором", url: "/admin/ai-curator-chats", icon: MessageSquare },
  { title: "Курсы и модули", url: "/admin/courses", icon: GraduationCap },
  { title: "Ученики", url: "/admin/students-activity", icon: Users },
  { title: "Достижения и XP", url: "/admin/achievements", icon: Puzzle },
  { title: "Настройки платформы", url: "/admin/settings", icon: Settings },
  { title: "Администраторы", url: "/admin/admins", icon: UserCog },
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

  const { state } = useSidebar();

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
    <Sidebar collapsible="icon" className="border-r border-gray-800 bg-[#18181b] md:data-[state=collapsed]:w-[4rem]">
      <SidebarHeader className="border-b border-gray-800 px-3 sm:px-4 py-4 bg-[#18181b] min-h-[64px] flex items-center">
        <div className={cn(
          "flex items-center transition-all duration-300 w-full",
          isCollapsed ? "justify-center p-1" : "justify-start p-2 px-3"
        )}>
          {isCollapsed ? (
            <motion.div
              whileHover={{ scale: 1.1, filter: "drop-shadow(0 0 8px rgba(0,255,0,0.6))" }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <OnAILogo variant="icon" className="w-7 h-7 text-[#00ff00]" />
            </motion.div>
          ) : (
            <OnAILogo variant="full" className="h-7 w-auto text-white" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={cn(
        "transition-all duration-300 pt-6 md:pt-8",
        isCollapsed ? "px-1" : "px-3 sm:px-4"
      )}>
        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            "px-3 text-sm font-semibold text-[#00ff00] transition-all duration-300 uppercase tracking-wider mb-2",
            isCollapsed && "opacity-0 h-0 overflow-hidden mb-0"
          )}>
            Навигация
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} size="lg">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center rounded-xl transition-all duration-300 overflow-hidden",
                          "hover:scale-[1.02] active:scale-[0.98]",
                          "text-white hover:text-[#00ff00]",
                          isCollapsed 
                            ? "!size-12 !p-0 justify-center items-center hover:bg-[#00ff00]/10 hover:shadow-[0_0_20px_rgba(0,255,0,0.3)]" 
                            : "!h-12 gap-3 px-4 py-3 justify-start items-center w-full",
                          isActive && !isCollapsed && "bg-gradient-to-r from-[#00ff00]/20 to-[#00ff00]/10 shadow-lg shadow-[#00ff00]/20",
                          isActive && isCollapsed && "bg-[#00ff00]/20 shadow-[0_0_20px_rgba(0,255,0,0.4)]"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Фон для активной кнопки (только для развернутого) */}
                          {isActive && !isCollapsed && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-[#00ff00]/20 to-[#00ff00]/10"
                              animate={{
                                opacity: [0.8, 1, 0.8],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                          )}
                          
                          {/* Иконка с эффектом */}
                          <motion.div
                            whileHover={{ 
                              scale: 1.15,
                              filter: isCollapsed ? "drop-shadow(0 0 6px rgba(0,255,0,0.8))" : "none"
                            }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                              "relative z-10 flex items-center justify-center",
                              isCollapsed && isActive && "drop-shadow-[0_0_8px_rgba(0,255,0,0.6)]"
                            )}
                          >
                            <item.icon className={cn(
                              "flex-shrink-0 transition-all duration-300",
                              "!w-5 !h-5",
                              isActive && isCollapsed && "text-[#00ff00]"
                            )} />
                          </motion.div>
                          
                          {/* Текст */}
                          {!isCollapsed && (
                            <span className="relative z-10 font-medium transition-colors duration-300 text-sm flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">
                              {item.title}
                            </span>
                          )}
                          
                          {/* Индикатор активности (только для развернутого) */}
                          {isActive && !isCollapsed && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: "3px" }}
                              className="absolute right-0 top-1/2 -translate-y-1/2 h-8 bg-[#00ff00] rounded-l-full shadow-[0_0_10px_rgba(0,255,0,0.5)]"
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn(
        "py-3 sm:py-4 border-t border-gray-800 bg-black/30 transition-all duration-300",
        isCollapsed ? "px-2" : "px-3 sm:px-4"
      )}>
        <div className={cn(
          "text-xs text-gray-500 transition-all duration-300",
          isCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
        )}>
          <p className="leading-relaxed text-center">© 2025 onAI Academy</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
