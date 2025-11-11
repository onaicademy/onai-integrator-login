import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import { FloatingAIButton } from "./components/FloatingAIButton";

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
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <FloatingAIButton />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
