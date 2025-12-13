import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, Lock, Zap, Code, Briefcase, Rocket, Brain, Bot, Clapperboard, Sparkles, MessageSquare } from "lucide-react";
import { ModuleUnlockAnimation } from "@/components/tripwire/ModuleUnlockAnimation";
import { api } from "@/utils/apiClient";
import LiveStreamModule from "./components/LiveStreamModule";
import { TripwireAIChatDialog } from "@/components/tripwire/TripwireAIChatDialog";
import { tripwireSupabase } from "@/lib/supabase-tripwire";

// 🎯 Brand Code v3.0 - Cyber-Architecture
const BRAND = {
  colors: {
    neon_green: '#00FF88',
    void: '#030303',
    surface: '#0A0A0A',
    panel: '#0F0F0F',
    text_dim: '#9CA3AF',
  },
  fonts: {
    main: '"Space Grotesk", sans-serif',
    body: '"Manrope", sans-serif',
    mono: '"JetBrains Mono", monospace',
  }
};

// 🔥 Tripwire modules data (ID соответствуют БД: 16, 17, 18)
// ✅ НОВЫЙ ПОРЯДОК: Вводный → GPT → Reels (сохраняем moduleNumber для логики)
const tripwireModules = [
  {
    id: 16, // ✅ Модуль 1: Основы AI в БД
    moduleNumber: 1,
    title: "ВВОДНЫЙ МОДУЛЬ",
    subtitle: "ОПРЕДЕЛИМ КАКОЕ НАПРАВЛЕНИЕ В ИИ ТВОЕ",
    description: "Базовое погружение в нейросети. Разбор основных инструментов и выбор специализации для заработка.",
    duration: "9 мин",
    lessons: 1,
    icon: Rocket,
    status: "active",
    gradient: "from-[#00FF88]/10 via-[#00FF88]/5 to-transparent",
    lessonId: 67,
  },
  {
    id: 17, // ✅ Модуль 2: Практика с AI в БД
    moduleNumber: 2,
    title: "Создание GPT-бота",
    subtitle: "Instagram, WhatsApp интеграции",
    description: "Практический модуль по созданию умных ассистентов. Подключение к соцсетям и автоматизация общения.",
    duration: "14 мин",
    lessons: 1,
    icon: MessageSquare,
    status: "locked",
    gradient: "from-[#00FF88]/10 via-[#00FF88]/5 to-transparent",
    lessonId: 68,
  },
  {
    id: 18, // ✅ Модуль 3: AI в бизнесе в БД
    moduleNumber: 3,
    title: "Создание вирусных Reels",
    subtitle: "100 000 👁️ | Сценарий, видео, монтаж",
    description: "Генерация контента с помощью AI. Создание сценариев, цифровых аватаров и автоматический монтаж.",
    duration: "1 мин",
    lessons: 1,
    icon: Clapperboard,
    status: "locked",
    gradient: "from-[#00FF88]/10 via-[#00FF88]/5 to-transparent",
    lessonId: 69,
  },
];

/**
 * 🚀 TRIPWIRE PRODUCT PAGE - CYBER-ARCHITECTURE v3.0
 * - Expensive, high-tech design
 * - Bento Grid layout
 * - Neon glows & glassmorphism
 * - Space Grotesk typography
 */
export default function TripwireProductPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredModule, setHoveredModule] = useState<number | null>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false); // ✅ AI Curator State

  // 🔥 ВАЖНО: Используем tripwireSupabase для Tripwire студентов, НЕ useAuth()!
  const [tripwireUser, setTripwireUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 🎮 GAMIFICATION: Module unlock animations
  const [unlockedModules, setUnlockedModules] = useState<any[]>([]);
  const [currentUnlock, setCurrentUnlock] = useState<any | null>(null);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [userUnlockedModuleIds, setUserUnlockedModuleIds] = useState<number[]>([]);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [modulesWithDuration, setModulesWithDuration] = useState(tripwireModules);

  // ✅ Обработка анимации разблокировки при возврате с урока
  useEffect(() => {
    // Проверяем URL параметры
    const params = new URLSearchParams(location.search);
    const unlockedModule = params.get('unlockedModule');
    
    if (unlockedModule) {
      const moduleId = parseInt(unlockedModule);
      console.log(`🎉 Показываем анимацию разблокировки модуля ${moduleId}`);
      setCurrentUnlock({ module_id: moduleId });
      setShowUnlockAnimation(true);
      
      // Очищаем URL параметр чтобы анимация не повторялась
      window.history.replaceState({}, document.title, '/integrator');
    }
    
    // Также проверяем location.state (для совместимости)
    const state = location.state as { unlockedModuleId?: number; showUnlockAnimation?: boolean } | null;
    
    if (state?.showUnlockAnimation && state?.unlockedModuleId) {
      console.log(`🎉 Показываем анимацию разблокировки модуля ${state.unlockedModuleId} (из state)`);
      setCurrentUnlock({ module_id: state.unlockedModuleId });
      setShowUnlockAnimation(true);
      
      // Очищаем state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // 🔥 Load Tripwire user from tripwireSupabase
  useEffect(() => {
    tripwireSupabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        console.log('🔥 TripwireProductPage: Loaded tripwire user:', session.user.email);
        setTripwireUser(session.user);
        setIsAdmin(session.user.user_metadata?.role === 'admin');
      }
    });
  }, []);

  // Load newly unlocked modules and progress on mount
  useEffect(() => {
    if (!tripwireUser?.id) return;

    const loadUnlocks = async () => {
      try {
        // ✅ КЭШИРОВАНИЕ: Проверяем есть ли в localStorage
        const cachedKey = `tripwire_unlocks_${tripwireUser.id}`;
        const cached = localStorage.getItem(cachedKey);
        
        if (cached) {
          const cachedData = JSON.parse(cached);
          console.log('⚡ Loaded from CACHE:', cachedData.moduleIds);
          setUserUnlockedModuleIds(cachedData.moduleIds);
        }
        
        // Загружаем с сервера в фоне
        const response = await api.get(`/api/tripwire/module-unlocks/${tripwireUser.id}`);
        const unlocks = response.unlocks || [];
        
        console.log('🔓 Loaded unlocks from API:', unlocks);
        
        // Store all unlocked module IDs (для изменения визуала)
        const allUnlockedIds = unlocks.map((u: any) => u.module_id);
        setUserUnlockedModuleIds(allUnlockedIds);
        
        // ✅ СОХРАНЯЕМ В КЭШЕ
        localStorage.setItem(cachedKey, JSON.stringify({
          moduleIds: allUnlockedIds,
          timestamp: Date.now()
        }));
        
        // ✅ FIX: Показываем анимацию ТОЛЬКО если unlock создан недавно (последние 10 секунд)
        const now = new Date().getTime();
        const recentUnlocks = unlocks.filter((u: any) => {
          if (u.animation_shown) return false; // Уже показанные - пропускаем
          
          const unlockedAt = new Date(u.unlocked_at).getTime();
          const diffSeconds = (now - unlockedAt) / 1000;
          
          console.log(`🕐 Module ${u.module_id} unlocked ${diffSeconds.toFixed(1)}s ago`);
          
          // Показываем только если разблокирован меньше 10 секунд назад
          return diffSeconds < 10;
        });
        
        if (recentUnlocks.length > 0) {
          console.log(`🎉 Showing animation for ${recentUnlocks.length} recent unlock(s)`);
          setUnlockedModules(recentUnlocks);
          setCurrentUnlock(recentUnlocks[0]);
          setShowUnlockAnimation(true);
        }
        
        // 🔥 Загружаем завершенные уроки из tripwire_progress
        const { data: progressData, error: progressError } = await tripwireSupabase
          .from('tripwire_progress')
          .select('lesson_id, is_completed')
          .eq('tripwire_user_id', tripwireUser.id)
          .eq('is_completed', true);
        
        if (!progressError && progressData) {
          const completedLessonIds = progressData.map((p: any) => p.lesson_id);
          setCompletedLessons(completedLessonIds);
          console.log('✅ Loaded completed lessons:', completedLessonIds);
        }
      } catch (error) {
        console.error('❌ Failed to load unlocks:', error);
      }
    };

    loadUnlocks();
  }, [tripwireUser?.id]);

  // 🔥 Load lesson durations from Bunny Stream video metadata
  useEffect(() => {
    const loadDurations = async () => {
      try {
        // Load all 3 lessons and extract duration from video metadata
        const lessonIds = [67, 68, 69];
        const lessons = await Promise.all(
          lessonIds.map(async (id) => {
            try {
              const response = await api.get(`/api/tripwire/lessons/${id}`);
              return {
                id,
                duration_minutes: response.lesson?.duration_minutes || 0
              };
            } catch (err) {
              console.warn(`Failed to load lesson ${id}:`, err);
              return { id, duration_minutes: 0 };
            }
          })
        );
        
        const updatedModules = tripwireModules.map(module => {
          const lesson = lessons.find(l => l.id === module.lessonId);
          if (lesson && lesson.duration_minutes) {
            const hours = Math.floor(lesson.duration_minutes / 60);
            const minutes = lesson.duration_minutes % 60;
            let durationStr = '';
            if (hours > 0) {
              durationStr = hours + ' ч' + (minutes > 0 ? ' ' + minutes + ' мин' : '');
            } else {
              durationStr = minutes + ' мин';
            }
            return { ...module, duration: durationStr };
          }
          return module;
        });
        setModulesWithDuration(updatedModules);
        console.log('✅ Loaded lesson durations:', lessons);
      } catch (error) {
        console.error('❌ Failed to load durations:', error);
      }
    };
    
    loadDurations();
  }, []);


  // Handle unlock animation completion
  const handleUnlockComplete = async () => {
    if (!currentUnlock || !tripwireUser?.id) return;

    try {
      // Mark animation as shown
      await api.post('/api/tripwire/module-unlocks/mark-shown', {
        userId: tripwireUser.id,
        moduleId: currentUnlock.module_id
      });

      console.log(`✅ Animation shown for module ${currentUnlock.module_id}`);

      // Remove completed unlock from queue
      const remainingUnlocks = unlockedModules.filter(u => u.id !== currentUnlock.id);
      setUnlockedModules(remainingUnlocks);

      // Show next unlock if exists
      if (remainingUnlocks.length > 0) {
        setTimeout(() => {
          setCurrentUnlock(remainingUnlocks[0]);
          setShowUnlockAnimation(true);
        }, 500);
      } else {
        setShowUnlockAnimation(false);
        setCurrentUnlock(null);
      }
    } catch (error) {
      console.error('❌ Failed to mark animation as shown:', error);
      setShowUnlockAnimation(false);
    }
  };

  const handleModuleClick = (module: any) => {
    // ✅ ADMIN GOD MODE: Admin can click any module
    if (module.status === 'locked' && !isAdmin) {
      return;
    }

    // ✅ FIX: Правильный URL format без /module/${module.id}
    navigate(`/integrator/lesson/${module.lessonId}`);
  };

  // ✅ DYNAMICALLY unlock modules based on userUnlockedModuleIds
  const modulesWithDynamicStatus = modulesWithDuration.map(module => {
    // 🔥 Module 16 (вводный) ВСЕГДА открыт для ВСЕХ (даже если нет в userUnlockedModuleIds)
    if (module.id === 16) {
      return { ...module, status: 'active' };
    }
    
    // 🔥 Admin видит все модули
    if (isAdmin) {
      console.log(`🔥 Admin mode: unlocking module ${module.id}`);
      return { ...module, status: 'active' };
    }
    
    // 🔥 Остальные модули открываются через userUnlockedModuleIds
    const isUnlocked = userUnlockedModuleIds.includes(module.id);
    console.log(`🔍 Module ${module.id}: unlocked=${isUnlocked}, userUnlockedIds=[${userUnlockedModuleIds.join(', ')}], isAdmin=${isAdmin}`);
    return {
      ...module,
      status: isUnlocked ? 'active' : 'locked'
    };
  });

  const activeModules = modulesWithDynamicStatus.filter(m => m.status === 'active');
  const lockedModules = modulesWithDynamicStatus.filter(m => m.status === 'locked');
  
  // 🔥 Подсчитываем завершенные модули
  // Модуль считается завершенным, если его урок завершен в tripwire_progress
  // Модуль 16 (урок 67) завершен → completedLessons includes 67
  // Модуль 17 (урок 68) завершен → completedLessons includes 68
  // Модуль 18 (урок 69) завершен → completedLessons includes 69
  let completedModulesCount = 0;
  if (isAdmin) {
    completedModulesCount = 3; // Admin видит всё открытым
  } else {
    if (completedLessons.includes(67)) completedModulesCount++; // Модуль 16 завершен
    if (completedLessons.includes(68)) completedModulesCount++; // Модуль 17 завершен
    if (completedLessons.includes(69)) completedModulesCount++; // Модуль 18 завершен
  }
  
  console.log('🎯 Completed modules count:', completedModulesCount, 'completedLessons:', completedLessons);
  
  // ✅ ПРАВИЛЬНАЯ РАСКЛАДКА:
  // LEFT COLUMN (lg:col-span-6): Модуль 1 (Вводный) + Модуль 2 (GPT)
  // RIGHT COLUMN (lg:col-span-4): Модуль 3 (Reels) + Прямой эфир (4)
  const leftColumnModules = modulesWithDynamicStatus.filter(m => m.id === 16 || m.id === 17); // Вводный + GPT
  const rightColumnModules = modulesWithDynamicStatus.filter(m => m.id === 18); // Reels

  // Get current unlock module data
  const currentUnlockModule = currentUnlock 
    ? modulesWithDuration.find(m => m.id === currentUnlock.module_id)
    : null;

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        background: BRAND.colors.void,
        fontFamily: BRAND.fonts.body 
      }}
    >
      {/* ═══════════════════════════════════════════════════════════
          CYBER GRID BACKGROUND
          ═══════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(${BRAND.colors.neon_green}33 1px, transparent 1px),
              linear-gradient(90deg, ${BRAND.colors.neon_green}33 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          AMBIENT GLOW EFFECTS
          ═══════════════════════════════════════════════════════ */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-[#00FF88]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-[#00FF88]/3 rounded-full blur-[150px] pointer-events-none" />

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════ */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 pt-6 sm:pt-8 lg:pt-12 pb-12 lg:pb-20">
        
        {/* ═══════════════════════════════════════════════════════════
            HERO HEADER - CYBER STYLE
            ═══════════════════════════════════════════════════════ */}
        <motion.header
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 sm:mb-10 lg:mb-12"
        >
          {/* System Label */}
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-5 lg:mb-6">
            <motion.div
              animate={{
                boxShadow: ['0 0 4px #00FF88', '0 0 8px #00FF88', '0 0 4px #00FF88'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#00FF88]"
            />
            <span 
              className="text-[10px] sm:text-xs md:text-sm tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] uppercase"
              style={{ 
                fontFamily: BRAND.fonts.mono,
                color: BRAND.colors.neon_green 
              }}
            >
              /// EXPRESS COURSE
            </span>
          </div>

          {/* Container for Title, Subtitle and Button */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            <div className="flex-1">
              {/* Main Title with GLOW effect */}
              <h1 
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold uppercase mb-3 sm:mb-4 leading-tight"
                style={{ 
                  fontFamily: BRAND.fonts.main,
                  color: '#FFFFFF',
                  textShadow: `
                    0 0 20px rgba(0, 255, 148, 0.3),
                    0 0 40px rgba(0, 255, 148, 0.2),
                    0 0 60px rgba(0, 255, 148, 0.1)
                  `
                }}
              >
                INTEGRATOR <span style={{ color: BRAND.colors.neon_green }}>V3.0</span>
              </h1>

              {/* Subtitle */}
              <p 
                className="text-[11px] sm:text-xs md:text-sm lg:text-base xl:text-lg max-w-2xl leading-relaxed"
                style={{ color: BRAND.colors.text_dim }}
              >
                Кибернетическая платформа для освоения AI-интеграции.<br />
                Начните свой путь от нуля до первых $1000.
              </p>
            </div>

            {/* 🟢 AI CURATOR BUTTON - LOCKED FOR STUDENTS - COMPACT VERSION */}
            <motion.button
              whileHover={{ scale: isAdmin ? 1.02 : 1, boxShadow: isAdmin ? '0 0 30px rgba(0,255,136,0.3)' : 'none' }}
              whileTap={{ scale: isAdmin ? 0.98 : 1 }}
              onClick={() => {
                if (isAdmin) {
                  setIsAIChatOpen(true);
                } else {
                  showLocked('AI Куратор');
                }
              }}
              className={`group relative px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-3.5 md:py-2 lg:px-4 lg:py-2.5 overflow-hidden rounded-md sm:rounded-lg flex items-center gap-2 sm:gap-2.5 border transition-all duration-300 flex-shrink-0 md:w-auto ${
                isAdmin 
                  ? 'border-[#00FF88]/40 hover:border-[#00FF88] cursor-pointer' 
                  : 'border-white/10 cursor-not-allowed opacity-50'
              }`}
              style={{
                background: isAdmin 
                  ? `linear-gradient(135deg, rgba(0,255,136,0.08) 0%, rgba(0,255,136,0.02) 100%)`
                  : `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Shimmer Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                initial={{ x: '-200%' }}
                animate={{ x: '200%' }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 1,
                  ease: "easeInOut"
                }}
              />
              
              {/* Icon Container */}
              <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-sm sm:rounded-md bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/30 group-hover:bg-[#00FF88]/20 group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4 md:h-4 lg:w-5 lg:h-5 text-[#00FF88]" />
              </div>

              {/* Text */}
              <div className="relative z-10 text-left flex-1 min-w-0">
                <p className={`font-bold font-mono text-[9px] sm:text-[10px] md:text-[10px] lg:text-xs leading-none mb-0.5 transition-colors ${
                  isAdmin ? 'text-white group-hover:text-[#00FF88]' : 'text-white/60'
                }`}>
                  AI Куратор
                </p>
                <p className="text-[7px] sm:text-[8px] md:text-[8px] lg:text-[9px] text-white/60 font-mono tracking-wide leading-none truncate">
                  {isAdmin ? 'Онлайн 24/7' : '🔒 Доступно на полной версии'}
                </p>
              </div>

              {/* Glow Effect */}
              <div className="absolute inset-0 bg-[#00FF88]/5 group-hover:bg-[#00FF88]/10 transition-colors duration-500 pointer-events-none" />
            </motion.button>
          </div>
        </motion.header>

        {/* ═══════════════════════════════════════════════════════════
            GRID LAYOUT: LEFT (Вводный+GPT) + RIGHT (Reels+Эфир)
            ═══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 lg:gap-8 max-w-[1200px] mx-auto">
          
          {/* ═══════════════════════════════════════════════════════════
              LEFT COLUMN (lg:col-span-6): ВВОДНЫЙ + GPT
              ═══════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 flex flex-col gap-6 lg:gap-8">
            {leftColumnModules.map((module, index) => {
              const isLocked = module.status === 'locked';
            
            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
                onClick={() => !isLocked ? handleModuleClick(module) : null}
                onMouseEnter={() => setHoveredModule(module.id)}
                onMouseLeave={() => setHoveredModule(null)}
                className={`relative rounded-[16px] p-4 lg:p-6 group overflow-hidden flex-1 ${
                  isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${BRAND.colors.panel} 0%, ${BRAND.colors.surface} 100%)`,
                  border: `2px solid ${
                    isLocked 
                      ? 'rgba(255,255,255,0.05)' 
                      : hoveredModule === module.id 
                        ? BRAND.colors.neon_green 
                        : 'rgba(0, 255, 148, 0.2)'
                  }`,
                  backdropFilter: 'blur(40px)',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: !isLocked && hoveredModule === module.id 
                    ? `0 0 40px rgba(0, 255, 148, 0.3)` 
                    : !isLocked 
                      ? '0 0 20px rgba(0, 255, 148, 0.1)'
                      : 'none'
                }}
              >
                {/* Gradient Overlay */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-br ${module.gradient} ${isLocked ? 'opacity-20' : 'opacity-30'}`}
                />

                  <div className="relative z-10 flex items-start gap-3">
                    {/* Icon with Badge */}
                    <div className="relative flex-shrink-0">
                      <div 
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${
                          isLocked ? '' : 'group-hover:scale-110'
                        } transition-transform duration-300`}
                        style={{
                          background: isLocked 
                            ? 'rgba(255,255,255,0.03)' 
                            : `${BRAND.colors.neon_green}20`,
                          border: isLocked 
                            ? '1px solid rgba(255,255,255,0.05)' 
                            : `1px solid ${BRAND.colors.neon_green}30`
                        }}
                      >
                        <module.icon 
                          className="w-5 h-5 sm:w-6 sm:h-6"
                          style={{ color: isLocked ? BRAND.colors.text_dim : BRAND.colors.neon_green }}
                        />
                      </div>
                      {/* Module Number Badge */}
                      <div 
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: isLocked ? 'rgba(255,255,255,0.1)' : BRAND.colors.neon_green,
                          color: isLocked ? BRAND.colors.text_dim : '#000000',
                          fontFamily: BRAND.fonts.mono,
                          boxShadow: isLocked ? 'none' : `0 0 8px ${BRAND.colors.neon_green}`,
                          border: isLocked ? '1px solid rgba(255,255,255,0.1)' : 'none'
                        }}
                      >
                        {module.moduleNumber}
                      </div>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <h3 
                        className="text-base sm:text-lg font-bold uppercase mb-1 line-clamp-1"
                        style={{ 
                          color: isLocked ? 'rgba(255,255,255,0.4)' : '#FFFFFF',
                          fontFamily: BRAND.fonts.main
                        }}
                      >
                        {module.title}
                      </h3>
                      <p 
                        className="text-[10px] sm:text-xs mb-1.5 line-clamp-1"
                        style={{ 
                          color: isLocked ? 'rgba(156, 163, 175, 0.4)' : BRAND.colors.text_dim,
                          fontFamily: BRAND.fonts.body,
                          opacity: isLocked ? 0.5 : 0.8
                        }}
                      >
                        {module.subtitle}
                      </p>
                      <p 
                        className="text-[10px] sm:text-xs mb-3"
                        style={{ 
                          color: isLocked ? 'rgba(156, 163, 175, 0.4)' : BRAND.colors.text_dim,
                          fontFamily: BRAND.fonts.body,
                          opacity: isLocked ? 0.4 : 0.6
                        }}
                      >
                        {module.description}
                      </p>

                      {/* Stats & Button - прижаты к низу */}
                      <div className="mt-auto space-y-2">
                        {/* Stats */}
                        <div className="flex items-center gap-3 text-[10px] sm:text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock 
                              className="w-3 h-3 sm:w-4 sm:h-4" 
                              style={{ 
                                color: isLocked ? 'rgba(156, 163, 175, 0.3)' : BRAND.colors.neon_green, 
                                opacity: 0.7 
                              }}
                            />
                            <span style={{ 
                              color: isLocked ? 'rgba(156, 163, 175, 0.4)' : BRAND.colors.neon_green, 
                              opacity: 0.7 
                            }}>
                              {module.duration}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen 
                              className="w-3 h-3 sm:w-4 sm:h-4" 
                              style={{ 
                                color: isLocked ? 'rgba(156, 163, 175, 0.3)' : BRAND.colors.neon_green, 
                                opacity: 0.7 
                              }}
                            />
                            <span style={{ 
                              color: isLocked ? 'rgba(156, 163, 175, 0.4)' : BRAND.colors.neon_green, 
                              opacity: 0.7 
                            }}>
                              {module.lessons} урок
                            </span>
                          </div>
                        </div>

                        {/* CTA Button */}
                        {!isLocked && (
                          <motion.button
                            initial={{ skewX: -10 }}
                            animate={{ skewX: -10 }}
                            whileHover={{ scale: 1.02, skewX: 0 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="relative px-3 py-1.5 sm:px-4 sm:py-2 font-bold uppercase tracking-wider overflow-hidden"
                            style={{
                              background: BRAND.colors.neon_green,
                              color: '#000000',
                              borderRadius: '6px',
                              fontFamily: BRAND.fonts.main,
                              fontSize: '10px',
                            }}
                          >
                            <motion.span 
                              initial={{ skewX: 10 }}
                              animate={{ skewX: 10 }}
                              style={{ display: 'block' }}
                            >
                              → НАЧАТЬ МОДУЛЬ
                            </motion.span>
                          </motion.button>
                        )}
                        
                        {isLocked && (
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs" style={{ color: BRAND.colors.text_dim, opacity: 0.5 }}>
                            <Lock className="w-3 h-3" />
                            <span>ЗАБЛОКИРОВАНО</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Glassmorphic Lock Overlay */}
                  {isLocked && (
                    <div 
                      className="absolute inset-0 backdrop-blur-[2px] flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: 'rgba(0,0,0,0.3)'
                      }}
                    >
                      <Lock 
                        className="w-10 h-10 sm:w-12 sm:h-12" 
                        style={{ color: BRAND.colors.text_dim }}
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              RIGHT COLUMN (lg:col-span-4): REELS + ПРЯМОЙ ЭФИР
              ═══════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">
            {/* МОДУЛЬ 3: REELS */}
            {rightColumnModules.map((module, index) => {
              const isLocked = module.status === 'locked';
              
              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  onClick={() => !isLocked ? handleModuleClick(module) : null}
                  onMouseEnter={() => setHoveredModule(module.id)}
                  onMouseLeave={() => setHoveredModule(null)}
                  className={`relative rounded-[16px] p-4 lg:p-6 group overflow-hidden flex-1 ${
                    isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.colors.panel} 0%, ${BRAND.colors.surface} 100%)`,
                    border: `2px solid ${
                      isLocked 
                        ? 'rgba(255,255,255,0.05)' 
                        : hoveredModule === module.id 
                          ? BRAND.colors.neon_green 
                          : 'rgba(0, 255, 148, 0.2)'
                    }`,
                    backdropFilter: 'blur(40px)',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: !isLocked && hoveredModule === module.id 
                      ? `0 0 40px rgba(0, 255, 148, 0.3)` 
                      : !isLocked 
                        ? '0 0 20px rgba(0, 255, 148, 0.1)'
                        : 'none'
                  }}
                >
                  {/* Gradient Overlay */}
                  <div 
                    className={`absolute inset-0 bg-gradient-to-br ${module.gradient} ${isLocked ? 'opacity-20' : 'opacity-30'}`}
                  />

                  <div className="relative z-10 flex items-start gap-3">
                    {/* Icon with Badge */}
                    <div className="relative flex-shrink-0">
                      <div 
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isLocked ? '' : 'group-hover:scale-110'
                        } transition-transform duration-300`}
                        style={{
                          background: isLocked 
                            ? 'rgba(255,255,255,0.03)' 
                            : `${BRAND.colors.neon_green}20`,
                          border: isLocked 
                            ? '1px solid rgba(255,255,255,0.05)' 
                            : `1px solid ${BRAND.colors.neon_green}30`
                        }}
                      >
                        <module.icon 
                          className="w-6 h-6"
                          style={{ color: isLocked ? BRAND.colors.text_dim : BRAND.colors.neon_green }}
                        />
                      </div>
                      {/* Module Number Badge */}
                      <div 
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: isLocked ? 'rgba(255,255,255,0.1)' : BRAND.colors.neon_green,
                          color: isLocked ? BRAND.colors.text_dim : '#000000',
                          fontFamily: BRAND.fonts.mono,
                          boxShadow: isLocked ? 'none' : `0 0 8px ${BRAND.colors.neon_green}`,
                          border: isLocked ? '1px solid rgba(255,255,255,0.1)' : 'none'
                        }}
                      >
                        {module.moduleNumber}
                      </div>
                    </div>

                    {/* Text */}
                    <div className="flex-1 flex flex-col">
                      <h3 
                        className="text-lg lg:text-xl font-bold uppercase mb-1"
                        style={{ 
                          color: isLocked ? 'rgba(255,255,255,0.4)' : '#FFFFFF',
                          fontFamily: BRAND.fonts.main
                        }}
                      >
                        {module.title}
                      </h3>
                      <p 
                        className="text-xs mb-2"
                        style={{ 
                          color: isLocked ? 'rgba(156, 163, 175, 0.4)' : BRAND.colors.text_dim,
                          fontFamily: BRAND.fonts.body,
                          opacity: isLocked ? 0.5 : 0.8
                        }}
                      >
                        {module.subtitle}
                      </p>
                      <p 
                        className="text-xs mb-4"
                        style={{ 
                          color: isLocked ? 'rgba(156, 163, 175, 0.4)' : BRAND.colors.text_dim,
                          fontFamily: BRAND.fonts.body,
                          opacity: isLocked ? 0.4 : 0.6
                        }}
                      >
                        {module.description}
                      </p>

                      {/* Stats & Button - прижаты к низу */}
                      <div className="mt-auto space-y-2.5">
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock 
                              className="w-4 h-4" 
                              style={{ 
                                color: isLocked ? 'rgba(156, 163, 175, 0.3)' : BRAND.colors.neon_green, 
                                opacity: 0.7 
                              }}
                            />
                            <span style={{ 
                              color: isLocked ? 'rgba(156, 163, 175, 0.4)' : BRAND.colors.neon_green, 
                              opacity: 0.7 
                            }}>
                              {module.duration}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen 
                              className="w-4 h-4" 
                              style={{ 
                                color: isLocked ? 'rgba(156, 163, 175, 0.3)' : BRAND.colors.neon_green, 
                                opacity: 0.7 
                              }}
                            />
                            <span style={{ 
                              color: isLocked ? 'rgba(156, 163, 175, 0.4)' : BRAND.colors.neon_green, 
                              opacity: 0.7 
                            }}>
                              {module.lessons} урок
                            </span>
                          </div>
                        </div>

                        {/* CTA Button */}
                        {!isLocked && (
                          <motion.button
                            initial={{ skewX: -10 }}
                            animate={{ skewX: -10 }}
                            whileHover={{ scale: 1.02, skewX: 0 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="relative px-4 py-2 font-bold uppercase tracking-wider overflow-hidden"
                            style={{
                              background: BRAND.colors.neon_green,
                              color: '#000000',
                              borderRadius: '6px',
                              fontFamily: BRAND.fonts.main,
                              fontSize: '10px',
                            }}
                          >
                            <motion.span 
                              initial={{ skewX: 10 }}
                              animate={{ skewX: 10 }}
                              style={{ display: 'block' }}
                            >
                              → НАЧАТЬ МОДУЛЬ
                            </motion.span>
                          </motion.button>
                        )}
                        
                        {isLocked && (
                          <div className="flex items-center gap-2 text-xs" style={{ color: BRAND.colors.text_dim, opacity: 0.5 }}>
                            <Lock className="w-3 h-3" />
                            <span>ЗАБЛОКИРОВАНО</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Glassmorphic Lock Overlay */}
                  {isLocked && (
                    <div 
                      className="absolute inset-0 backdrop-blur-[2px] flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: 'rgba(0,0,0,0.3)'
                      }}
                    >
                      <Lock 
                        className="w-12 h-12" 
                        style={{ color: BRAND.colors.text_dim }}
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}
            
            {/* ПРЯМОЙ ЭФИР (4) - ПОД REELS */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <LiveStreamModule modulesCompleted={completedModulesCount} />
            </motion.div>
          </div>
        </div>

      </div>

      {/* 🎮 GAMIFICATION: Module Unlock Animation */}
      {showUnlockAnimation && currentUnlock && (
        <ModuleUnlockAnimation
          moduleNumber={currentUnlock.module_id}
          onClose={() => {
            setShowUnlockAnimation(false);
            handleUnlockComplete();
          }}
          onNavigate={() => {
            setShowUnlockAnimation(false);
            handleUnlockComplete();
            // Navigate to module (moduleId is currentUnlock.module_id)
            // Map module_id to lesson_id
            const lessonMap = { 16: 67, 17: 68, 18: 69 };
            const lessonId = lessonMap[currentUnlock.module_id as keyof typeof lessonMap] || currentUnlock.module_id;
            navigate(`/integrator/lesson/${lessonId}`);
          }}
        />
      )}

      {/* 🟢 AI CURATOR DIALOG */}
      <TripwireAIChatDialog 
        open={isAIChatOpen} 
        onOpenChange={setIsAIChatOpen} 
      />
    </div>
  );
}
