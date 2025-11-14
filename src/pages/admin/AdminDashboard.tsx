import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Brain, Sparkles, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { api } from "@/utils/apiClient";

const KZT_RATE = 460; // 1 USD = 460 KZT

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tokenStats, setTokenStats] = useState<any>(null);

  // Загружаем статистику токенов при монтировании
  useEffect(() => {
    loadTokenStats();
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
          <h1 className="text-5xl font-bold text-white mb-4">
            Админ-панель
          </h1>
          <p className="text-gray-400 text-lg">
            Выберите раздел для управления платформой
          </p>
        </motion.div>

        {/* Карточки */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Карточка 1: Управление студентами */}
          <AdminCard
            title="Управление студентами"
            description="Добавление, удаление, роли, приглашения"
            icon={<Users className="w-8 h-8" />}
            onClick={() => navigate("/admin/students-activity")}
            stats={[
              { label: "Всего студентов", value: "150" },
              { label: "Активных", value: "120" },
              { label: "Новых за неделю", value: "+12" },
            ]}
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
        className="relative p-6 cursor-pointer bg-[#1a1a24] border-gray-800 hover:border-[#00ff00]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#00ff00]/10 overflow-hidden group"
        onClick={onClick}
      >
        {/* Иконка */}
        <div className="flex items-center gap-4 mb-4">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
            transition={{ duration: 0.3 }}
            className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#00ff00]/20 to-[#00cc00]/10 flex items-center justify-center border border-[#00ff00]/30"
          >
            <div className="text-[#00ff00]">{icon}</div>
          </motion.div>
          
          {/* Индикатор hover */}
          <motion.div
            initial={{ width: 0 }}
            whileHover={{ width: "3px" }}
            className="absolute right-0 top-1/2 -translate-y-1/2 h-16 bg-[#00ff00] rounded-l-full opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>

        {/* Текст */}
        <h2 className="text-2xl font-bold text-white mb-2">
          {title}
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          {description}
        </p>

        {/* Статистика */}
        <div className="space-y-2 pt-4 border-t border-gray-800">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex justify-between items-center"
            >
              <span className="text-sm text-gray-500">{stat.label}</span>
              <span className="text-base font-bold text-[#00ff00]">{stat.value}</span>
            </div>
          ))}
        </div>

      </Card>
    </motion.div>
  );
}

