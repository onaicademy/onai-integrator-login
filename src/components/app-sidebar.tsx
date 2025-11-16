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
    <Sidebar collapsible="icon" className="border-r border-gray-800 bg-[#18181b]">
      <SidebarHeader className="border-b border-gray-800 px-3 sm:px-4 py-3 sm:py-4 bg-[#18181b]">
        <div className={cn(
          "flex items-center transition-all duration-300",
          isCollapsed ? "justify-center p-1" : "justify-start p-2 pl-1"
        )}>
          {isCollapsed ? (
            <OnAILogo variant="icon" className="w-10 h-10 text-[#00ff00]" />
          ) : (
            <OnAILogo variant="full" className="h-8 w-auto text-white" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 sm:px-3">
        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            "px-2 text-sm sm:text-base text-[#00ff00] transition-all duration-300 uppercase tracking-wider font-bold",
            isCollapsed && "opacity-0"
          )}>
            Навигация
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 overflow-hidden",
                          "hover:scale-[1.02] active:scale-[0.98]",
                          "text-white hover:text-[#00ff00]",
                          isActive && "bg-gradient-to-r from-[#00ff00]/20 to-[#00ff00]/10 shadow-lg shadow-[#00ff00]/20"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Фон для активной кнопки */}
                          {isActive && (
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
                            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            className="relative z-10"
                          >
                            <item.icon className="w-5 h-5 flex-shrink-0 transition-colors duration-300" />
                          </motion.div>
                          
                          {/* Текст */}
                          {!isCollapsed && (
                            <span className="relative z-10 font-medium transition-colors duration-300 truncate">
                              {item.title}
                            </span>
                          )}
                          
                          {/* Индикатор активности */}
                          {isActive && (
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

      <SidebarFooter className="px-3 sm:px-4 py-3 sm:py-4 border-t border-gray-800 bg-black/30">
        <div className={cn(
          "text-xs text-gray-600 transition-opacity",
          isCollapsed && "opacity-0"
        )}>
          <p className="leading-relaxed">© 2025 onAI Academy</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
