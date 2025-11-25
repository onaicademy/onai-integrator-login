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
import { motion, AnimatePresence } from "motion/react";
import { Robot, Lightning, Atom } from '@phosphor-icons/react';

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
      className="border-r-2 border-[#b2ff2e]/30 relative overflow-hidden"
      style={{
        background: `
          linear-gradient(
            135deg,
            rgba(0, 0, 0, 0.85) 0%,
            rgba(10, 10, 10, 0.9) 25%,
            rgba(178, 255, 46, 0.05) 50%,
            rgba(5, 5, 5, 0.88) 75%,
            rgba(0, 0, 0, 0.9) 100%
          )
        `,
        backdropFilter: 'blur(60px) saturate(180%)',
        boxShadow: `
          inset 3px 0 0 rgba(178, 255, 46, 0.2),
          inset 0 0 80px rgba(178, 255, 46, 0.06),
          10px 0 80px rgba(0, 0, 0, 0.9),
          0 0 120px rgba(178, 255, 46, 0.03)
        `,
      }}
    >
      {/* 🎨 ПРЕМИУМ: Падающие частицы Matrix */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 15 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-[2px] h-[2px] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: '#b2ff2e',
              boxShadow: '0 0 4px #b2ff2e',
            }}
            animate={{
              y: ['-10%', '110vh'],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 12,
              delay: Math.random() * 5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Glassmorphism фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(178, 255, 46, 0.12), transparent 70%)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <SidebarHeader className="border-b-2 border-[#b2ff2e]/30 px-4 sm:px-6 py-4 sm:py-6 relative overflow-hidden">
        {/* Светящийся glassmorphism фон хедера */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(178, 255, 46, 0.15) 0%, rgba(0, 255, 0, 0.08) 100%)',
            backdropFilter: 'blur(20px)',
          }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 4,
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
            whileHover={{ scale: 1.08, rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.4 }}
          >
            {isCollapsed ? (
              <div className="relative">
                <OnAILogo variant="icon" className="w-12 h-12 text-[#b2ff2e] drop-shadow-[0_0_15px_rgba(178,255,46,0.7)]" />
                {/* Пульсирующее кольцо */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-[#b2ff2e]/40"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.8, 0, 0.8],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
              </div>
            ) : (
              <div className="relative">
                <OnAILogo variant="full" className="h-10 w-auto text-white drop-shadow-[0_0_25px_rgba(178,255,46,0.4)]" />
                {/* Светящийся фон за логотипом */}
                <motion.div
                  className="absolute -inset-2 bg-[#b2ff2e]/10 blur-xl rounded-full"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [0.9, 1.1, 0.9],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                />
              </div>
            )}
          </motion.div>
        </div>

        {/* ПРЕМИУМ: Анимированная линия с частицами */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, #b2ff2e, transparent)',
            }}
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 sm:px-4 relative">
        <SidebarGroup>
          <SidebarGroupLabel 
            className={cn(
              "px-3 mb-3 text-xs font-bold uppercase tracking-[0.3em] transition-all duration-300 flex items-center gap-2",
              "bg-gradient-to-r from-[#b2ff2e] to-[#00ff00] bg-clip-text text-transparent",
              "drop-shadow-[0_0_10px_rgba(178,255,46,0.4)]",
              isCollapsed && "opacity-0"
            )}
          >
            <Lightning size={16} weight="duotone" className="text-[#b2ff2e]" />
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
                              "group relative flex items-center gap-3 rounded-2xl px-4 py-4 transition-all duration-300 overflow-hidden",
                              "hover:scale-[1.04] active:scale-[0.96]",
                              "border-2 border-transparent",
                              isActive 
                                ? "bg-gradient-to-r from-[#b2ff2e]/30 via-[#00ff00]/25 to-[#b2ff2e]/20 border-[#b2ff2e]/50 shadow-[0_0_25px_rgba(178,255,46,0.3),inset_0_0_25px_rgba(178,255,46,0.15)]"
                                : "hover:bg-[#b2ff2e]/15 hover:border-[#b2ff2e]/30 hover:shadow-[0_0_20px_rgba(178,255,46,0.2)] backdrop-blur-sm"
                            )
                          }
                          style={{
                            backdropFilter: 'blur(10px)',
                          }}
                        >
                          {({ isActive }) => (
                            <>
                              {/* Анимированный glassmorphism фон для активной кнопки */}
                              {isActive && (
                                <>
                                  <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-[#b2ff2e]/40 via-[#00ff00]/30 to-transparent"
                                    animate={{
                                      x: ['-100%', '200%'],
                                    }}
                                    transition={{
                                      duration: 4,
                                      repeat: Infinity,
                                      ease: "linear"
                                    }}
                                  />
                                  <motion.div
                                    className="absolute inset-0 bg-[#b2ff2e]/15"
                                    animate={{
                                      opacity: [0.6, 1, 0.6],
                                    }}
                                    transition={{
                                      duration: 2.5,
                                      repeat: Infinity,
                                      ease: "easeInOut"
                                    }}
                                  />
                                </>
                              )}
                              
                              {/* Иконка с 3D эффектом */}
                              <motion.div
                                whileHover={{ 
                                  rotate: [0, -10, 10, -10, 0],
                                  scale: 1.2,
                                }}
                                whileTap={{ scale: 0.8 }}
                                transition={{ duration: 0.5 }}
                                className="relative z-10 flex-shrink-0"
                              >
                                <div className="relative">
                                  <item.icon 
                                    className={cn(
                                      "w-6 h-6 transition-all duration-300",
                                      isActive 
                                        ? "text-[#b2ff2e] drop-shadow-[0_0_12px_rgba(178,255,46,1)]" 
                                        : "text-gray-400 group-hover:text-[#b2ff2e] group-hover:drop-shadow-[0_0_8px_rgba(178,255,46,0.6)]"
                                    )}
                                    strokeWidth={2.5}
                                  />
                                  {/* Светящееся кольцо вокруг иконки */}
                                  {isActive && (
                                    <motion.div
                                      className="absolute inset-0 rounded-full bg-[#b2ff2e]/40 blur-md"
                                      animate={{
                                        scale: [1, 1.6, 1],
                                        opacity: [0.6, 0, 0.6],
                                      }}
                                      transition={{
                                        duration: 2.5,
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
                                    "relative z-10 text-[15px] font-semibold tracking-wide truncate transition-all duration-300",
                                    isActive 
                                      ? "text-white drop-shadow-[0_0_12px_rgba(178,255,46,0.5)]" 
                                      : "text-gray-300 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                                  )}
                                >
                                  {item.title}
                                </motion.span>
                              )}
                              
                              {/* Индикатор активности - ТОЛСТАЯ СВЕТЯЩАЯСЯ ПОЛОСА */}
                              {isActive && (
                                <motion.div
                                  initial={{ width: 0, opacity: 0 }}
                                  animate={{ width: "5px", opacity: 1 }}
                                  className="absolute right-0 top-1/2 -translate-y-1/2 h-12 bg-gradient-to-b from-[#b2ff2e] via-[#00ff00] to-[#b2ff2e] rounded-l-full"
                                  style={{
                                    boxShadow: '0 0 20px rgba(178, 255, 46, 1), 0 0 40px rgba(178, 255, 46, 0.5)'
                                  }}
                                />
                              )}

                              {/* Hover glassmorphism effect */}
                              <motion.div
                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{
                                  background: 'radial-gradient(circle at center, rgba(178, 255, 46, 0.2), transparent 70%)',
                                  backdropFilter: 'blur(8px)',
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

      <SidebarFooter className="px-4 sm:px-6 py-4 sm:py-5 border-t-2 border-[#b2ff2e]/30 relative overflow-hidden">
        {/* ПРЕМИУМ: Glassmorphism футер */}
        <motion.div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(178, 255, 46, 0.08), rgba(178, 255, 46, 0.2))',
            backdropFilter: 'blur(20px)',
          }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Светящиеся частицы */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: '#b2ff2e',
                boxShadow: '0 0 8px #b2ff2e',
              }}
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
                duration: 4 + i,
                repeat: Infinity,
                delay: i * 0.6,
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
              className="relative z-10 space-y-3"
            >
              {/* Status indicator с glassmorphism */}
              <motion.div 
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-[#b2ff2e]/30 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(178, 255, 46, 0.15), rgba(0, 255, 0, 0.1))',
                  backdropFilter: 'blur(15px)',
                  boxShadow: '0 0 20px rgba(178, 255, 46, 0.2)',
                }}
                whileHover={{ scale: 1.02 }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1],
                    boxShadow: ['0 0 8px #b2ff2e', '0 0 20px #b2ff2e', '0 0 8px #b2ff2e'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="w-3 h-3 rounded-full bg-[#b2ff2e]"
                />
                <div className="flex items-center gap-2">
                  <Atom size={18} weight="duotone" className="text-[#b2ff2e]" />
                  <span className="text-xs font-bold text-[#b2ff2e] drop-shadow-[0_0_8px_rgba(178,255,46,0.6)]">
                    СИСТЕМА АКТИВНА
                  </span>
                </div>
              </motion.div>
              
              <div className="px-3 space-y-1">
                <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-2">
                  <Robot size={14} weight="duotone" className="text-[#b2ff2e]" />
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
