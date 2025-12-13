import { lazy, Suspense } from "react"; // 🚀 ОПТИМИЗАЦИЯ: Lazy loading
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "./components/layouts/MainLayout";
import { AdminGuard as OldAdminGuard } from "./components/AdminGuard";
import { AdminGuard } from "./components/guards/AdminGuard"; // ✅ Admin Guard (основная платформа)
import { SalesGuard } from "./components/SalesGuard"; // ✅ Guard для admin & sales (Tripwire)
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
// Tripwire Guards
import { TripwireGuard } from "./components/tripwire/TripwireGuard";
import { StudentGuard } from "./components/tripwire/StudentGuard"; // ✅ Student Guard (Tripwire)
import { AdminGuard as TripwireAdminGuard } from "./components/tripwire/AdminGuard"; // ✅ Admin Guard (Tripwire)

// 🚀 ОПТИМИЗАЦИЯ: Синхронные импорты только для критичных страниц
import Login from "./pages/Login";
import UpdatePassword from "./pages/UpdatePassword";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import { Loader2 } from "lucide-react";

// 🚀 ОПТИМИЗАЦИЯ: Lazy loading страниц (уменьшает начальный бандл)
const Profile = lazy(() => import("./pages/Profile"));
const NeuroHub = lazy(() => import("./pages/NeuroHub"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Welcome = lazy(() => import("./pages/Welcome"));
const Courses = lazy(() => import("./pages/Courses"));
const Course = lazy(() => import("./pages/Course"));
const Module = lazy(() => import("./pages/Module"));
const Lesson = lazy(() => import("./pages/Lesson"));
const Activity = lazy(() => import("./pages/admin/Activity"));
const AICuratorChats = lazy(() => import("./pages/admin/AICuratorChats"));
const TokenUsage = lazy(() => import("./pages/admin/TokenUsage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const StudentsActivity = lazy(() => import("./pages/admin/StudentsActivity"));
const AIAnalytics = lazy(() => import("./pages/admin/AIAnalytics"));
const TripwireManager = lazy(() => import("./pages/admin/TripwireManager"));
const Messages = lazy(() => import("./pages/Messages"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Students = lazy(() => import("./pages/admin/Students"));
const Costs = lazy(() => import("./pages/admin/Costs"));
const Transcriptions = lazy(() => import("./pages/admin/TripwireTranscriptions"));
const MainPlatformTranscriptions = lazy(() => import("./pages/admin/MainPlatformTranscriptions"));

// 🚀 ОПТИМИЗАЦИЯ: Lazy loading Tripwire страниц
const TripwireProductPage = lazy(() => import("./pages/tripwire/TripwireProductPage"));
const TripwireLogin = lazy(() => import("./pages/tripwire/TripwireLogin"));
const TripwireLanding = lazy(() => import("./pages/tripwire/TripwireLanding"));
const TripwireLesson = lazy(() => import("./pages/tripwire/TripwireLesson"));
const TripwireProfile = lazy(() => import("./pages/tripwire/TripwireProfile"));
const ProfTest = lazy(() => import("./pages/tripwire/ProfTest"));
import TripwireCertificatePage from "./pages/tripwire/TripwireCertificatePage";
import TripwireUpdatePassword from "./pages/tripwire/TripwireUpdatePassword"; // 🔑 Password Reset
import { TripwireLayout } from "./components/tripwire/TripwireLayout";
// Tripwire Admin pages
import TripwireAdminDashboard from "./pages/tripwire/admin/Dashboard";
import TripwireAnalytics from "./pages/tripwire/admin/Analytics";
import TripwireStudents from "./pages/tripwire/admin/Students";
import TripwireCosts from "./pages/tripwire/admin/Costs";

const queryClient = new QueryClient();

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

// Helper component for redirecting with params
const RedirectWithParams = ({ from, to }: { from: string; to: string }) => {
  const location = useLocation();
  const newPath = location.pathname.replace(from, to);
  return <Navigate replace to={newPath + location.search} />;
};

const AppRoutes = () => {
  const location = useLocation();
  const isWelcomePage = location.pathname === '/welcome';

  return (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes>
      {/* Публичные страницы (без авторизации) */}
      <Route path="/login" element={<Login />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/access-denied" element={<AccessDenied />} />
      
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
      
      {/* Sales Manager Dashboard для Tripwire (ЗАЩИЩЕНО: admin и sales роли) */}
      <Route path="/admin/tripwire-manager" element={
        <SalesGuard><TripwireManager /></SalesGuard>
      } />
      
      {/* Чат (требует авторизацию) */}
      <Route path="/messages" element={
        <ProtectedRoute>
          <MainLayout><Messages /></MainLayout>
        </ProtectedRoute>
      } />
      
      {/* ========================================
          INTEGRATOR ROUTES (NEW)
          ======================================== */}
      
      {/* Public: Login page */}
      <Route path="/integrator/login" element={<TripwireLogin />} />
      
      {/* Public: Landing page (no auth required) - для сбора заявок */}
      <Route path="/expresscourse" element={<TripwireLanding />} />
      <Route path="/integrator/expresscourse" element={<TripwireLanding />} />
      
      {/* Public: Password Reset (no auth required) */}
      <Route path="/integrator/update-password" element={<TripwireUpdatePassword />} />
      
      {/* Public: Certificate page (no auth required for sharing) */}
      <Route path="/integrator/certificate/:certificateNumber" element={<TripwireCertificatePage />} />
      
      {/* Public: Professional Test pages (no auth required) */}
      <Route path="/integrator/proftest" element={<ProfTest />} />
      <Route path="/integrator/proftest/:slug" element={<ProfTest />} />
      
      {/* STUDENT ROUTES: Integrator студенческие маршруты (student, admin, sales могут заходить) */}
      <Route path="/integrator" element={
        <StudentGuard>
          <TripwireLayout>
            <TripwireProductPage />
          </TripwireLayout>
        </StudentGuard>
      } />
      {/* ✅ Единственный роут для Integrator уроков */}
      <Route path="/integrator/lesson/:lessonId" element={
        <StudentGuard>
          <TripwireLayout>
            <TripwireLesson />
          </TripwireLayout>
        </StudentGuard>
      } />
      <Route path="/integrator/profile" element={
        <StudentGuard>
          <TripwireLayout>
            <TripwireProfile />
          </TripwireLayout>
        </StudentGuard>
      } />
      
      {/* ADMIN ROUTES: Integrator админские маршруты - ТОЛЬКО для admin роли */}
      <Route path="/integrator/admin" element={
        <TripwireAdminGuard>
          <TripwireLayout>
            <TripwireAdminDashboard />
          </TripwireLayout>
        </TripwireAdminGuard>
      } />
      <Route path="/integrator/admin/analytics" element={
        <TripwireAdminGuard>
          <TripwireLayout>
            <TripwireAnalytics />
          </TripwireLayout>
        </TripwireAdminGuard>
      } />
      <Route path="/integrator/admin/students" element={
        <TripwireAdminGuard>
          <TripwireLayout>
            <TripwireStudents />
          </TripwireLayout>
        </TripwireAdminGuard>
      } />
      <Route path="/integrator/admin/costs" element={
        <TripwireAdminGuard>
          <TripwireLayout>
            <TripwireCosts />
          </TripwireLayout>
        </TripwireAdminGuard>
      } />
      <Route path="/integrator/admin/transcriptions" element={
        <TripwireAdminGuard>
          <TripwireLayout>
            <Transcriptions />
          </TripwireLayout>
        </TripwireAdminGuard>
      } />
      
      {/* ========================================
          LEGACY TRIPWIRE REDIRECTS
          DO NOT DELETE - Required for old links
          ======================================== */}
      
      {/* Public routes - redirect to /integrator */}
      <Route path="/tripwire/login" element={<Navigate replace to="/integrator/login" />} />
      <Route path="/tripwire/update-password" element={<Navigate replace to="/integrator/update-password" />} />
      <Route path="/tripwire/certificate/:certificateNumber" element={<RedirectWithParams from="/tripwire" to="/integrator" />} />
      
      {/* Student routes - redirect to /integrator */}
      <Route path="/tripwire" element={<Navigate replace to="/integrator" />} />
      <Route path="/tripwire/lesson/:lessonId" element={<RedirectWithParams from="/tripwire" to="/integrator" />} />
      <Route path="/tripwire/profile" element={<Navigate replace to="/integrator/profile" />} />
      
      {/* Admin routes - redirect to /integrator/admin */}
      <Route path="/tripwire/admin" element={<Navigate replace to="/integrator/admin" />} />
      <Route path="/tripwire/admin/analytics" element={<Navigate replace to="/integrator/admin/analytics" />} />
      <Route path="/tripwire/admin/students" element={<Navigate replace to="/integrator/admin/students" />} />
      <Route path="/tripwire/admin/costs" element={<Navigate replace to="/integrator/admin/costs" />} />
      <Route path="/tripwire/admin/transcriptions" element={<Navigate replace to="/integrator/admin/transcriptions" />} />
      
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

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
