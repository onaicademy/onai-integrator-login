import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Download,
  FileText,
  Link as LinkIcon,
  Play
} from "lucide-react";
import { logActivity } from "@/utils/activityLogger";
import { addXP } from "@/utils/xpManager";

// Mock data
const lessonData = {
  "3": {
    id: 3,
    moduleId: 2,
    title: "Подключение Telegram-бота",
    description: "Научитесь создавать и настраивать Telegram-бота через BotFather, получать токен и интегрировать его с вашей системой",
    duration: "12 мин",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    materials: [
      { type: "pdf", title: "Инструкция по созданию бота", url: "#" },
      { type: "link", title: "BotFather в Telegram", url: "https://t.me/botfather" },
      { type: "checklist", title: "Чек-лист настройки", url: "#" }
    ]
  }
};

const Lesson = () => {
  const { id, moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const [isCompleted, setIsCompleted] = useState(false);

  console.log("Lesson params:", { id, moduleId, lessonId });

  // Используем lessonId или fallback на "3"
  const lesson = lessonData[lessonId as keyof typeof lessonData] || lessonData["3"];

  useEffect(() => {
    if (!lesson) {
      console.log("Lesson not found for lessonId:", lessonId);
      return;
    }
    // Check localStorage for completion
    const completed = localStorage.getItem(`lesson-${lessonId}-completed`);
    setIsCompleted(completed === "true");
    
    // Log lesson view
    logActivity("lesson_view", { lesson_id: lessonId, module_id: moduleId });
  }, [lessonId, lesson, moduleId]);

  const handleComplete = async () => {
    // Check if already completed to avoid double XP
    if (isCompleted) return;
    
    localStorage.setItem(`lesson-${lessonId}-completed`, "true");
    setIsCompleted(true);
    
    // Log lesson completion and add XP
    await logActivity("lesson_complete", { lesson_id: lessonId, module_id: moduleId });
    await addXP(25, `lesson_completed_${lessonId}`);
  };

  const handleNext = () => {
    // В реальном приложении здесь будет логика определения следующего урока
    const nextLessonId = Number(lessonId) + 1;
    navigate(`/course/${id}/module/${moduleId}/lesson/${nextLessonId}`);
  };

  if (!lesson) {
    console.log("Rendering lesson not found");
    return <div className="text-white p-8">Урок не найден</div>;
  }

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-4 h-4" />;
      case "link":
        return <LinkIcon className="w-4 h-4" />;
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-black" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(`/course/${id}/module/${moduleId}`)}
            className="text-muted-foreground hover:bg-neon hover:text-neon-foreground gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад к модулю
          </Button>
        </motion.div>

        {/* Lesson Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
              Модуль {lesson.moduleId} • Урок {lesson.id}
            </span>
            {isCompleted && (
              <div className="flex items-center gap-1.5 text-neon text-xs sm:text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Завершено
              </div>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3">
            {lesson.title}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
            {lesson.description}
          </p>
        </motion.header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Video Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="relative rounded-2xl overflow-hidden border border-neon/20 shadow-[0_0_30px_rgba(177,255,50,0.15)]">
              {/* Video Player */}
              <div className="relative aspect-video bg-black">
                <iframe
                  src={lesson.videoUrl}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
              
              {/* Video Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-neon/10 via-neon/5 to-neon/10 blur-xl -z-10" />
            </div>

            {/* Video Controls */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={handleComplete}
                disabled={isCompleted}
                className="flex-1 bg-neon text-neon-foreground hover:bg-neon/20 font-bold shadow-[0_0_20px_rgba(177,255,50,0.3)] hover:shadow-[0_0_30px_rgba(177,255,50,0.5)] transition-all"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {isCompleted ? "Урок завершён" : "Завершить урок"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleNext}
                className="flex-1 border-neon/30 hover:bg-neon/10"
              >
                Следующий урок
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.section>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Lesson Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-neon/10 flex items-center justify-center">
                  <Play className="w-5 h-5 text-neon" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Длительность</p>
                  <p className="text-lg font-bold text-foreground">{lesson.duration}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Прогресс модуля</p>
                <Progress value={60} />
                <p className="text-xs text-right text-neon font-medium">60%</p>
              </div>
            </motion.div>

            {/* Materials */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-foreground mb-4">
                Материалы урока
              </h3>
              
              <div className="space-y-3">
                {lesson.materials.map((material, index) => (
                  <a
                    key={index}
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 hover:border-neon/30 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center text-neon group-hover:bg-neon/20 transition-colors">
                      {getMaterialIcon(material.type)}
                    </div>
                    <span className="flex-1 text-sm text-foreground group-hover:text-neon transition-colors">
                      {material.title}
                    </span>
                    <Download className="w-4 h-4 text-muted-foreground group-hover:text-neon transition-colors" />
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-neon/5 backdrop-blur-xl border border-neon/20 rounded-2xl p-6"
            >
              <h3 className="text-base font-bold text-neon mb-3">
                💡 Совет
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                После просмотра видео обязательно попрактикуйтесь с созданием собственного бота. Это поможет лучше усвоить материал.
              </p>
            </motion.div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Lesson;
