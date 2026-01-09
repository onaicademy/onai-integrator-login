import { lazy, Suspense, useEffect } from "react"; // 🚀 ОПТИЗАЦИЯ: Lazy loading
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "./components/layouts/MainLayout";
import { AdminGuard as OldAdminGuard } from "./components/AdminGuard";
import { AdminGuard } from "./components/guards/AdminGuard"; // ✅ Admin Guard (основная платформа)
import { SalesGuard } from "./components/SalesGuard"; // ✅ Guard для admin & sales (Tripwire)
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initSentry, Sentry } from "@/config/sentryInit"; // 🛡️ Sentry Monitoring
import { AmoCRMSyncStatus } from "@/components/AmoCRMSyncStatus"; // 📊 AmoCRM Rate Limiter Status
// Integrator Guards
import { TripwireGuard } from "./components/tripwire/TripwireGuard";
import { StudentGuard } from "./components/tripwire/StudentGuard"; // ✅ Student Guard (Integrator)
import { AdminGuard as TripwireAdminGuard } from "./components/tripwire/AdminGuard"; // ✅ Admin Guard (Integrator)
import { TrafficGuard } from "./components/traffic/TrafficGuard"; // ✅ Traffic Guard (LocalStorage-based auth)

// 🛡️ ERROR RECOVERY: Import retry utilities
import { retryChunkLoad } from "@/utils/error-recovery";

// 🚀 ОПТИМИЗАЦИЯ: Синхронные импорты только для критичных страниц
import Login from "./pages/Login";
import UpdatePassword from "./pages/UpdatePassword";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import { Loader2 } from "lucide-react";

// 🚀 ОПТИМИЗАЦИЯ + 🛡️ ЗАЩИТА: Lazy loading с автоматическим retry при ChunkLoadError
const Profile = lazy(() => retryChunkLoad(() => import("./pages/Profile")));
const NeuroHub = lazy(() => retryChunkLoad(() => import("./pages/NeuroHub")));
const Achievements = lazy(() => retryChunkLoad(() => import("./pages/Achievements")));
const Welcome = lazy(() => retryChunkLoad(() => import("./pages/Welcome")));
const Courses = lazy(() => retryChunkLoad(() => import("./pages/Courses")));
const Course = lazy(() => retryChunkLoad(() => import("./pages/Course")));
const Module = lazy(() => retryChunkLoad(() => import("./pages/Module")));
const Lesson = lazy(() => retryChunkLoad(() => import("./pages/Lesson")));
const Activity = lazy(() => retryChunkLoad(() => import("./pages/admin/Activity")));
const AICuratorChats = lazy(() => retryChunkLoad(() => import("./pages/admin/AICuratorChats")));
const TokenUsage = lazy(() => retryChunkLoad(() => import("./pages/admin/TokenUsage")));
const AdminDashboard = lazy(() => retryChunkLoad(() => import("./pages/admin/AdminDashboard")));
const SystemHealth = lazy(() => retryChunkLoad(() => import("./pages/admin/SystemHealth")));
const DebugPanel = lazy(() => retryChunkLoad(() => import("./pages/admin/DebugPanel"))); // 🚔 Debug Panel
const StudentsActivity = lazy(() => retryChunkLoad(() => import("./pages/admin/StudentsActivity")));
const AIAnalytics = lazy(() => retryChunkLoad(() => import("./pages/admin/AIAnalytics")));
const TripwireManager = lazy(() => retryChunkLoad(() => import("./pages/admin/TripwireManager")));
const Messages = lazy(() => retryChunkLoad(() => import("./pages/Messages")));
const Analytics = lazy(() => retryChunkLoad(() => import("./pages/admin/Analytics")));
const Students = lazy(() => retryChunkLoad(() => import("./pages/admin/Students")));
const Costs = lazy(() => retryChunkLoad(() => import("./pages/admin/Costs")));
const Transcriptions = lazy(() => retryChunkLoad(() => import("./pages/admin/TripwireTranscriptions")));
const MainPlatformTranscriptions = lazy(() => retryChunkLoad(() => import("./pages/admin/MainPlatformTranscriptions")));
const LeadTracking = lazy(() => retryChunkLoad(() => import("./pages/admin/LeadTracking")));
const UnifiedDashboard = lazy(() => retryChunkLoad(() => import("./pages/admin/UnifiedDashboard")));
const ShortLinksStats = lazy(() => retryChunkLoad(() => import("./pages/admin/ShortLinksStats")));
const ShortLinkRedirect = lazy(() => retryChunkLoad(() => import("./pages/ShortLinkRedirect")));

// 🚀 ОПТИМИЗАЦИЯ + 🛡️ ЗАЩИТА: Lazy loading Integrator страниц с retry
const TripwireProductPage = lazy(() => retryChunkLoad(() => import("./pages/tripwire/TripwireProductPage")));
const TripwireLogin = lazy(() => retryChunkLoad(() => import("./pages/tripwire/TripwireLogin")));
const TripwireLanding = lazy(() => retryChunkLoad(() => import("./pages/tripwire/TripwireLanding")));
const TripwireLesson = lazy(() => retryChunkLoad(() => import("./pages/tripwire/TripwireLesson")));
const TripwireProfile = lazy(() => retryChunkLoad(() => import("./pages/tripwire/TripwireProfile")));
const ClearCache = lazy(() => retryChunkLoad(() => import("./pages/ClearCache")));
const ProfTest = lazy(() => retryChunkLoad(() => import("./pages/tripwire/ProfTest")));
const TrafficCommandDashboard = lazy(() => retryChunkLoad(() => import("./pages/tripwire/TrafficCommandDashboard")));
const MassBroadcast = lazy(() => retryChunkLoad(() => import("./pages/tripwire/admin/MassBroadcast")));
import TripwireCertificatePage from "./pages/tripwire/TripwireCertificatePage";
import { TripwireLayout } from "./components/tripwire/TripwireLayout";

// 🚀 Traffic Dashboard (new personal cabinets system)
const TrafficLogin = lazy(() => retryChunkLoad(() => import("./pages/traffic/TrafficLogin")));
const OnboardingTestPage = lazy(() => retryChunkLoad(() => import("./pages/traffic/OnboardingTestPage")));
const TrafficResetPassword = lazy(() => retryChunkLoad(() => import("./pages/traffic/TrafficResetPassword")));
const TrafficCabinetDashboard = lazy(() => retryChunkLoad(() => import("./pages/traffic/TrafficCabinetDashboard")));
const TrafficTargetologistDashboard = lazy(() => retryChunkLoad(() => import("./pages/traffic/TrafficTargetologistDashboard")));
const TrafficAdminPanel = lazy(() => retryChunkLoad(() => import("./pages/traffic/TrafficAdminPanel")));
const TrafficSecurityPanel = lazy(() => retryChunkLoad(() => import("./pages/traffic/TrafficSecurityPanel")));
const TrafficTeamConstructor = lazy(() => retryChunkLoad(() => import("./pages/traffic/TrafficTeamConstructor")));
const UTMSourcesPanel = lazy(() => retryChunkLoad(() => import("./pages/traffic/UTMSourcesPanel")));
const TrafficDetailedAnalytics = lazy(() => retryChunkLoad(() => import("./pages/traffic/TrafficDetailedAnalytics")));
const TrafficSettings = lazy(() => retryChunkLoad(() => import("./pages/traffic/TrafficSettings")));
const TrafficAPIIntegrations = lazy(() => retryChunkLoad(() => import("./pages/traffic/TrafficAPIIntegrations")));
const ReferralGeneratorPage = lazy(() => retryChunkLoad(() => import("./pages/referral/ReferralGeneratorPage"))); // 🎯 Referral System
// Integrator Admin pages
import TripwireAdminDashboard from "./pages/tripwire/admin/Dashboard";
import TripwireAnalytics from "./pages/tripwire/admin/Analytics";
import TripwireStudents from "./pages/tripwire/admin/Students";
import TripwireCosts from "./pages/tripwire/admin/Costs";
import LeadsAdmin from "./pages/tripwire/admin/LeadsAdmin";
import DebugDashboard from "./pages/admin/DebugDashboard";

// 🛡️ Initialize Sentry FIRST - до создания компонентов
initSentry();

// 🚀 ОПТИМИЗАЦИЯ: Enhanced QueryClient config с retry и stale time
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
      gcTime: 10 * 60 * 1000, // 10 минут - время хранения в кэше (было cacheTime)
      retry: 3, // 3 попытки при ошибке
      retryDelay: (attemptIndex) =>
        Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s, 4s, макс 30s
      refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна (было 'stale')
      refetchOnReconnect: 'always', // Перезапросить при reconnect
      refetchOnMount: false, // Не перезапрашивать при каждом mount если есть в кэше
      networkMode: 'online', // Запросы только online
    },
    mutations: {
      retry: 2, // 2 попытки для мутаций
      retryDelay: 1000, // 1 секунда между попытками
      networkMode: 'online',
    },
  },
});

// 🚀 ОПТИМИЗАЦИЯ: Красивый Loader для Suspense
const SuspenseLoader = () => (
  <div className="flex items-center justify-center h-screen bg-[#030303]">
    <div className="text-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-[#00FF88] mx-auto" />
      <p className="text-white font-['JetBrains_Mono'] text-xl tracking-wider uppercase">
        /// ЗАГРУЗКА МОДУЛЯ...
      </p>
    </div>
  </div>
);

// Legacy Tripwire redirect helper
const LegacyTripwireRedirect = ({ legacyBase, forcedPath }: { legacyBase: string; forcedPath?: string }) => {
  const location = useLocation();
  const strippedPath = location.pathname.replace(legacyBase, '') || '/';
  const targetPath = forcedPath || strippedPath;
  const targetWithSearch = `${targetPath}${location.search || ''}`;
  const isTripwireDomain = window.location.hostname === 'expresscourse.onai.academy';

  useEffect(() => {
    if (isTripwireDomain) {
      return;
    }
    window.location.replace(`https://expresscourse.onai.academy${targetWithSearch}`);
  }, [isTripwireDomain, targetWithSearch]);

  return isTripwireDomain ? <Navigate replace to={targetWithSearch} /> : null;
};

const AppRoutes = () => {
  const location = useLocation();
  const isWelcomePage = location.pathname === '/welcome';
  // ✅ Domain detection for Traffic Dashboard
  const isTrafficDomain = window.location.hostname === 'traffic.onai.academy';
  // ✅ Domain detection for Referral System
  const isReferralDomain = window.location.hostname === 'referral.onai.academy';
  // ✅ Domain detection for Tripwire product
  const isTripwireDomain = window.location.hostname === 'expresscourse.onai.academy';
  const showMainRoutes = !isTrafficDomain && !isReferralDomain && !isTripwireDomain;

  return (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes>
        {/* Публичные страницы (без авторизации) */}
        {/* ✅ MAIN PLATFORM LOGIN (only on main domains) */}
        {showMainRoutes && <Route path="/login" element={<Login />} />}
        {showMainRoutes && <Route path="/" element={<Navigate to="/login" replace />} />}

        {/* ✅ TRIPWIRE DOMAIN: use Tripwire login at root */}
        {isTripwireDomain && <Route path="/login" element={<TripwireLogin />} />}

        {/* 🎯 REFERRAL DOMAIN: Show referral page at root */}
        {isReferralDomain && <Route path="/" element={<ReferralGeneratorPage />} />}
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* 🔗 Short link redirect */}
        <Route path="/l/:shortCode" element={<ShortLinkRedirect />} />

        {/* 🎯 REFERRAL SYSTEM (Public - no auth required) */}
        {!isReferralDomain && <Route path="/referral" element={<ReferralGeneratorPage />} />}

        {showMainRoutes && (
          <>
            {/* Welcome - требует авторизацию, но доступна для новых пользователей */}
            <Route path="/welcome" element={
              <ProtectedRoute>
                <Welcome />
              </ProtectedRoute>
            } />

            {/* Защищённые страницы (требуют авторизацию) */}
            <Route path="/profile" element={
              <ProtectedRoute>
                {isWelcomePage ? <Profile /> : <MainLayout><Profile /></MainLayout>}
              </ProtectedRoute>
            } />
            <Route path="/neurohub" element={
              <ProtectedRoute>
                <MainLayout><NeuroHub /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/achievements" element={
              <ProtectedRoute>
                <MainLayout><Achievements /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/courses" element={
              <ProtectedRoute>
                <MainLayout><Courses /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/course/:id" element={
              <ProtectedRoute>
                <MainLayout><Course /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/course/:id/module/:moduleId" element={
              <ProtectedRoute>
                <MainLayout><Module /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/course/:id/module/:moduleId/lesson/:lessonId" element={
              <ProtectedRoute>
                <MainLayout><Lesson /></MainLayout>
              </ProtectedRoute>
            } />

            {/* ✅ ADMIN ROUTES WITH SIDEBAR */}
            <Route path="/admin" element={<AdminGuard><MainLayout><AdminDashboard /></MainLayout></AdminGuard>} />
            <Route path="/admin/dashboard" element={<AdminGuard><MainLayout><AdminDashboard /></MainLayout></AdminGuard>} />
            <Route path="/admin/analytics" element={<AdminGuard><Analytics /></AdminGuard>} />
            <Route path="/admin/students" element={<AdminGuard><Students /></AdminGuard>} />
            <Route path="/admin/transcriptions" element={<AdminGuard><MainPlatformTranscriptions /></AdminGuard>} />
            <Route path="/admin/costs" element={<AdminGuard><Costs /></AdminGuard>} />
            {/* ❌ УБРАНО: /target moved to /admin/leads */}
            <Route path="/admin/leads" element={<AdminGuard><LeadTracking /></AdminGuard>} />
            <Route path="/admin/short-links" element={<AdminGuard><ShortLinksStats /></AdminGuard>} />
            {/* ✅ NEW: Tripwire Sales Global - referenced in AdminDashboard card #6 */}
            <Route path="/admin/tripwire-sales-global" element={<AdminGuard><MainLayout><TripwireManager /></MainLayout></AdminGuard>} />

            {/* ❌ OLD ADMIN ROUTES (Keeping for backwards compatibility) */}
            <Route path="/admin/old" element={
              <ProtectedRoute>
                <OldAdminGuard><MainLayout><AdminDashboard /></MainLayout></OldAdminGuard>
              </ProtectedRoute>
            } />
            <Route path="/admin/activity" element={
              <ProtectedRoute>
                <OldAdminGuard><MainLayout><Activity /></MainLayout></OldAdminGuard>
              </ProtectedRoute>
            } />
            <Route path="/admin/students-activity" element={
              <ProtectedRoute>
                <OldAdminGuard><MainLayout><StudentsActivity /></MainLayout></OldAdminGuard>
              </ProtectedRoute>
            } />
            <Route path="/admin/ai-analytics" element={
              <ProtectedRoute>
                <OldAdminGuard><MainLayout><AIAnalytics /></MainLayout></OldAdminGuard>
              </ProtectedRoute>
            } />
            <Route path="/admin/ai-curator-chats" element={
              <ProtectedRoute>
                <OldAdminGuard><MainLayout><AICuratorChats /></MainLayout></OldAdminGuard>
              </ProtectedRoute>
            } />
            <Route path="/admin/token-usage" element={
              <ProtectedRoute>
                <OldAdminGuard><MainLayout><TokenUsage /></MainLayout></OldAdminGuard>
              </ProtectedRoute>
            } />

            {/* Чат (требует авторизацию) */}
            <Route path="/messages" element={
              <ProtectedRoute>
                <MainLayout><Messages /></MainLayout>
              </ProtectedRoute>
            } />
          </>
        )}

        {/* ========================================
          TRIPWIRE ROUTES (expresscourse.onai.academy)
          ======================================== */}

        {/* Public: Clear Cache page */}
        <Route path="/clear-cache" element={<ClearCache />} />

        {isTripwireDomain && (
          <>
            {/* Public: Landing page (no auth required) */}
            <Route path="/expresscourse" element={<TripwireLanding />} />
            <Route path="/expresscourse/:campaignSlug" element={<TripwireLanding />} />
            {/* Public: Certificate page (no auth required for sharing) */}
            <Route path="/certificate/:certificateNumber" element={<TripwireCertificatePage />} />

            {/* Public: Professional Test pages (no auth required) */}
            <Route path="/proftest" element={<ProfTest />} />
            <Route path="/proftest/:slug" element={<ProfTest />} />

            {/* Public: Traffic Command Dashboard (no auth required) */}
            <Route path="/traficcommand" element={<TrafficCommandDashboard />} />

            {/* Sales Manager Dashboard (ЗАЩИЩЕНО: admin и sales роли) */}
            <Route path="/sales-manager" element={
              <SalesGuard><TripwireManager /></SalesGuard>
            } />

            {/* STUDENT ROUTES: Tripwire student routes */}
            <Route path="/" element={
              <StudentGuard>
                <TripwireLayout>
                  <TripwireProductPage />
                </TripwireLayout>
              </StudentGuard>
            } />
            <Route path="/lesson/:lessonId" element={
              <StudentGuard>
                <TripwireLayout>
                  <TripwireLesson />
                </TripwireLayout>
              </StudentGuard>
            } />
            <Route path="/profile" element={
              <StudentGuard>
                <TripwireLayout>
                  <TripwireProfile />
                </TripwireLayout>
              </StudentGuard>
            } />

            {/* ADMIN ROUTES: Tripwire admin routes */}
            <Route path="/admin" element={
              <TripwireAdminGuard>
                <TripwireLayout>
                  <TripwireAdminDashboard />
                </TripwireLayout>
              </TripwireAdminGuard>
            } />
            <Route path="/admin/analytics" element={
              <TripwireAdminGuard>
                <TripwireLayout>
                  <TripwireAnalytics />
                </TripwireLayout>
              </TripwireAdminGuard>
            } />
            <Route path="/admin/students" element={
              <TripwireAdminGuard>
                <TripwireLayout>
                  <TripwireStudents />
                </TripwireLayout>
              </TripwireAdminGuard>
            } />
            <Route path="/admin/costs" element={
              <TripwireAdminGuard>
                <TripwireLayout>
                  <TripwireCosts />
                </TripwireLayout>
              </TripwireAdminGuard>
            } />
            <Route path="/admin/transcriptions" element={
              <TripwireAdminGuard>
                <TripwireLayout>
                  <Transcriptions />
                </TripwireLayout>
              </TripwireAdminGuard>
            } />

            {/* ✅ NEW: Landing заявки */}
            <Route path="/admin/leads" element={
              <TripwireAdminGuard>
                <TripwireLayout>
                  <LeadsAdmin />
                </TripwireLayout>
              </TripwireAdminGuard>
            } />

            {/* 🔗 NEW: Статистика коротких ссылок для SMS */}
            <Route path="/admin/short-links" element={
              <TripwireAdminGuard>
                <TripwireLayout>
                  <ShortLinksStats />
                </TripwireLayout>
              </TripwireAdminGuard>
            } />

            {/* 📧📱 NEW: Массовые рассылки (EMAIL + SMS) */}
            <Route path="/admin/mass-broadcast" element={
              <TripwireAdminGuard>
                <TripwireLayout>
                  <MassBroadcast />
                </TripwireLayout>
              </TripwireAdminGuard>
            } />

            {/* 🚔 DEBUG PANEL: System Health & Operation Logging */}
            <Route path="/admin/system-health" element={
              <SalesGuard>
                <SystemHealth />
              </SalesGuard>
            } />

            <Route path="/admin/debug" element={
              <SalesGuard>
                <DebugPanel />
              </SalesGuard>
            } />

            {/* ❌ Access Denied for Tripwire */}
            <Route path="/access-denied" element={<AccessDenied />} />
          </>
        )}

        {/* 🚀 TRAFFIC DASHBOARD - Personal Cabinets System */}
        {/* ✅ PRODUCTION: subdomain traffic.onai.academy (routes WITHOUT prefix) */}
        {/* ✅ TRAFFIC LOGIN (only on traffic.onai.academy) */}
        {isTrafficDomain && <Route path="/login" element={<TrafficLogin />} />}
        {isTrafficDomain && <Route path="/reset-password" element={<TrafficResetPassword />} />}
        {isTrafficDomain && <Route path="/" element={<Navigate to="/login" replace />} />}

        {/* ✅ DEVELOPMENT: /traffic prefix routes for localhost testing */}
        <Route path="/traffic/login" element={<TrafficLogin />} />
        <Route path="/traffic/reset-password" element={<TrafficResetPassword />} />

        {/* 🧪 TESTING: Onboarding Test Page (локальное тестирование) */}
        <Route path="/traffic/onboarding-test" element={<OnboardingTestPage />} />
        <Route path="/onboarding-test" element={<OnboardingTestPage />} />

        <Route path="/traffic/cabinet/:team" element={
          <TrafficGuard>
            <TrafficTargetologistDashboard />
          </TrafficGuard>
        } />
        <Route path="/traffic/detailed-analytics" element={
          <TrafficGuard>
            <TrafficDetailedAnalytics />
          </TrafficGuard>
        } />
        <Route path="/traffic/settings" element={
          <TrafficGuard>
            <TrafficSettings />
          </TrafficGuard>
        } />
        <Route path="/traffic/admin" element={
          <TrafficGuard requireAdmin={true}>
            <Navigate to="/traffic/admin/dashboard" replace />
          </TrafficGuard>
        } />
        <Route path="/traffic/admin/dashboard" element={
          <TrafficGuard requireAdmin={true}>
            <TrafficAdminPanel />
          </TrafficGuard>
        } />
        <Route path="/traffic/admin/api-integrations" element={
          <TrafficGuard requireAdmin={true}>
            <TrafficAPIIntegrations />
          </TrafficGuard>
        } />
        <Route path="/traffic/admin/settings" element={
          <TrafficGuard requireAdmin={true}>
            <TrafficAdminPanel />
          </TrafficGuard>
        } />
        <Route path="/traffic/admin/users" element={
          <TrafficGuard requireAdmin={true}>
            <TrafficAdminPanel />
          </TrafficGuard>
        } />
        <Route path="/traffic/admin/security" element={
          <TrafficGuard requireAdmin={true}>
            <TrafficSecurityPanel />
          </TrafficGuard>
        } />
        <Route path="/traffic/admin/utm-sources" element={
          <TrafficGuard requireAdmin={true}>
            <UTMSourcesPanel />
          </TrafficGuard>
        } />
        <Route path="/traffic/admin/team-constructor" element={
          <TrafficGuard requireAdmin={true}>
            <TrafficTeamConstructor />
          </TrafficGuard>
        } />

        {/* ✅ TRAFFIC DOMAIN ONLY: These routes should ONLY render on traffic.onai.academy */}
        {/* 🔥 FIX: Previously these were outside domain conditional, causing /admin to redirect to /traffic/login on main platform */}
        {isTrafficDomain && (
          <>
            {/* Personal Cabinet for each targetologist - Simplified NO SIDEBAR */}
            <Route path="/cabinet/:team" element={
              <TrafficGuard>
                <TrafficTargetologistDashboard />
              </TrafficGuard>
            } />

            {/* Detailed Analytics - Campaigns/AdSets/Ads */}
            <Route path="/detailed-analytics" element={
              <TrafficGuard>
                <TrafficDetailedAnalytics />
              </TrafficGuard>
            } />

            {/* Settings - Targetologist settings */}
            <Route path="/settings" element={
              <TrafficGuard>
                <TrafficSettings />
              </TrafficGuard>
            } />

            {/* Admin Panel for Traffic Dashboard */}
            <Route path="/admin" element={
              <TrafficGuard requireAdmin={true}>
                <Navigate to="/admin/dashboard" replace />
              </TrafficGuard>
            } />
            <Route path="/admin/dashboard" element={
              <TrafficGuard requireAdmin={true}>
                <TrafficAdminPanel />
              </TrafficGuard>
            } />
            <Route path="/admin/settings" element={
              <TrafficGuard requireAdmin={true}>
                <TrafficAdminPanel />
              </TrafficGuard>
            } />
            <Route path="/admin/users" element={
              <TrafficGuard requireAdmin={true}>
                <TrafficAdminPanel />
              </TrafficGuard>
            } />
            <Route path="/admin/security" element={
              <TrafficGuard requireAdmin={true}>
                <TrafficSecurityPanel />
              </TrafficGuard>
            } />
            <Route path="/admin/utm-sources" element={
              <TrafficGuard requireAdmin={true}>
                <UTMSourcesPanel />
              </TrafficGuard>
            } />
            <Route path="/admin/team-constructor" element={
              <TrafficGuard requireAdmin={true}>
                <TrafficTeamConstructor />
              </TrafficGuard>
            } />

            {/* 🛡️ DEBUG: System monitoring dashboard */}
            <Route path="/debug/report" element={<DebugDashboard />} />
            <Route path="/admin/debug/report" element={<DebugDashboard />} />
          </>
        )}

        {/* Legacy Tripwire paths → expresscourse.onai.academy */}
        <Route path="//*" element={<LegacyTripwireRedirect legacyBase="/" />} />
        <Route path="/tripwire/*" element={<LegacyTripwireRedirect legacyBase="/tripwire" />} />
        <Route path="/admin/tripwire-manager" element={<LegacyTripwireRedirect legacyBase="/admin/tripwire-manager" forcedPath="/sales-manager" />} />

        {/* 🔥 БЕЗОПАСНОСТЬ: /test-query УДАЛЁН - не должен быть доступен в production */}
        {/* <Route path="/test-query" element={<TestQuery />} /> */}

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

// 🔥 ИСПРАВЛЕНИЕ: AppContent с тремя состояниями (Loading → Login → Dashboard)
const AppContent = () => {
  const isTripwireDomain = window.location.hostname === 'expresscourse.onai.academy';
  if (isTripwireDomain) {
    return <AppRoutes />;
  }

  const { isInitialized, isLoading } = useAuth();

  // СОСТОЯНИЕ 1: LOADING - НЕ РЕНДЕРИМ НИЧЕГО пока AuthContext не инициализирован!
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-green-400 mx-auto mb-4" />
          <p className="text-xl text-white">Загрузка приложения...</p>
          <p className="text-sm text-gray-400 mt-2">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  // СОСТОЯНИЕ 2 и 3: Рендерим роуты (роутер сам решает показывать Login или Dashboard)
  // Роутер использует защиту через редиректы в защищённых страницах
  return (
    <>
      <AppRoutes />
    </>
  );
};

// 🛡️ Wrap App with Sentry ErrorBoundary для отлова всех ошибок
const App = () => {
  const isTripwireDomain = window.location.hostname === 'expresscourse.onai.academy';

  const appTree = (
    <OnboardingProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </OnboardingProvider>
  );

  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
          <div className="max-w-md w-full bg-gray-800/50 backdrop-blur border border-red-500/20 rounded-lg p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Произошла ошибка</h2>
                <p className="text-sm text-gray-400">Мы уже получили уведомление</p>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
              <p className="text-sm text-red-300 font-mono">{error?.message}</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={resetError}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"
              >
                Попробовать снова
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
              >
                На главную
              </button>
            </div>
          </div>
        </div>
      )}
      showDialog={false}
    >
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AmoCRMSyncStatus />
            {isTripwireDomain ? appTree : <AuthProvider>{appTree}</AuthProvider>}
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </Sentry.ErrorBoundary>
  );
};

export default App;
