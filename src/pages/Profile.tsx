import { motion } from "framer-motion";
import { ProfileHeader } from "@/components/profile/v2/ProfileHeader";
import { UserDashboard } from "@/components/profile/v2/UserDashboard";
import { LearningStats } from "@/components/profile/v2/LearningStats";
import { CourseModules } from "@/components/profile/v2/CourseModules";
import { AchievementsGrid } from "@/components/profile/v2/AchievementsGrid";
import { AIAssistantPanel } from "@/components/profile/v2/AIAssistantPanel";

const Profile = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Radial gradient glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[hsl(var(--cyber-blue))]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ProfileHeader />
        </motion.div>

        {/* Main Content Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - User Dashboard */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-4"
          >
            <UserDashboard />
          </motion.div>

          {/* Right Column - Stats & Content */}
          <div className="lg:col-span-8 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <LearningStats />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <CourseModules />
            </motion.div>
          </div>
        </div>

        {/* Achievements Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-6"
        >
          <AchievementsGrid />
        </motion.div>

        {/* AI Assistant */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6"
        >
          <AIAssistantPanel />
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

export default Profile;
