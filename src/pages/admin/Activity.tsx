import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  AlertTriangle, 
  FileText, 
  Eye, 
  Download,
  FileQuestion,
  CalendarIcon,
  Info,
  Activity as ActivityIcon,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";

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

  // Mock data for charts
  const activityData = [
    { day: 'Пн', users: 45, messages: 120 },
    { day: 'Вт', users: 52, messages: 145 },
    { day: 'Ср', users: 49, messages: 132 },
    { day: 'Чт', users: 63, messages: 178 },
    { day: 'Пт', users: 58, messages: 165 },
    { day: 'Сб', users: 42, messages: 98 },
    { day: 'Вс', users: 38, messages: 85 },
  ];

  const weeklyTrend = [
    { week: 'Нед 1', active: 320, atRisk: 12 },
    { week: 'Нед 2', active: 345, atRisk: 8 },
    { week: 'Нед 3', active: 380, atRisk: 15 },
    { week: 'Нед 4', active: 420, atRisk: 10 },
  ];

  // ВРЕМЕННО ОТКЛЮЧЕНО: проверка авторизации и прав админа
  useEffect(() => {
    // Убираем все проверки, просто загружаем страницу
    setIsAdmin(true);
    setLoading(false);
    fetchData();
  }, []);

  const checkAdminAccess = async () => {
    // Отключено
  };

  const fetchData = async () => {
    try {
      // Fetch stats
      const { data: statsData } = await supabase
        .from('dashboard_stats')
        .select('*')
        .single();

      if (statsData) setStats(statsData);

      // Fetch reports
      const { data: reportsData } = await supabase
        .from('admin_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (reportsData) setReports(reportsData as unknown as AdminReport[]);
    } catch (error) {
      console.error('Error fetching data:', error);
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
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header with Info */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Панель Активности
                    </h1>
                    <p className="text-muted-foreground mt-1">Аналитика и отчёты платформы</p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => setShowGenerateModal(true)}
                className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                <FileText className="mr-2 h-4 w-4" />
                Сгенерировать отчёт
              </Button>
            </div>

            {/* Info Banner */}
            <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-white">📊 Как читать метрики?</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <strong className="text-white">Активные пользователи</strong> — количество уникальных пользователей, которые взаимодействовали с платформой. 
                      <strong className="text-white ml-2">Сообщения</strong> — общее количество отправленных сообщений. 
                      <strong className="text-white ml-2">В риске оттока</strong> — пользователи, которые не были активны последние 7+ дней.
                      <strong className="text-white ml-2">Процент изменения</strong> показывает динамику относительно предыдущего периода (зеленый = рост, красный = снижение).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Сегодня активных
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">Пользователи, которые зашли в систему сегодня</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats?.active_today || 0}</div>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <p className="text-xs text-green-500 font-medium">
                    +{stats?.active_today_change || 0}% к вчера
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/50 border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Сообщений сегодня
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">Общее количество отправленных сообщений за сегодня</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats?.messages_today || 0}</div>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <p className="text-xs text-green-500 font-medium">
                    +{stats?.messages_today_change || 0}% к вчера
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/50 border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Эта неделя активных
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">Уникальные пользователи за последние 7 дней</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ActivityIcon className="h-5 w-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats?.active_week || 0}</div>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <p className="text-xs text-green-500 font-medium">
                    +{stats?.active_week_change || 0}% к прошлой неделе
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/50 border-red-500/20 hover:border-red-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    В риске оттока
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">Пользователи без активности 7+ дней - требуют внимания</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">{stats?.at_risk || 0}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats?.at_risk ? `${((stats.at_risk / (stats.active_week || 1)) * 100).toFixed(1)}% от активных` : 'Нет данных'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Activity Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Активность за неделю
                </CardTitle>
                <CardDescription>
                  Динамика пользователей и сообщений по дням
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(280 100% 70%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(280 100% 70%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorUsers)"
                      name="Пользователи"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="messages" 
                      stroke="hsl(280 100% 70%)" 
                      fillOpacity={1} 
                      fill="url(#colorMessages)"
                      name="Сообщения"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Weekly Trend Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Тренд по неделям
                </CardTitle>
                <CardDescription>
                  Активные пользователи и риск оттока
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="active" fill="hsl(var(--primary))" name="Активные" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="atRisk" fill="hsl(0 84% 60%)" name="В риске" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Reports Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    История отчётов
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Сгенерированные аналитические отчёты за различные периоды
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <FileQuestion className="h-16 w-16 text-primary" />
                  </div>
                  <p className="text-foreground text-lg font-medium">Отчёты ещё не создавались</p>
                  <p className="text-muted-foreground text-sm mt-2 text-center max-w-sm">
                    Нажмите кнопку "Сгенерировать отчёт" чтобы создать первый аналитический отчёт
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Период</TableHead>
                        <TableHead className="text-muted-foreground">Дата создания</TableHead>
                        <TableHead className="text-muted-foreground">Активных юзеров</TableHead>
                        <TableHead className="text-muted-foreground">Настроение</TableHead>
                        <TableHead className="text-muted-foreground">Проблем</TableHead>
                        <TableHead className="text-muted-foreground">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id} className="border-border hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium text-foreground">{report.period_label}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(report.created_at), 'd MMM yyyy, HH:mm')}
                          </TableCell>
                          <TableCell className="text-foreground font-medium">{report.active_users}</TableCell>
                          <TableCell>{getSentimentBadge(report.sentiment)}</TableCell>
                          <TableCell>
                            <Badge variant={report.issues_count > 5 ? "destructive" : "secondary"}>
                              {report.issues_count}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="hover:bg-primary/10 hover:text-primary"
                                    onClick={() => {
                                      setSelectedReport(report);
                                      setShowDetailsModal(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Просмотреть детали</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="hover:bg-primary/10 hover:text-primary">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Скачать отчёт</TooltipContent>
                              </Tooltip>
                            </div>
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

        {/* Generate Report Modal */}
        <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Сгенерировать отчёт</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Выберите период для создания аналитического отчёта
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Выберите период</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="last-month">Последний месяц</SelectItem>
                    <SelectItem value="last-3-months">Последние 3 месяца</SelectItem>
                    <SelectItem value="last-6-months">Последние 6 месяцев</SelectItem>
                    <SelectItem value="custom">Произвольный период</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {period === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">От</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Выберите дату"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">До</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Выберите дату"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setShowGenerateModal(false)}
              >
                Отмена
              </Button>
              <Button 
                onClick={handleGenerateReport}
                disabled={generating}
                className="bg-primary hover:bg-primary/90"
              >
                {generating ? "Генерация..." : "Сгенерировать"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Report Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground text-2xl">
                {selectedReport?.period_label}
              </DialogTitle>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Краткая сводка</h3>
                  <p className="text-muted-foreground text-base leading-relaxed">
                    {selectedReport.summary}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Ключевые точки</h3>
                  <div className="space-y-3">
                    {selectedReport.key_points.positive?.map((point, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-green-500">✅</span>
                        <span className="text-muted-foreground">{point}</span>
                      </div>
                    ))}
                    {selectedReport.key_points.warnings?.map((point, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-yellow-500">⚠️</span>
                        <span className="text-muted-foreground">{point}</span>
                      </div>
                    ))}
                    {selectedReport.key_points.critical?.map((point, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-red-500">🔴</span>
                        <span className="text-muted-foreground">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Рекомендации</h3>
                  <ol className="space-y-2 list-decimal list-inside">
                    {selectedReport.recommendations?.map((rec, i) => (
                      <li key={i} className="text-muted-foreground">{rec}</li>
                    ))}
                  </ol>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90">
                  <Download className="mr-2 h-4 w-4" />
                  Скачать полный отчёт
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}