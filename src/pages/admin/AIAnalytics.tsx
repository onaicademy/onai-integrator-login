import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "@/utils/apiClient";
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
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем реальные данные из API
  useEffect(() => {
    loadDashboardStats();
  }, [period]);

  const loadDashboardStats = async () => {
    setIsLoading(true);
    try {
      console.log('📊 [AIAnalytics] Загружаем dashboard stats...');
      const response = await api.get('/api/analytics/dashboard-stats');
      const data = response.data || response;
      console.log('✅ [AIAnalytics] Dashboard stats загружены:', data);
      setDashboardData(data);
    } catch (error: any) {
      console.error('❌ [AIAnalytics] Ошибка загрузки stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Реальные метрики (с fallback на моки если API не загружен)
  const metrics = dashboardData?.kpi || {
    total_students: 0,
    active_today: 0,
    chat_sentiment_score: 7.0,
    attention_needed: 0,
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
    <div className="min-h-screen bg-black p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
      {/* Заголовок */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-display">
            🤖 AI-аналитика
          </h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
            Мониторинг AI-систем и студентов
          </p>
        </div>
        {/* Фильтр периода */}
        <div className="flex gap-2">
          <Button
            variant={period === "day" ? "default" : "outline"}
            onClick={() => setPeriod("day")}
            className={period === "day" ? "bg-[#00FF88] text-black hover:bg-[#00cc88]" : "border-gray-700 text-white hover:bg-gray-800"}
            size="sm"
          >
            День
          </Button>
          <Button
            variant={period === "week" ? "default" : "outline"}
            onClick={() => setPeriod("week")}
            className={period === "week" ? "bg-[#00FF88] text-black hover:bg-[#00cc88]" : "border-gray-700 text-white hover:bg-gray-800"}
            size="sm"
          >
            Неделя
          </Button>
          <Button
            variant={period === "month" ? "default" : "outline"}
            onClick={() => setPeriod("month")}
            className={period === "month" ? "bg-[#00FF88] text-black hover:bg-[#00cc88]" : "border-gray-700 text-white hover:bg-gray-800"}
            size="sm"
          >
            Месяц
          </Button>
        </div>
      </motion.div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Всего студентов"
          value={isLoading ? '...' : metrics.total_students}
          icon={<Users className="w-5 h-5" />}
        />
        <MetricCard
          title="Активных сегодня"
          value={isLoading ? '...' : metrics.active_today}
          icon={<Target className="w-5 h-5" />}
        />
        <MetricCard
          title="Средн. настроение"
          value={isLoading ? '...' : `${metrics.chat_sentiment_score}/10`}
          icon={<Brain className="w-5 h-5" />}
          badge={metrics.chat_sentiment_score >= 7 ? "😊 Позитивное" : metrics.chat_sentiment_score >= 5 ? "😐 Нейтральное" : "😟 Негативное"}
          badgeColor={metrics.chat_sentiment_score >= 7 ? "green" : metrics.chat_sentiment_score >= 5 ? "yellow" : "red"}
        />
        <MetricCard
          title="Требуют внимания"
          value={isLoading ? '...' : metrics.attention_needed}
          icon={<AlertTriangle className="w-5 h-5" />}
          badge={metrics.attention_needed > 0 ? "Критично" : "Всё в порядке"}
          badgeColor={metrics.attention_needed > 0 ? "red" : "green"}
          onClick={() => {
            // Прокрутить к вкладке "Студенты"
            document.querySelector('[value="students"]')?.click();
          }}
        />
      </div>

      {/* Вкладки */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-[#1a1a24] border border-gray-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black text-white text-xs sm:text-sm">Обзор</TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black text-white text-xs sm:text-sm">Инсайты</TabsTrigger>
          <TabsTrigger value="students" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black text-white text-xs sm:text-sm">Студенты</TabsTrigger>
          <TabsTrigger value="conflicts" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black text-white text-xs sm:text-sm">Конфликты бота</TabsTrigger>
        </TabsList>

        {/* Вкладка: Обзор */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* График настроения */}
            <Card className="bg-[#1a1a24] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-base sm:text-lg">Тренд настроения (7 дней)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64 flex items-center justify-center text-gray-400 text-sm sm:text-base">
                  График будет здесь (Recharts)
                </div>
              </CardContent>
            </Card>

            {/* Популярные темы */}
            <Card className="bg-[#1a1a24] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-base sm:text-lg">Популярные темы вопросов</CardTitle>
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
          <Card className="bg-[#1a1a24] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base sm:text-lg">Инсайты и рекомендации</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {mockInsights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка: Студенты */}
        <TabsContent value="students">
          <Card className="bg-[#1a1a24] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base sm:text-lg">Студенты, требующие внимания</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {studentsNeedAttention.map((student) => {
                  const levelColors = getAttentionLevelColor(student.attention_level);
                  
                  return (
                    <motion.div
                      key={student.id}
                      className={`
                        p-3 sm:p-4 rounded-lg border-2 cursor-pointer
                        hover:shadow-lg hover:shadow-[#00FF88]/10 transition-all
                        ${levelColors.bg} ${levelColors.border}
                      `}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#00FF88]/20 to-[#00cc88]/10 flex items-center justify-center font-bold text-white text-sm sm:text-base">
                            {student.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm sm:text-base">{student.name}</p>
                            <p className="text-xs sm:text-sm text-gray-400">{student.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                          <div className="text-right">
                            <p className={`text-xl sm:text-2xl font-bold ${levelColors.text}`}>{student.total_score}</p>
                            <p className="text-xs text-gray-500">баллов</p>
                          </div>
                          <Badge variant="outline" className={`${levelColors.text} ${levelColors.border} text-xs`}>
                            {levelColors.label}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Красные флаги (preview) */}
                      {student.red_flags.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-800">
                          <p className="text-xs sm:text-sm text-red-500 font-medium">
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
          <Card className="bg-[#1a1a24] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base sm:text-lg">🤖 Конфликты и ошибки AI-куратора</CardTitle>
              <p className="text-xs sm:text-sm text-gray-400 mt-2">
                Автоматически обнаруженные проблемы в ответах бота. Кратко, по факту, с решениями.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
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
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <Button size="sm" variant="default" className="bg-[#00FF88] text-black hover:bg-[#00cc88]">
                            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm">Пометить решённым</span>
                          </Button>
                          <Button size="sm" variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                            <span className="text-xs sm:text-sm">В работу</span>
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Статистика конфликтов */}
              <div className="mt-4 sm:mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-400">Critical</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-500">1</p>
                </div>
                <div className="p-3 sm:p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-400">High</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-500">0</p>
                </div>
                <div className="p-3 sm:p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-400">Medium</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-500">1</p>
                </div>
                <div className="p-3 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-400">Low</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-500">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* МОДАЛЬНОЕ ОКНО: Детали студента */}
      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1a1a24] border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#00FF88]/20 to-[#00cc88]/10 flex items-center justify-center font-bold text-base sm:text-lg text-white">
                  {selectedStudent.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-white">{selectedStudent.name}</p>
                  <p className="text-xs sm:text-sm text-gray-400 font-normal">{selectedStudent.email}</p>
                </div>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-400">
                Детальная аналитика студента на основе алгоритма оценки внимания
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6 mt-4">
              {/* Итоговый балл */}
              <div className="text-center">
                <div className={`
                  inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 rounded-full
                  ${getAttentionLevelColor(selectedStudent.attention_level).bg}
                  border-4 ${getAttentionLevelColor(selectedStudent.attention_level).border}
                `}>
                  <div>
                    <p className={`text-3xl sm:text-4xl font-bold ${getAttentionLevelColor(selectedStudent.attention_level).text}`}>
                      {selectedStudent.total_score}
                    </p>
                    <p className="text-xs text-gray-500">из 100</p>
                  </div>
                </div>
                <p className={`mt-3 text-lg sm:text-xl font-bold ${getAttentionLevelColor(selectedStudent.attention_level).text}`}>
                  {getAttentionLevelColor(selectedStudent.attention_level).label}
                </p>
              </div>

              {/* Breakdown по критериям */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">📊 Разбивка по критериям</h3>
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
                  <h3 className="text-base sm:text-lg font-semibold mb-3 text-red-500">🚩 Красные флаги (критично!)</h3>
                  <div className="space-y-2">
                    {selectedStudent.red_flags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 sm:p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-white">{flag}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Жёлтые флаги */}
              {selectedStudent.yellow_flags.length > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3 text-yellow-500">⚠️ Жёлтые флаги (наблюдение)</h3>
                  <div className="space-y-2">
                    {selectedStudent.yellow_flags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 sm:p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-white">{flag}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Рекомендуемые действия */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-3 text-[#00FF88]">✅ Рекомендуемые действия</h3>
                <div className="space-y-2">
                  {selectedStudent.actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 sm:p-3 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#00FF88] flex-shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm text-white">{action}</p>
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
    <Card className={`bg-[#1a1a24] border-gray-800 ${onClick ? "cursor-pointer hover:shadow-lg hover:shadow-[#00FF88]/10 transition-shadow hover:border-[#00FF88]/50" : ""}`} onClick={onClick}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs sm:text-sm text-gray-400">{title}</p>
          <div className="p-1.5 sm:p-2 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/30">{icon}</div>
        </div>
        <div className="flex items-end justify-between">
          <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-xs sm:text-sm ${trendUp ? "text-[#00FF88]" : "text-red-500"}`}>
              {trendUp ? <TrendingUp className="w-3 w-3 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
              {trend}
            </div>
          )}
          {badge && (
            <Badge variant={badgeColor === "green" ? "default" : "destructive"} className={`text-xs ${badgeColor === "green" ? "bg-[#00FF88] text-black" : "bg-red-600 text-white"}`}>
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
      <div className="flex justify-between text-xs sm:text-sm mb-1">
        <span className="font-medium text-white">{topic}</span>
        <span className="text-gray-400">{count} вопросов</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#00FF88] to-[#00cc88]"
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
        return <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />;
      case "trend":
        return <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />;
      case "achievement":
        return <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#00FF88]" />;
      default:
        return <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />;
    }
  };

  return (
    <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-black/40 rounded-lg border border-gray-800 hover:border-[#00FF88]/30 transition-colors">
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1">
        <h4 className="font-semibold mb-1 text-white text-sm sm:text-base">{insight.title}</h4>
        <p className="text-xs sm:text-sm text-gray-400 mb-2">{insight.description}</p>
        {insight.action && (
          <p className="text-xs sm:text-sm text-[#00FF88]">→ {insight.action}</p>
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
    if (score < 85) return "bg-[#00FF88]";
    return "bg-blue-500";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="font-semibold text-white text-sm sm:text-base">{label}</span>
          <span className="text-xs sm:text-sm text-gray-400 ml-2">(вес: {weight}%)</span>
        </div>
        <span className="text-lg sm:text-xl font-bold text-white">{score}/100</span>
      </div>
      <Progress value={score} className="h-2 sm:h-3 mb-1" />
      <p className="text-xs text-gray-400">{details}</p>
    </div>
  );
}
