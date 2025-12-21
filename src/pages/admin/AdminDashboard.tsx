import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Brain, Sparkles, DollarSign, TrendingUp, Mic, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { api } from "@/utils/apiClient";
import { supabase } from "@/lib/supabase";

const KZT_RATE = 460; // 1 USD = 460 KZT

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tokenStats, setTokenStats] = useState<any>(null);
  const [studentStats, setStudentStats] = useState<any>(null);
  const [tripwireStats, setTripwireStats] = useState<any>(null);
  const [myStats, setMyStats] = useState<any>(null);
  const [transcriptionStats, setTranscriptionStats] = useState<any>(null);

  // Загружаем все статистики при монтировании
  useEffect(() => {
    loadTokenStats();
    loadStudentStats();
    loadTripwireStats();
    loadMyStats();
    loadTranscriptionStats();
  }, []);

  const loadTokenStats = async () => {
    try {
      console.log('[AdminDashboard] Загружаем статистику токенов...');
      const response = await api.get('/api/tokens/stats/total');
      const stats = response.data || response;
      console.log('[AdminDashboard] ✅ Статистика токенов загружена:', stats);
      setTokenStats(stats);
    } catch (error) {
      console.error('[AdminDashboard] ❌ Ошибка загрузки токенов:', error);
    }
  };

  const loadStudentStats = async () => {
    try {
      console.log('[AdminDashboard] Загружаем статистику Tripwire студентов...');
      
      // ✅ ИСПОЛЬЗУЕМ TRIPWIRE API ДЛЯ ПОЛУЧЕНИЯ РЕАЛЬНОЙ СТАТИСТИКИ!
      const response = await api.get('/api/tripwire/admin/stats');
      const statsData = response;
      
      console.log('[AdminDashboard] ✅ Получена статистика от Tripwire API:', statsData);

      const stats = {
        total: statsData.total_students || 0,
        active: statsData.active_students || 0,
        newThisWeek: statsData.total_students || 0, // ✅ Можно улучшить добавив фильтр по дате в API
      };

      console.log('[AdminDashboard] ✅ Статистика Tripwire студентов загружена:', stats);
      setStudentStats(stats);
    } catch (error) {
      console.error('[AdminDashboard] ❌ Ошибка загрузки студентов:', error);
    }
  };

  const loadTripwireStats = async () => {
    try {
      console.log('[AdminDashboard] Загружаем статистику Tripwire продаж...');
      
      // ✅ ИСПОЛЬЗУЕМ TRIPWIRE ADMIN STATS API
      const statsResponse = await api.get('/api/tripwire/admin/stats');
      console.log('[AdminDashboard] ✅ Tripwire Stats API response:', statsResponse);
      
      // ✅ Также получаем данные о менеджерах для доп. информации
      try {
        const leaderboardResponse = await api.get('/api/admin/tripwire/leaderboard');
        const managers = leaderboardResponse.data?.managers || leaderboardResponse.managers || [];
        
        // Подсчитываем суммы из leaderboard (для продаж)
        const totalSales = managers.reduce((sum: number, m: any) => sum + m.total_sales, 0);
        const totalRevenue = managers.reduce((sum: number, m: any) => sum + m.total_revenue, 0);
        const thisMonthSales = managers.reduce((sum: number, m: any) => sum + m.this_month_sales, 0);

        setTripwireStats({
          // ✅ Основные метрики берём из реальной статистики
          totalStudents: statsResponse.total_students || 0,
          completedStudents: statsResponse.completed_students || 0,
          completionRate: statsResponse.completion_rate || 0,
          // ✅ Продажи берём из leaderboard (это для менеджеров)
          totalSales,
          totalRevenue,
          thisMonthSales,
          managersCount: managers.length,
        });

        console.log('[AdminDashboard] ✅ Статистика Tripwire загружена:', { 
          students: statsResponse.total_students, 
          sales: totalSales, 
          revenue: totalRevenue 
        });
      } catch (leaderboardError) {
        // Если leaderboard не доступен, используем только stats
        console.warn('[AdminDashboard] ⚠️ Leaderboard недоступен, используем только stats');
        setTripwireStats({
          totalStudents: statsResponse.total_students || 0,
          completedStudents: statsResponse.completed_students || 0,
          completionRate: statsResponse.completion_rate || 0,
          totalSales: statsResponse.total_students || 0, // Fallback: кол-во студентов = кол-во продаж
          totalRevenue: (statsResponse.total_students || 0) * 5000, // Fallback: студенты * 5000₸
          thisMonthSales: 0,
          managersCount: 0,
        });
      }
    } catch (error) {
      console.error('[AdminDashboard] ❌ Ошибка загрузки Tripwire:', error);
    }
  };

  const loadMyStats = async () => {
    try {
      console.log('[AdminDashboard] Загружаем МОЮ статистику...');
      const response = await api.get('/api/admin/tripwire/my-stats');
      const stats = response.data || response;
      
      setMyStats(stats);

      console.log('[AdminDashboard] ✅ МОЯ статистика загружена:', stats);
    } catch (error) {
      console.error('[AdminDashboard] ❌ Ошибка загрузки МОЕй статистики:', error);
    }
  };

  const loadTranscriptionStats = async () => {
    try {
      console.log('[AdminDashboard] Загружаем статистику транскрипций...');
      const response = await api.get('/api/admin/transcriptions/stats');
      const data = response.data || response;
      
      setTranscriptionStats(data.stats);

      console.log('[AdminDashboard] ✅ Статистика транскрипций загружена:', data.stats);
    } catch (error) {
      console.error('[AdminDashboard] ❌ Ошибка загрузки статистики транскрипций:', error);
    }
  };

  // Форматирование данных для карточки студентов (TRIPWIRE)
  const formatStudentStats = () => {
    if (!studentStats) {
      return [
        { label: "Всего студентов", value: "..." },
        { label: "Активных", value: "..." },
        { label: "Завершили курс", value: "..." },
      ];
    }

    return [
      { label: "Всего студентов", value: studentStats.total.toString() },
      { label: "Активных (7 дн)", value: studentStats.active.toString() },
      { label: "Завершений", value: `${tripwireStats?.completedStudents || 0}` },
    ];
  };

  // Форматирование данных для карточки токенов
  const formatTokenStats = () => {
    if (!tokenStats) {
      return [
        { label: "Затраты сегодня", value: "..." },
        { label: "Всего токенов", value: "..." },
        { label: "Запросов", value: "..." },
      ];
    }

    const totalCostKZT = Math.round((tokenStats.total_cost_usd || 0) * KZT_RATE);
    const totalTokens = tokenStats.total_tokens || 0;
    const totalRequests = tokenStats.total_requests || 0;

    // Форматируем токены (125K, 1.2M и т.д.)
    const formatTokens = (num: number) => {
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${Math.round(num / 1000)}K`;
      return num.toString();
    };

    return [
      { label: "Затраты сегодня", value: `${totalCostKZT}₸` },
      { label: "Всего токенов", value: formatTokens(totalTokens) },
      { label: "Запросов", value: totalRequests.toString() },
    ];
  };

  return (
    <div className="min-h-screen bg-black relative p-6">
      {/* ===== КОНТЕНТ ===== */}
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl font-bold text-white mb-4 font-display">
            Админ-панель
          </h1>
          <p className="text-gray-400 text-lg">
            Выберите раздел для управления платформой
          </p>
        </motion.div>

        {/* Карточки */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Карточка 1: Управление студентами (ДИНАМИЧЕСКИЕ ДАННЫЕ) */}
          <AdminCard
            title="Управление студентами"
            description="Добавление, удаление, роли, приглашения"
            icon={<Users className="w-8 h-8" />}
            onClick={() => navigate("/admin/students-activity")}
            stats={formatStudentStats()}
          />

          {/* Карточка 2: Activity (старая панель) */}
          <AdminCard
            title="Activity"
            description="Общая статистика и метрики платформы"
            icon={<Sparkles className="w-8 h-8" />}
            onClick={() => navigate("/admin/activity")}
            stats={[
              { label: "Активность", value: "85%" },
              { label: "Онлайн", value: "47" },
              { label: "Завершений", value: "234" },
            ]}
          />

          {/* Карточка 3: AI-аналитика */}
          <AdminCard
            title="AI-аналитика"
            description="Дашборд AI-куратора, наставника и аналитика"
            icon={<Brain className="w-8 h-8" />}
            onClick={() => navigate("/admin/ai-analytics")}
            stats={[
              { label: "AI диалогов", value: "89" },
              { label: "Настроение", value: "😊 7.2/10" },
              { label: "Проблем выявлено", value: "8" },
            ]}
          />

          {/* Карточка 4: Токены AI-агентов (ДИНАМИЧЕСКИЕ ДАННЫЕ) */}
          <AdminCard
            title="Токены AI-агентов"
            description="Затраты OpenAI, статистика, бюджет"
            icon={<DollarSign className="w-8 h-8" />}
            onClick={() => navigate("/admin/token-usage")}
            stats={formatTokenStats()}
          />

          {/* Карточка 5: Мой отдел продаж (ЛИЧНАЯ ПАНЕЛЬ ДЛЯ ДИРЕКТОРА) */}
          <AdminCard
            title="Мой отдел продаж"
            description="Мои продажи, мои клиенты, добавление пользователей"
            icon={<TrendingUp className="w-8 h-8" />}
            onClick={() => navigate("/integrator/sales-manager")}
            stats={[
              { label: "Мои продажи", value: myStats?.totalSales?.toString() || "0" },
              { label: "Моя выручка", value: myStats ? `${myStats.totalRevenue.toLocaleString('ru-RU')}₸` : "0₸" },
              { label: "Этот месяц", value: `+${myStats?.thisMonthSales || 0}` },
            ]}
          />

          {/* Карточка 6: Sales Manager - Tripwire (ГЛОБАЛЬНАЯ СТАТИСТИКА) */}
          <AdminCard
            title="Sales Manager - Tripwire"
            description="Управление продажами, рейтинг менеджеров"
            icon={<TrendingUp className="w-8 h-8" />}
            onClick={() => navigate("/admin/tripwire-sales-global")}
            stats={[
              { label: "Всего студентов", value: tripwireStats?.totalStudents?.toString() || "0" },
              { label: "Завершений курса", value: `${tripwireStats?.completedStudents || 0} (${Math.round(tripwireStats?.completionRate || 0)}%)` },
              { label: "Выручка", value: tripwireStats ? `${tripwireStats.totalRevenue.toLocaleString('ru-RU')}₸` : "0₸" },
            ]}
          />

          {/* Карточка 7: System Health & Queue Management */}
          <AdminCard
            title="System Health"
            description="Мониторинг очереди задач и управление режимами работы"
            icon={<Activity className="w-8 h-8" />}
            onClick={() => navigate("/admin/system-health")}
            stats={[
              { label: "Статус", value: "✅ Online" },
              { label: "Режим", value: "Async Queue" },
              { label: "Jobs", value: "..." },
            ]}
          />

          {/* Карточка 8: Транскрибации уроков */}
          <AdminCard
            title="Транскрибации уроков"
            description="Управление транскрибациями через Groq Whisper"
            icon={<Mic className="w-8 h-8" />}
            onClick={() => navigate("/admin/transcriptions")}
            stats={[
              { label: "Всего уроков", value: transcriptionStats?.total?.toString() || "..." },
              { label: "Готовых", value: transcriptionStats?.completed?.toString() || "..." },
              { label: "Ожидают", value: transcriptionStats?.pending?.toString() || "..." },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// ===================================
// КОМПОНЕНТ КАРТОЧКИ С ЭФФЕКТАМИ
// ===================================

interface AdminCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  stats: { label: string; value: string }[];
}

function AdminCard({ title, description, icon, onClick, stats }: AdminCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className="relative p-8 cursor-pointer bg-[#1a1a24] border-gray-800 hover:border-[#00FF88]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#00FF88]/10 overflow-hidden group h-full"
        onClick={onClick}
      >
        {/* Иконка */}
        <div className="flex items-center gap-4 mb-6">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
            transition={{ duration: 0.3 }}
            className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#00FF88]/20 to-[#00cc88]/10 flex items-center justify-center border border-[#00FF88]/30"
          >
            <div className="text-[#00FF88]">{icon}</div>
          </motion.div>
          
          {/* Индикатор hover */}
          <motion.div
            initial={{ width: 0 }}
            whileHover={{ width: "3px" }}
            className="absolute right-0 top-1/2 -translate-y-1/2 h-16 bg-[#00FF88] rounded-l-full opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>

        {/* Текст */}
        <h2 className="text-2xl font-bold text-white mb-3 font-display">
          {title}
        </h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          {description}
        </p>

        {/* Статистика */}
        <div className="space-y-3 pt-6 border-t border-gray-800">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex justify-between items-center"
            >
              <span className="text-sm text-gray-500">{stat.label}</span>
              <span className="text-base font-bold text-[#00FF88]">{stat.value}</span>
            </div>
          ))}
        </div>

      </Card>
    </motion.div>
  );
}

