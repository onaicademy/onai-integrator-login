import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "./components/layouts/MainLayout";
import { AdminGuard } from "./components/AdminGuard";
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
import Messages from "./pages/Messages";
import AIMarathon from "./pages/AIMarathon";
// 🔥 БЕЗОПАСНОСТЬ: TestQuery удалён - не должен быть доступен в production
// import TestQuery from "./pages/TestQuery";
import { FloatingAIButton } from "./components/FloatingAIButton";
import { Loader2 } from "lucide-react";

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
      <Route path="/aimarathon" element={<AIMarathon />} />
      
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
      
      {/* Админ-панель (ЗАЩИЩЕНО: только saint@onaiacademy.kz) */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminGuard><MainLayout><AdminDashboard /></MainLayout></AdminGuard>
        </ProtectedRoute>
      } />
      <Route path="/admin/activity" element={
        <ProtectedRoute>
          <AdminGuard><MainLayout><Activity /></MainLayout></AdminGuard>
        </ProtectedRoute>
      } />
      <Route path="/admin/students-activity" element={
        <ProtectedRoute>
          <AdminGuard><MainLayout><StudentsActivity /></MainLayout></AdminGuard>
        </ProtectedRoute>
      } />
      <Route path="/admin/ai-analytics" element={
        <ProtectedRoute>
          <AdminGuard><MainLayout><AIAnalytics /></MainLayout></AdminGuard>
        </ProtectedRoute>
      } />
      <Route path="/admin/ai-curator-chats" element={
        <ProtectedRoute>
          <AdminGuard><MainLayout><AICuratorChats /></MainLayout></AdminGuard>
        </ProtectedRoute>
      } />
      <Route path="/admin/token-usage" element={
        <ProtectedRoute>
          <AdminGuard><MainLayout><TokenUsage /></MainLayout></AdminGuard>
        </ProtectedRoute>
      } />
      
      {/* Чат (требует авторизацию) */}
      <Route path="/messages" element={
        <ProtectedRoute>
          <MainLayout><Messages /></MainLayout>
        </ProtectedRoute>
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
  const location = useLocation();
  
  // Don't show FloatingAIButton on public landing pages
  const isPublicLanding = location.pathname === '/aimarathon';

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
      {!isPublicLanding && <FloatingAIButton />}
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
