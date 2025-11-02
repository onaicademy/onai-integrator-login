import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  PlayCircle, 
  CheckCircle2, 
  Circle, 
  Clock,
  ChevronLeft,
  FileText
} from "lucide-react";

// Mock data - в реальном приложении это будет из API
const moduleData = {
  "2": {
    id: 2,
    title: "Создание GPT-бота и CRM",
    description: "Полный цикл создания интеллектуального бота с интеграцией в CRM систему",
    progress: 60,
    lessons: [
      { id: 1, title: "Введение и обзор платформы", duration: "7 мин", status: "completed" },
      { id: 2, title: "Создание API-ключа OpenAI", duration: "10 мин", status: "completed" },
      { id: 3, title: "Подключение Telegram-бота", duration: "12 мин", status: "active" },
      { id: 4, title: "Интеграция с amoCRM через Webhook", duration: "15 мин", status: "locked" },
      { id: 5, title: "Настройка автопостов и ответов", duration: "9 мин", status: "locked" },
    ]
  }
};

const Module = () => {
  const { id, moduleId } = useParams();
  const navigate = useNavigate();
  
  console.log("Module params:", { id, moduleId });
  
  // Используем moduleId или fallback на "2"
  const module = moduleData[moduleId as keyof typeof moduleData] || moduleData["2"];

  if (!module) {
    console.log("Module not found for moduleId:", moduleId);
    return <div className="text-white p-8">Модуль не найден</div>;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-neon" />;
      case "active":
        return <PlayCircle className="w-5 h-5 text-neon animate-pulse" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border-neon/30 bg-neon/5";
      case "active":
        return "border-neon bg-neon/10 shadow-[0_0_20px_rgba(177,255,50,0.3)]";
      default:
        return "border-border/30 bg-card/30";
    }
  };

  const handleLessonClick = (lessonId: number, status: string) => {
    if (status !== "locked") {
      navigate(`/course/${id}/module/${moduleId}/lesson/${lessonId}`);
    }
  };

  const completedLessons = module.lessons.filter(l => l.status === "completed").length;
  const totalLessons = module.lessons.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-black" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(`/course/${id}`)}
            className="text-muted-foreground hover:bg-neon hover:text-neon-foreground gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад к курсу
          </Button>
        </motion.div>

        {/* Module Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 sm:mb-12"
        >
          <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                  Модуль {module.id}
                </p>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3">
                  {module.title}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {module.description}
                </p>
              </div>
            </div>

            {/* Progress Section */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Прогресс: {completedLessons} из {totalLessons} уроков
                </span>
                <span className="text-neon font-bold">{module.progress}%</span>
              </div>
              <Progress value={module.progress} />
            </div>
          </div>
        </motion.header>

        {/* Lessons Grid */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">
            Уроки модуля
          </h2>
          
          <div className="space-y-4">
            {module.lessons.map((lesson, index) => (
              <motion.article
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleLessonClick(lesson.id, lesson.status)}
                className={`
                  relative overflow-hidden rounded-xl sm:rounded-2xl border-2 
                  transition-all duration-300
                  ${getStatusColor(lesson.status)}
                  ${lesson.status !== "locked" ? "cursor-pointer hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(177,255,50,0.2)]" : "opacity-60 cursor-not-allowed"}
                `}
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    {/* Lesson Number Badge */}
                    <div className={`
                      flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl 
                      flex items-center justify-center font-bold text-sm sm:text-base
                      ${lesson.status === "active" ? "bg-neon text-neon-foreground" : "bg-muted text-muted-foreground"}
                    `}>
                      {lesson.id}
                    </div>

                    {/* Lesson Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-foreground">
                          {lesson.title}
                        </h3>
                        {getStatusIcon(lesson.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{lesson.duration}</span>
                        </div>
                        {lesson.status === "completed" && (
                          <span className="text-neon font-medium">✓ Завершено</span>
                        )}
                        {lesson.status === "active" && (
                          <span className="text-neon font-medium">▶ Активен</span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    {lesson.status !== "locked" && (
                      <Button
                        size="sm"
                        variant={lesson.status === "active" ? "default" : "outline"}
                        className={lesson.status === "active" ? "bg-neon text-neon-foreground hover:bg-neon/90" : ""}
                      >
                        {lesson.status === "completed" ? "Повторить" : "Начать"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Glow Effect for Active */}
                {lesson.status === "active" && (
                  <div className="absolute inset-0 bg-gradient-to-r from-neon/5 to-transparent pointer-events-none" />
                )}
              </motion.article>
            ))}
          </div>
        </section>

        {/* Module Materials */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 sm:p-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-neon" />
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              Материалы модуля
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Дополнительные материалы станут доступны после прохождения всех уроков
          </p>
          <Button 
            variant="outline" 
            disabled={completedLessons < totalLessons}
            className="w-full sm:w-auto"
          >
            Скачать материалы
          </Button>
        </motion.section>
      </div>
    </div>
  );
};

export default Module;
