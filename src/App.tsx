import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "./components/layouts/MainLayout";
import { AdminGuard as OldAdminGuard } from "./components/AdminGuard";
import { AdminGuard } from "./components/guards/AdminGuard"; // ✅ Admin Guard
import { SalesGuard } from "./components/SalesGuard"; // ✅ Guard для admin & sales
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Login from "./pages/Login";
import AccessDenied from "./pages/AccessDenied";
import Profile from "./pages/Profile";
import NeuroHub from "./pages/NeuroHub";
import Achievements from "./pages/Achievements";
import Welcome from "./pages/Welcome";
import Courses from "./pages/Courses";
import Course from "./pages/Course";
import Module from "./pages/Module";
import Lesson from "./pages/Lesson";
import NotFound from "./pages/NotFound";
import Activity from "./pages/admin/Activity";
import AICuratorChats from "./pages/admin/AICuratorChats";
import TokenUsage from "./pages/admin/TokenUsage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentsActivity from "./pages/admin/StudentsActivity";
import AIAnalytics from "./pages/admin/AIAnalytics";
import TripwireManager from "./pages/admin/TripwireManager"; // ✅ Sales Manager Dashboard
import Messages from "./pages/Messages";
// ✅ New Card-based Admin Routes (NO Layout!)
import Analytics from "./pages/admin/Analytics";
import Students from "./pages/admin/Students";
import Costs from "./pages/admin/Costs";
import Transcriptions from "./pages/admin/Transcriptions";
import MainPlatformTranscriptions from "./pages/admin/MainPlatformTranscriptions"; // ✅ Основная платформа
// 🔥 БЕЗОПАСНОСТЬ: TestQuery удалён - не должен быть доступен в production
// import TestQuery from "./pages/TestQuery";
import { Loader2 } from "lucide-react";
// Tripwire pages
import TripwireProductPage from "./pages/tripwire/TripwireProductPage";
import TripwireLogin from "./pages/tripwire/TripwireLogin";
import TripwireLesson from "./pages/tripwire/TripwireLesson";
import TripwireProfile from "./pages/tripwire/TripwireProfile";
import { TripwireLayout } from "./components/tripwire/TripwireLayout";
import { TripwireGuard } from "./components/tripwire/TripwireGuard";
// Tripwire Admin pages
import TripwireAdminDashboard from "./pages/tripwire/admin/Dashboard";
import TripwireAnalytics from "./pages/tripwire/admin/Analytics";
import TripwireStudents from "./pages/tripwire/admin/Students";
import TripwireCosts from "./pages/tripwire/admin/Costs";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const isWelcomePage = location.pathname === '/welcome';

  return (
    <Routes>
      {/* Публичные страницы (без авторизации) */}
      <Route path="/login" element={<Login />} />
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
      
      {/* Tripwire (Trial Version - Now Requires Real Authentication) */}
      {/* Public: Login page */}
      <Route path="/tripwire/login" element={<TripwireLogin />} />
      
      {/* Protected: All other Tripwire routes require authentication */}
      <Route path="/tripwire" element={
        <TripwireGuard>
          <TripwireLayout>
            <TripwireProductPage />
          </TripwireLayout>
        </TripwireGuard>
      } />
      <Route path="/tripwire/module/:moduleId/lesson/:lessonId" element={
        <TripwireGuard>
          <TripwireLayout>
            <TripwireLesson />
          </TripwireLayout>
        </TripwireGuard>
      } />
      <Route path="/tripwire/profile" element={
        <TripwireGuard>
          <TripwireLayout>
            <TripwireProfile />
          </TripwireLayout>
        </TripwireGuard>
      } />
      
      {/* Tripwire Admin Routes - ТОЛЬКО для saint@onaiacademy.kz */}
      <Route path="/tripwire/admin" element={
        <TripwireGuard>
          <AdminGuard>
            <TripwireLayout>
              <TripwireAdminDashboard />
            </TripwireLayout>
          </AdminGuard>
        </TripwireGuard>
      } />
      <Route path="/tripwire/admin/analytics" element={
        <TripwireGuard>
          <AdminGuard>
            <TripwireLayout>
              <TripwireAnalytics />
            </TripwireLayout>
          </AdminGuard>
        </TripwireGuard>
      } />
      <Route path="/tripwire/admin/students" element={
        <TripwireGuard>
          <AdminGuard>
            <TripwireLayout>
              <TripwireStudents />
            </TripwireLayout>
          </AdminGuard>
        </TripwireGuard>
      } />
      <Route path="/tripwire/admin/costs" element={
        <TripwireGuard>
          <AdminGuard>
            <TripwireLayout>
              <TripwireCosts />
            </TripwireLayout>
          </AdminGuard>
        </TripwireGuard>
      } />
      <Route path="/tripwire/admin/transcriptions" element={
        <TripwireGuard>
          <AdminGuard>
            <TripwireLayout>
              <Transcriptions />
            </TripwireLayout>
          </AdminGuard>
        </TripwireGuard>
      } />
      
      {/* 🔥 БЕЗОПАСНОСТЬ: /test-query УДАЛЁН - не должен быть доступен в production */}
      {/* <Route path="/test-query" element={<TestQuery />} /> */}
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
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
