import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { StudentCuratorChats } from "@/components/admin/StudentCuratorChats";
import {
  USE_MOCK_DATA,
  MOCK_USERS,
  MOCK_PLATFORM_STATS,
  MOCK_WEEKLY_ACTIVITY,
  MOCK_WEEKLY_TREND,
  MOCK_ACHIEVEMENTS_DATA,
  MOCK_AI_DIAGNOSTICS_DATA,
  MOCK_AI_CURATOR_DATA,
  MOCK_MARKETING_DATA,
  generateMockUserAchievements,
  generateMockUserDiagnostics,
  type MockUser
} from "@/lib/mock-data";

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
  
  // Состояние для топ учеников (реальные данные из Supabase)
  const [topStudents, setTopStudents] = useState<UserWithStats[]>([]);

  // Используем mock данные или реальные данные из Supabase
  const weeklyTrend = MOCK_WEEKLY_TREND;
  const aiDiagnosticsData = MOCK_AI_DIAGNOSTICS_DATA;
  const aiCuratorData = MOCK_AI_CURATOR_DATA;
  const achievementsData = MOCK_ACHIEVEMENTS_DATA;
  const marketingData = MOCK_MARKETING_DATA;

  // ВРЕМЕННО ОТКЛЮЧЕНО: проверка авторизации и прав админа для свободного тестирования UI
  useEffect(() => {
    // Убираем все проверки, просто загружаем страницу
    setIsAdmin(true);
    setLoading(false);
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAccess = async () => {
    // ОТКЛЮЧЕНО: для свободного доступа к странице
    // Раскомментировать когда нужно будет включить авторизацию обратно
  };

  const fetchData = async () => {
    try {
      if (USE_MOCK_DATA) {
        // Используем mock данные для демонстрации
        console.log('📊 Загружаем mock данные для демонстрации админ-панели');
        
        setStats(MOCK_PLATFORM_STATS);
        setActivityData(MOCK_WEEKLY_ACTIVITY);
        
        // Преобразуем mock пользователей в формат UserWithStats
        const mockUsersConverted = MOCK_USERS.map(user => ({
          ...user,
          stats: user.stats,
          lastActive: user.lastActive,
        })) as UserWithStats[];
        
        setUsers(mockUsersConverted);
        setTopStudents(mockUsersConverted.slice(0, 15));
        
        console.log(`✅ Загружено ${mockUsersConverted.length} mock пользователей`);
        console.log(`🏆 Топ-15 учеников готовы к отображению`);
      } else {
        // Получаем статистику платформы из реальных данных
        const platformStats = await getPlatformStats();
        setStats(platformStats);

        // Получаем данные активности за неделю для графика
        const weeklyData = await getWeeklyActivityData();
        setActivityData(weeklyData);

        // Получаем всех пользователей
        const allUsers = await getAllUsers();
        setUsers(allUsers);

        // Создаём топ-15 учеников, отсортированных по XP
        const sortedByXp = [...allUsers].sort((a, b) => {
          const aXp = a.stats?.total_xp || 0;
          const bXp = b.stats?.total_xp || 0;
          return bXp - aXp;
        });
        setTopStudents(sortedByXp.slice(0, 15));

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

      if (USE_MOCK_DATA) {
        // Используем mock данные для достижений и диагностики
        const mockAchievements = generateMockUserAchievements(user.id);
        setUserAchievements(mockAchievements as unknown as AchievementWithStatus[]);
        
        const mockDiagnostics = generateMockUserDiagnostics(user as MockUser);
        setUserDiagnostics(mockDiagnostics as unknown as DiagnosticsData);
        
        console.log(`👤 Загружены mock данные для пользователя: ${user.full_name || user.email}`);
      } else {
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
      <div className="min-h-screen bg-black p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 sm:h-20 w-full bg-[#1a1a24]" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 sm:h-32 bg-[#1a1a24]" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {[1, 2].map(i => <Skeleton key={i} className="h-48 sm:h-64 bg-[#1a1a24]" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const COLORS = ['#00FF88', '#00cc88', '#3b82f6', '#8b5cf6'];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-black p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-[#00FF88]/20 to-[#00cc88]/10 rounded-xl border border-[#00FF88]/30">
                <BarChart3 className="h-8 w-8 sm:h-10 sm:w-10 text-[#00FF88]" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white font-display">
                  Панель Активности
                </h1>
                <p className="text-gray-400 mt-1 text-sm sm:text-base">Комплексная аналитика платформы и учеников</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Card className="bg-[#1a1a24] border-gray-800">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <Button
                  variant="ghost"
                  className="gap-1 sm:gap-2 hover:bg-[#00FF88]/10 hover:text-[#00FF88] text-white text-xs sm:text-sm"
                  onClick={() => {
                    // Scroll to overview section or keep default view
                  }}
                >
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                  Обзор
                </Button>
                <Button
                  variant="ghost"
                  className="gap-1 sm:gap-2 hover:bg-[#00FF88]/10 hover:text-[#00FF88] text-white text-xs sm:text-sm"
                  onClick={() => setShowTopStudentsModal(true)}
                >
                  <Award className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Топ</span> Ученики
                </Button>
                <Button
                  variant="ghost"
                  className="gap-1 sm:gap-2 hover:bg-[#00FF88]/10 hover:text-[#00FF88] text-white text-xs sm:text-sm"
                  onClick={() => {
                    // Can add another modal or section later
                  }}
                >
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Все</span> Ученики
                </Button>
                <Button
                  variant="ghost"
                  className="gap-1 sm:gap-2 hover:bg-[#00FF88]/10 hover:text-[#00FF88] text-white text-xs sm:text-sm"
                  onClick={() => navigate("/admin/ai-curator-chats")}
                >
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Диалоги</span> AI
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
              
              <div className="relative">
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
                <div className="absolute bottom-4 right-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 bg-background/80 backdrop-blur-sm hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                    onClick={() => navigate("/admin/ai-curator-chats")}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Просмотреть диалоги
                  </Button>
                </div>
              </div>
            </div>
          </ActivitySection>

          {/* Блок 4: Маркетинг */}
          <ActivitySection
            title="Маркетинговая Аналитика"
            description="Источники трафика и конверсии"
            icon={MousePointer}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Источники трафика - Pie Chart */}
              <Card className="bg-[#1a1a24] border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-[#00FF88]" />
                    Источники трафика
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-gray-400">Распределение по каналам привлечения</CardDescription>
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
                          backgroundColor: '#1a1a24', 
                          border: '1px solid #333',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Метрики конверсии */}
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
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
                  iconColor="text-[#00FF88]"
                />
              </div>
            </div>
          </ActivitySection>

          {/* Users Table */}
          <Card className="bg-[#1a1a24] border-gray-800">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#00FF88]" />
                    Пользователи платформы
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs sm:text-sm text-gray-400">
                    Список всех зарегистрированных пользователей с базовой статистикой
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs sm:text-sm px-3 py-1 bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30">
                  Всего: {users.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
                  <div className="p-4 bg-[#00FF88]/10 rounded-full mb-4 border border-[#00FF88]/30">
                    <Users className="h-12 w-12 sm:h-16 sm:w-16 text-[#00FF88]" />
                  </div>
                  <p className="text-white text-base sm:text-lg font-medium">Пользователи не найдены</p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-2 text-center max-w-sm">
                    Зарегистрированные пользователи будут отображаться здесь
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800 hover:bg-transparent">
                        <TableHead className="text-gray-400 text-xs sm:text-sm">Email</TableHead>
                        <TableHead className="text-gray-400 text-xs sm:text-sm">Имя</TableHead>
                        <TableHead className="text-gray-400 text-xs sm:text-sm">Роль</TableHead>
                        <TableHead className="text-gray-400 text-xs sm:text-sm">Регистрация</TableHead>
                        <TableHead className="text-gray-400 text-xs sm:text-sm">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-gray-800 hover:bg-[#00FF88]/5 transition-colors">
                          <TableCell className="font-medium text-white text-xs sm:text-sm">
                            {user.email || 'Не указан'}
                          </TableCell>
                          <TableCell className="text-white text-xs sm:text-sm">
                            {user.full_name || 'Не указано'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.role === 'admin' ? 'default' : 'secondary'}
                              className={cn(
                                "text-xs",
                                user.role === 'admin' ? 'bg-[#00FF88] text-black' : 'bg-gray-700 text-white'
                              )}
                            >
                              {user.role || 'student'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs sm:text-sm">
                            {format(new Date(user.created_at), 'd MMM yyyy')}
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="hover:bg-[#00FF88]/10 hover:text-[#00FF88] text-white"
                                  onClick={() => handleViewUser(user)}
                                >
                                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#1a1a24] border-gray-700 text-white">Детали пользователя</TooltipContent>
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
          <DialogContent className="bg-[#1a1a24] border-gray-800 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl text-white">{selectedUser?.full_name || selectedUser?.email || 'Пользователь'}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-400">Детальная информация о пользователе и его прогрессе</DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid w-full grid-cols-4 bg-black border border-gray-800">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black text-white text-xs sm:text-sm">Обзор</TabsTrigger>
                  <TabsTrigger value="achievements" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black text-white text-xs sm:text-sm">Достижения</TabsTrigger>
                  <TabsTrigger value="diagnostics" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black text-white text-xs sm:text-sm">Диагностика</TabsTrigger>
                  <TabsTrigger value="ai-chats" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black text-white text-xs sm:text-sm">AI Чаты</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
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
                        <div key={achievement.id} className="flex items-center gap-3 p-3 bg-black/40 rounded-lg border border-gray-800 hover:border-[#00FF88]/30 transition-colors">
                          <Award className={cn(
                            "h-6 w-6 sm:h-8 sm:w-8",
                            achievement.completed ? "text-yellow-500" : "text-gray-600"
                          )} />
                          <div className="flex-1">
                            <h4 className="font-medium text-white text-sm sm:text-base">{achievement.title}</h4>
                            <p className="text-xs sm:text-sm text-gray-400">{achievement.description}</p>
                            {achievement.unlocked_at && (
                              <p className="text-xs text-gray-500 mt-1">
                                Получено: {format(new Date(achievement.unlocked_at), 'd MMM yyyy')}
                              </p>
                            )}
                          </div>
                          <Badge 
                            variant={achievement.completed ? "default" : "secondary"}
                            className={cn(
                              "text-xs",
                              achievement.completed ? "bg-[#00FF88] text-black" : "bg-gray-700 text-white"
                            )}
                          >
                            {achievement.completed ? "✓ Получено" : "Не получено"}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-400 py-8 text-sm">Нет данных о достижениях</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="diagnostics" className="mt-4">
                  {userDiagnostics ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="p-3 sm:p-4 bg-black/40 rounded-lg border border-gray-800">
                          <p className="text-xs sm:text-sm text-gray-400">Уроков завершено</p>
                          <p className="text-xl sm:text-2xl font-bold mt-1 text-white">{userDiagnostics.lessons_completed}</p>
                        </div>
                        <div className="p-3 sm:p-4 bg-black/40 rounded-lg border border-gray-800">
                          <p className="text-xs sm:text-sm text-gray-400">Минут в день</p>
                          <p className="text-xl sm:text-2xl font-bold mt-1 text-white">{userDiagnostics.avg_minutes_per_day}</p>
                        </div>
                        <div className="p-3 sm:p-4 bg-black/40 rounded-lg border border-gray-800">
                          <p className="text-xs sm:text-sm text-gray-400">Текущий стрик</p>
                          <p className="text-xl sm:text-2xl font-bold mt-1 text-white">{userDiagnostics.current_streak} дней</p>
                        </div>
                        <div className="p-3 sm:p-4 bg-black/40 rounded-lg border border-gray-800">
                          <p className="text-xs sm:text-sm text-gray-400">Низкая вовлечённость</p>
                          <Badge 
                            variant={userDiagnostics.flag_low_engagement ? "destructive" : "default"}
                            className={cn(
                              "mt-1 text-xs",
                              userDiagnostics.flag_low_engagement ? "bg-red-600 text-white" : "bg-[#00FF88] text-black"
                            )}
                          >
                            {userDiagnostics.flag_low_engagement ? "Да" : "Нет"}
                          </Badge>
                        </div>
                      </div>
                      {userDiagnostics.stuck_lessons.length > 0 && (
                        <div className="p-3 sm:p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                          <h4 className="font-medium text-yellow-500 mb-2 text-sm sm:text-base">Застрявшие уроки:</h4>
                          <p className="text-xs sm:text-sm text-white">{userDiagnostics.stuck_lessons.join(', ')}</p>
                        </div>
                      )}
                      <div className="p-3 sm:p-4 bg-[#00FF88]/10 rounded-lg border border-[#00FF88]/20">
                        <h4 className="font-medium text-[#00FF88] mb-2 text-sm sm:text-base">Рекомендация AI:</h4>
                        <p className="text-xs sm:text-sm text-white">{userDiagnostics.recommendation}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-8 text-sm">Нет данных диагностики</p>
                  )}
                </TabsContent>

                {/* AI Чаты */}
                <TabsContent value="ai-chats" className="mt-4">
                  <StudentCuratorChats userId={selectedUser.id} />
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Top Students Modal */}
        <Dialog open={showTopStudentsModal} onOpenChange={setShowTopStudentsModal}>
          <DialogContent className="bg-[#1a1a24] border-gray-800 max-w-6xl max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-300">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2 text-white">
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                Топ 15 Учеников Платформы
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-400">
                Лучшие ученики по совокупности показателей: XP, завершённые уроки, вовлечённость и отсутствие пропусков
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 sm:mt-6 rounded-lg border border-gray-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 bg-black/50">
                    <TableHead className="w-12 font-semibold text-gray-400 text-xs sm:text-sm">#</TableHead>
                    <TableHead className="font-semibold text-gray-400 text-xs sm:text-sm">Ученик</TableHead>
                    <TableHead className="text-right font-semibold text-gray-400 text-xs sm:text-sm">
                      <div className="flex items-center justify-end gap-1">
                        <Zap className="h-3 w-3 text-[#00FF88]" />
                        XP
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-400 text-xs sm:text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <Flame className="h-3 w-3 text-orange-500" />
                        Стрик
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-400 text-xs sm:text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <BookOpen className="h-3 w-3 text-blue-500" />
                        Уроков
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-400 text-xs sm:text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <MessageSquare className="h-3 w-3 text-purple-500" />
                        Вопросов
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-400 text-xs sm:text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <Target className="h-3 w-3 text-cyan-500" />
                        Продуктивность
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-400 text-xs sm:text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <Trophy className="h-3 w-3 text-yellow-500" />
                        Оценка
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-400 text-xs sm:text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <Heart className="h-3 w-3 text-pink-500" />
                        Поведение
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold text-gray-400 text-xs sm:text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        Активность
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topStudents.map((student, index) => {
                    const xp = student.stats?.total_xp || 0;
                    const streak = student.stats?.current_streak || 0;
                    const modulesCompleted = student.stats?.lessons_completed || 0;
                    const questionsAsked = student.stats?.questions_asked || 0;
                    const productivity = student.stats?.completion_rate || 0;
                    const rating = student.stats?.average_score || 0;
                    const behavior = productivity >= 85 ? 'Отличное' : productivity >= 70 ? 'Хорошее' : 'Среднее';
                    const lastActive = student.lastActive || format(new Date(student.created_at), 'dd.MM.yyyy');
                    
                    return (
                      <TableRow 
                        key={student.id} 
                        className="border-gray-800 hover:bg-[#00FF88]/5 transition-all duration-200 cursor-pointer group"
                        onClick={() => handleViewUser(student)}
                      >
                        <TableCell className="font-medium">
                          <Badge 
                            variant={index < 3 ? "default" : "secondary"}
                            className={cn(
                              "transition-transform group-hover:scale-110 text-xs",
                              index === 0 && "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
                              index === 1 && "bg-gray-400/20 text-gray-400 border-gray-400/50",
                              index === 2 && "bg-orange-600/20 text-orange-600 border-orange-600/50",
                              index >= 3 && "bg-gray-700 text-white"
                            )}
                          >
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xl sm:text-2xl">👤</span>
                            <div>
                              <p className="font-medium text-white text-xs sm:text-sm">{student.full_name || student.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                            <span className="font-bold text-yellow-500 text-xs sm:text-sm">{xp.toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Flame className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
                            <span className="font-medium text-white text-xs sm:text-sm">{streak}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30 text-xs">
                            {modulesCompleted}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                            <span className="font-medium text-white text-xs sm:text-sm">{questionsAsked}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Target className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
                            <Badge 
                              variant="outline"
                              className={cn(
                                "text-xs",
                                productivity >= 90 && "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30",
                                productivity >= 80 && productivity < 90 && "bg-blue-500/10 text-blue-500 border-blue-500/30",
                                productivity < 80 && "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                              )}
                            >
                              {productivity.toFixed(0)}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                            <span className="font-bold text-white text-xs sm:text-sm">{rating > 0 ? rating.toFixed(1) : '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline"
                            className={cn(
                              "text-xs",
                              behavior === 'Отличное' && "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30",
                              behavior === 'Хорошее' && "bg-blue-500/10 text-blue-500 border-blue-500/30",
                              behavior === 'Среднее' && "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                            )}
                          >
                            {behavior}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs sm:text-sm text-gray-400">
                          {lastActive}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-[#00FF88]/5 rounded-lg border border-[#00FF88]/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-[#00FF88]" />
                  <p className="text-xs sm:text-sm font-medium text-white">
                    Средняя продуктивность топ-15: <span className="text-[#00FF88] font-bold">{topStudents.length > 0 ? (topStudents.reduce((acc, s) => acc + (s.stats?.completion_rate || 0), 0) / topStudents.length).toFixed(0) : 0}%</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                  <p className="text-xs sm:text-sm font-medium text-white">
                    Суммарный XP: <span className="text-yellow-500 font-bold">{topStudents.reduce((acc, s) => acc + (s.stats?.total_xp || 0), 0).toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-[#00FF88]/10 rounded-lg border border-[#00FF88]/20 text-center">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-[#00FF88] mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Всего уроков</p>
                  <p className="text-base sm:text-lg font-bold text-[#00FF88]">{topStudents.reduce((acc, s) => acc + (s.stats?.lessons_completed || 0), 0)}</p>
                </div>
                <div className="p-2 sm:p-3 bg-orange-500/10 rounded-lg border border-orange-500/20 text-center">
                  <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Средний стрик</p>
                  <p className="text-base sm:text-lg font-bold text-orange-500">{topStudents.length > 0 ? (topStudents.reduce((acc, s) => acc + (s.stats?.current_streak || 0), 0) / topStudents.length).toFixed(0) : 0} дней</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-center">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Всего вопросов</p>
                  <p className="text-base sm:text-lg font-bold text-blue-500">{topStudents.reduce((acc, s) => acc + (s.stats?.questions_asked || 0), 0)}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
