import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  AlertTriangle, 
  Eye,
  Activity as ActivityIcon,
  BarChart3,
  Trophy,
  Zap,
  Target,
  Clock,
  Brain,
  Heart,
  Sparkles,
  TrendingDown,
  MousePointer,
  Globe,
  UserCheck,
  Flame,
  Award,
  BookOpen,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Area, AreaChart, PieChart, Pie, Cell } from "recharts";
import {
  getPlatformStats,
  getWeeklyActivityData,
  getAllUsers,
  getUserStats,
  getUserAchievementsWithDetails,
  getUserLatestDiagnostics,
  type AchievementWithStatus,
  type UserStats,
  type DiagnosticsData
} from "@/lib/admin-utils";
import { StatCard } from "@/components/admin/StatCard";
import { MetricCard } from "@/components/admin/MetricCard";
import { ActivitySection } from "@/components/admin/ActivitySection";

interface DashboardStats {
  active_today: number;
  active_today_change: number;
  messages_today: number;
  messages_today_change: number;
  active_week: number;
  active_week_change: number;
  at_risk: number;
}

interface AdminReport {
  id: string;
  period_label: string;
  start_date: string;
  end_date: string;
  created_at: string;
  active_users: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  issues_count: number;
  summary: string;
  key_points: {
    positive: string[];
    warnings: string[];
    critical: string[];
  };
  recommendations: string[];
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface UserWithStats extends User {
  stats?: UserStats;
  lastActive?: string;
}

export default function Activity() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [period, setPeriod] = useState("last-month");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [generating, setGenerating] = useState(false);

  // Новые состояния для пользователей
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userAchievements, setUserAchievements] = useState<AchievementWithStatus[]>([]);
  const [userDiagnostics, setUserDiagnostics] = useState<DiagnosticsData | null>(null);
  interface ActivityData {
    day: string;
    users: number;
    messages: number;
  }
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  
  // Состояние для модального окна топ учеников
  const [showTopStudentsModal, setShowTopStudentsModal] = useState(false);

  // Mock data for analytics (будут заменены на данные из Supabase)
  const weeklyTrend = [
    { week: 'Нед 1', active: 320, atRisk: 12 },
    { week: 'Нед 2', active: 345, atRisk: 8 },
    { week: 'Нед 3', active: 380, atRisk: 15 },
    { week: 'Нед 4', active: 420, atRisk: 10 },
  ];

  // Mock: AI Diagnostician метрики
  const aiDiagnosticsData = {
    engagement_score: 78,
    at_risk_students: 12,
    stuck_lessons_count: 8,
    avg_response_time: 4.2,
    recommendations_sent: 156,
    success_rate: 85,
  };

  // Mock: AI Curator метрики  
  const aiCuratorData = {
    motivation_messages: 234,
    personalized_paths: 45,
    engagement_boost: 23,
    retention_rate: 89,
  };

  // Mock: Достижения учеников
  const achievementsData = {
    total_xp_earned: 45230,
    avg_streak: 12,
    modules_completed: 189,
    top_performers: 15,
  };

  // Mock: Топ ученики (детальные данные) - 15 лучших учеников
  const topStudentsData = [
    {
      id: '1',
      name: 'Иван',
      avatar: '👨‍💻',
      xp: 2000,
      streak: 9,
      modules_completed: 58,
      questions_to_curator: 45,
      productivity: 95,
      rating: 4.9,
      behavior: 'Отличное',
      last_active: '1 час назад',
    },
    {
      id: '2',
      name: 'Алиса',
      avatar: '👩‍🎓',
      xp: 1850,
      streak: 10,
      modules_completed: 52,
      questions_to_curator: 52,
      productivity: 92,
      rating: 4.8,
      behavior: 'Отличное',
      last_active: '2 часа назад',
    },
    {
      id: '3',
      name: 'Алина Смирнова',
      avatar: '👩‍🎓',
      xp: 1780,
      streak: 28,
      modules_completed: 50,
      questions_to_curator: 38,
      productivity: 90,
      rating: 4.7,
      behavior: 'Отличное',
      last_active: '3 часа назад',
    },
    {
      id: '4',
      name: 'Дмитрий Иванов',
      avatar: '👨‍💻',
      xp: 1690,
      streak: 24,
      modules_completed: 48,
      questions_to_curator: 41,
      productivity: 88,
      rating: 4.6,
      behavior: 'Хорошее',
      last_active: '5 часов назад',
    },
    {
      id: '5',
      name: 'Екатерина Петрова',
      avatar: '👩‍💼',
      xp: 1620,
      streak: 21,
      modules_completed: 46,
      questions_to_curator: 35,
      productivity: 87,
      rating: 4.7,
      behavior: 'Отличное',
      last_active: '4 часа назад',
    },
    {
      id: '6',
      name: 'Максим Сидоров',
      avatar: '👨‍🔬',
      xp: 1580,
      streak: 19,
      modules_completed: 45,
      questions_to_curator: 31,
      productivity: 85,
      rating: 4.5,
      behavior: 'Хорошее',
      last_active: '6 часов назад',
    },
    {
      id: '7',
      name: 'София Козлова',
      avatar: '👩‍🎨',
      xp: 1540,
      streak: 17,
      modules_completed: 43,
      questions_to_curator: 42,
      productivity: 84,
      rating: 4.6,
      behavior: 'Отличное',
      last_active: 'Вчера',
    },
    {
      id: '8',
      name: 'Артём Волков',
      avatar: '👨‍🎓',
      xp: 1490,
      streak: 15,
      modules_completed: 41,
      questions_to_curator: 29,
      productivity: 82,
      rating: 4.4,
      behavior: 'Хорошее',
      last_active: '7 часов назад',
    },
    {
      id: '9',
      name: 'Мария Новикова',
      avatar: '👩‍💼',
      xp: 1450,
      streak: 14,
      modules_completed: 40,
      questions_to_curator: 33,
      productivity: 81,
      rating: 4.5,
      behavior: 'Хорошее',
      last_active: '8 часов назад',
    },
    {
      id: '10',
      name: 'Андрей Соколов',
      avatar: '👨‍💼',
      xp: 1410,
      streak: 13,
      modules_completed: 38,
      questions_to_curator: 27,
      productivity: 80,
      rating: 4.3,
      behavior: 'Хорошее',
      last_active: '10 часов назад',
    },
    {
      id: '11',
      name: 'Ольга Морозова',
      avatar: '👩‍🔬',
      xp: 1380,
      streak: 12,
      modules_completed: 37,
      questions_to_curator: 30,
      productivity: 79,
      rating: 4.4,
      behavior: 'Хорошее',
      last_active: 'Вчера',
    },
    {
      id: '12',
      name: 'Павел Кузнецов',
      avatar: '👨‍🎨',
      xp: 1340,
      streak: 11,
      modules_completed: 36,
      questions_to_curator: 25,
      productivity: 78,
      rating: 4.2,
      behavior: 'Хорошее',
      last_active: 'Вчера',
    },
    {
      id: '13',
      name: 'Наталья Лебедева',
      avatar: '👩‍💻',
      xp: 1310,
      streak: 10,
      modules_completed: 35,
      questions_to_curator: 28,
      productivity: 77,
      rating: 4.3,
      behavior: 'Хорошее',
      last_active: '2 дня назад',
    },
    {
      id: '14',
      name: 'Сергей Попов',
      avatar: '👨‍🏫',
      xp: 1280,
      streak: 9,
      modules_completed: 34,
      questions_to_curator: 24,
      productivity: 76,
      rating: 4.2,
      behavior: 'Среднее',
      last_active: '2 дня назад',
    },
    {
      id: '15',
      name: 'Елена Васильева',
      avatar: '👩‍🏫',
      xp: 1250,
      streak: 8,
      modules_completed: 33,
      questions_to_curator: 26,
      productivity: 75,
      rating: 4.1,
      behavior: 'Среднее',
      last_active: '3 дня назад',
    },
  ];

  // Mock: Маркетинг
  const marketingData = {
    traffic_sources: [
      { name: 'Органика', value: 45, color: '#10b981' },
      { name: 'Реклама', value: 30, color: '#3b82f6' },
      { name: 'Соц. сети', value: 15, color: '#8b5cf6' },
      { name: 'Прямой', value: 10, color: '#f59e0b' },
    ],
    bounce_rate: 23,
    avg_session: 8.5,
    conversion_rate: 4.2,
  };

  // Проверка авторизации и прав админа
  useEffect(() => {
    checkAdminAccess();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Требуется авторизация",
          description: "Пожалуйста, войдите в систему",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      // Проверяем роль пользователя
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError || userRole?.role !== 'admin') {
        toast({
          title: "Доступ запрещен",
          description: "Требуются права администратора",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await fetchData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось проверить права доступа",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      // Получаем статистику платформы из реальных данных
      const platformStats = await getPlatformStats();
      setStats(platformStats);

      // Получаем данные активности за неделю для графика
      const weeklyData = await getWeeklyActivityData();
      setActivityData(weeklyData);

      // Получаем всех пользователей
      const allUsers = await getAllUsers();
      setUsers(allUsers);

      // Получаем отчёты (если есть таблица)
      try {
        const { data: reportsData } = await supabase
          .from('admin_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (reportsData) setReports(reportsData as unknown as AdminReport[]);
      } catch (error) {
        // Таблица admin_reports может не существовать - это нормально
        console.log('admin_reports table not found, skipping...');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Ошибка загрузки данных",
        description: "Не удалось загрузить некоторые данные",
        variant: "destructive"
      });
    }
  };

  // Функция для просмотра детальной информации о пользователе
  const handleViewUser = async (user: UserWithStats) => {
    try {
      setSelectedUser(user);
      setShowUserModal(true);

      // Загружаем статистику пользователя
      const stats = await getUserStats(user.id);
      setSelectedUser(prev => prev ? { ...prev, stats } : null);

      // Загружаем достижения пользователя
      const achievements = await getUserAchievementsWithDetails(user.id);
      setUserAchievements(achievements);

      // Загружаем диагностику
      const diagnostics = await getUserLatestDiagnostics(user.id);
      if (diagnostics) {
        setUserDiagnostics(diagnostics.data_json);
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить детали пользователя",
        variant: "destructive"
      });
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      let start: Date, end: Date, label: string;

      if (period === "custom") {
        if (!startDate || !endDate) {
          toast({
            title: "Ошибка",
            description: "Выберите даты начала и окончания",
            variant: "destructive"
          });
          setGenerating(false);
          return;
        }
        start = startDate;
        end = endDate;
        label = `${format(start, 'dd.MM.yyyy')} - ${format(end, 'dd.MM.yyyy')}`;
      } else {
        const now = new Date();
        end = now;
        
        switch (period) {
          case "last-month":
            start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            label = "Последний месяц";
            break;
          case "last-3-months":
            start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            label = "Последние 3 месяца";
            break;
          case "last-6-months":
            start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
            label = "Последние 6 месяцев";
            break;
          default:
            start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            label = "Последний месяц";
        }
      }

      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          start_date: format(start, 'yyyy-MM-dd'),
          end_date: format(end, 'yyyy-MM-dd'),
          period_label: label
        }
      });

      if (error) throw error;

      toast({
        title: "Отчёт готов! ✅",
        description: "Отчёт успешно сгенерирован"
      });

      setShowGenerateModal(false);
      await fetchData();
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать отчёт",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-green-500">😊 Позитивное</Badge>;
      case 'neutral':
        return <Badge className="bg-yellow-500">😐 Нейтральное</Badge>;
      case 'negative':
        return <Badge className="bg-red-500">😠 Негативное</Badge>;
      default:
        return <Badge>-</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map(i => <Skeleton key={i} className="h-64" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl">
                <BarChart3 className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Панель Активности
                </h1>
                <p className="text-muted-foreground mt-2">Комплексная аналитика платформы и учеников</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Card className="bg-card/50 border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="ghost"
                  className="gap-2 hover:bg-primary/10 hover:text-primary"
                  onClick={() => {
                    // Scroll to overview section or keep default view
                  }}
                >
                  <BarChart3 className="h-4 w-4" />
                  Обзор
                </Button>
                <Button
                  variant="ghost"
                  className="gap-2 hover:bg-primary/10 hover:text-primary"
                  onClick={() => setShowTopStudentsModal(true)}
                >
                  <Award className="h-4 w-4" />
                  Топ Ученики
                </Button>
                <Button
                  variant="ghost"
                  className="gap-2 hover:bg-primary/10 hover:text-primary"
                  onClick={() => {
                    // Can add another modal or section later
                  }}
                >
                  <Users className="h-4 w-4" />
                  Все Ученики
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Блок 1: Общая активность */}
          <ActivitySection
            title="Общая Активность"
            description="Ключевые показатели активности платформы"
            icon={ActivityIcon}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Сегодня активных"
                value={stats?.active_today || 0}
                icon={Users}
                tooltip="Пользователи, которые зашли в систему сегодня"
                trend={{
                  value: stats?.active_today_change || 0,
                  isPositive: (stats?.active_today_change || 0) > 0,
                  label: "к вчера"
                }}
                gradientFrom="from-primary/10"
                gradientTo="to-primary/5"
                iconColor="text-primary"
              />
              
              <StatCard
                title="Сообщений сегодня"
                value={stats?.messages_today || 0}
                icon={MessageSquare}
                tooltip="Общее количество отправленных сообщений за сегодня"
                trend={{
                  value: stats?.messages_today_change || 0,
                  isPositive: (stats?.messages_today_change || 0) > 0,
                  label: "к вчера"
                }}
                gradientFrom="from-purple-500/10"
                gradientTo="to-purple-500/5"
                iconColor="text-purple-500"
              />
              
              <StatCard
                title="Эта неделя активных"
                value={stats?.active_week || 0}
                icon={TrendingUp}
                tooltip="Уникальные пользователи за последние 7 дней"
                trend={{
                  value: stats?.active_week_change || 0,
                  isPositive: (stats?.active_week_change || 0) > 0,
                  label: "к прошлой неделе"
                }}
                gradientFrom="from-blue-500/10"
                gradientTo="to-blue-500/5"
                iconColor="text-blue-500"
              />
              
              <StatCard
                title="В риске оттока"
                value={stats?.at_risk || 0}
                icon={AlertTriangle}
                tooltip="Пользователи без активности 7+ дней - требуют внимания"
                description={stats?.at_risk ? `${((stats.at_risk / (stats.active_week || 1)) * 100).toFixed(1)}% от активных` : 'Нет данных'}
                gradientFrom="from-red-500/10"
                gradientTo="to-red-500/5"
                iconColor="text-red-500"
              />
            </div>
          </ActivitySection>

          {/* Блок 2: Достижения учеников */}
          <ActivitySection
            title="Достижения Учеников"
            description="Прогресс, XP и стрики"
            icon={Trophy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Всего XP заработано"
                value={achievementsData.total_xp_earned.toLocaleString()}
                icon={Zap}
                tooltip="Общий опыт, заработанный всеми учениками"
                gradientFrom="from-yellow-500/10"
                gradientTo="to-yellow-500/5"
                iconColor="text-yellow-500"
              />
              
              <StatCard
                title="Средний стрик"
                value={`${achievementsData.avg_streak} дней`}
                icon={Flame}
                tooltip="Средняя длина активности без перерывов"
                gradientFrom="from-orange-500/10"
                gradientTo="to-orange-500/5"
                iconColor="text-orange-500"
              />
              
              <StatCard
                title="Модулей завершено"
                value={achievementsData.modules_completed}
                icon={BookOpen}
                tooltip="Общее количество завершённых модулей"
                gradientFrom="from-green-500/10"
                gradientTo="to-green-500/5"
                iconColor="text-green-500"
              />
              
              <StatCard
                title="Топ учеников"
                value={achievementsData.top_performers}
                icon={Award}
                tooltip="Ученики с наивысшими показателями"
                gradientFrom="from-purple-500/10"
                gradientTo="to-purple-500/5"
                iconColor="text-purple-500"
                onClick={() => setShowTopStudentsModal(true)}
              />
            </div>
          </ActivitySection>

          {/* Блок 3: AI-Диагностика */}
          <ActivitySection
            title="AI-Диагностика"
            description="Анализ от AI-наставника и AI-куратора"
            icon={Brain}
            badge="AI-Powered"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MetricCard
                title="AI Diagnostician"
                description="Метрики вовлечённости и рекомендаций"
                icon={Sparkles}
                iconColor="text-cyan-500"
                items={[
                  { 
                    label: "Оценка вовлечённости", 
                    value: `${aiDiagnosticsData.engagement_score}%`,
                    badge: { text: aiDiagnosticsData.engagement_score > 70 ? "Хорошо" : "Низко", variant: aiDiagnosticsData.engagement_score > 70 ? "default" : "destructive" }
                  },
                  { label: "Учеников в риске", value: aiDiagnosticsData.at_risk_students },
                  { label: "Застрявших уроков", value: aiDiagnosticsData.stuck_lessons_count },
                  { label: "Время отклика AI", value: `${aiDiagnosticsData.avg_response_time}s` },
                  { label: "Рекомендаций отправлено", value: aiDiagnosticsData.recommendations_sent },
                  { 
                    label: "Успешность рекомендаций", 
                    value: `${aiDiagnosticsData.success_rate}%`,
                    badge: { text: "Отлично", variant: "default" }
                  },
                ]}
              />
              
              <MetricCard
                title="AI Curator"
                description="Персонализация и мотивация"
                icon={Heart}
                iconColor="text-pink-500"
                items={[
                  { label: "Мотивационных сообщений", value: aiCuratorData.motivation_messages },
                  { label: "Персонализированных путей", value: aiCuratorData.personalized_paths },
                  { 
                    label: "Прирост вовлечённости", 
                    value: `+${aiCuratorData.engagement_boost}%`,
                    badge: { text: "↑", variant: "default" }
                  },
                  { 
                    label: "Уровень удержания", 
                    value: `${aiCuratorData.retention_rate}%`,
                    badge: { text: "Высокий", variant: "default" }
                  },
                ]}
              />
            </div>
          </ActivitySection>

          {/* Блок 4: Маркетинг */}
          <ActivitySection
            title="Маркетинговая Аналитика"
            description="Источники трафика и конверсии"
            icon={MousePointer}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Источники трафика - Pie Chart */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Источники трафика
                  </CardTitle>
                  <CardDescription>Распределение по каналам привлечения</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={marketingData.traffic_sources}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {marketingData.traffic_sources.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Метрики конверсии */}
              <div className="grid grid-cols-1 gap-4">
                <StatCard
                  title="Bounce Rate"
                  value={`${marketingData.bounce_rate}%`}
                  icon={TrendingDown}
                  tooltip="Процент посетителей, покинувших сайт после просмотра одной страницы"
                  gradientFrom="from-red-500/10"
                  gradientTo="to-red-500/5"
                  iconColor="text-red-500"
                />
                
                <StatCard
                  title="Средняя сессия"
                  value={`${marketingData.avg_session} мин`}
                  icon={Clock}
                  tooltip="Среднее время, проведённое на платформе"
                  gradientFrom="from-blue-500/10"
                  gradientTo="to-blue-500/5"
                  iconColor="text-blue-500"
                />
                
                <StatCard
                  title="Конверсия"
                  value={`${marketingData.conversion_rate}%`}
                  icon={UserCheck}
                  tooltip="Процент посетителей, ставших активными пользователями"
                  gradientFrom="from-green-500/10"
                  gradientTo="to-green-500/5"
                  iconColor="text-green-500"
                />
              </div>
            </div>
          </ActivitySection>

          {/* Users Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Пользователи платформы
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Список всех зарегистрированных пользователей с базовой статистикой
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  Всего: {users.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <Users className="h-16 w-16 text-primary" />
                  </div>
                  <p className="text-foreground text-lg font-medium">Пользователи не найдены</p>
                  <p className="text-muted-foreground text-sm mt-2 text-center max-w-sm">
                    Зарегистрированные пользователи будут отображаться здесь
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Email</TableHead>
                        <TableHead className="text-muted-foreground">Имя</TableHead>
                        <TableHead className="text-muted-foreground">Роль</TableHead>
                        <TableHead className="text-muted-foreground">Регистрация</TableHead>
                        <TableHead className="text-muted-foreground">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-border hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium text-foreground">
                            {user.email || 'Не указан'}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {user.full_name || 'Не указано'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role || 'student'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(user.created_at), 'd MMM yyyy')}
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="hover:bg-primary/10 hover:text-primary"
                                  onClick={() => handleViewUser(user)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Детали пользователя</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Details Modal */}
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedUser?.full_name || selectedUser?.email || 'Пользователь'}</DialogTitle>
              <DialogDescription>Детальная информация о пользователе и его прогрессе</DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Обзор</TabsTrigger>
                  <TabsTrigger value="achievements">Достижения</TabsTrigger>
                  <TabsTrigger value="diagnostics">Диагностика</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <StatCard
                      title="Всего XP"
                      value={selectedUser.stats?.total_xp || 0}
                      icon={Zap}
                      gradientFrom="from-yellow-500/10"
                      gradientTo="to-yellow-500/5"
                      iconColor="text-yellow-500"
                    />
                    <StatCard
                      title="Уроков завершено"
                      value={selectedUser.stats?.completed_lessons || 0}
                      icon={BookOpen}
                      gradientFrom="from-green-500/10"
                      gradientTo="to-green-500/5"
                      iconColor="text-green-500"
                    />
                    <StatCard
                      title="Достижений"
                      value={selectedUser.stats?.achievements_count || 0}
                      icon={Trophy}
                      gradientFrom="from-purple-500/10"
                      gradientTo="to-purple-500/5"
                      iconColor="text-purple-500"
                    />
                    <StatCard
                      title="Минут в день"
                      value={selectedUser.stats?.avg_minutes_per_day || 0}
                      icon={Clock}
                      gradientFrom="from-blue-500/10"
                      gradientTo="to-blue-500/5"
                      iconColor="text-blue-500"
                    />
                    <StatCard
                      title="Текущий стрик"
                      value={`${selectedUser.stats?.current_streak || 0} д`}
                      icon={Flame}
                      gradientFrom="from-orange-500/10"
                      gradientTo="to-orange-500/5"
                      iconColor="text-orange-500"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="achievements" className="mt-4">
                  <div className="space-y-3">
                    {userAchievements.length > 0 ? (
                      userAchievements.map((achievement) => (
                        <div key={achievement.id} className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border">
                          <Award className={cn(
                            "h-8 w-8",
                            achievement.completed ? "text-yellow-500" : "text-muted-foreground"
                          )} />
                          <div className="flex-1">
                            <h4 className="font-medium">{achievement.title}</h4>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            {achievement.unlocked_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Получено: {format(new Date(achievement.unlocked_at), 'd MMM yyyy')}
                              </p>
                            )}
                          </div>
                          <Badge variant={achievement.completed ? "default" : "secondary"}>
                            {achievement.completed ? "✓ Получено" : "Не получено"}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Нет данных о достижениях</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="diagnostics" className="mt-4">
                  {userDiagnostics ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-card/50 rounded-lg border border-border">
                          <p className="text-sm text-muted-foreground">Уроков завершено</p>
                          <p className="text-2xl font-bold mt-1">{userDiagnostics.lessons_completed}</p>
                        </div>
                        <div className="p-4 bg-card/50 rounded-lg border border-border">
                          <p className="text-sm text-muted-foreground">Минут в день</p>
                          <p className="text-2xl font-bold mt-1">{userDiagnostics.avg_minutes_per_day}</p>
                        </div>
                        <div className="p-4 bg-card/50 rounded-lg border border-border">
                          <p className="text-sm text-muted-foreground">Текущий стрик</p>
                          <p className="text-2xl font-bold mt-1">{userDiagnostics.current_streak} дней</p>
                        </div>
                        <div className="p-4 bg-card/50 rounded-lg border border-border">
                          <p className="text-sm text-muted-foreground">Низкая вовлечённость</p>
                          <Badge variant={userDiagnostics.flag_low_engagement ? "destructive" : "default"}>
                            {userDiagnostics.flag_low_engagement ? "Да" : "Нет"}
                          </Badge>
                        </div>
                      </div>
                      {userDiagnostics.stuck_lessons.length > 0 && (
                        <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                          <h4 className="font-medium text-yellow-500 mb-2">Застрявшие уроки:</h4>
                          <p className="text-sm">{userDiagnostics.stuck_lessons.join(', ')}</p>
                        </div>
                      )}
                      <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                        <h4 className="font-medium text-primary mb-2">Рекомендация AI:</h4>
                        <p className="text-sm">{userDiagnostics.recommendation}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Нет данных диагностики</p>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Top Students Modal */}
        <Dialog open={showTopStudentsModal} onOpenChange={setShowTopStudentsModal}>
          <DialogContent className="bg-card border-border max-w-6xl max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-300">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Award className="h-6 w-6 text-yellow-500" />
                Топ 15 Учеников Платформы
              </DialogTitle>
              <DialogDescription>
                Лучшие ученики по совокупности показателей: XP, завершённые уроки, вовлечённость и отсутствие пропусков
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-6 rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 bg-muted/30">
                    <TableHead className="w-12 font-semibold">#</TableHead>
                    <TableHead className="font-semibold">Ученик</TableHead>
                    <TableHead className="text-right font-semibold">
                      <div className="flex items-center justify-end gap-1">
                        <Zap className="h-3 w-3" />
                        XP
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Flame className="h-3 w-3" />
                        Стрик
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        Уроков
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Вопросов
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Target className="h-3 w-3" />
                        Продуктивность
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Trophy className="h-3 w-3" />
                        Оценка
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Heart className="h-3 w-3" />
                        Поведение
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        Активность
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topStudentsData.map((student, index) => (
                    <TableRow 
                      key={student.id} 
                      className="border-border/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer group"
                    >
                      <TableCell className="font-medium">
                        <Badge 
                          variant={index < 3 ? "default" : "secondary"}
                          className={cn(
                            "transition-transform group-hover:scale-110",
                            index === 0 && "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
                            index === 1 && "bg-gray-400/20 text-gray-400 border-gray-400/50",
                            index === 2 && "bg-orange-600/20 text-orange-600 border-orange-600/50"
                          )}
                        >
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{student.avatar}</span>
                          <div>
                            <p className="font-medium">{student.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          <span className="font-bold text-yellow-500">{student.xp.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span className="font-medium">{student.streak}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                          {student.modules_completed}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{student.questions_to_curator}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Target className="h-4 w-4 text-purple-500" />
                          <Badge 
                            variant="outline"
                            className={cn(
                              student.productivity >= 90 && "bg-green-500/10 text-green-500 border-green-500/30",
                              student.productivity >= 80 && student.productivity < 90 && "bg-blue-500/10 text-blue-500 border-blue-500/30",
                              student.productivity < 80 && "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                            )}
                          >
                            {student.productivity}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="font-bold">{student.rating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline"
                          className={cn(
                            student.behavior === 'Отличное' && "bg-green-500/10 text-green-500 border-green-500/30",
                            student.behavior === 'Хорошее' && "bg-blue-500/10 text-blue-500 border-blue-500/30"
                          )}
                        >
                          {student.behavior}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {student.last_active}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium">
                    Средняя продуктивность топ-15: <span className="text-primary font-bold">{(topStudentsData.reduce((acc, s) => acc + s.productivity, 0) / topStudentsData.length).toFixed(0)}%</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <p className="text-sm font-medium">
                    Суммарный XP: <span className="text-yellow-500 font-bold">{topStudentsData.reduce((acc, s) => acc + s.xp, 0).toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
                  <BookOpen className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Всего уроков</p>
                  <p className="text-lg font-bold text-green-500">{topStudentsData.reduce((acc, s) => acc + s.modules_completed, 0)}</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20 text-center">
                  <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Средний стрик</p>
                  <p className="text-lg font-bold text-orange-500">{(topStudentsData.reduce((acc, s) => acc + s.streak, 0) / topStudentsData.length).toFixed(0)} дней</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-center">
                  <MessageSquare className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Всего вопросов</p>
                  <p className="text-lg font-bold text-blue-500">{topStudentsData.reduce((acc, s) => acc + s.questions_to_curator, 0)}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
