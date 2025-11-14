import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Zap, TrendingUp, Calendar as CalendarIcon, Activity } from 'lucide-react';
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
  }, [user?.id, user?.role]); // ✅ Перезагружаем при смене роли

  const loadStats = async () => {
    setIsLoading(true);
    try {
      console.log('📊 Загружаем статистику токенов для пользователя:', user?.id);
      console.log('👤 Роль пользователя:', user?.role);
      
      // Для админа получаем ОБЩУЮ статистику (всех пользователей)
      // Для обычных пользователей - только свою
      const endpoint = user?.role === 'admin' 
        ? '/api/tokens/stats/total'
        : `/api/tokens/stats?userId=${user?.id}`;
      
      console.log('🔗 Запрос к:', endpoint);
      const response = await api.get(endpoint);
      
      console.log('✅ Полный response:', response);
      console.log('📊 response.data:', response.data);
      console.log('📊 response.success:', response.success);
      
      // ✅ Backend возвращает { success: true, data: {...} }
      // api.get() парсит JSON и возвращает весь объект
      const statsData = response.data || response;
      console.log('📊 Final stats:', statsData);
      
      setStats(statsData);
    } catch (error: any) {
      console.error('❌ Ошибка загрузки статистики:', error);
      console.error('❌ Детали ошибки:', error.message);
      toast({
        title: "Ошибка загрузки",
        description: error.message || "Не удалось загрузить статистику использования токенов",
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
      <div className="flex items-center justify-center min-h-screen bg-black">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Activity className="h-12 w-12 text-[#00ff00] mx-auto mb-4" />
          </motion.div>
          <p className="text-gray-400">Загрузка данных...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Заголовок */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Отслеживание токенов</h1>
            <p className="text-gray-400">Статистика использования OpenAI API</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={currency === 'usd' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrency('usd')}
              className={currency === 'usd' ? 'bg-[#00ff00] text-black hover:bg-[#00cc00]' : 'border-gray-700 text-white hover:bg-gray-800'}
            >
              USD ($)
            </Button>
            <Button
              variant={currency === 'kzt' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrency('kzt')}
              className={currency === 'kzt' ? 'bg-[#00ff00] text-black hover:bg-[#00cc00]' : 'border-gray-700 text-white hover:bg-gray-800'}
            >
              KZT (₸)
            </Button>
          </div>
        </motion.div>

        {/* Метрики */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <MetricCard
            title="Всего потрачено"
            value={formatCurrency(stats?.total_cost_usd || 0)}
            subtitle={`${(stats?.total_tokens || 0).toLocaleString()} токенов`}
            icon={<DollarSign className="h-5 w-5" />}
            index={0}
          />
          <MetricCard
            title="Всего запросов"
            value={(stats?.total_requests || 0).toString()}
            subtitle="К OpenAI API"
            icon={<Zap className="h-5 w-5" />}
            index={1}
          />
          <MetricCard
            title="Средняя стоимость"
            value={formatCurrency((stats?.total_cost_usd || 0) / (stats?.total_requests || 1))}
            subtitle="На запрос"
            icon={<TrendingUp className="h-5 w-5" />}
            index={2}
          />
        </motion.div>

        {/* Табы */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-[#1a1a24] border border-gray-800">
            <TabsTrigger 
              value="overview"
              className="data-[state=active]:bg-[#00ff00] data-[state=active]:text-black text-white"
            >
              Обзор
            </TabsTrigger>
            <TabsTrigger 
              value="agents"
              className="data-[state=active]:bg-[#00ff00] data-[state=active]:text-black text-white"
            >
              По агентам
            </TabsTrigger>
            <TabsTrigger 
              value="models"
              className="data-[state=active]:bg-[#00ff00] data-[state=active]:text-black text-white"
            >
              По моделям
            </TabsTrigger>
            <TabsTrigger 
              value="calendar"
              className="data-[state=active]:bg-[#00ff00] data-[state=active]:text-black text-white"
            >
              Календарь
            </TabsTrigger>
          </TabsList>

          {/* Обзор */}
          <TabsContent value="overview" className="space-y-4">
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* График по агентам */}
              <Card className="bg-[#1a1a24] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Затраты по AI-агентам</CardTitle>
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
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #00ff00', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* График по моделям */}
              <Card className="bg-[#1a1a24] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Затраты по моделям</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={modelData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#999" />
                      <YAxis stroke="#999" />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #00ff00', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="cost" fill="#00ff00" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Последние запросы */}
            <Card className="bg-[#1a1a24] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Последние запросы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.recent_requests?.slice(0, 10).map((req: any, idx: number) => (
                    <motion.div 
                      key={idx} 
                      className="flex justify-between items-center p-3 bg-black/40 border border-gray-800 rounded-lg hover:border-[#00ff00]/30 transition-all"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div>
                        <p className="font-medium text-white">
                          {req.assistant_type === 'curator' ? '🎓 AI-Куратор' : 
                           req.assistant_type === 'analyst' ? '📊 AI-Аналитик' : 
                           '🌟 AI-Ментор'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {format(new Date(req.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-[#00ff00]">{formatCurrency(req.total_cost_usd || 0)}</p>
                        <p className="text-sm text-gray-400">{req.total_tokens} токенов</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* По агентам */}
          <TabsContent value="agents" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agentData.map((agent, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00ff00]/50 transition-all">
                    <CardHeader>
                      <CardTitle className="text-white">{agent.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-2xl font-bold text-[#00ff00]">{formatCurrency(agent.cost)}</p>
                        <p className="text-sm text-gray-400">Всего затрачено</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-white">{agent.tokens.toLocaleString()}</p>
                        <p className="text-sm text-gray-400">Токенов использовано</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-white">{agent.requests}</p>
                        <p className="text-sm text-gray-400">Запросов выполнено</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* По моделям */}
          <TabsContent value="models" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {modelData.map((model, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00ff00]/50 transition-all">
                    <CardHeader>
                      <CardTitle className="text-white">{model.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-2xl font-bold text-[#00ff00]">{formatCurrency(model.cost)}</p>
                        <p className="text-sm text-gray-400">Всего затрачено</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-white">{model.tokens.toLocaleString()}</p>
                        <p className="text-sm text-gray-400">Токенов использовано</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-white">{model.requests}</p>
                        <p className="text-sm text-gray-400">Запросов выполнено</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Календарь */}
          <TabsContent value="calendar" className="space-y-4">
            <Card className="bg-[#1a1a24] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Календарь затрат</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border border-gray-800 text-white"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Компонент метрики
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon,
  index = 0
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  icon?: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -5 }}
    >
      <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00ff00]/50 transition-all overflow-hidden group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
          <motion.div
            className="text-[#00ff00]"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            {icon}
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#00ff00] mb-1">{value}</div>
          {subtitle && (
            <p className="text-xs text-gray-400">{subtitle}</p>
          )}
        </CardContent>
        {/* Зеленая полоска при hover */}
        <div className="h-1 w-0 bg-gradient-to-r from-[#00ff00] to-[#00cc00] group-hover:w-full transition-all duration-300" />
      </Card>
    </motion.div>
  );
}
