import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  Clock,
  BookOpen,
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

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[hsl(var(--cyber-blue))]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-5xl font-bold text-foreground mb-3 bg-gradient-to-r from-neon via-[hsl(var(--cyber-blue))] to-neon bg-clip-text text-transparent">
                Интегратор 2.0
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Самый полный курс по автоматизации при помощи нейросетей
              </p>
            </div>
            <Button 
              size="lg" 
              variant="neon"
              className="shadow-[0_0_20px_rgba(177,255,50,0.4)] hover:shadow-[0_0_30px_rgba(177,255,50,0.6)] transition-all"
            >
              Продолжить обучение
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:border-neon/50 transition-all group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-neon/10 border border-neon/30">
                  <BookOpen className="w-6 h-6 text-neon" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Прогресс по курсу</p>
                  <p className="text-3xl font-bold text-neon">{courseProgress}%</p>
                </div>
              </div>
              <Progress value={courseProgress} className="h-2" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:border-[hsl(var(--cyber-blue))]/50 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[hsl(var(--cyber-blue))]/10 border border-[hsl(var(--cyber-blue))]/30">
                  <Clock className="w-6 h-6 text-[hsl(var(--cyber-blue))]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Время обучения</p>
                  <p className="text-3xl font-bold text-[hsl(var(--cyber-blue))]">6ч 30м</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:border-neon/50 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-neon/10 border border-neon/30">
                  <Package className="w-6 h-6 text-neon" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Модулей</p>
                  <p className="text-3xl font-bold text-foreground">8 + бонусы</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Modules Section */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-foreground mb-6">Модули курса</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modules.map((module, index) => {
                const Icon = module.icon;
                return (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.03 }}
                    className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:border-neon/50 hover:shadow-[0_0_20px_rgba(177,255,50,0.2)] transition-all group cursor-pointer"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 rounded-xl bg-neon/10 border border-neon/30 group-hover:bg-neon/20 transition-colors">
                        <Icon className="w-6 h-6 text-neon" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{module.title}</h3>
                        <p className="text-sm text-neon font-medium">{module.progress}%</p>
                      </div>
                    </div>
                    <Progress value={module.progress} className="h-1.5 mb-3" />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full border border-neon/30 hover:bg-neon/10 text-neon"
                    >
                      {module.progress === 100 ? "Повторить" : module.progress > 0 ? "Продолжить" : "Начать"}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Course Materials */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-foreground mb-4">Материалы курса</h3>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Download className="w-4 h-4" />
                Договор-оферта курса
              </Button>
            </motion.div>

            {/* Schedule */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-neon" />
                Расписание созвонов
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Понедельник</span>
                  <span className="text-neon font-semibold">20:00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Четверг</span>
                  <span className="text-neon font-semibold">14:00</span>
                </div>
              </div>
            </motion.div>

            {/* Curators */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-foreground mb-4">Кураторы</h3>
              <div className="space-y-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neon/20 border border-neon/50 flex items-center justify-center">
                    <span className="text-neon font-bold">Е</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Ерке</p>
                    <p className="text-xs text-muted-foreground">онлайн 10:00–22:00</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[hsl(var(--cyber-blue))]/20 border border-[hsl(var(--cyber-blue))]/50 flex items-center justify-center">
                    <span className="text-[hsl(var(--cyber-blue))] font-bold">Р</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Раймжан</p>
                    <p className="text-xs text-muted-foreground">онлайн 10:00–22:00</p>
                  </div>
                </div>
              </div>
              <Button variant="neon" className="w-full gap-2">
                <MessageCircle className="w-4 h-4" />
                Написать куратору
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-muted-foreground/50">
            Powered by Neural Education Systems © 2025
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Course;
