import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Settings, Code, ArrowRight, LayoutDashboard, BookOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CourseModule {
  id: number;
  title: string;
  subtitle: string;
  progress: number;
  icon: LucideIcon;
  lessons: number;
  duration: string;
  inDevelopment?: boolean;
}

export const CourseModules = () => {
  const navigate = useNavigate();
  
  const modules: CourseModule[] = [
    {
      id: 1,
      title: "Интегратор 2.0",
      subtitle: "Автоматизация с AI",
      progress: 45,
      icon: Settings,
      lessons: 48,
      duration: "8 недель",
      inDevelopment: false,
    },
    {
      id: 2,
      title: "Креатор 2.0",
      subtitle: "Генерация контента с AI",
      progress: 0,
      icon: BookOpen,
      lessons: 40,
      duration: "6 недель",
      inDevelopment: true,
    },
    {
      id: 3,
      title: "Программист на Cursor",
      subtitle: "Разработка с AI",
      progress: 0,
      icon: Code,
      lessons: 60,
      duration: "10 недель",
      inDevelopment: true,
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">Курсы</h3>
        <span className="text-[10px] sm:text-xs text-gray-400">{modules.length} курса</span>
      </div>

      {/* Dashboard Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          onClick={() => navigate("/neurohub")}
          variant="outline"
          className="w-full border-[#00FF88]/40 hover:bg-[#00FF88]/10 hover:border-[#00FF88] group transition-all duration-300 text-white"
        >
          <LayoutDashboard className="w-4 h-4 mr-2 text-[#00FF88]" />
          <span>Перейти в AI-наставник</span>
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {modules.map((module, index) => {
          const Icon = module.icon;
          
          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.03 }}
              className="group relative"
            >
              <div className="relative bg-[#1a1a24] backdrop-blur-md border border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 overflow-hidden transition-all duration-500 hover:border-[#00FF88]/50">
                {/* Background gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#00FF88]/5 via-transparent to-[#00cc88]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Glow effect */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#00FF88]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10 space-y-3 sm:space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-[#00FF88]/20 to-[#00cc88]/10 border border-[#00FF88]/30 group-hover:border-[#00FF88]/50 transition-colors">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#00FF88]" />
                    </div>
                    <div className="text-right">
                      {module.inDevelopment ? (
                        <span className="text-xs sm:text-sm font-medium text-orange-500 bg-orange-500/10 border border-orange-500/30 rounded-full px-2 py-1">🚧 Скоро</span>
                      ) : (
                        <>
                          <p className="text-xl sm:text-2xl font-bold text-[#00FF88]">{module.progress}%</p>
                          <p className="text-[10px] sm:text-xs text-gray-400">завершено</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Module info */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <h4 className="text-sm sm:text-base md:text-lg font-bold text-white group-hover:text-[#00FF88] transition-colors leading-tight">
                      {module.title}
                    </h4>
                    <p className="text-[10px] sm:text-xs text-gray-400">{module.subtitle}</p>
                  </div>

                  {/* Progress bar */}
                  {!module.inDevelopment && (
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="h-1 sm:h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${module.progress}%` }}
                          transition={{ duration: 1, delay: index * 0.2 }}
                          className="h-full bg-gradient-to-r from-[#00FF88] to-[#00cc88] rounded-full"
                          style={{
                            boxShadow: "0 0 8px rgba(0, 255, 136, 0.5)",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-400">
                    <span>{module.lessons} уроков</span>
                    <span>{module.duration}</span>
                  </div>

                  {/* Action button */}
                  <Button
                    variant="outline"
                    onClick={() => !module.inDevelopment && navigate(`/course/${module.id}`)}
                    disabled={module.inDevelopment}
                    className={`w-full transition-all duration-300 text-xs sm:text-sm ${
                      module.inDevelopment
                        ? 'border-gray-700 text-gray-500 cursor-not-allowed'
                        : 'border-[#00FF88]/40 hover:bg-[#00FF88]/10 hover:border-[#00FF88] text-white group/btn'
                    }`}
                  >
                    <span className="truncate">{module.inDevelopment ? 'В разработке' : 'Продолжить курс'}</span>
                    {!module.inDevelopment && (
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2 group-hover/btn:translate-x-1 transition-transform flex-shrink-0" />
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
