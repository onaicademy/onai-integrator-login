import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { OnAILogo } from "@/components/OnAILogo";
import { motion, AnimatePresence } from "motion/react";
import { 
  House, 
  Brain, 
  User, 
  Trophy, 
  GridNine,
  Lock,
  ChartBar,
  Lightning,
  X
} from '@phosphor-icons/react';
import { type Icon } from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { tripwireSupabase } from "@/lib/supabase-tripwire";

interface MenuItem {
  title: string;
  url: string;
  icon: Icon;
  locked?: boolean;
  adminOnly?: boolean; // Только для admin
  salesOnly?: boolean; // Для admin и sales
}

// 🎯 EXACT menu items from main platform (Russian names)
const menuItems: MenuItem[] = [
  { title: "Главная", url: "/tripwire", icon: House, locked: false },
  { title: "NeuroHUB", url: "/neurohub", icon: Brain, locked: true },
  { title: "Мой профиль", url: "/tripwire/profile", icon: User, locked: false },
  { title: "Достижения", url: "/achievements", icon: Trophy, locked: true },
  { title: "onAIgram", url: "/messages", icon: GridNine, locked: true },
  { title: "Админ панель", url: "/tripwire/admin", icon: ChartBar, locked: false, adminOnly: true }, // ✅ Только admin
  // ❌ Sales Manager НЕ должен быть в Tripwire сайдбаре! Только в основной админ-панели
];

interface TripwireSidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

/**
 * 🔒 TRIPWIRE SIDEBAR - 100% Visual Replication
 * - EXACT styling from app-sidebar-premium.tsx
 * - Russian menu items (Главная, NeuroHUB, etc.)
 * - Locked items with shake animation
 * - Glassmorphism matching main platform
 */
export function TripwireSidebar({ onClose, isMobile = false }: TripwireSidebarProps) {
  const [tripwireUserRole, setTripwireUserRole] = useState<string>('student');
  
  // 🔥 Load Tripwire user role from tripwireSupabase
  useEffect(() => {
    tripwireSupabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role || 'student';
        setTripwireUserRole(role);
        console.log('🔒 TripwireSidebar: User role:', role);
      }
    });
  }, []);
  
  // 🔒 SECURITY: Role-based access  
  const isAdmin = tripwireUserRole === 'admin';
  const isSales = false; // Sales not available in Tripwire
  
  return (
    <div 
      className="h-full flex flex-col border-r border-white/5 relative overflow-hidden glass-panel"
      style={{
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header with Logo - EXACT replica */}
      <div className="border-b border-white/5 px-4 sm:px-6 py-4 sm:py-6 relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <OnAILogo variant="full" className="h-10 w-auto text-white" />
        </div>
      </div>

      {/* Navigation Menu - Brand Code 3.0 */}
      <div className="flex-1 px-3 sm:px-4 py-6 relative overflow-y-auto">
        <div className="px-3 mb-4 flex items-center gap-2.5">
          <Lightning size={20} weight="fill" className="text-[#00FF88] drop-shadow-[0_0_8px_rgba(0,255,136,0.6)]" />
          <h1 className="text-base font-display font-bold text-white uppercase tracking-wider drop-shadow-[0_0_10px_rgba(0,255,136,0.3)]">
            НАВИГАЦИЯ
          </h1>
        </div>
        
        <div className="space-y-2">
          <TooltipProvider>
            <AnimatePresence mode="popLayout">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                
                // 🔒 SECURITY CHECK: Hide based on role
                if (item.adminOnly && !isAdmin) return null;
                if (item.salesOnly && !isSales) return null;
                
                // Show locked items with shake animation
                if (item.locked) {
                  return (
                    <motion.div
                      key={item.url}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ delay: index * 0.05, type: "spring" }}
                      whileHover={{
                        x: [0, -4, 4, -4, 4, 0],
                        transition: { duration: 0.4 }
                      }}
                      className="cursor-not-allowed"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "group relative flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-300",
                              "text-gray-500/50 border border-transparent"
                            )}
                            style={{
                              backdropFilter: 'blur(10px)',
                            }}
                          >
                            <Icon 
                              size={22}
                              weight="duotone"
                              className="flex-shrink-0 transition-all duration-300"
                            />
                            <span className="text-sm font-sans font-medium transition-all duration-300">
                              {item.title}
                            </span>
                            <Lock 
                              size={18} 
                              weight="fill" 
                              className="ml-auto text-red-400/60 group-hover:text-red-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.4)]"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          className="bg-black/90 border-[#00FF88]/30 text-white"
                        >
                          <p className="text-sm">🔒 Available in full program</p>
                          <p className="text-xs text-[#00FF88]/70 mt-1">Upgrade to unlock</p>
                        </TooltipContent>
                      </Tooltip>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ delay: index * 0.05, type: "spring" }}
                  >
                    <NavLink
                      to={item.url}
                      onClick={() => isMobile && onClose?.()}
                      end={item.url === "/tripwire"}
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
                          <Icon 
                            size={22}
                            weight={isActive ? "fill" : "duotone"}
                            className={cn(
                              "flex-shrink-0 transition-all duration-300",
                              isActive && "drop-shadow-[0_0_6px_rgba(0,255,136,0.6)]"
                            )}
                          />
                          <span className={cn(
                            "text-sm font-sans font-semibold transition-all duration-300",
                            isActive && "drop-shadow-[0_0_6px_rgba(0,255,136,0.5)]"
                          )}>
                            {item.title}
                          </span>
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
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </TooltipProvider>
        </div>
      </div>

      {/* Footer - EXACT replica */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-white/5 relative overflow-hidden">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="relative z-10 space-y-3"
          >
            {/* System Status */}
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
              <p className="text-[11px] font-sans font-semibold text-gray-400">
                © 2025 onAI Academy
              </p>
              <p className="text-[10px] font-mono font-medium text-gray-600 tracking-wide">
                ПРЕМИУМ ПЛАТФОРМА ОБУЧЕНИЯ
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

