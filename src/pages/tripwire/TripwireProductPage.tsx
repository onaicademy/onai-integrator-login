import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, CheckCircle, Play, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// 🎯 Mock data for Tripwire course (4 modules = 4 lessons)
const tripwireCourse = {
  id: 1,
  title: "Интегратор: 0 to $1000",
  description: "Основы AI-интеграции для бизнеса",
  modules: [
    {
      id: 1,
      title: "Модуль 1: Введение в AI",
      description: "Основы работы с искусственным интеллектом",
      duration: "45 мин",
      progress: 0,
      isLocked: false,
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      materials: [
        { name: "Презентация Модуль 1.pdf", url: "#" },
        { name: "Чек-лист по AI-инструментам.docx", url: "#" }
      ]
    },
    {
      id: 2,
      title: "Модуль 2: ChatGPT для бизнеса",
      description: "Практическое применение ChatGPT",
      duration: "60 мин",
      progress: 0,
      isLocked: true,
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      materials: []
    },
    {
      id: 3,
      title: "Модуль 3: Автоматизация с AI",
      description: "Создание автоматизаций",
      duration: "50 мин",
      progress: 0,
      isLocked: true,
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      materials: []
    },
    {
      id: 4,
      title: "Модуль 4: Первый проект",
      description: "Запуск вашего первого AI-проекта",
      duration: "55 мин",
      progress: 0,
      isLocked: true,
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      materials: []
    }
  ]
};

/**
 * 🎯 TRIPWIRE PRODUCT PAGE - 100% Visual Replication
 * - Module = Lesson (simplified structure)
 * - Click module → immediately load lesson view
 * - EXACT styling from Course.tsx
 */
export default function TripwireProductPage() {
  const navigate = useNavigate();
  const [selectedModule, setSelectedModule] = useState<any | null>(null);

  const handleModuleClick = (module: any) => {
    if (module.isLocked) {
      alert('🔒 Сначала завершите предыдущий модуль!');
      return;
    }
    
    // Map module IDs to first lesson IDs from database
    // Module 1 → lesson 29, Module 2 → lesson 40, Module 3 → lesson 36, Module 4 → lesson 43
    const moduleToLessonMap: { [key: number]: number } = {
      1: 29,
      2: 40,
      3: 36,
      4: 43
    };
    
    const firstLessonId = moduleToLessonMap[module.id];
    if (!firstLessonId) {
      alert('❌ Урок не найден для этого модуля');
      return;
    }
    
    navigate(`/tripwire/module/${module.id}/lesson/${firstLessonId}`);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Neural Network Background - EXACT replica */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Floating Neural Nodes */}
        {Array.from({ length: 30 }).map((_, i) => {
          const size = 2 + Math.random() * 4;
          const x = Math.random() * 100;
          const y = Math.random() * 100;
          const duration = 10 + Math.random() * 20;
          
          return (
            <motion.div
              key={`node-${i}`}
              className="absolute rounded-full bg-[#00ff00]"
              style={{
                width: size,
                height: size,
                left: `${x}%`,
                top: `${y}%`,
                boxShadow: `0 0 ${size * 4}px rgba(0, 255, 0, 0.6)`,
              }}
              animate={{
                x: [0, Math.random() * 40 - 20, 0],
                y: [0, Math.random() * 40 - 20, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 5,
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Hero Banner - EXACT replica */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="relative bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] rounded-3xl overflow-hidden border border-[#00ff00]/20 p-8 sm:p-10 md:p-12 lg:p-16">
            {/* Green Glow Effect */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00ff00]/10 rounded-full blur-3xl" />
            
            {/* Hero Content */}
            <div className="relative z-10 max-w-3xl">
              {/* Top Badge */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-[#00ff00]/10 border border-[#00ff00]/30 rounded-full px-4 py-2 mb-6"
              >
                <span className="w-2 h-2 bg-[#00ff00] rounded-full animate-pulse" />
                <p className="text-xs sm:text-sm text-[#00ff00] font-semibold uppercase tracking-wide">
                  Trial Version • 4 Foundational Modules
                </p>
              </motion.div>

              {/* Main Title */}
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 text-white font-display leading-tight"
              >
                Интегратор{" "}
                <span className="relative inline-block">
                  <span className="text-[#00ff00] relative z-10">0 to $1000</span>
                  <motion.span
                    className="absolute inset-0 bg-[#00ff00] blur-xl opacity-50"
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </span>
              </motion.h1>

              <p className="text-gray-300 text-lg max-w-2xl">
                Освойте основы AI-интеграции и заработайте первые $1000. 
                Доступ к 4 базовым модулям в пробной версии.
              </p>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        {!selectedModule ? (
          // Module List View
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <section className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight font-display">
                  Модули курса
                </h2>
              </div>
              
              <div className="space-y-3">
                {tripwireCourse.modules.map((module, index) => (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleModuleClick(module)}
                    className={`relative bg-[#1a1a24] border border-gray-800 rounded-2xl p-6 transition-all duration-300 ${
                      module.isLocked 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover:border-[#00ff00]/50 hover:shadow-lg hover:shadow-[#00ff00]/10 cursor-pointer hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Module Number */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 flex-shrink-0 ${
                        module.isLocked 
                          ? 'bg-gray-800/50 border-gray-700' 
                          : 'bg-[#00ff00]/10 border-[#00ff00]/30'
                      }`}>
                        {module.isLocked ? (
                          <Lock className="w-5 h-5 text-gray-500" />
                        ) : (
                          <span className="text-[#00ff00] font-bold">{index + 1}</span>
                        )}
                      </div>

                      {/* Module Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-bold text-white">{module.title}</h3>
                          {!module.isLocked && (
                            <Badge variant="outline" className="bg-[#00ff00]/10 text-[#00ff00] border-[#00ff00]/30">
                              Доступен
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-4">{module.description}</p>
                        
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-[#00ff00]" />
                            {module.duration}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-[#00ff00]" />
                            {module.materials.length} материалов
                          </div>
                        </div>

                        {/* Progress */}
                        {!module.isLocked && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                              <span>Прогресс</span>
                              <span>{module.progress}%</span>
                            </div>
                            <Progress value={module.progress} className="h-2" />
                          </div>
                        )}
                      </div>
                    </div>

                    {module.isLocked && (
                      <div className="absolute top-4 right-4">
                        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                          🔒 Заблокирован
                        </Badge>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Right Sidebar - EXACT replica */}
            <aside className="space-y-4 sm:space-y-6 lg:pt-[60px]">
              {/* Stats Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-[#00ff00] rounded-2xl p-6"
              >
                <h3 className="text-sm font-bold text-black mb-4 uppercase">
                  Ваш прогресс
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-black/70 text-sm">Пройдено</span>
                    <span className="text-black font-bold">0/4</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-black/70 text-sm">Время</span>
                    <span className="text-black font-bold">0/210 мин</span>
                  </div>
                </div>
              </motion.div>
            </aside>
          </div>
        ) : (
          // Lesson View (selected module)
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Back Button */}
              <Button
                variant="outline"
                onClick={() => setSelectedModule(null)}
                className="border-gray-700 text-white hover:bg-white/5"
              >
                ← Вернуться к модулям
              </Button>

              {/* Video Player */}
              <div className="relative bg-[#1a1a24] border border-gray-800 rounded-2xl overflow-hidden aspect-video">
                <iframe
                  src={selectedModule.video_url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Module Info */}
              <div className="bg-[#1a1a24] border border-gray-800 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-2">{selectedModule.title}</h2>
                <p className="text-gray-400 mb-4">{selectedModule.description}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#00ff00]" />
                    {selectedModule.duration}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-[#00ff00]" />
                    {selectedModule.progress}% завершено
                  </div>
                </div>
              </div>

              {/* Materials */}
              {selectedModule.materials.length > 0 && (
                <div className="bg-[#1a1a24] border border-gray-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">📁 Материалы урока</h3>
                  <div className="space-y-2">
                    {selectedModule.materials.map((material: any, idx: number) => (
                      <a
                        key={idx}
                        href={material.url}
                        className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <BookOpen className="w-5 h-5 text-[#00ff00]" />
                        <span className="text-white text-sm">{material.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <aside className="space-y-6">
              <div className="bg-[#00ff00] rounded-2xl p-6">
                <h3 className="text-sm font-bold text-black mb-4 uppercase">
                  Ваш прогресс
                </h3>
                <Progress value={selectedModule.progress} className="h-3 mb-4" />
                <Button
                  className="w-full bg-black text-[#00ff00] hover:bg-black/90 font-bold"
                  onClick={() => alert('Функция в разработке!')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Отметить выполненным
                </Button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

