import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/course/ModuleCard";
import { CourseStats } from "@/components/course/CourseStats";
import { 
  Hand, 
  MessageSquare, 
  Settings, 
  Workflow, 
  Link, 
  Package, 
  Rocket, 
  TrendingUp,
  Gift,
  Search,
  Download,
  Calendar,
  MessageCircle
} from "lucide-react";

const modules = [
  { id: 1, title: "Введение в профессию", progress: 100, icon: Hand },
  { id: 2, title: "Создание GPT бота и CRM", progress: 90, icon: MessageSquare },
  { id: 3, title: "Интеграция amoCRM и Bitrix24", progress: 80, icon: Settings },
  { id: 4, title: "Автоматизация при помощи Make", progress: 60, icon: Workflow },
  { id: 5, title: "N8N автоматизация и работа с API", progress: 50, icon: Link },
  { id: 6, title: "Реализация и закрытие проекта", progress: 40, icon: Package },
  { id: 7, title: "Упаковка и продвижение", progress: 30, icon: Rocket },
  { id: 8, title: "Продажи на высокий чек", progress: 20, icon: TrendingUp },
  { id: 9, title: "Бонусы", progress: 10, icon: Gift },
  { id: 10, title: "Воркшопы", progress: 0, icon: Search }
];

const Course = () => {
  const courseProgress = 45;
  const studyTime = "6ч 30м";
  const modulesCount = "8 + бонусы";

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[hsl(var(--cyber-blue))]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        {/* Hero Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 md:mb-12"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3 bg-gradient-to-r from-neon via-[hsl(var(--cyber-blue))] to-neon bg-clip-text text-transparent">
                Интегратор 2.0
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                Самый полный курс по автоматизации при помощи нейросетей
              </p>
            </div>
            <Button 
              size="lg" 
              variant="neon"
              className="shadow-[0_0_20px_rgba(177,255,50,0.4)] hover:shadow-[0_0_30px_rgba(177,255,50,0.6)] transition-all focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-background w-full lg:w-auto"
              aria-label="Продолжить обучение курса Интегратор 2.0"
            >
              Продолжить обучение
            </Button>
          </div>

          {/* Stats Cards */}
          <CourseStats 
            courseProgress={courseProgress}
            studyTime={studyTime}
            modulesCount={modulesCount}
          />
        </motion.header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Modules Section */}
          <section className="lg:col-span-2" aria-labelledby="modules-heading">
            <h2 id="modules-heading" className="text-2xl font-bold text-foreground mb-6">
              Модули курса
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modules.map((module, index) => (
                <ModuleCard
                  key={module.id}
                  {...module}
                  index={index}
                />
              ))}
            </div>
          </section>

          {/* Right Sidebar */}
          <aside className="space-y-6" aria-label="Дополнительная информация">
            {/* Course Materials */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
              aria-labelledby="materials-heading"
            >
              <h3 id="materials-heading" className="text-lg font-bold text-foreground mb-4">
                Материалы курса
              </h3>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Скачать договор-оферту курса"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Договор-оферта курса
              </Button>
            </motion.section>

            {/* Schedule */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
              aria-labelledby="schedule-heading"
            >
              <h3 id="schedule-heading" className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-neon" aria-hidden="true" />
                Расписание созвонов
              </h3>
              <div className="space-y-3" role="list">
                <div className="flex items-center justify-between py-2" role="listitem">
                  <span className="text-muted-foreground text-base">Понедельник</span>
                  <time className="text-neon font-semibold text-lg">20:00</time>
                </div>
                <div className="flex items-center justify-between py-2" role="listitem">
                  <span className="text-muted-foreground text-base">Четверг</span>
                  <time className="text-neon font-semibold text-lg">14:00</time>
                </div>
              </div>
            </motion.section>

            {/* Curators */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
              aria-labelledby="curators-heading"
            >
              <h3 id="curators-heading" className="text-lg font-bold text-foreground mb-4">
                Кураторы
              </h3>
              <div className="space-y-4 mb-4" role="list">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors" role="listitem">
                  <div 
                    className="w-12 h-12 rounded-full bg-neon/20 border-2 border-neon/50 flex items-center justify-center flex-shrink-0"
                    style={{
                      boxShadow: "0 4px 12px rgba(177, 255, 50, 0.3)"
                    }}
                    aria-hidden="true"
                  >
                    <span className="text-neon font-bold text-lg">Е</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-base">Ерке</p>
                    <p className="text-sm text-muted-foreground">онлайн 10:00–22:00</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors" role="listitem">
                  <div 
                    className="w-12 h-12 rounded-full bg-[hsl(var(--cyber-blue))]/20 border-2 border-[hsl(var(--cyber-blue))]/50 flex items-center justify-center flex-shrink-0"
                    style={{
                      boxShadow: "0 4px 12px rgba(0, 200, 255, 0.3)"
                    }}
                    aria-hidden="true"
                  >
                    <span className="text-[hsl(var(--cyber-blue))] font-bold text-lg">Р</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-base">Раймжан</p>
                    <p className="text-sm text-muted-foreground">онлайн 10:00–22:00</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="neon" 
                className="w-full gap-2 focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2"
                aria-label="Написать сообщение куратору"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                Написать куратору
              </Button>
            </motion.section>
          </aside>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 md:mt-16 text-center"
          role="contentinfo"
        >
          <p className="text-sm text-muted-foreground/60 leading-relaxed">
            Powered by Neural Education Systems © 2025
          </p>
        </motion.footer>
      </div>
    </div>
  );
};

export default Course;
