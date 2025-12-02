import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Clock, 
  BookOpen, 
  CheckCircle,
  Lock,
  Lightning,
  Trophy,
  ChartBar
} from "@phosphor-icons/react";
import { Bot } from "lucide-react";
import { AIChatDialog } from "@/components/profile/v2/AIChatDialog";

/**
 * 🎯 TRIPWIRE HOME - Trial Dashboard
 * - Premium cyber-architecture design
 * - Single course card with progress
 * - Stats preview (limited)
 * - Strong CTA to upgrade
 * - AI Curator Chat (Whisper + File upload)
 */
export default function TripwireHome() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 
          className="text-4xl md:text-5xl font-bold text-white mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Welcome, Student 👋
        </h1>
        <p className="text-white/60 text-lg">
          You're on the trial version. Start your journey to $1000!
        </p>
      </motion.div>

      {/* Stats Overview - Limited */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Active Stat */}
        <Card className="p-6 bg-[#0A0A0A]/60 border-[#b2ff2e]/20 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#b2ff2e]/10 rounded-lg">
                <Lightning size={24} weight="fill" className="text-[#b2ff2e]" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Lessons Completed</p>
                <p className="text-2xl font-bold text-white">0/4</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Locked Stat */}
        <Card className="p-6 bg-[#0A0A0A]/40 border-white/10 backdrop-blur-xl relative overflow-hidden group cursor-not-allowed">
          <div className="flex items-center justify-between mb-2 opacity-40">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <Trophy size={24} weight="fill" className="text-white/50" />
              </div>
              <div>
                <p className="text-white/40 text-sm">Achievements</p>
                <p className="text-2xl font-bold text-white/40">0/24</p>
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4">
            <Lock size={20} weight="fill" className="text-red-400/60" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <p className="text-xs text-white/80 font-semibold">Unlock in Full Program</p>
          </div>
        </Card>

        {/* Locked Stat */}
        <Card className="p-6 bg-[#0A0A0A]/40 border-white/10 backdrop-blur-xl relative overflow-hidden group cursor-not-allowed">
          <div className="flex items-center justify-between mb-2 opacity-40">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <ChartBar size={24} weight="fill" className="text-white/50" />
              </div>
              <div>
                <p className="text-white/40 text-sm">AI Sessions</p>
                <p className="text-2xl font-bold text-white/40">0/∞</p>
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4">
            <Lock size={20} weight="fill" className="text-red-400/60" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <p className="text-xs text-white/80 font-semibold">Unlock in Full Program</p>
          </div>
        </Card>
      </motion.div>

      {/* Main Course Card - "Integrator: 0 to $1000" */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 
          className="text-2xl font-bold text-white mb-4"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Your Trial Course
        </h2>
        
        <Card className="overflow-hidden bg-[#0A0A0A]/60 border-[#b2ff2e]/30 backdrop-blur-xl hover:border-[#b2ff2e]/50 transition-all duration-300">
          <div className="md:flex">
            {/* Course Image - Neon Style Placeholder */}
            <div className="md:w-1/3 relative overflow-hidden group">
              <div className="aspect-video md:aspect-square bg-gradient-to-br from-[#b2ff2e]/20 via-#00FF88]/10 to-cyan-500/20 relative">
                {/* Animated Gradient Overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#b2ff2e]/20 to-transparent"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                />
                
                {/* Decorative Elements */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                    >
                      <BookOpen size={64} weight="duotone" className="text-[#b2ff2e] mx-auto mb-2" />
                    </motion.div>
                    <p className="text-[#b2ff2e] font-bold text-sm">TRIAL VERSION</p>
                  </div>
                </div>

                {/* Grid Overlay for Cyber Effect */}
                <div className="absolute inset-0" style={{
                  backgroundImage: `linear-gradient(rgba(178, 255, 46, 0.1) 1px, transparent 1px),
                                    linear-gradient(90deg, rgba(178, 255, 46, 0.1) 1px, transparent 1px)`,
                  backgroundSize: '20px 20px',
                  opacity: 0.3,
                }} />
              </div>
            </div>

            {/* Course Content */}
            <div className="md:w-2/3 p-6 md:p-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#b2ff2e]/10 border border-[#b2ff2e]/30 rounded-full mb-4">
                <Lightning size={16} weight="fill" className="text-[#b2ff2e]" />
                <span className="text-xs font-semibold text-[#b2ff2e]">TRIAL ACCESS</span>
              </div>

              {/* Title */}
              <h3 
                className="text-2xl md:text-3xl font-bold text-white mb-3"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Integrator: 0 to $1000
              </h3>

              {/* Description */}
              <p className="text-white/70 mb-6 leading-relaxed">
                Master the fundamentals of AI integration and earn your first $1000. 
                This trial gives you access to 4 foundational lessons.
              </p>

              {/* Progress Section */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Your Progress</span>
                  <span className="text-[#b2ff2e] font-semibold">0% Complete</span>
                </div>
                <Progress value={0} className="h-2 bg-white/10" />
                <div className="flex items-center gap-4 text-sm text-white/60">
                  <div className="flex items-center gap-1">
                    <CheckCircle size={16} weight="fill" className="text-[#b2ff2e]" />
                    <span>0/4 Lessons</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>~2 hours</span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  size="lg"
                  className="w-full md:w-auto bg-[#b2ff2e] text-black hover:bg-[#9de624] font-bold text-base shadow-[0_0_30px_rgba(178,255,46,0.3)] hover:shadow-[0_0_40px_rgba(178,255,46,0.5)] transition-all duration-300"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Play size={20} weight="fill" className="mr-2" />
                  Continue Learning
                </Button>
              </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Upgrade Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="p-8 bg-gradient-to-br from-[#b2ff2e]/10 via-#00FF88]/5 to-transparent border-[#b2ff2e]/30 backdrop-blur-xl relative overflow-hidden">
          {/* Animated Background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-[#b2ff2e]/10 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />

          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <h3 
              className="text-2xl md:text-3xl font-bold text-white mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              🚀 Ready to Unlock Everything?
            </h3>
            <p className="text-white/70 mb-6 text-lg">
              Get unlimited access to all courses, AI Mentor, NeuroHub, and exclusive community support. 
              Take your skills from $0 to $10,000+
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                className="bg-[#b2ff2e] text-black hover:bg-[#9de624] font-bold text-lg px-8 py-6 shadow-[0_0_40px_rgba(178,255,46,0.4)] hover:shadow-[0_0_60px_rgba(178,255,46,0.6)] transition-all duration-300"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Lightning size={24} weight="fill" className="mr-2" />
                Upgrade to Full Program
              </Button>
            </motion.div>
          </div>
        </Card>
      </motion.div>

      {/* AI Curator Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="overflow-hidden bg-[#0A0A0A]/60 border-[#00FF88]/30 backdrop-blur-xl hover:border-[#00FF88]/50 transition-all duration-300">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/30 flex items-center justify-center">
                <Bot className="w-8 h-8 text-[#00FF88]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                  AI-Куратор
                </h3>
                <p className="text-sm text-gray-400 uppercase tracking-wider">
                  Онлайн 24/7
                </p>
              </div>
            </div>
            
            <p className="text-white/70 mb-6 leading-relaxed">
              Задавайте вопросы по урокам, отправляйте голосовые сообщения и файлы. 
              AI-куратор поможет разобраться в сложных моментах.
            </p>
            
            <Button
              onClick={() => setIsAIChatOpen(true)}
              className="w-full bg-[#00FF88] hover:bg-[#00cc88] text-black font-bold text-lg py-6"
              style={{
                boxShadow: '0 0 30px rgba(0, 255, 136, 0.4)'
              }}
            >
              <Bot className="w-5 h-5 mr-2" />
              Написать куратору
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* AI Chat Dialog */}
      <AIChatDialog open={isAIChatOpen} onOpenChange={setIsAIChatOpen} />
    </div>
  );
}


