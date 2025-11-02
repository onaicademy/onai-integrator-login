import { motion } from "framer-motion";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Target, MessageCircle, TrendingUp, Flame, CheckCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NeuroHub = () => {
  const navigate = useNavigate();
  const [streak] = useState(4);

  const missions = [
    { id: 1, title: "Пройди 3 урока подряд", completed: false, progress: 1 },
    { id: 2, title: "Создай первого бота", completed: false, progress: 0 },
    { id: 3, title: "Заработай +100 XP за день", completed: true, progress: 100 },
  ];

  const updates = [
    { id: 1, title: "Добавлен новый модуль 'Продажи на высокий чек'", date: "Сегодня" },
    { id: 2, title: "AI-ассистент теперь умеет анализировать твой прогресс", date: "2 дня назад" },
  ];

  return (
    <div className="relative overflow-hidden min-h-screen bg-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-primary">Neuro</span>
            <span className="text-foreground">HUB</span>
          </h1>
          <p className="text-muted-foreground">Твой персональный AI-центр обучения</p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI-Наставник */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(177,255,50,0.3)",
                        "0 0 40px rgba(177,255,50,0.5)",
                        "0 0 20px rgba(177,255,50,0.3)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
                  >
                    <Brain className="w-8 h-8 text-primary" />
                  </motion.div>
                  <div>
                    <CardTitle>AI-Наставник</CardTitle>
                    <CardDescription>Твой AI-наставник помогает тебе развиваться быстрее</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start border-primary/40 hover:bg-primary/10 hover:border-primary group transition-all duration-300"
                  onClick={() => navigate("/course/1")}
                >
                  <Target className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
                  Рекомендовать урок
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-primary/40 hover:bg-primary/10 hover:border-primary group transition-all duration-300"
                >
                  <Sparkles className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
                  Цель недели
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-primary/40 hover:bg-primary/10 hover:border-primary group transition-all duration-300"
                >
                  <MessageCircle className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
                  Спросить у наставника
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Активность */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-primary/20 bg-card/50 backdrop-blur-sm h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Активность
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Время в обучении</span>
                    <span className="font-semibold text-foreground">12ч 30м</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Уроков за неделю</span>
                    <span className="font-semibold text-foreground">8</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Заработанный XP</span>
                    <span className="font-semibold text-primary">+420</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span className="text-foreground">Ты учишься уже <span className="font-bold text-primary">{streak} дня</span> подряд!</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Мини-миссии */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold mb-4">
            <span className="text-primary">Мини</span>
            <span className="text-foreground">-миссии</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {missions.map((mission) => (
              <Card
                key={mission.id}
                className={`border-primary/20 bg-card/50 backdrop-blur-sm transition-all duration-300 ${
                  mission.completed ? "border-primary/60 shadow-[0_0_20px_rgba(177,255,50,0.2)]" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-medium">{mission.title}</p>
                    {mission.completed && (
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                  {!mission.completed && (
                    <div className="space-y-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(mission.progress / 3) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{mission.progress}/3</p>
                    </div>
                  )}
                  {mission.completed && (
                    <p className="text-xs text-primary font-semibold">Выполнено ✅</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Обновления платформы */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold mb-4">
            <span className="text-primary">Обновления</span>
            <span className="text-foreground"> платформы</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {updates.map((update) => (
              <Card
                key={update.id}
                className="border-primary/20 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-all duration-300 cursor-pointer group"
              >
                <CardContent className="p-6">
                  <p className="text-sm font-medium mb-2 group-hover:text-primary transition-colors">
                    {update.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{update.date}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Совет дня */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Brain className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm font-semibold text-primary mb-1">Совет дня</p>
                  <p className="text-sm text-foreground">
                    Советуем повторить модуль <span className="font-bold text-primary">'Make'</span> — ты проходил его 10 дней назад.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default NeuroHub;
