import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/course/ModuleCard";
import { CourseStats } from "@/components/course/CourseStats";
import { 
  DoorOpen,
  MessagesSquare,
  Cable,
  Workflow,
  Network,
  FileCheck,
  Megaphone,
  CreditCard,
  Gift,
  Users,
  Download,
  MessageCircle
} from "lucide-react";

const modules = [
  { id: 1, title: "Введение в профессию", progress: 100, icon: DoorOpen },
  { id: 2, title: "Создание GPT бота и CRM", progress: 90, icon: MessagesSquare },
  { id: 3, title: "Интеграция amoCRM и Bitrix24", progress: 80, icon: Cable },
  { id: 4, title: "Автоматизация при помощи Make", progress: 60, icon: Workflow },
  { id: 5, title: "N8N автоматизация и работа с API", progress: 50, icon: Network },
  { id: 6, title: "Реализация и закрытие проекта", progress: 40, icon: FileCheck },
  { id: 7, title: "Упаковка и продвижение", progress: 30, icon: Megaphone },
  { id: 8, title: "Продажи на высокий чек", progress: 20, icon: CreditCard },
  { id: 9, title: "Бонусы", progress: 10, icon: Gift },
  { id: 10, title: "Воркшопы", progress: 0, icon: Users }
];

const Course = () => {
  const courseProgress = 45;
  const studyTime = "6ч 30м";
  const modulesCount = "8 + бонусы";

  return (
    <div>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-black" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Hero Banner */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="relative bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-border/30 p-6 sm:p-8 md:p-10 lg:p-12">
            {/* Hero Content */}
            <div className="relative z-10 max-w-2xl">
              <p className="text-[10px] sm:text-xs md:text-sm lg:text-base text-muted-foreground mb-2 sm:mb-3 uppercase tracking-wide leading-tight">
                самый полный курс по автоматизации<br className="hidden sm:inline" />
                <span className="sm:hidden"> </span>при помощи нейросетей
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 md:mb-8 text-white font-gilroy leading-tight">
                Интегратор<span className="block sm:inline sm:ml-2 text-primary drop-shadow-[0_0_15px_rgba(177,255,50,0.8)]">2.0</span>
              </h1>
              <Button 
                size="lg" 
                className="bg-neon text-black hover:bg-neon/90 font-bold text-xs sm:text-sm md:text-base px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 rounded-full shadow-[0_0_30px_rgba(177,255,50,0.5)] hover:shadow-[0_0_40px_rgba(177,255,50,0.7)] transition-all w-full sm:w-auto"
                aria-label="Запустить ИИ Куратора"
              >
                <span className="truncate whitespace-nowrap">запустить ИИ Куратора</span>
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ml-2 flex-shrink-0" />
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Modules Section */}
          <section className="lg:col-span-2" aria-labelledby="modules-heading">
            <h2 id="modules-heading" className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-3 sm:mb-4 md:mb-6 leading-tight">
              Модули курса
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
          <aside className="space-y-4 sm:space-y-6" aria-label="Дополнительная информация">
            {/* Course Materials */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-neon rounded-2xl p-3 sm:p-4 md:p-6"
              aria-labelledby="materials-heading"
            >
              <h3 id="materials-heading" className="text-xs sm:text-sm md:text-base font-bold text-black mb-2 sm:mb-3 md:mb-4 uppercase leading-tight">
                договор-оферта курса интегратор 2.0
              </h3>
              <Button 
                className="w-full bg-black text-neon hover:bg-black/90 font-bold rounded-xl mb-2 sm:mb-3 md:mb-4 text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10"
                aria-label="Посмотреть договор-оферту"
              >
                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Посмотреть договор-оферту</span>
              </Button>
              <div className="text-black text-[10px] sm:text-xs md:text-sm mb-2 sm:mb-3 md:mb-4 leading-tight">
                <p className="font-semibold">Режим работы общего чата</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">10:00—22:00</p>
              </div>
              <Button 
                className="w-full bg-black text-neon hover:bg-black/90 font-bold rounded-xl text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10"
                aria-label="Перейти в общий чат"
              >
                <span className="truncate">Перейти в общий чат</span>
              </Button>
            </motion.section>

            {/* Schedule */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-3 sm:p-4 md:p-6"
              aria-labelledby="schedule-heading"
            >
              <h3 id="schedule-heading" className="text-sm sm:text-base md:text-lg font-bold text-foreground mb-2 sm:mb-3 md:mb-4 leading-tight">
                Расписание Zoom-созвонов
              </h3>
              <div className="space-y-1.5 sm:space-y-2 md:space-y-3" role="list">
                <div className="flex items-center gap-2" role="listitem">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-foreground flex-shrink-0" />
                  <span className="text-muted-foreground text-[10px] sm:text-xs md:text-sm leading-tight">Каждый понедельник в 20:00</span>
                </div>
                <div className="flex items-center gap-2" role="listitem">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-foreground flex-shrink-0" />
                  <span className="text-muted-foreground text-[10px] sm:text-xs md:text-sm leading-tight">Каждый четверг в 14:00</span>
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
              <div className="bg-neon rounded-2xl p-3 sm:p-4 md:p-6" role="listitem">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
                  <div 
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <span className="text-neon font-bold text-sm sm:text-base md:text-lg">Е</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-black/70 leading-tight">Куратор</p>
                    <p className="font-bold text-black text-base sm:text-lg md:text-xl truncate leading-tight">Ерке</p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-black/70 leading-tight">Онлайн 10:00–22:00</p>
                  </div>
                </div>
                <Button 
                  className="w-full bg-black text-neon hover:bg-black/90 font-bold rounded-xl text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10"
                  aria-label="Написать куратору Ерке"
                >
                  <span className="truncate">Написать куратору</span>
                </Button>
              </div>

              {/* Curator 2 */}
              <div className="bg-neon rounded-2xl p-3 sm:p-4 md:p-6" role="listitem">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
                  <div 
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <span className="text-neon font-bold text-sm sm:text-base md:text-lg">Р</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-black/70 leading-tight">Куратор</p>
                    <p className="font-bold text-black text-base sm:text-lg md:text-xl truncate leading-tight">Раймжан</p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-black/70 leading-tight">Онлайн 10:00–22:00</p>
                  </div>
                </div>
                <Button 
                  className="w-full bg-black text-neon hover:bg-black/90 font-bold rounded-xl text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10"
                  aria-label="Написать куратору Раймжан"
                >
                  <span className="truncate">Написать куратору</span>
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
          className="mt-8 sm:mt-12 md:mt-16 text-center px-4"
          role="contentinfo"
        >
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground/60 leading-relaxed">
            Powered by Neural Education Systems © 2025
          </p>
        </motion.footer>
      </div>
    </div>
  );
};

export default Course;
