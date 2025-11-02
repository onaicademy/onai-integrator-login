import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/course/ModuleCard";
import { CourseStats } from "@/components/course/CourseStats";
import { 
  Sparkles, 
  Bot, 
  Plug2, 
  Cpu, 
  Network, 
  FileCheck2, 
  Megaphone, 
  DollarSign,
  Gift,
  Users,
  Download,
  MessageCircle
} from "lucide-react";

const modules = [
  { id: 1, title: "Введение в профессию", progress: 100, icon: Sparkles },
  { id: 2, title: "Создание GPT бота и CRM", progress: 90, icon: Bot },
  { id: 3, title: "Интеграция amoCRM и Bitrix24", progress: 80, icon: Plug2 },
  { id: 4, title: "Автоматизация при помощи Make", progress: 60, icon: Cpu },
  { id: 5, title: "N8N автоматизация и работа с API", progress: 50, icon: Network },
  { id: 6, title: "Реализация и закрытие проекта", progress: 40, icon: FileCheck2 },
  { id: 7, title: "Упаковка и продвижение", progress: 30, icon: Megaphone },
  { id: 8, title: "Продажи на высокий чек", progress: 20, icon: DollarSign },
  { id: 9, title: "Бонусы", progress: 10, icon: Gift },
  { id: 10, title: "Воркшопы", progress: 0, icon: Users }
];

const Course = () => {
  const courseProgress = 45;
  const studyTime = "6ч 30м";
  const modulesCount = "8 + бонусы";

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-black" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        {/* Hero Banner */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="relative bg-black rounded-3xl overflow-hidden border border-border/30 p-8 md:p-12 lg:p-16">
            {/* Hero Content */}
            <div className="relative z-10 max-w-2xl">
              <p className="text-base md:text-lg text-muted-foreground mb-4 uppercase tracking-wide">
                самый полный курс по автоматизации<br />при помощи нейросетей
              </p>
              <h1 className="text-6xl md:text-7xl font-bold mb-8 text-white font-gilroy">
                Интегратор 2.0
              </h1>
              <Button 
                size="lg" 
                className="bg-neon text-black hover:bg-neon/90 font-bold text-lg px-8 py-6 rounded-full shadow-[0_0_30px_rgba(177,255,50,0.5)] hover:shadow-[0_0_40px_rgba(177,255,50,0.7)] transition-all"
                aria-label="Запустить ИИ Куратора"
              >
                запустить ИИ Куратора
                <MessageCircle className="w-5 h-5 ml-2" />
              </Button>
            </div>
            
            {/* 3D Robot Placeholder - Right Side */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black z-10" />
              <div 
                className="absolute right-0 top-1/2 -translate-y-1/2 w-full h-full"
                style={{
                  background: "radial-gradient(circle at center, rgba(177, 255, 50, 0.1) 0%, transparent 70%)"
                }}
              />
            </div>
          </div>
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
              className="bg-neon rounded-2xl p-6"
              aria-labelledby="materials-heading"
            >
              <h3 id="materials-heading" className="text-lg font-bold text-black mb-4 uppercase">
                договор-оферта курса интегратор 2.0
              </h3>
              <Button 
                className="w-full bg-black text-neon hover:bg-black/90 font-bold rounded-xl mb-4"
                aria-label="Посмотреть договор-оферту"
              >
                <Download className="w-4 h-4" />
                Посмотреть договор-оферту
              </Button>
              <div className="text-black text-sm mb-4">
                <p className="font-semibold">Режим работы общего чата</p>
                <p className="text-2xl font-bold">10:00—22:00</p>
              </div>
              <Button 
                className="w-full bg-black text-neon hover:bg-black/90 font-bold rounded-xl"
                aria-label="Перейти в общий чат"
              >
                Перейти в общий чат
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
              <h3 id="schedule-heading" className="text-lg font-bold text-foreground mb-4">
                Расписание Zoom-созвонов
              </h3>
              <div className="space-y-3" role="list">
                <div className="flex items-center gap-2" role="listitem">
                  <div className="w-2 h-2 rounded-full bg-foreground" />
                  <span className="text-muted-foreground text-base">Каждый понедельник в 20:00</span>
                </div>
                <div className="flex items-center gap-2" role="listitem">
                  <div className="w-2 h-2 rounded-full bg-foreground" />
                  <span className="text-muted-foreground text-base">Каждый четверг в 14:00</span>
                </div>
              </div>
            </motion.section>

            {/* Curators */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4"
              aria-labelledby="curators-heading"
            >
              <h3 id="curators-heading" className="sr-only">Кураторы</h3>
              
              {/* Curator 1 */}
              <div className="bg-neon rounded-2xl p-6" role="listitem">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-12 h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <span className="text-neon font-bold text-lg">Е</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-black/70">Куратор</p>
                    <p className="font-bold text-black text-xl">Ерке</p>
                    <p className="text-sm text-black/70">Онлайн 10:00–22:00</p>
                  </div>
                </div>
                <Button 
                  className="w-full bg-black text-neon hover:bg-black/90 font-bold rounded-xl"
                  aria-label="Написать куратору Ерке"
                >
                  Написать куратору
                </Button>
              </div>

              {/* Curator 2 */}
              <div className="bg-neon rounded-2xl p-6" role="listitem">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-12 h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <span className="text-neon font-bold text-lg">Р</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-black/70">Куратор</p>
                    <p className="font-bold text-black text-xl">Раймжан</p>
                    <p className="text-sm text-black/70">Онлайн 10:00–22:00</p>
                  </div>
                </div>
                <Button 
                  className="w-full bg-black text-neon hover:bg-black/90 font-bold rounded-xl"
                  aria-label="Написать куратору Раймжан"
                >
                  Написать куратору
                </Button>
              </div>
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
