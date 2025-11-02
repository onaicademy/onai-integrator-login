import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layouts/MainLayout";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Course from "./pages/Course";
import Module from "./pages/Module";
import Lesson from "./pages/Lesson";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
          <Route path="/course/:id" element={<MainLayout><Course /></MainLayout>} />
          <Route path="/course/:id/module/:moduleId" element={<MainLayout><Module /></MainLayout>} />
          <Route path="/course/:id/module/:moduleId/lesson/:lessonId" element={<MainLayout><Lesson /></MainLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
