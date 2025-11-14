import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Zap, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/apiClient';

const KZT_RATE = 460; // 1 USD = 460 KZT (можно сделать динамическим)

export default function TokenUsagePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState<'usd' | 'kzt'>('usd');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user?.id]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      console.log('📊 Загружаем статистику токенов для пользователя:', user?.id);
      
      // Получаем статистику с Backend
      const response = await api.get(`/api/tokens/stats?userId=${user?.id}`);
      
      console.log('✅ Статистика получена:', response);
      setStats(response.data);
    } catch (error) {
      console.error('❌ Ошибка загрузки статистики:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить статистику использования токенов",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Конвертация валюты
  const convertCurrency = (usdAmount: number) => {
    return currency === 'usd' ? usdAmount : usdAmount * KZT_RATE;
  };

  const formatCurrency = (amount: number) => {
    const converted = convertCurrency(amount);
    return currency === 'usd' 
      ? `$${converted.toFixed(4)}` 
      : `${Math.round(converted)} ₸`;
  };

  // Данные для графика по агентам
  const agentData = stats?.by_assistant ? Object.entries(stats.by_assistant).map(([name, data]: any) => ({
    name: name === 'curator' ? 'AI-Куратор' : name === 'analyst' ? 'AI-Аналитик' : 'AI-Ментор',
    cost: convertCurrency(data.cost),
    tokens: data.tokens,
    requests: data.requests,
  })) : [];

  // Данные для графика по моделям
  const modelData = stats?.by_model ? Object.entries(stats.by_model).map(([name, data]: any) => ({
    name,
    cost: convertCurrency(data.cost),
    tokens: data.tokens,
    requests: data.requests,
  })) : [];

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Zap className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">📊 Отслеживание токенов OpenAI</h1>
        <div className="flex gap-2">
          <Button
            variant={currency === 'usd' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrency('usd')}
          >
            USD ($)
          </Button>
          <Button
            variant={currency === 'kzt' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrency('kzt')}
          >
            KZT (₸)
          </Button>
        </div>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Всего потрачено"
          value={formatCurrency(stats?.total_cost_usd || 0)}
          subtitle={`${(stats?.total_tokens || 0).toLocaleString()} токенов`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Всего запросов"
          value={(stats?.recent_requests?.length || 0).toString()}
          subtitle="За последнее время"
          icon={<Zap className="h-5 w-5" />}
        />
        <MetricCard
          title="Средняя стоимость"
          value={formatCurrency((stats?.total_cost_usd || 0) / (stats?.recent_requests?.length || 1))}
          subtitle="На запрос"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Табы */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="agents">По агентам</TabsTrigger>
          <TabsTrigger value="models">По моделям</TabsTrigger>
          <TabsTrigger value="calendar">Календарь</TabsTrigger>
        </TabsList>

        {/* Обзор */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* График по агентам */}
            <Card>
              <CardHeader>
                <CardTitle>Затраты по AI-агентам</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={agentData}
                      dataKey="cost"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.name}: ${formatCurrency(entry.cost)}`}
                    >
                      {agentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* График по моделям */}
            <Card>
              <CardHeader>
                <CardTitle>Затраты по моделям</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={modelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="cost" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Последние запросы */}
          <Card>
            <CardHeader>
              <CardTitle>Последние запросы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats?.recent_requests?.slice(0, 10).map((req: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">
                        {req.assistant_type === 'curator' ? '🎓 AI-Куратор' : 
                         req.assistant_type === 'analyst' ? '📊 AI-Аналитик' : 
                         '🌟 AI-Ментор'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(req.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(req.total_cost_usd || 0)}</p>
                      <p className="text-sm text-muted-foreground">{req.total_tokens} токенов</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* По агентам */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agentData.map((agent, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle>{agent.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(agent.cost)}</p>
                    <p className="text-sm text-muted-foreground">Всего затрачено</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{agent.tokens.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Токенов использовано</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{agent.requests}</p>
                    <p className="text-sm text-muted-foreground">Запросов выполнено</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* По моделям */}
        <TabsContent value="models" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {modelData.map((model, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle>{model.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(model.cost)}</p>
                    <p className="text-sm text-muted-foreground">Всего затрачено</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{model.tokens.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Токенов использовано</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{model.requests}</p>
                    <p className="text-sm text-muted-foreground">Запросов выполнено</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Календарь */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Календарь затрат</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Компонент метрики
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon 
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
