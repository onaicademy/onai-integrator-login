import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, Lock, Zap, Code, Briefcase, Rocket, Brain, Bot, Clapperboard, Sparkles } from "lucide-react";
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
const tripwireModules = [
  {
    id: 16, // ✅ Модуль 1: Основы AI в БД
    title: "Вводный модуль",
    subtitle: "Определим какое направление в ИИ твое",
    description: "Базовое погружение в нейросети. Разбор основных инструментов и выбор специализации для заработка.",
    duration: "45 мин",
    lessons: 1,
    icon: Brain,
    status: "active",
    gradient: "from-[#00FF88]/20 via-transparent to-transparent",
    lessonId: 67,
  },
  {
    id: 17, // ✅ Модуль 2: Практика с AI в БД
    title: "Создание GPT-бота",
    subtitle: "Instagram, WhatsApp интеграции",
    description: "Практический модуль по созданию умных ассистентов. Подключение к соцсетям и автоматизация общения.",
    duration: "60 мин",
    lessons: 1,
    icon: Bot,
    status: "locked",
    gradient: "from-purple-500/20 via-transparent to-transparent",
    lessonId: 68,
  },
  {
    id: 18, // ✅ Модуль 3: AI в бизнесе в БД
    title: "Создание вирусных Reels",
    subtitle: "100 000 👁️ | Сценарий, видео, монтаж",
    description: "Генерация контента с помощью AI. Создание сценариев, цифровых аватаров и автоматический монтаж.",
    duration: "50 мин",
    lessons: 1,
    icon: Clapperboard,
    status: "locked",
    gradient: "from-blue-500/20 via-transparent to-transparent",
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

  // Load newly unlocked modules on mount
  useEffect(() => {
    if (!tripwireUser?.id) return;

    const loadUnlocks = async () => {
      try {
        const response = await api.get(`/api/tripwire/module-unlocks/${tripwireUser.id}`);
        const unlocks = response.unlocks || [];
        
        console.log('🔓 Loaded unlocks:', unlocks);
        
        // Store all unlocked module IDs (для изменения визуала)
        const allUnlockedIds = unlocks.map((u: any) => u.module_id);
        setUserUnlockedModuleIds(allUnlockedIds);
        
        // Показываем анимацию только для тех, где animation_shown = false
        const pendingUnlocks = unlocks.filter((u: any) => !u.animation_shown);
        if (pendingUnlocks.length > 0) {
          setUnlockedModules(pendingUnlocks);
          setCurrentUnlock(pendingUnlocks[0]);
          setShowUnlockAnimation(true);
        }
      } catch (error) {
        console.error('❌ Failed to load unlocks:', error);
      }
    };

    loadUnlocks();
  }, [tripwireUser?.id]);

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
    
    navigate(`/tripwire/module/${module.id}/lesson/${module.lessonId}`);
  };

  // ✅ DYNAMICALLY unlock modules based on userUnlockedModuleIds
  const modulesWithDynamicStatus = tripwireModules.map(module => ({
    ...module,
    status: (module.id === 1 || userUnlockedModuleIds.includes(module.id) || isAdmin) 
      ? 'active' 
      : 'locked'
  }));

  const activeModules = modulesWithDynamicStatus.filter(m => m.status === 'active');
  const lockedModules = modulesWithDynamicStatus.filter(m => m.status === 'locked');
  
  // Первый активный модуль показываем большой картой
  const featuredModule = activeModules[0];
  // Остальные активные показываем в правой колонке
  const otherActiveModules = activeModules.slice(1);

  // Get current unlock module data
  const currentUnlockModule = currentUnlock 
    ? tripwireModules.find(m => m.id === currentUnlock.module_id)
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
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-20">
        
        {/* ═══════════════════════════════════════════════════════════
            HERO HEADER - CYBER STYLE
            ═══════════════════════════════════════════════════════ */}
        <motion.header
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 lg:mb-20"
        >
          {/* System Label */}
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{
                boxShadow: ['0 0 4px #00FF88', '0 0 8px #00FF88', '0 0 4px #00FF88'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-3 h-3 rounded-full bg-[#00FF88]"
            />
            <span 
              className="text-xs tracking-[0.3em] uppercase"
              style={{ 
                fontFamily: BRAND.fonts.mono,
                color: BRAND.colors.neon_green 
              }}
            >
              /// SYSTEM ACTIVE • V3.0 STABLE
            </span>
          </div>

          {/* Main Title with GLOW effect */}
          <h1 
            className="text-6xl lg:text-8xl font-bold uppercase mb-6 leading-none"
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
            INTEGRATOR
            <span 
              className="block mt-2"
              style={{ color: BRAND.colors.neon_green }}
            >
              V3.0
            </span>
          </h1>

          {/* Subtitle */}
          <p 
            className="text-xl lg:text-2xl max-w-3xl mb-8"
            style={{ color: BRAND.colors.text_dim }}
          >
            Кибернетическая платформа для освоения AI-интеграции.
            <br />
            Начните свой путь от нуля до первых $1000.
          </p>

          {/* 🟢 AI CURATOR BUTTON - PREMIUM DESIGN */}
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(0,255,136,0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAIChatOpen(true)}
            className="group relative px-10 py-5 overflow-hidden rounded-2xl flex items-center gap-5 border-2 border-[#00FF88]/40 hover:border-[#00FF88] transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, rgba(0,255,136,0.08) 0%, rgba(0,255,136,0.02) 100%)`,
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
            <div className="relative z-10 w-14 h-14 rounded-xl bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/30 group-hover:bg-[#00FF88]/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
              <Bot className="w-7 h-7 text-[#00FF88]" />
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-xl border-2 border-[#00FF88]/40 animate-ping opacity-30" />
            </div>

            {/* Text */}
            <div className="relative z-10 text-left">
              <p className="text-white font-bold font-mono text-lg leading-none mb-2 group-hover:text-[#00FF88] transition-colors">
                AI Куратор
              </p>
              <p className="text-[10px] text-white/60 font-mono tracking-wide leading-none">
                Твой личный помощник 24/7
              </p>
            </div>

            {/* Glow Effect */}
            <div className="absolute inset-0 bg-[#00FF88]/5 group-hover:bg-[#00FF88]/10 transition-colors duration-500 pointer-events-none" />
            
            {/* Fingerprint Icon */}
            <div className="relative z-10 ml-auto">
              <svg 
                className="w-8 h-8 text-[#00FF88] opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
                <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
                <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
                <path d="M2 12a10 10 0 0 1 18-6"/>
                <path d="M2 16h.01"/>
                <path d="M21.8 16c.2-2 .131-5.354 0-6"/>
                <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/>
                <path d="M8.65 22c.21-.66.45-1.32.57-2"/>
                <path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>
              </svg>
            </div>
          </motion.button>
        </motion.header>

        {/* ═══════════════════════════════════════════════════════════
            BENTO GRID LAYOUT
            ═══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* ═══════════════════════════════════════════════════════════
              LEFT COLUMN: ACTIVE MODULE (HERO CARD)
              ═══════════════════════════════════════════════════════ */}
          {featuredModule && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="lg:col-span-7"
            >
              <div
                onClick={() => handleModuleClick(featuredModule)}
                onMouseEnter={() => setHoveredModule(featuredModule.id)}
                onMouseLeave={() => setHoveredModule(null)}
                className="relative h-full min-h-[500px] lg:min-h-[600px] rounded-[24px] overflow-hidden cursor-pointer group"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.colors.panel} 0%, ${BRAND.colors.surface} 100%)`,
                  border: `1px solid ${hoveredModule === featuredModule.id ? BRAND.colors.neon_green : 'rgba(255,255,255,0.05)'}`,
                  backdropFilter: 'blur(40px)',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: hoveredModule === featuredModule.id 
                    ? `0 0 60px rgba(0, 255, 148, 0.2)` 
                    : 'none'
                }}
              >
                {/* Gradient Overlay */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-br ${featuredModule.gradient} opacity-40`}
                />

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-between p-8 lg:p-12">
                  {/* Top */}
                  <div>
                    {/* Status Badge */}
                    <Badge 
                      className="mb-6 px-4 py-2 text-xs uppercase tracking-wider border-0"
                      style={{
                        background: `${BRAND.colors.neon_green}20`,
                        color: BRAND.colors.neon_green,
                        fontFamily: BRAND.fonts.mono
                      }}
                    >
                      ⚡ ACTIVE MODULE
                    </Badge>

                    {/* Icon */}
                    <div 
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500"
                      style={{
                        background: `${BRAND.colors.neon_green}15`,
                        border: `2px solid ${BRAND.colors.neon_green}40`,
                      }}
                    >
                      <featuredModule.icon 
                        className="w-10 h-10" 
                        style={{ color: BRAND.colors.neon_green }}
                      />
                    </div>

                    {/* Title */}
                    <h2 
                      className="text-4xl lg:text-5xl font-bold uppercase mb-3 leading-tight"
                      style={{ 
                        fontFamily: BRAND.fonts.main,
                        color: '#FFFFFF'
                      }}
                    >
                      {featuredModule.title}
                    </h2>
                    
                    <p 
                      className="text-sm uppercase mb-4 tracking-widest"
                      style={{ 
                        fontFamily: BRAND.fonts.mono,
                        color: BRAND.colors.neon_green 
                      }}
                    >
                      {featuredModule.subtitle}
                    </p>

                    <p 
                      className="text-lg leading-relaxed max-w-lg"
                      style={{ color: BRAND.colors.text_dim }}
                    >
                      {featuredModule.description}
                    </p>
                  </div>

                  {/* Bottom - CTA */}
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock 
                          className="w-5 h-5" 
                          style={{ color: BRAND.colors.neon_green }}
                        />
                        <span style={{ color: BRAND.colors.text_dim }}>
                          {featuredModule.duration}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen 
                          className="w-5 h-5" 
                          style={{ color: BRAND.colors.neon_green }}
                        />
                        <span style={{ color: BRAND.colors.text_dim }}>
                          {featuredModule.lessons} урок
                        </span>
                      </div>
                    </div>

                    {/* SKEWED CTA BUTTON */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative px-8 py-4 font-bold uppercase tracking-wider overflow-hidden"
                      style={{
                        background: BRAND.colors.neon_green,
                        color: '#000000',
                        transform: 'skewX(-10deg)',
                        borderRadius: '8px',
                        fontFamily: BRAND.fonts.main,
                        fontSize: '14px',
                      }}
                    >
                      <span style={{ display: 'block', transform: 'skewX(10deg)' }}>
                        → НАЧАТЬ МОДУЛЬ
                      </span>
                    </motion.button>
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{
                    opacity: hoveredModule === featuredModule.id ? 0.1 : 0,
                  }}
                  style={{
                    background: `radial-gradient(circle at center, ${BRAND.colors.neon_green}, transparent 70%)`,
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              RIGHT COLUMN: OTHER ACTIVE + LOCKED MODULES
              ═══════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-6 lg:space-y-8">
            {/* Other Active Modules (разблокированные, кроме первого) */}
            {otherActiveModules.map((module, index) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
                onClick={() => handleModuleClick(module)}
                onMouseEnter={() => setHoveredModule(module.id)}
                onMouseLeave={() => setHoveredModule(null)}
                className="relative rounded-[20px] p-6 lg:p-8 cursor-pointer group overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.colors.panel} 0%, ${BRAND.colors.surface} 100%)`,
                  border: `2px solid ${hoveredModule === module.id ? BRAND.colors.neon_green : 'rgba(0, 255, 148, 0.2)'}`,
                  backdropFilter: 'blur(40px)',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: hoveredModule === module.id 
                    ? `0 0 40px rgba(0, 255, 148, 0.3)` 
                    : '0 0 20px rgba(0, 255, 148, 0.1)'
                }}
              >
                {/* Gradient Overlay */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-30`}
                />

                <div className="relative z-10 flex items-start gap-4">
                  {/* Icon */}
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
                    style={{
                      background: `${BRAND.colors.neon_green}20`,
                      border: `1px solid ${BRAND.colors.neon_green}30`
                    }}
                  >
                    <module.icon 
                      className="w-8 h-8"
                      style={{ color: BRAND.colors.neon_green }}
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <h3 
                      className="text-xl lg:text-2xl font-bold mb-2 uppercase"
                      style={{ 
                        color: '#FFFFFF',
                        fontFamily: BRAND.fonts.main
                      }}
                    >
                      {module.title}
                    </h3>
                    <p 
                      className="text-sm mb-3"
                      style={{ 
                        color: BRAND.colors.text_dim,
                        fontFamily: BRAND.fonts.body,
                        opacity: 0.8
                      }}
                    >
                      {module.subtitle}
                    </p>
                    <p 
                      className="text-xs mb-4"
                      style={{ 
                        color: BRAND.colors.text_dim,
                        fontFamily: BRAND.fonts.body,
                        opacity: 0.6
                      }}
                    >
                      {module.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock 
                          className="w-4 h-4" 
                          style={{ color: BRAND.colors.neon_green, opacity: 0.7 }}
                        />
                        <span style={{ color: BRAND.colors.neon_green, opacity: 0.7 }}>
                          {module.duration}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen 
                          className="w-4 h-4" 
                          style={{ color: BRAND.colors.neon_green, opacity: 0.7 }}
                        />
                        <span style={{ color: BRAND.colors.neon_green, opacity: 0.7 }}>
                          {module.lessons} урок
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Locked Modules */}
            {lockedModules.map((module, index) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
                onClick={() => handleModuleClick(module)}  // ✅ FIXED: Added onClick handler for admin access
                onMouseEnter={() => setHoveredModule(module.id)}
                onMouseLeave={() => setHoveredModule(null)}
                className={`relative rounded-[24px] overflow-hidden group ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'}`}  // ✅ ADMIN GOD MODE: clickable for admin
                style={{
                  background: `linear-gradient(135deg, ${BRAND.colors.panel} 0%, ${BRAND.colors.surface} 100%)`,
                  border: '1px solid rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(40px)',
                  minHeight: index === 0 ? '320px' : '240px',
                }}
              >
                {/* Gradient Overlay */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-20`}
                />

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-between p-6 lg:p-8">
                  <div>
                    {/* Lock Badge - Hidden for Admin */}
                    {!isAdmin && (  // ✅ ADMIN GOD MODE: Hide lock for admin
                      <Badge 
                        className="mb-4 px-3 py-1.5 text-xs uppercase tracking-wider border-0"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          color: BRAND.colors.text_dim,
                          fontFamily: BRAND.fonts.mono
                        }}
                      >
                        <Lock className="w-3 h-3 mr-1.5" />
                        LOCKED
                      </Badge>
                    )}

                    {/* Icon */}
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <module.icon 
                        className="w-7 h-7" 
                        style={{ color: BRAND.colors.text_dim }}
                      />
                    </div>

                    {/* Title */}
                    <h3 
                      className="text-2xl font-bold uppercase mb-2 leading-tight"
                      style={{ 
                        fontFamily: BRAND.fonts.main,
                        color: '#FFFFFF'
                      }}
                    >
                      {module.title}
                    </h3>
                    
                    <p 
                      className="text-xs uppercase mb-3 tracking-widest"
                      style={{ 
                        fontFamily: BRAND.fonts.mono,
                        color: BRAND.colors.text_dim,
                        opacity: 0.5
                      }}
                    >
                      {module.subtitle}
                    </p>

                    <p 
                      className="text-sm leading-relaxed"
                      style={{ 
                        color: BRAND.colors.text_dim,
                        opacity: 0.7 
                      }}
                    >
                      {module.description}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs mt-4">
                    <div className="flex items-center gap-1.5">
                      <Clock 
                        className="w-4 h-4" 
                        style={{ color: BRAND.colors.text_dim, opacity: 0.5 }}
                      />
                      <span style={{ color: BRAND.colors.text_dim, opacity: 0.5 }}>
                        {module.duration}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen 
                        className="w-4 h-4" 
                        style={{ color: BRAND.colors.text_dim, opacity: 0.5 }}
                      />
                      <span style={{ color: BRAND.colors.text_dim, opacity: 0.5 }}>
                        {module.lessons} урок
                      </span>
                    </div>
                  </div>
                </div>

                {/* Glassmorphic Lock Overlay */}
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
              </motion.div>
            ))}

            {/* 🔴 LIVE STREAM BANNER */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <LiveStreamModule modulesCompleted={isAdmin ? 3 : 0} />
            </motion.div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            BOTTOM INFO PANEL
            ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-12 lg:mt-16 rounded-[24px] overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${BRAND.colors.panel} 0%, ${BRAND.colors.surface} 100%)`,
            border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(40px)',
          }}
        >
          <div className="p-8 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <h3 
                className="text-2xl font-bold uppercase mb-2"
                style={{ 
                  fontFamily: BRAND.fonts.main,
                  color: '#FFFFFF'
                }}
              >
                Пробная версия
              </h3>
              <p style={{ color: BRAND.colors.text_dim }}>
                Вы проходите бесплатную trial-версию курса. Получите доступ ко всем 50+ модулям в полной программе.
              </p>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 font-bold uppercase tracking-wider whitespace-nowrap"
              style={{
                background: BRAND.colors.neon_green,
                color: '#000000',
                transform: 'skewX(-10deg)',
                borderRadius: '8px',
                fontFamily: BRAND.fonts.main,
                fontSize: '14px',
              }}
              onClick={() => alert('🚀 Функция апгрейда в разработке')}
            >
              <span style={{ display: 'block', transform: 'skewX(10deg)' }}>
                UPGRADE TO FULL
              </span>
            </motion.button>
          </div>
        </motion.div>
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
            navigate(`/tripwire/lesson/${currentUnlock.module_id}`);
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
