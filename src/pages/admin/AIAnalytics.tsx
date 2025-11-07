import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Target,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  BookOpen,
  Activity,
  Clock,
  Bug,
  Shield,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

// ============================================
// ТИПЫ
// ============================================

interface StudentDetail {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  
  // Итоговый балл
  total_score: number;
  attention_level: "critical" | "warning" | "attention" | "normal" | "excellent";
  
  // Breakdown по критериям
  activity_score: number;
  mood_score: number;
  progress_score: number;
  interaction_score: number;
  tests_score: number;
  
  // Детальные данные
  last_visit_days: number;
  login_frequency_7d: number;
  avg_mood_7d: number;
  mood_trend: number;
  lessons_completed_7d: number;
  completion_rate: number;
  time_on_current_lesson_days: number;
  ai_questions_7d: number;
  question_type: "struggling" | "learning" | "curious";
  avg_test_score: number;
  test_attempts_avg: number;
  
  // Красные флаги
  red_flags: string[];
  yellow_flags: string[];
  
  // Рекомендации
  actions: string[];
}

interface BotConflict {
  id: string;
  student_name: string;
  conflict_type: "INCORRECT_ANSWER" | "HALLUCINATION" | "MISUNDERSTOOD_QUESTION" | "REPETITIVE_ANSWER" | "INAPPROPRIATE_TONE" | "TECHNICAL_ERROR" | "INCOMPLETE_ANSWER";
  severity: "critical" | "high" | "medium" | "low";
  user_message: string;
  ai_response: string;
  detected_issue: string;
  suggestion: string;
  created_at: string;
  status: "new" | "reviewing" | "resolved";
}

export default function AIAnalytics() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);

  // Mock данные
  const mockMetrics = {
    total_students: 150,
    active_students: 120,
    avg_mood_score: 7.2,
    ai_conversations: 89,
    problems_detected: 8,
    needs_attention: 3,
  };

  // Mock студенты с ДЕТАЛЬНЫМИ данными
  const studentsNeedAttention: StudentDetail[] = [
    {
      id: "1",
      name: "Мария Сидорова",
      email: "maria@example.com",
      total_score: 28,
      attention_level: "critical",
      
      activity_score: 12,
      mood_score: 20,
      progress_score: 10,
      interaction_score: 30,
      tests_score: 20,
      
      last_visit_days: 8,
      login_frequency_7d: 1,
      avg_mood_7d: 3.5,
      mood_trend: -2,
      lessons_completed_7d: 0,
      completion_rate: 20,
      time_on_current_lesson_days: 6,
      ai_questions_7d: 0,
      question_type: "struggling",
      avg_test_score: 45,
      test_attempts_avg: 6,
      
      red_flags: [
        "❌ Не заходила 8 дней (критично!)",
        "❌ Настроение упало на 2 пункта",
        "❌ 0 завершённых уроков за неделю",
        "❌ Застряла на уроке 8 (6 дней)",
        "❌ Низкие результаты тестов (45%)",
      ],
      yellow_flags: [
        "⚠️ Не использует AI-куратора",
      ],
      actions: [
        "🔥 СРОЧНО: Позвонить студенту",
        "📧 Отправить email с предложением помощи",
        "🤖 AI-Mentor: мотивационное сообщение",
        "👨‍🏫 Назначить персональную консультацию",
        "📚 Проверить технические проблемы (доступ?)",
      ],
    },
    {
      id: "2",
      name: "Алексей Петров",
      email: "alex@example.com",
      total_score: 45,
      attention_level: "warning",
      
      activity_score: 50,
      mood_score: 60,
      progress_score: 30,
      interaction_score: 50,
      tests_score: 40,
      
      last_visit_days: 4,
      login_frequency_7d: 2,
      avg_mood_7d: 5.5,
      mood_trend: -1,
      lessons_completed_7d: 1,
      completion_rate: 50,
      time_on_current_lesson_days: 4,
      ai_questions_7d: 8,
      question_type: "struggling",
      avg_test_score: 58,
      test_attempts_avg: 4,
      
      red_flags: [
        "❌ Много вопросов без прогресса (8 вопросов, 1 урок)",
      ],
      yellow_flags: [
        "⚠️ Нерегулярные входы (то 1 день, то 5)",
        "⚠️ Настроение падает (-1 пункт)",
        "⚠️ Застрял на уроке 5 (4 дня)",
      ],
      actions: [
        "🤖 AI-Mentor: отправить напоминание",
        "📖 Предложить помощь AI-куратора по конкретной теме",
        "📝 Рекомендовать дополнительные материалы",
        "💪 Мотивационный контент",
      ],
    },
    {
      id: "3",
      name: "Анна Иванова",
      email: "anna@example.com",
      total_score: 58,
      attention_level: "attention",
      
      activity_score: 60,
      mood_score: 50,
      progress_score: 60,
      interaction_score: 70,
      tests_score: 60,
      
      last_visit_days: 2,
      login_frequency_7d: 4,
      avg_mood_7d: 5.8,
      mood_trend: 0,
      lessons_completed_7d: 2,
      completion_rate: 65,
      time_on_current_lesson_days: 2,
      ai_questions_7d: 5,
      question_type: "learning",
      avg_test_score: 68,
      test_attempts_avg: 3,
      
      red_flags: [],
      yellow_flags: [
        "⚠️ Настроение нестабильное (колебания)",
        "⚠️ Средний темп обучения",
      ],
      actions: [
        "🤖 AI-Mentor: поддержка и поощрение",
        "📚 Рекомендации по улучшению",
        "🎯 Периодический контроль",
      ],
    },
  ];

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

  // Mock конфликты бота
  const mockConflicts: BotConflict[] = [
    {
      id: "1",
      student_name: "Мария Сидорова",
      conflict_type: "HALLUCINATION",
      severity: "critical",
      user_message: "Где находится урок 25 про квантовые нейросети?",
      ai_response: "Урок 25 про квантовые нейросети находится в модуле 5...",
      detected_issue: "Бот упомянул несуществующий урок 25",
      suggestion: "→ СРОЧНО: Обновить context с актуальным списком уроков\n→ Добавить fact-checking\n→ Prompt: отвечать ТОЛЬКО на основе данных курса",
      created_at: "2 часа назад",
      status: "new",
    },
    {
      id: "2",
      student_name: "Алексей Петров",
      conflict_type: "MISUNDERSTOOD_QUESTION",
      severity: "medium",
      user_message: "Я не понял, как работает backpropagation. Объясни простыми словами.",
      ai_response: "Backpropagation это способ обучения нейросети...",
      detected_issue: "Студент переспросил - бот не понял вопрос",
      suggestion: "→ Улучшить prompt: если не уверен - спросить уточнение\n→ Добавить clarification question\n→ Обучить на примерах",
      created_at: "5 часов назад",
      status: "reviewing",
    },
    {
      id: "3",
      student_name: "Анна Иванова",
      conflict_type: "INCOMPLETE_ANSWER",
      severity: "low",
      user_message: "Расскажи подробно про gradient descent и все его вариации.",
      ai_response: "Gradient descent - это метод оптимизации.",
      detected_issue: "Ответ слишком краткий для сложного вопроса",
      suggestion: "→ Увеличить max_tokens\n→ Prompt: давать развёрнутые ответы на сложные вопросы\n→ Follow-up: \"Хочешь подробнее?\"",
      created_at: "1 день назад",
      status: "resolved",
    },
  ];

  // Получить цвет уровня внимания
  const getAttentionLevelColor = (level: StudentDetail["attention_level"]) => {
    switch (level) {
      case "critical":
        return { bg: "bg-red-500/10", border: "border-red-500", text: "text-red-500", label: "🔴 КРИТИЧНО" };
      case "warning":
        return { bg: "bg-orange-500/10", border: "border-orange-500", text: "text-orange-500", label: "🟠 ТРЕВОЖНО" };
      case "attention":
        return { bg: "bg-yellow-500/10", border: "border-yellow-500", text: "text-yellow-500", label: "🟡 ВНИМАНИЕ" };
      case "normal":
        return { bg: "bg-green-500/10", border: "border-green-500", text: "text-green-500", label: "🟢 НОРМА" };
      case "excellent":
        return { bg: "bg-blue-500/10", border: "border-blue-500", text: "text-blue-500", label: "🌟 ОТЛИЧНО" };
      default:
        return { bg: "bg-gray-500/10", border: "border-gray-500", text: "text-gray-500", label: "❓ НЕИЗВЕСТНО" };
    }
  };

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
          onClick={() => {
            // Прокрутить к вкладке "Студенты"
            document.querySelector('[value="students"]')?.click();
          }}
        />
      </div>

      {/* Вкладки */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="insights">Инсайты</TabsTrigger>
          <TabsTrigger value="students">Студенты</TabsTrigger>
          <TabsTrigger value="conflicts">Конфликты бота</TabsTrigger>
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
              <CardTitle>Студенты, требующие внимания</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {studentsNeedAttention.map((student) => {
                  const levelColors = getAttentionLevelColor(student.attention_level);
                  
                  return (
                    <motion.div
                      key={student.id}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer
                        hover:shadow-lg transition-all
                        ${levelColors.bg} ${levelColors.border}
                      `}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon/20 to-[hsl(var(--cyber-blue))]/20 flex items-center justify-center font-bold text-foreground">
                            {student.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${levelColors.text}`}>{student.total_score}</p>
                            <p className="text-xs text-muted-foreground">баллов</p>
                          </div>
                          <Badge variant="outline" className={`${levelColors.text} ${levelColors.border}`}>
                            {levelColors.label}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Красные флаги (preview) */}
                      {student.red_flags.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-sm text-red-500 font-medium">
                            🚨 {student.red_flags[0]}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка: Конфликты бота */}
        <TabsContent value="conflicts">
          <Card>
            <CardHeader>
              <CardTitle>🤖 Конфликты и ошибки AI-куратора</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Автоматически обнаруженные проблемы в ответах бота. Кратко, по факту, с решениями.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockConflicts.map((conflict) => {
                  const severityConfig = {
                    critical: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500", icon: <Bug className="w-5 h-5" />, label: "🔴 КРИТИЧНО" },
                    high: { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500", icon: <AlertTriangle className="w-5 h-5" />, label: "🟠 ВЫСОКИЙ" },
                    medium: { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500", icon: <AlertCircle className="w-5 h-5" />, label: "🟡 СРЕДНИЙ" },
                    low: { color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500", icon: <CheckCircle2 className="w-5 h-5" />, label: "🟢 НИЗКИЙ" },
                  }[conflict.severity];

                  const typeLabels: Record<BotConflict["conflict_type"], string> = {
                    HALLUCINATION: "💭 Фантазии",
                    INCORRECT_ANSWER: "❌ Неверный ответ",
                    MISUNDERSTOOD_QUESTION: "❓ Не понял",
                    REPETITIVE_ANSWER: "🔁 Повтор",
                    INAPPROPRIATE_TONE: "😠 Неуместный тон",
                    TECHNICAL_ERROR: "⚠️ Техническая ошибка",
                    INCOMPLETE_ANSWER: "📚 Неполный ответ",
                  };

                  return (
                    <motion.div
                      key={conflict.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`
                        p-4 rounded-lg border-2
                        ${severityConfig.bg} ${severityConfig.border}
                      `}
                    >
                      {/* Заголовок */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={severityConfig.color}>
                            {severityConfig.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`${severityConfig.color} ${severityConfig.border}`}>
                                {typeLabels[conflict.conflict_type]}
                              </Badge>
                              <Badge variant="outline" className={`${severityConfig.color} ${severityConfig.border}`}>
                                {severityConfig.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Студент: {conflict.student_name} • {conflict.created_at}
                            </p>
                          </div>
                        </div>
                        <Badge variant={conflict.status === "resolved" ? "default" : "secondary"}>
                          {conflict.status === "new" && "Новый"}
                          {conflict.status === "reviewing" && "В работе"}
                          {conflict.status === "resolved" && "Решено"}
                        </Badge>
                      </div>

                      {/* Проблема */}
                      <div className="mb-3">
                        <p className={`font-semibold ${severityConfig.color} text-sm mb-1`}>
                          ПРОБЛЕМА:
                        </p>
                        <p className="text-sm text-foreground bg-secondary/50 rounded p-2">
                          {conflict.detected_issue}
                        </p>
                      </div>

                      {/* Диалог */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">ВОПРОС СТУДЕНТА:</p>
                          <p className="text-xs bg-secondary/30 rounded p-2 text-foreground">
                            "{conflict.user_message}"
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">ОТВЕТ БОТА:</p>
                          <p className="text-xs bg-secondary/30 rounded p-2 text-foreground">
                            "{conflict.ai_response.substring(0, 100)}..."
                          </p>
                        </div>
                      </div>

                      {/* Решение */}
                      <div className="bg-neon/10 border border-neon/30 rounded p-3">
                        <p className="font-semibold text-neon text-sm mb-1">
                          ✅ РЕШЕНИЕ:
                        </p>
                        <pre className="text-xs text-foreground whitespace-pre-wrap font-sans">
                          {conflict.suggestion}
                        </pre>
                      </div>

                      {/* Кнопки действий */}
                      {conflict.status !== "resolved" && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="default">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Пометить решённым
                          </Button>
                          <Button size="sm" variant="outline">
                            В работу
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Статистика конфликтов */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-red-500">1</p>
                </div>
                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">High</p>
                  <p className="text-2xl font-bold text-orange-500">0</p>
                </div>
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Medium</p>
                  <p className="text-2xl font-bold text-yellow-500">1</p>
                </div>
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Low</p>
                  <p className="text-2xl font-bold text-blue-500">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* МОДАЛЬНОЕ ОКНО: Детали студента */}
      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon/20 to-[hsl(var(--cyber-blue))]/20 flex items-center justify-center font-bold text-lg">
                  {selectedStudent.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p>{selectedStudent.name}</p>
                  <p className="text-sm text-muted-foreground font-normal">{selectedStudent.email}</p>
                </div>
              </DialogTitle>
              <DialogDescription>
                Детальная аналитика студента на основе алгоритма оценки внимания
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Итоговый балл */}
              <div className="text-center">
                <div className={`
                  inline-flex items-center justify-center w-32 h-32 rounded-full
                  ${getAttentionLevelColor(selectedStudent.attention_level).bg}
                  border-4 ${getAttentionLevelColor(selectedStudent.attention_level).border}
                `}>
                  <div>
                    <p className={`text-4xl font-bold ${getAttentionLevelColor(selectedStudent.attention_level).text}`}>
                      {selectedStudent.total_score}
                    </p>
                    <p className="text-xs text-muted-foreground">из 100</p>
                  </div>
                </div>
                <p className={`mt-3 text-xl font-bold ${getAttentionLevelColor(selectedStudent.attention_level).text}`}>
                  {getAttentionLevelColor(selectedStudent.attention_level).label}
                </p>
              </div>

              {/* Breakdown по критериям */}
              <div>
                <h3 className="text-lg font-semibold mb-4">📊 Разбивка по критериям</h3>
                <div className="space-y-4">
                  <CriteriaBar
                    label="🏃 Активность"
                    score={selectedStudent.activity_score}
                    weight={25}
                    details={`Последний визит: ${selectedStudent.last_visit_days} дней назад • Частота входов: ${selectedStudent.login_frequency_7d}/7 дней`}
                  />
                  <CriteriaBar
                    label="😊 Настроение"
                    score={selectedStudent.mood_score}
                    weight={20}
                    details={`Средний mood: ${selectedStudent.avg_mood_7d}/10 • Динамика: ${selectedStudent.mood_trend > 0 ? '+' : ''}${selectedStudent.mood_trend} пункт(а)`}
                  />
                  <CriteriaBar
                    label="📚 Прогресс обучения"
                    score={selectedStudent.progress_score}
                    weight={30}
                    details={`Завершено уроков: ${selectedStudent.lessons_completed_7d}/7 дней • Процент завершения: ${selectedStudent.completion_rate}% • Время на уроке: ${selectedStudent.time_on_current_lesson_days} дней`}
                  />
                  <CriteriaBar
                    label="💬 Взаимодействие с AI"
                    score={selectedStudent.interaction_score}
                    weight={15}
                    details={`Вопросов: ${selectedStudent.ai_questions_7d}/7 дней • Тип вопросов: ${selectedStudent.question_type === 'struggling' ? '🆘 Трудности' : selectedStudent.question_type === 'learning' ? '📖 Обучение' : '🔍 Любознательный'}`}
                  />
                  <CriteriaBar
                    label="📝 Результаты тестов"
                    score={selectedStudent.tests_score}
                    weight={10}
                    details={`Средний балл: ${selectedStudent.avg_test_score}% • Попыток на тест: ${selectedStudent.test_attempts_avg}`}
                  />
                </div>
              </div>

              {/* Красные флаги */}
              {selectedStudent.red_flags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-red-500">🚩 Красные флаги (критично!)</h3>
                  <div className="space-y-2">
                    {selectedStudent.red_flags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground">{flag}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Жёлтые флаги */}
              {selectedStudent.yellow_flags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-yellow-500">⚠️ Жёлтые флаги (наблюдение)</h3>
                  <div className="space-y-2">
                    {selectedStudent.yellow_flags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground">{flag}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Рекомендуемые действия */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-neon">✅ Рекомендуемые действия</h3>
                <div className="space-y-2">
                  {selectedStudent.actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-neon/10 border border-neon/30 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-neon flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ============================================
// КОМПОНЕНТЫ
// ============================================

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  badge?: string;
  badgeColor?: "green" | "red" | "yellow";
  onClick?: () => void;
}

function MetricCard({ title, value, icon, trend, trendUp, badge, badgeColor, onClick }: MetricCardProps) {
  return (
    <Card className={onClick ? "cursor-pointer hover:shadow-lg transition-shadow" : ""} onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="p-2 rounded-lg bg-primary/10">{icon}</div>
        </div>
        <div className="flex items-end justify-between">
          <p className="text-3xl font-bold">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${trendUp ? "text-green-500" : "text-red-500"}`}>
              {trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {trend}
            </div>
          )}
          {badge && (
            <Badge variant={badgeColor === "green" ? "default" : "destructive"}>
              {badge}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TopicBarProps {
  topic: string;
  count: number;
  total: number;
}

function TopicBar({ topic, count, total }: TopicBarProps) {
  const percentage = (count / total) * 100;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{topic}</span>
        <span className="text-muted-foreground">{count} вопросов</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-neon to-[hsl(var(--cyber-blue))]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface InsightCardProps {
  insight: {
    type: string;
    priority: string;
    title: string;
    description: string;
    action: string | null;
  };
}

function InsightCard({ insight }: InsightCardProps) {
  const getIcon = () => {
    switch (insight.type) {
      case "problem":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "trend":
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case "achievement":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default:
        return <Brain className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex gap-4 p-4 bg-secondary/30 rounded-lg border border-border">
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1">
        <h4 className="font-semibold mb-1">{insight.title}</h4>
        <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
        {insight.action && (
          <p className="text-sm text-neon">→ {insight.action}</p>
        )}
      </div>
    </div>
  );
}

interface CriteriaBarProps {
  label: string;
  score: number;
  weight: number;
  details: string;
}

function CriteriaBar({ label, score, weight, details }: CriteriaBarProps) {
  const getColor = () => {
    if (score < 30) return "bg-red-500";
    if (score < 50) return "bg-orange-500";
    if (score < 70) return "bg-yellow-500";
    if (score < 85) return "bg-green-500";
    return "bg-blue-500";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="font-semibold">{label}</span>
          <span className="text-sm text-muted-foreground ml-2">(вес: {weight}%)</span>
        </div>
        <span className="text-xl font-bold">{score}/100</span>
      </div>
      <Progress value={score} className="h-3 mb-1" />
      <p className="text-xs text-muted-foreground">{details}</p>
    </div>
  );
}
