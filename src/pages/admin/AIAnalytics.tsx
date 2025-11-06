import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AIAnalytics() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");

  // Mock данные
  const mockMetrics = {
    total_students: 150,
    active_students: 120,
    avg_mood_score: 7.2,
    ai_conversations: 89,
    problems_detected: 8,
    needs_attention: 3,
  };

  const mockInsights = [
    {
      type: "problem",
      priority: "high",
      title: "3 студента застряли на уроке 8",
      description: "Backpropagation вызывает сложности",
      action: "Упростить урок или добавить материалы",
    },
    {
      type: "trend",
      priority: "medium",
      title: "Рост настроения студентов",
      description: "Средний балл вырос на +0.5 за неделю",
      action: null,
    },
    {
      type: "achievement",
      priority: "low",
      title: "15 студентов завершили модуль",
      description: "Рекордное количество за неделю",
      action: null,
    },
  ];

  const studentsNeedAttention = [
    {
      name: "Мария Сидорова",
      problem: "Застряла на уроке 8 (3 дня)",
      mood_score: 6.5,
      status: "frustrated",
    },
    {
      name: "Алексей Петров",
      problem: "Не заходил 5 дней",
      mood_score: 7.0,
      status: "inactive",
    },
    {
      name: "Анна Иванова",
      problem: "Много негативных сообщений",
      mood_score: 6.2,
      status: "demotivated",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Заголовок */}
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[hsl(var(--cyber-blue))] to-neon bg-clip-text text-transparent">
            🤖 AI-аналитика
          </h1>
          <p className="text-muted-foreground mt-2">
            Мониторинг AI-систем и студентов
          </p>
        </div>
        {/* Фильтр периода */}
        <div className="flex gap-2">
          <Button
            variant={period === "day" ? "default" : "outline"}
            onClick={() => setPeriod("day")}
          >
            День
          </Button>
          <Button
            variant={period === "week" ? "default" : "outline"}
            onClick={() => setPeriod("week")}
          >
            Неделя
          </Button>
          <Button
            variant={period === "month" ? "default" : "outline"}
            onClick={() => setPeriod("month")}
          >
            Месяц
          </Button>
        </div>
      </motion.div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Всего студентов"
          value={mockMetrics.total_students}
          icon={<Users className="w-5 h-5" />}
          trend="+12%"
          trendUp={true}
        />
        <MetricCard
          title="Активных сегодня"
          value={mockMetrics.active_students}
          icon={<Target className="w-5 h-5" />}
        />
        <MetricCard
          title="Средн. настроение"
          value={`${mockMetrics.avg_mood_score}/10`}
          icon={<Brain className="w-5 h-5" />}
          badge="😊 Позитивное"
          badgeColor="green"
        />
        <MetricCard
          title="Требуют внимания"
          value={mockMetrics.needs_attention}
          icon={<AlertTriangle className="w-5 h-5" />}
          badge="Критично"
          badgeColor="red"
        />
      </div>

      {/* Вкладки */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="insights">Инсайты</TabsTrigger>
          <TabsTrigger value="students">Студенты</TabsTrigger>
        </TabsList>

        {/* Вкладка: Обзор */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* График настроения */}
            <Card>
              <CardHeader>
                <CardTitle>Тренд настроения (7 дней)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  График будет здесь (Recharts)
                </div>
              </CardContent>
            </Card>

            {/* Популярные темы */}
            <Card>
              <CardHeader>
                <CardTitle>Популярные темы вопросов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <TopicBar topic="Нейросети" count={45} total={150} />
                  <TopicBar topic="Python" count={38} total={150} />
                  <TopicBar topic="Gradient Descent" count={25} total={150} />
                  <TopicBar topic="Backpropagation" count={20} total={150} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Вкладка: Инсайты */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Инсайты и рекомендации</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockInsights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка: Студенты */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Студенты требующие внимания</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {studentsNeedAttention.map((student, i) => (
                  <StudentAlertCard key={i} student={student} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Компоненты
function MetricCard({ title, value, icon, trend, trendUp, badge, badgeColor }: any) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {trend && (
          <div
            className={`flex items-center gap-1 text-sm mt-1 ${
              trendUp ? "text-green-500" : "text-red-500"
            }`}
          >
            {trendUp ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>{trend}</span>
          </div>
        )}
        {badge && (
          <Badge
            className="mt-2"
            variant={badgeColor === "green" ? "default" : "destructive"}
          >
            {badge}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

function TopicBar({ topic, count, total }: any) {
  const percentage = (count / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{topic}</span>
        <span className="text-muted-foreground">{count}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-neon" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function InsightCard({ insight }: any) {
  const priorityColors: Record<string, "destructive" | "default" | "secondary"> = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold">{insight.title}</h3>
        <Badge variant={priorityColors[insight.priority]}>{insight.priority}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
      {insight.action && (
        <div className="text-sm">
          <p className="font-medium mb-1">Рекомендация:</p>
          <p className="text-muted-foreground">{insight.action}</p>
        </div>
      )}
    </div>
  );
}

function StudentAlertCard({ student }: any) {
  const statusColors: Record<string, "destructive" | "default" | "secondary"> = {
    frustrated: "destructive",
    inactive: "secondary",
    demotivated: "default",
  };

  return (
    <div className="border rounded-lg p-4 flex items-center justify-between">
      <div>
        <h3 className="font-semibold">{student.name}</h3>
        <p className="text-sm text-muted-foreground">{student.problem}</p>
        <p className="text-sm mt-1">Настроение: {student.mood_score}/10</p>
      </div>
      <div className="flex gap-2">
        <Badge variant={statusColors[student.status]}>{student.status}</Badge>
        <Button size="sm">Связаться</Button>
      </div>
    </div>
  );
}

