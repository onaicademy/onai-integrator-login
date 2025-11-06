import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { TrendingUp, TrendingDown, DollarSign, Zap, AlertTriangle, Check } from 'lucide-react';
import { getDailyTokenUsage, checkBudgetLimits } from '@/lib/token-tracker';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function TokenUsagePage() {
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [limits, setLimits] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Загрузить последние 30 дней
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      const { data } = await getDailyTokenUsage(startDate, endDate);
      setDailyData(data || []);

      // Проверить лимиты
      const { data: limitsData } = await checkBudgetLimits();
      setLimits(limitsData);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Вычисления для dashboard
  const todayData = dailyData.find(d => d.date === format(new Date(), 'yyyy-MM-dd'));
  const monthTotal = dailyData.reduce((sum, d) => sum + (d.total_cost_kzt || 0), 0);
  const totalTokens = dailyData.reduce((sum, d) => sum + (d.total_tokens || 0), 0);

  // Данные для графиков
  const chartData = dailyData.slice().reverse().map(d => ({
    date: format(new Date(d.date), 'd MMM', { locale: ru }),
    cost: d.total_cost_kzt,
    tokens: d.total_tokens,
    curator: d.curator_cost_kzt,
    mentor: d.mentor_cost_kzt,
    analyst: d.analyst_cost_kzt,
  }));

  const pieData = todayData ? [
    { name: 'AI-куратор', value: todayData.curator_cost_kzt || 0, color: '#8b5cf6' },
    { name: 'AI-наставник', value: todayData.mentor_cost_kzt || 0, color: '#3b82f6' },
    { name: 'AI-аналитик', value: todayData.analyst_cost_kzt || 0, color: '#10b981' },
  ] : [];

  const modelData = todayData ? [
    { name: 'GPT-4o', value: todayData.gpt4o_cost_kzt || 0, color: '#f59e0b' },
    { name: 'GPT-3.5', value: todayData.gpt35_cost_kzt || 0, color: '#06b6d4' },
    { name: 'Whisper', value: todayData.whisper_cost_kzt || 0, color: '#ec4899' },
  ] : [];

  const limitPercentage = limits ? (limits.current_monthly_kzt / limits.monthly_limit_kzt) * 100 : 0;

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">📊 Отслеживание токенов OpenAI</h1>
        <Badge variant={limits?.limit_exceeded ? "destructive" : "default"}>
          {limits?.limit_exceeded ? "⚠️ Лимит превышен" : "✅ В норме"}
        </Badge>
      </div>

      {/* Алерты */}
      {limits?.limit_exceeded && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {limits.alert_message}
          </AlertDescription>
        </Alert>
      )}

      {limitPercentage >= 80 && limitPercentage < 100 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Внимание! Израсходовано {limitPercentage.toFixed(0)}% месячного лимита
          </AlertDescription>
        </Alert>
      )}

      {/* Метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Сегодня"
          value={`${(todayData?.total_cost_kzt || 0).toLocaleString()} ₸`}
          subtitle={`${(todayData?.total_tokens || 0).toLocaleString()} токенов`}
          icon={<DollarSign className="h-5 w-5" />}
          trend={todayData ? undefined : "Нет данных"}
        />
        <MetricCard
          title="Этот месяц"
          value={`${monthTotal.toLocaleString()} ₸`}
          subtitle={`${totalTokens.toLocaleString()} токенов`}
          icon={<TrendingUp className="h-5 w-5" />}
          progress={limitPercentage}
        />
        <MetricCard
          title="Лимит месяца"
          value={`${(limits?.monthly_limit_kzt || 0).toLocaleString()} ₸`}
          subtitle={`Осталось: ${((limits?.monthly_limit_kzt || 0) - (limits?.current_monthly_kzt || 0)).toLocaleString()} ₸`}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <MetricCard
          title="Запросов"
          value={dailyData.reduce((sum, d) => sum + (d.request_count || 0), 0).toString()}
          subtitle={`Пользователей: ${dailyData.reduce((sum, d) => sum + (d.unique_users || 0), 0)}`}
          icon={<Zap className="h-5 w-5" />}
        />
      </div>

      {/* Прогресс до лимита */}
      <Card>
        <CardHeader>
          <CardTitle>Прогресс месячного лимита</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{(limits?.current_monthly_kzt || 0).toLocaleString()} ₸</span>
              <span>{(limits?.monthly_limit_kzt || 0).toLocaleString()} ₸</span>
            </div>
            <Progress value={limitPercentage} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              {limitPercentage >= 100 
                ? "⚠️ Лимит превышен!" 
                : `${limitPercentage.toFixed(1)}% использовано`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="calendar">Календарь</TabsTrigger>
          <TabsTrigger value="agents">По агентам</TabsTrigger>
          <TabsTrigger value="models">По моделям</TabsTrigger>
        </TabsList>

        {/* Вкладка: Обзор */}
        <TabsContent value="overview" className="space-y-4">
          {/* График стоимости по дням */}
          <Card>
            <CardHeader>
              <CardTitle>Стоимость по дням (последние 30 дней)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => `${value.toLocaleString()} ₸`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Стоимость"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* График токенов */}
          <Card>
            <CardHeader>
              <CardTitle>Токены по дням</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => value.toLocaleString()} />
                  <Legend />
                  <Bar dataKey="tokens" fill="#3b82f6" name="Токены" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка: Календарь */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Выберите день</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  locale={ru}
                />
              </CardContent>
            </Card>

            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const dayData = dailyData.find(
                      d => d.date === format(selectedDate, 'yyyy-MM-dd')
                    );
                    
                    if (!dayData) {
                      return <p className="text-muted-foreground">Нет данных за этот день</p>;
                    }

                    return (
                      <div className="space-y-4">
                        <div>
                          <p className="text-2xl font-bold">{dayData.total_cost_kzt.toLocaleString()} ₸</p>
                          <p className="text-sm text-muted-foreground">
                            {dayData.total_tokens.toLocaleString()} токенов
                          </p>
                        </div>

                        <div className="space-y-2">
                          <StatRow 
                            label="AI-куратор" 
                            value={`${dayData.curator_cost_kzt} ₸`}
                            tokens={dayData.curator_tokens}
                          />
                          <StatRow 
                            label="AI-наставник" 
                            value={`${dayData.mentor_cost_kzt} ₸`}
                            tokens={dayData.mentor_tokens}
                          />
                          <StatRow 
                            label="AI-аналитик" 
                            value={`${dayData.analyst_cost_kzt} ₸`}
                            tokens={dayData.analyst_tokens}
                          />
                        </div>

                        <div className="border-t pt-4 space-y-2">
                          <StatRow 
                            label="Запросов" 
                            value={dayData.request_count}
                          />
                          <StatRow 
                            label="Пользователей" 
                            value={dayData.unique_users}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Вкладка: По агентам */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* График по агентам */}
            <Card>
              <CardHeader>
                <CardTitle>Стоимость по агентам</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => `${value.toLocaleString()} ₸`} />
                    <Legend />
                    <Bar dataKey="curator" fill="#8b5cf6" name="AI-куратор" />
                    <Bar dataKey="mentor" fill="#3b82f6" name="AI-наставник" />
                    <Bar dataKey="analyst" fill="#10b981" name="AI-аналитик" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Круговая диаграмма сегодня */}
            <Card>
              <CardHeader>
                <CardTitle>Распределение сегодня</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `${value.toLocaleString()} ₸`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground">Нет данных за сегодня</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Вкладка: По моделям */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Распределение по моделям (сегодня)</CardTitle>
            </CardHeader>
            <CardContent>
              {modelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={modelData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {modelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${value.toLocaleString()} ₸`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground">Нет данных за сегодня</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Компоненты

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  progress 
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  icon?: React.ReactNode; 
  trend?: string;
  progress?: number;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 text-sm mt-1 text-green-500">
            <TrendingUp className="h-4 w-4" />
            <span>{trend}</span>
          </div>
        )}
        {progress !== undefined && progress > 0 && (
          <Progress value={progress} className="h-2 mt-2" />
        )}
      </CardContent>
    </Card>
  );
}

function StatRow({ label, value, tokens }: { label: string; value: string | number; tokens?: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <p className="text-sm font-medium">{value}</p>
        {tokens !== undefined && (
          <p className="text-xs text-muted-foreground">{tokens.toLocaleString()} токенов</p>
        )}
      </div>
    </div>
  );
}

