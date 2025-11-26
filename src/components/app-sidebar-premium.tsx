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
 * 🎯 CYBER-ARCHITECTURE SIDEBAR
 * - Minimalist Design
 * - Acid Green (#00FF94) Accents
 * - JetBrains Mono for System Labels
 * - Glassmorphism 2.0
 * - Premium Depth & Clarity
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
      className="border-r border-white/8 relative overflow-hidden"
      style={{
        background: `
          linear-gradient(
            135deg,
            rgba(3, 3, 3, 0.9) 0%,
            rgba(10, 10, 10, 0.95) 50%,
            rgba(3, 3, 3, 0.9) 100%
          )
        `,
        backdropFilter: 'blur(16px) saturate(180%)',
        boxShadow: `
          inset 1px 0 0 rgba(0, 255, 148, 0.08),
          8px 0 40px rgba(0, 0, 0, 0.8)
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
              backgroundColor: '#00FF94',
              boxShadow: '0 0 4px #00FF94',
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
            background: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 148, 0.08), transparent 70%)',
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

      <SidebarHeader className="border-b border-white/8 px-4 sm:px-6 py-4 sm:py-6 relative overflow-hidden">
        {/* Светящийся glassmorphism фон хедера */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 255, 148, 0.08) 0%, rgba(0, 255, 148, 0.04) 100%)',
            backdropFilter: 'blur(16px)',
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
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            {isCollapsed ? (
              <div className="relative">
                <OnAILogo variant="icon" className="w-12 h-12 text-[#00FF94] drop-shadow-[0_0_15px_rgba(0,255,148,0.5)]" />
                {/* Пульсирующее кольцо */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-[#00FF94]/40"
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
                <OnAILogo variant="full" className="h-10 w-auto text-white drop-shadow-[0_0_20px_rgba(0,255,148,0.3)]" />
                {/* Светящийся фон за логотипом */}
                <motion.div
                  className="absolute -inset-2 bg-[#00FF94]/10 blur-xl rounded-full"
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
              background: 'linear-gradient(90deg, transparent, #00FF94, transparent)',
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
              "px-3 mb-3 text-[10px] font-mono font-medium uppercase tracking-[0.25em] transition-all duration-300 flex items-center gap-2",
              "text-cyber-gray",
              isCollapsed && "opacity-0"
            )}
          >
            <Lightning size={14} weight="duotone" className="text-[#00FF94]" />
            <span>⚡ НАВИГАЦИЯ</span>
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
                                ? "bg-gradient-to-r from-[#00FF94]/20 via-[#00FF94]/15 to-[#00FF94]/10 border-[#00FF94]/30 shadow-[0_0_20px_rgba(0,255,148,0.2)]"
                                : "hover:bg-[#00FF94]/10 hover:border-[#00FF94]/20 hover:shadow-[0_0_15px_rgba(0,255,148,0.15)] backdrop-blur-sm"
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
                                    className="absolute inset-0 bg-gradient-to-r from-[#00FF94]/30 via-[#00FF94]/20 to-transparent"
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
                                    className="absolute inset-0 bg-[#00FF94]/10"
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
                                        ? "text-[#00FF94] drop-shadow-[0_0_10px_rgba(0,255,148,0.8)]" 
                                        : "text-gray-400 group-hover:text-[#00FF94] group-hover:drop-shadow-[0_0_8px_rgba(0,255,148,0.5)]"
                                    )}
                                    strokeWidth={2.5}
                                  />
                                  {/* Светящееся кольцо вокруг иконки */}
                                  {isActive && (
                                    <motion.div
                                      className="absolute inset-0 rounded-full bg-[#00FF94]/30 blur-md"
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
                                  className="absolute right-0 top-1/2 -translate-y-1/2 h-12 bg-gradient-to-b from-[#00FF94] via-[#00FF94] to-[#00FF94] rounded-l-full"
                                  style={{
                                    boxShadow: '0 0 15px rgba(0, 255, 148, 0.8), 0 0 30px rgba(0, 255, 148, 0.4)'
                                  }}
                                />
                              )}

                              {/* Hover glassmorphism effect */}
                              <motion.div
                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{
                                  background: 'radial-gradient(circle at center, rgba(0, 255, 148, 0.15), transparent 70%)',
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

      <SidebarFooter className="px-4 sm:px-6 py-4 sm:py-5 border-t border-white/8 relative overflow-hidden">
        {/* ПРЕМИУМ: Glassmorphism футер */}
        <motion.div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(0, 255, 148, 0.05), rgba(0, 255, 148, 0.08))',
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
                backgroundColor: '#00FF94',
                boxShadow: '0 0 8px #00FF94',
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
              {/* System Status - CYBER ARCHITECTURE */}
              <motion.div 
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/8 relative overflow-hidden"
                style={{
                  background: 'rgba(10, 10, 10, 0.6)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      boxShadow: ['0 0 8px #00FF94', '0 0 15px #00FF94', '0 0 8px #00FF94'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="w-2 h-2 rounded-full bg-[#00FF94]"
                  />
                  <span className="text-[10px] font-mono font-medium text-cyber-gray uppercase tracking-wider">
                    СИСТЕМА АКТИВНА
                  </span>
                </div>
                <span className="text-[10px] font-mono font-medium text-cyber-gray uppercase tracking-wider">
                  V.3.0
                </span>
              </motion.div>
              
              {/* Copyright - CYBER ARCHITECTURE */}
              <div className="px-3 space-y-1">
                <p className="text-[10px] font-mono text-cyber-gray">
                  © 2025 onAI Academy
                </p>
                <p className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">
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
