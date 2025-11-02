import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { WelcomeBanner } from "@/components/profile/WelcomeBanner";
import { PlayerProgress } from "@/components/profile/PlayerProgress";
import { CurrentCourse } from "@/components/profile/CurrentCourse";
import { Achievements } from "@/components/profile/Achievements";
import { StatsPanel } from "@/components/profile/StatsPanel";
import { LoadingSpinner } from "@/components/profile/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleContinueLearning = () => {
    const courseId = localStorage.getItem("currentCourseId") || "1";
    navigate(`/course/${courseId}`);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Radial gradient glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[hsl(var(--cyber-blue))]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Welcome Banner */}
        <WelcomeBanner />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <PlayerProgress />
            <CurrentCourse />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            <StatsPanel />
            <Achievements />
          </div>
        </div>

        {/* Main CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex justify-center"
        >
          <Button
            onClick={handleContinueLearning}
            variant="neon"
            size="lg"
            className="text-lg px-12 py-6 h-auto group shadow-[0_0_30px_rgba(177,255,50,0.3)]"
          >
            <PlayCircle className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
            Продолжить обучение
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 pt-8 border-t border-border/30 text-center"
        >
          <div className="space-y-2">
            <h3 className="text-lg font-bold">
              <span className="text-neon">onAI</span>
              <span className="text-foreground"> Academy</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Powered by Neural Education Systems © 2025
            </p>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default Dashboard;
