import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MainLayout } from "./components/layouts/MainLayout";
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
      
      {/* Админ-панель (требуют роль admin) */}
      <Route path="/admin" element={<MainLayout><AdminDashboard /></MainLayout>} />
      <Route path="/admin/activity" element={<MainLayout><Activity /></MainLayout>} />
      <Route path="/admin/students-activity" element={<MainLayout><StudentsActivity /></MainLayout>} />
      <Route path="/admin/ai-analytics" element={<MainLayout><AIAnalytics /></MainLayout>} />
      <Route path="/admin/ai-curator-chats" element={<MainLayout><AICuratorChats /></MainLayout>} />
      <Route path="/admin/token-usage" element={<MainLayout><TokenUsage /></MainLayout>} />
      
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
      <BrowserRouter>
        <AppRoutes />
        <FloatingAIButton />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
