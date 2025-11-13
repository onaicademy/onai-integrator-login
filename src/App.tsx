import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "./components/layouts/MainLayout";
import { AdminGuard } from "./components/AdminGuard";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import NeuroHub from "./pages/NeuroHub";
import Achievements from "./pages/Achievements";
import Welcome from "./pages/Welcome";
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
import ProfileSettings from "./pages/ProfileSettings";
import Messages from "./pages/Messages";
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
      <Route path="/welcome" element={<Welcome />} />
      
      {/* Защищённые страницы (требуют авторизацию) */}
      <Route path="/profile" element={
        isWelcomePage ? <Profile /> : <MainLayout><Profile /></MainLayout>
      } />
      <Route path="/neurohub" element={<MainLayout><NeuroHub /></MainLayout>} />
      <Route path="/achievements" element={<MainLayout><Achievements /></MainLayout>} />
      <Route path="/courses" element={<Navigate to="/course/1" replace />} />
      <Route path="/course/:id" element={<MainLayout><Course /></MainLayout>} />
      <Route path="/course/:id/module/:moduleId" element={<MainLayout><Module /></MainLayout>} />
      <Route path="/course/:id/module/:moduleId/lesson/:lessonId" element={<MainLayout><Lesson /></MainLayout>} />
      
      {/* Админ-панель (ЗАЩИЩЕНО: только saint@onaiacademy.kz) */}
      <Route path="/admin" element={<AdminGuard><MainLayout><AdminDashboard /></MainLayout></AdminGuard>} />
      <Route path="/admin/activity" element={<AdminGuard><MainLayout><Activity /></MainLayout></AdminGuard>} />
      <Route path="/admin/students-activity" element={<AdminGuard><MainLayout><StudentsActivity /></MainLayout></AdminGuard>} />
      <Route path="/admin/ai-analytics" element={<AdminGuard><MainLayout><AIAnalytics /></MainLayout></AdminGuard>} />
      <Route path="/admin/ai-curator-chats" element={<AdminGuard><MainLayout><AICuratorChats /></MainLayout></AdminGuard>} />
      <Route path="/admin/token-usage" element={<AdminGuard><MainLayout><TokenUsage /></MainLayout></AdminGuard>} />
      
      {/* Настройки и чат (требуют авторизацию) */}
      <Route path="/settings" element={<MainLayout><ProfileSettings /></MainLayout>} />
      <Route path="/messages" element={<MainLayout><Messages /></MainLayout>} />
      
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
      <FloatingAIButton />
    </>
  );
};

const App = () => (
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
);

export default App;
