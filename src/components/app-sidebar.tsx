import { Home, GraduationCap, Award, Bot, MessageSquare, Settings, LayoutDashboard, Users, Puzzle, UserCog, Gauge, Sparkles } from "lucide-react";
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
  { title: "onAIgram", url: "/messages", icon: MessageSquare },
  { title: "Админ панель", url: "/admin", icon: LayoutDashboard },
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
    <Sidebar 
      collapsible="offcanvas" 
      className="border-r-2 border-[#b2ff2e]/20"
      style={{
        background: `
          linear-gradient(
            135deg,
            rgba(5, 5, 5, 0.98) 0%,
            rgba(20, 20, 20, 0.95) 25%,
            rgba(178, 255, 46, 0.03) 50%,
            rgba(15, 15, 15, 0.97) 75%,
            rgba(0, 0, 0, 0.98) 100%
          )
        `,
        backdropFilter: 'blur(40px) saturate(200%)',
        boxShadow: `
          inset 2px 0 0 rgba(178, 255, 46, 0.15),
          inset 0 0 60px rgba(178, 255, 46, 0.04),
          8px 0 60px rgba(0, 0, 0, 0.8),
          0 0 100px rgba(178, 255, 46, 0.02)
        `,
      }}
    >
      {/* ФОНОВАЯ АНИМАЦИЯ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
          className="absolute top-0 left-0 w-full h-full"
                style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(178, 255, 46, 0.08), transparent 70%)',
                }}
                animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
            duration: 6,
                  repeat: Infinity,
            ease: "easeInOut"
                }}
              />
          </div>
          
      <SidebarHeader className="border-b-2 border-[#b2ff2e]/20 px-4 sm:px-6 py-4 sm:py-6 relative overflow-hidden">
        {/* Светящийся фон хедера */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-[#b2ff2e]/10 via-transparent to-[#00ff00]/5"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <div className={cn(
          "flex items-center transition-all duration-500 relative z-10",
          isCollapsed ? "justify-center" : "justify-start gap-3"
        )}>
          {/* ЛОГОТИП */}
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.3 }}
          >
            {isCollapsed ? (
              <div className="relative">
                <OnAILogo variant="icon" className="w-12 h-12 text-[#b2ff2e] drop-shadow-[0_0_10px_rgba(178,255,46,0.5)]" />
                {/* Пульсирующий эффект */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#b2ff2e]/30"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
              </div>
            ) : (
              <OnAILogo variant="full" className="h-10 w-auto text-white drop-shadow-[0_0_20px_rgba(178,255,46,0.3)]" />
            )}
          </motion.div>

        </div>

        {/* ПРЕМИУМ: Анимированная линия под логотипом */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: 'linear-gradient(90deg, transparent, #b2ff2e, transparent)',
          }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </SidebarHeader>

      <SidebarContent className="px-3 sm:px-4 relative">
        <SidebarGroup>
          <SidebarGroupLabel 
            className={cn(
              "px-3 mb-3 text-xs font-bold uppercase tracking-[0.25em] transition-all duration-300",
              "bg-gradient-to-r from-[#b2ff2e] to-[#00ff00] bg-clip-text text-transparent",
              "drop-shadow-[0_0_8px_rgba(178,255,46,0.3)]",
            isCollapsed && "opacity-0"
            )}
          >
            🎯 НАВИГАЦИЯ
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        cn(
                              "group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-300 overflow-hidden",
                              "hover:scale-[1.03] active:scale-[0.97]",
                              "border-2 border-transparent",
                              isActive 
                                ? "bg-gradient-to-r from-[#b2ff2e]/25 via-[#00ff00]/20 to-[#b2ff2e]/15 border-[#b2ff2e]/40 shadow-[0_0_20px_rgba(178,255,46,0.25),inset_0_0_20px_rgba(178,255,46,0.1)]"
                                : "hover:bg-[#b2ff2e]/10 hover:border-[#b2ff2e]/20 hover:shadow-[0_0_15px_rgba(178,255,46,0.15)]"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                              {/* Анимированный фон для активной кнопки */}
                          {isActive && (
                                <>
                                  <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-[#b2ff2e]/30 via-[#00ff00]/20 to-transparent"
                                    animate={{
                                      x: ['-100%', '200%'],
                                    }}
                                    transition={{
                                      duration: 3,
                                      repeat: Infinity,
                                      ease: "linear"
                                    }}
                                  />
                            <motion.div
                                    className="absolute inset-0 bg-[#b2ff2e]/10"
                              animate={{
                                      opacity: [0.5, 0.8, 0.5],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                                </>
                          )}
                          
                          {/* Иконка с эффектом */}
                          <motion.div
                                whileHover={{ 
                                  rotate: [0, -8, 8, -8, 0],
                                  scale: 1.15,
                                }}
                                whileTap={{ scale: 0.85 }}
                                transition={{ duration: 0.4 }}
                                className="relative z-10 flex-shrink-0"
                          >
                                <div className="relative">
                                  <item.icon 
                                    className={cn(
                                      "w-6 h-6 transition-all duration-300",
                                      isActive 
                                        ? "text-[#b2ff2e] drop-shadow-[0_0_8px_rgba(178,255,46,0.8)]" 
                                        : "text-gray-400 group-hover:text-[#b2ff2e]"
                                    )}
                                    strokeWidth={2.5}
                                  />
                                  {/* Пульсирующий эффект вокруг иконки */}
                                  {isActive && (
                                    <motion.div
                                      className="absolute inset-0 rounded-full bg-[#b2ff2e]/30 blur-sm"
                                      animate={{
                                        scale: [1, 1.4, 1],
                                        opacity: [0.5, 0, 0.5],
                                      }}
                                      transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeOut"
                                      }}
                                    />
                                  )}
                                </div>
                          </motion.div>
                          
                              {/* Текст - ТРЕНДОВЫЙ ШРИФТ Inter (№1 для AI платформ) */}
                          {!isCollapsed && (
                                <motion.span 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className={cn(
                                    "relative z-10 text-[15px] font-medium tracking-wide truncate transition-all duration-300",
                                    isActive 
                                      ? "text-white drop-shadow-[0_0_10px_rgba(178,255,46,0.4)]" 
                                      : "text-gray-300 group-hover:text-white"
                                  )}
                                >
                              {item.title}
                                </motion.span>
                          )}
                          
                              {/* Индикатор активности - ТОЛЩЕ */}
                          {isActive && (
                            <motion.div
                                  initial={{ width: 0, opacity: 0 }}
                                  animate={{ width: "4px", opacity: 1 }}
                                  className="absolute right-0 top-1/2 -translate-y-1/2 h-10 bg-gradient-to-b from-[#b2ff2e] to-[#00ff00] rounded-l-full"
                                  style={{
                                    boxShadow: '0 0 15px rgba(178, 255, 46, 0.8), 0 0 30px rgba(178, 255, 46, 0.4)'
                                  }}
                            />
                          )}

                              {/* Hover glow effect */}
                              <motion.div
                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{
                                  background: 'radial-gradient(circle at center, rgba(178, 255, 46, 0.15), transparent 70%)',
                                }}
                              />
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

      <SidebarFooter className="px-4 sm:px-6 py-4 sm:py-5 border-t-2 border-[#b2ff2e]/20 relative overflow-hidden">
        {/* ПРЕМИУМ: Анимированный фон футера */}
        <motion.div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(178, 255, 46, 0.05), rgba(178, 255, 46, 0.15))',
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Светящиеся частицы */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[#b2ff2e] rounded-full"
              initial={{ 
                x: Math.random() * 100 + '%', 
                y: '100%',
                opacity: 0 
              }}
              animate={{
                y: '-100%',
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "linear"
              }}
            />
          ))}
        </div>
        
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative z-10 space-y-2"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#b2ff2e]/10 border border-[#b2ff2e]/20">
                <div className="w-2 h-2 rounded-full bg-[#b2ff2e] animate-pulse" />
                <span className="text-xs font-bold text-[#b2ff2e]">СИСТЕМА АКТИВНА</span>
              </div>
              
              <p className="text-[11px] font-semibold text-gray-400 px-3">
                © 2025 onAI Academy
              </p>
              <p className="text-[10px] font-medium text-gray-500 px-3">
                Premium Learning Platform
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </SidebarFooter>
    </Sidebar>
  );
}
