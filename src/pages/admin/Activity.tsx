import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  CalendarIcon
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roles) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await fetchData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
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
      <div className="min-h-screen bg-[#0f172a] p-6">
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
    <div className="min-h-screen bg-[#0f172a] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white">Activity Dashboard</h1>
            <p className="text-gray-400 mt-2">Аналитика и отчёты платформы</p>
          </div>
          <Button 
            onClick={() => setShowGenerateModal(true)}
            className="bg-[#6366f1] hover:bg-[#5558e3]"
          >
            <FileText className="mr-2 h-4 w-4" />
            Сгенерировать отчёт
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#1e293b] border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Сегодня активных
              </CardTitle>
              <Users className="h-4 w-4 text-[#6366f1]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.active_today || 0}</div>
              <p className="text-xs text-green-500 mt-1">
                +{stats?.active_today_change || 0}% к вчера
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Сообщений сегодня
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-[#6366f1]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.messages_today || 0}</div>
              <p className="text-xs text-green-500 mt-1">
                +{stats?.messages_today_change || 0}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Эта неделя активных
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-[#6366f1]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.active_week || 0}</div>
              <p className="text-xs text-green-500 mt-1">
                +{stats?.active_week_change || 0}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                В риске оттока
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{stats?.at_risk || 0}</div>
              <p className="text-xs text-gray-400 mt-1">Требуют внимания</p>
            </CardContent>
          </Card>
        </div>

        {/* Reports Table */}
        <Card className="bg-[#1e293b] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">История отчётов</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileQuestion className="h-16 w-16 text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg">Отчёты ещё не создавались</p>
                <p className="text-gray-500 text-sm mt-2">
                  Нажмите кнопку выше чтобы создать первый отчёт
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Период</TableHead>
                    <TableHead className="text-gray-400">Дата создания</TableHead>
                    <TableHead className="text-gray-400">Активных юзеров</TableHead>
                    <TableHead className="text-gray-400">Настроение</TableHead>
                    <TableHead className="text-gray-400">Проблем</TableHead>
                    <TableHead className="text-gray-400">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="border-gray-700 hover:bg-[#334155]">
                      <TableCell className="text-white">{report.period_label}</TableCell>
                      <TableCell className="text-gray-400">
                        {format(new Date(report.created_at), 'd MMM yyyy, HH:mm')}
                      </TableCell>
                      <TableCell className="text-white">{report.active_users}</TableCell>
                      <TableCell>{getSentimentBadge(report.sentiment)}</TableCell>
                      <TableCell className="text-white">{report.issues_count}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedReport(report);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generate Report Modal */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="bg-[#1e293b] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Сгенерировать отчёт</DialogTitle>
            <DialogDescription className="text-gray-400">
              Выберите период для создания отчёта
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Выберите период</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="bg-[#0f172a] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-gray-700">
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
                  <label className="text-sm text-gray-400">От</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-[#0f172a] border-gray-700",
                          !startDate && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#1e293b] border-gray-700">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">До</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-[#0f172a] border-gray-700",
                          !endDate && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#1e293b] border-gray-700">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
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
              className="text-gray-400"
            >
              Отмена
            </Button>
            <Button 
              onClick={handleGenerateReport}
              disabled={generating}
              className="bg-[#6366f1] hover:bg-[#5558e3]"
            >
              {generating ? "Генерация..." : "Сгенерировать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="bg-[#1e293b] border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">
              {selectedReport?.period_label}
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Краткая сводка</h3>
                <p className="text-gray-300 text-base leading-relaxed">
                  {selectedReport.summary}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Ключевые точки</h3>
                <div className="space-y-3">
                  {selectedReport.key_points.positive?.map((point, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-green-500">✅</span>
                      <span className="text-gray-300">{point}</span>
                    </div>
                  ))}
                  {selectedReport.key_points.warnings?.map((point, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-yellow-500">⚠️</span>
                      <span className="text-gray-300">{point}</span>
                    </div>
                  ))}
                  {selectedReport.key_points.critical?.map((point, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-red-500">🔴</span>
                      <span className="text-gray-300">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Рекомендации</h3>
                <ol className="space-y-2 list-decimal list-inside">
                  {selectedReport.recommendations?.map((rec, i) => (
                    <li key={i} className="text-gray-300">{rec}</li>
                  ))}
                </ol>
              </div>

              <Button className="w-full bg-[#6366f1] hover:bg-[#5558e3]">
                <Download className="mr-2 h-4 w-4" />
                Скачать полный отчёт
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
