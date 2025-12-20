import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { landingSupabase } from '@/lib/supabase-landing';
import axios from 'axios';
import { TeamAvatar, TeamBadge } from '@/components/traffic/TeamAvatar';
import { TRAFFIC_API_URL } from '@/config/traffic-api';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Target, 
  BarChart3, RefreshCw, ChevronDown, Sparkles, ArrowUpRight,
  Zap, Activity, PieChart, Calendar, Filter, Bot, Loader2,
  Lightbulb, CheckCircle2, AlertTriangle, X, Info, HelpCircle
} from 'lucide-react';

// 🚀 Use TRAFFIC_API_URL for correct nginx proxy handling
const API_URL = TRAFFIC_API_URL;

// 📚 Описания метрик для подсказок
const METRIC_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  revenue: {
    title: 'Доход (Revenue)',
    description: 'Общая сумма выручки от продаж через AmoCRM. Это реальные деньги, которые команда заработала за выбранный период.'
  },
  spend: {
    title: 'Затраты (Ad Spend)',
    description: 'Сумма потраченная на рекламу в Facebook Ads. Включает все расходы на объявления, таргетинг и продвижение.'
  },
  roas: {
    title: 'ROAS (Return on Ad Spend)',
    description: 'Возврат инвестиций в рекламу. Показывает сколько долларов дохода приносит каждый доллар рекламы. ROAS > 1 = прибыльно, ROAS > 2 = отлично!'
  },
  cpa: {
    title: 'CPA (Cost Per Acquisition)',
    description: 'Средняя стоимость привлечения одного клиента. Чем ниже CPA при сохранении качества лида, тем эффективнее кампания.'
  },
  sales: {
    title: 'Продажи (Sales)',
    description: 'Количество успешно закрытых сделок в AmoCRM. Это реальные клиенты, которые оплатили продукт/услугу.'
  },
  clicks: {
    title: 'Клики (Clicks)',
    description: 'Количество кликов по рекламным объявлениям. Показывает заинтересованность аудитории в вашем предложении.'
  },
  impressions: {
    title: 'Показы (Impressions)',
    description: 'Сколько раз ваша реклама была показана пользователям Facebook. Охват потенциальной аудитории.'
  },
  ctr: {
    title: 'CTR (Click-Through Rate)',
    description: 'Процент пользователей, которые кликнули по объявлению после просмотра. Хороший CTR > 1% означает, что креатив и оффер цепляют аудиторию.'
  },
};

// 💡 Компонент подсказки с описанием метрики
const MetricTooltip = ({ metricKey }: { metricKey: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const info = METRIC_DESCRIPTIONS[metricKey];
  
  if (!info) return null;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="ml-1.5 p-0.5 hover:bg-[#00FF88]/10 rounded transition-all inline-flex"
        aria-label={`Информация о метрике: ${info.title}`}
      >
        <HelpCircle className="w-3.5 h-3.5 text-[#00FF88]/60 hover:text-[#00FF88]" />
      </button>
      
      {isOpen && (
        <span className="absolute z-50 w-72 p-4 bg-black/95 border border-[#00FF88]/30 rounded-xl shadow-2xl shadow-[#00FF88]/20 backdrop-blur-xl left-0 top-full mt-2 block">
          <span className="flex items-start gap-2 mb-2">
            <Info className="w-4 h-4 text-[#00FF88] flex-shrink-0 mt-0.5" />
            <span className="text-sm font-bold text-white">{info.title}</span>
          </span>
          <span className="text-xs text-gray-300 leading-relaxed block">
            {info.description}
          </span>
        </span>
      )}
    </span>
  );
};

// Types
interface VideoMetrics {
  plays: number;
  thruplay: number;
  completions: number;
  completionRate: number;
  thruplayRate: number;
  avgWatchTime: number;
  retention?: {
    '25%': number;
    '50%': number;
    '75%': number;
    '100%': number;
  };
}

interface TopCreative {
  name: string;
  plays: number;
  thruplay: number;
  completions: number;
  completionRate: string;
  avgWatchTime: string;
}

interface CombinedTeamData {
  team: string;
  spend: number;
  revenue: number;
  roas: number;
  sales: number;
  cpa: number;
  impressions: number;
  clicks: number;
  ctr: number;
  // 🎬 Video engagement
  videoMetrics?: VideoMetrics | null;
  topVideoCreatives?: TopCreative[];
}

interface CombinedAnalytics {
  success: boolean;
  period: { since: string; until: string; preset: string };
  teams: CombinedTeamData[];
  totals: CombinedTeamData;
  exchangeRate?: {
    usdToKzt: number;
    updatedAt: string;
  };
  // 🏷️ ТОП UTM МЕТОК
  topUtmBySales?: TopUtmSales[];
  topCampaignsByCtr?: TopCampaignCtr[];
  topCampaignsByVideo?: TopCampaignVideo[];
  updatedAt: string;
}

// 🏷️ Типы для ТОП UTM меток
interface TopUtmSales {
  rank: number;
  campaign: string;
  sales: number;
  revenue: number;
  team: string;
}

interface TopCampaignCtr {
  rank: number;
  name: string;
  team: string;
  ctr: number;
  clicks: number;
  impressions: number;
  spend: number;
}

interface TopCampaignVideo {
  rank: number;
  name: string;
  team: string;
  plays: number;
  completions: number;
  completionRate: number;
  spend: number;
}

// Format helpers
const formatDollars = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

const formatTenge = (value: number) => {
  if (value >= 1000000) return `₸${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `₸${(value / 1000).toFixed(1)}K`;
  return `₸${value.toFixed(0)}`;
};

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString('ru-RU');
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

// 🎨 TRIPWIRE БРЕНД - ПРАВИЛЬНЫЕ пороги ROAS
const getRoasColor = (roas: number) => {
  // ROAS >= 2 = Отлично (прибыль 100%+)
  if (roas >= 2) return { bg: 'bg-[#00FF88]/10', text: 'text-[#00FF88]', border: 'border-[#00FF88]/30', glow: 'shadow-[#00FF88]/20' };
  // ROAS >= 1 = Прибыльно (в плюсе)
  if (roas >= 1) return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', glow: 'shadow-green-500/10' };
  // ROAS >= 0.5 = Требует работы
  if (roas >= 0.5) return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', glow: 'shadow-yellow-500/10' };
  // ROAS < 0.5 = Критически (убыточно)
  return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', glow: 'shadow-red-500/10' };
};

// 🎯 Статус ROAS текстом
const getRoasStatus = (roas: number) => {
  if (roas >= 2) return '🟢 Отлично';
  if (roas >= 1) return '🟢 Прибыльно';
  if (roas >= 0.5) return '🟡 Требует работы';
  return '🔴 Убыточно';
};

// 🏆 ПРЕМИАЛЬНАЯ Рейтинговая система - "Лезвие" эффект
const RANK_SYSTEM = {
  1: {
    title: 'ЛЕГЕНДАРНО',
    medal: '🏆',
    color: '#00FF88',
    // Яркий зелёный градиент слева направо
    gradientStyle: 'linear-gradient(90deg, rgba(0,255,136,0.25) 0%, rgba(0,255,136,0.08) 50%, rgba(50,50,50,0.3) 100%)',
    borderStyle: '2px solid rgba(0,255,136,0.4)',
    shimmerOpacity: 0.6,
    shimmerSpeed: '2s',
  },
  2: {
    title: 'ЭПИЧНО',
    medal: '🥈',
    color: '#00FF88',
    // Средняя яркость
    gradientStyle: 'linear-gradient(90deg, rgba(0,255,136,0.15) 0%, rgba(0,255,136,0.05) 50%, rgba(40,40,40,0.3) 100%)',
    borderStyle: '1px solid rgba(0,255,136,0.25)',
    shimmerOpacity: 0.4,
    shimmerSpeed: '2.5s',
  },
  3: {
    title: 'ХОРОШО',
    medal: '🥉',
    color: '#00FF88',
    // Слабая яркость
    gradientStyle: 'linear-gradient(90deg, rgba(0,255,136,0.08) 0%, rgba(0,255,136,0.02) 50%, rgba(35,35,35,0.3) 100%)',
    borderStyle: '1px solid rgba(0,255,136,0.15)',
    shimmerOpacity: 0.25,
    shimmerSpeed: '3s',
  },
  4: {
    title: 'ТРЕБУЕТ ДОРАБОТОК',
    medal: '⭐',
    color: '#666666',
    // Минимальный эффект
    gradientStyle: 'linear-gradient(90deg, rgba(100,100,100,0.1) 0%, rgba(50,50,50,0.05) 50%, rgba(30,30,30,0.2) 100%)',
    borderStyle: '1px solid rgba(100,100,100,0.2)',
    shimmerOpacity: 0.1,
    shimmerSpeed: '4s',
  },
};

// 🎨 TRIPWIRE КОМАНДЫ - Фирменная палитра
const TEAM_COLORS: Record<string, { primary: string; gradient: string }> = {
  'Kenesary': { primary: '#00FF88', gradient: 'from-[#00FF88]/15 to-[#00FF88]/5' },
  'Arystan': { primary: '#00FF88', gradient: 'from-[#00FF88]/15 to-[#00FF88]/5' },
  'Muha': { primary: '#00FF88', gradient: 'from-[#00FF88]/15 to-[#00FF88]/5' },
  'Traf4': { primary: '#00FF88', gradient: 'from-[#00FF88]/15 to-[#00FF88]/5' },
};

interface TrafficCommandDashboardProps {
  filterTeam?: string | null;
  currentUserTeam?: string | null; // Команда залогиненного пользователя
  language?: string; // Язык интерфейса
}

export default function TrafficCommandDashboard({ 
  filterTeam = null, 
  currentUserTeam = null,
  language = 'ru'
}: TrafficCommandDashboardProps) {
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [customDate, setCustomDate] = useState<string | null>(null); // YYYY-MM-DD
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Record<string, string>>({});
  const [loadingRecs, setLoadingRecs] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'KZT'>('USD');

  // Fetch AI recommendations for a team
  const fetchRecommendations = async (team: string) => {
    if (recommendations[team]) {
      setShowRecommendations(team);
      return;
    }
    
    setLoadingRecs(team);
    try {
      const response = await axios.get(`${API_URL}/api/facebook-ads/recommendations/${team}`);
      if (response.data.recommendations) {
        setRecommendations(prev => ({ ...prev, [team]: response.data.recommendations }));
        setShowRecommendations(team);
      } else {
        // Generate new recommendations
        const teamData = analytics?.teams.find(t => t.team === team);
        if (teamData) {
          const genResponse = await axios.post(`${API_URL}/api/facebook-ads/recommendations/generate`, {
            team: teamData.team,
            spend: teamData.spend,
            revenue: teamData.revenue,
            roas: teamData.roas,
            sales: teamData.sales,
            cpa: teamData.cpa,
            ctr: teamData.ctr,
            impressions: teamData.impressions,
            clicks: teamData.clicks,
            // 🎬 VIDEO METRICS
            videoMetrics: (teamData as any).videoMetrics || null,
            topVideoCreatives: (teamData as any).topVideoCreatives || [],
          });
          if (genResponse.data.recommendations) {
            setRecommendations(prev => ({ ...prev, [team]: genResponse.data.recommendations }));
            setShowRecommendations(team);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoadingRecs(null);
    }
  };

  // Fetch combined analytics (FB Ads + AmoCRM)
  const { data: analytics, isLoading, refetch, isFetching } = useQuery<CombinedAnalytics>({
    queryKey: ['combined-analytics', dateRange, customDate],
    queryFn: async () => {
      const url = customDate 
        ? `${API_URL}/api/traffic/combined-analytics?date=${customDate}`
        : `${API_URL}/api/traffic/combined-analytics?preset=${dateRange}`;
      const response = await axios.get(url);
      return response.data;
    },
    refetchInterval: customDate ? false : 600000, // Авто-обновление каждые 10 минут (отключено для custom date)
    retry: 2,
  });

  // 🏆 Ранжирование команд по ROAS (ПОСЛЕ объявления analytics)
  const rankedTeams = useMemo(() => {
    if (!analytics?.teams) return [];

    // 🎯 Фильтрация: если filterTeam задан, показываем только эту команду
    let teamsToShow = analytics.teams;
    if (filterTeam) {
      teamsToShow = analytics.teams.filter(t => t.team === filterTeam);
    }

    const sorted = [...teamsToShow].sort((a, b) => {
      // Сортируем по ROAS (главная метрика)
      return b.roas - a.roas;
    });

    return sorted.map((team, index) => ({
      ...team,
      rank: (index + 1) as 1 | 2 | 3 | 4,
      rankInfo: RANK_SYSTEM[Math.min(index + 1, 4) as 1 | 2 | 3 | 4],
    }));
  }, [analytics?.teams, filterTeam]);

  // 💱 Конвертация и форматирование валюты (ПОСЛЕ analytics)
  const exchangeRate = analytics?.exchangeRate?.usdToKzt || 470;
  
  const formatMoney = (valueUSD: number, type: 'spend' | 'revenue' = 'spend') => {
    if (currency === 'KZT') {
      const valueKZT = type === 'revenue' ? valueUSD : valueUSD * exchangeRate;
      if (valueKZT >= 1000000) return `₸${(valueKZT / 1000000).toFixed(2)}M`;
      if (valueKZT >= 1000) return `₸${(valueKZT / 1000).toFixed(1)}K`;
      return `₸${valueKZT.toFixed(0)}`;
    } else {
      // USD
      const valueUSDDisplay = type === 'revenue' ? valueUSD / exchangeRate : valueUSD;
      if (valueUSDDisplay >= 1000000) return `$${(valueUSDDisplay / 1000000).toFixed(2)}M`;
      if (valueUSDDisplay >= 1000) return `$${(valueUSDDisplay / 1000).toFixed(1)}K`;
      return `$${valueUSDDisplay.toFixed(2)}`;
    }
  };

  // Filtered teams
  const displayTeams = useMemo(() => {
    if (!analytics?.teams) return [];
    if (selectedTeam) return analytics.teams.filter(t => t.team === selectedTeam);
    return analytics.teams;
  }, [analytics?.teams, selectedTeam]);

  // Top performers
  const topByRoas = useMemo(() => {
    if (!analytics?.teams) return null;
    return [...analytics.teams].sort((a, b) => b.roas - a.roas)[0];
  }, [analytics?.teams]);

  const topBySales = useMemo(() => {
    if (!analytics?.teams) return null;
    return [...analytics.teams].sort((a, b) => b.sales - a.sales)[0];
  }, [analytics?.teams]);

  return (
    <div className="min-h-screen bg-[#030303] text-white antialiased">
      {/* 🎨 TRIPWIRE Фирменный фон */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00FF88]/5 via-transparent to-transparent" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,255,136,0.02) 1px, transparent 0)`,
          backgroundSize: '60px 60px'
        }} />
        {/* Фирменные акценты */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00FF88]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#00FF88]/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* 🎯 TRIPWIRE Заголовок */}
        <header className="border-b border-[#00FF88]/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50 shadow-lg shadow-[#00FF88]/5">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
            {/* Заголовок - всегда сверху */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-3 md:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/20 shadow-lg shadow-[#00FF88]/20 flex-shrink-0">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-[#00FF88]" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white truncate">
                  Командная Панель Трафика
                </h1>
                <p className="text-xs sm:text-sm text-[#00FF88]/60 truncate">Facebook Ads + AmoCRM</p>
              </div>
            </div>

            {/* Контролы - адаптивная сетка */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
              {/* 💱 Переключатель валют USD/KZT */}
              <div className="flex items-center gap-1 bg-black/50 rounded-xl p-1 border border-[#00FF88]/20 w-full sm:w-auto">
                <button
                  onClick={() => setCurrency('USD')}
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    currency === 'USD'
                      ? 'bg-[#00FF88] text-black shadow-lg shadow-[#00FF88]/30'
                      : 'text-[#00FF88]/60 hover:text-[#00FF88]'
                  }`}
                >
                  $ USD
                </button>
                <button
                  onClick={() => setCurrency('KZT')}
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    currency === 'KZT'
                      ? 'bg-[#00FF88] text-black shadow-lg shadow-[#00FF88]/30'
                      : 'text-[#00FF88]/60 hover:text-[#00FF88]'
                  }`}
                >
                  ₸ KZT
                </button>
                {/* Курс валюты - inline на мобилке */}
                {analytics?.exchangeRate && (
                  <div className="hidden md:flex text-xs text-gray-400 flex-col items-end ml-2">
                    <span className="text-[#00FF88]/80">1 USD = {analytics.exchangeRate.usdToKzt.toFixed(0)} ₸</span>
                    <span className="text-gray-500">CB {new Date(analytics.exchangeRate.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>

              {/* Переключатель периодов */}
              <div className="flex bg-[#00FF88]/5 rounded-xl p-1 border border-[#00FF88]/20 w-full sm:w-auto">
                {(['7d', '14d', '30d'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => {
                      setDateRange(range);
                      setCustomDate(null);
                    }}
                    className={`flex-1 sm:flex-none px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      dateRange === range && !customDate
                        ? 'bg-[#00FF88] text-black shadow-lg shadow-[#00FF88]/30'
                        : 'text-[#00FF88]/60 hover:text-[#00FF88]'
                    }`}
                  >
                    {range === '7d' ? '7д' : range === '14d' ? '14д' : '30д'}
                  </button>
                ))}
              </div>

              {/* 📅 Календарь выбора даты */}
              <div className="flex items-center gap-2 bg-[#00FF88]/5 rounded-xl px-3 sm:px-4 py-2 border border-[#00FF88]/20 w-full sm:w-auto">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-[#00FF88] flex-shrink-0" />
                <input
                  type="date"
                  value={customDate || ''}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  className="bg-transparent text-white text-xs sm:text-sm border-none outline-none cursor-pointer font-medium flex-1 min-w-0"
                  style={{
                    colorScheme: 'dark',
                  }}
                />
                {customDate && (
                  <button
                    onClick={() => setCustomDate(null)}
                    className="p-1 hover:bg-[#00FF88]/10 rounded transition-all flex-shrink-0"
                    title="Сбросить"
                  >
                    <X className="w-3 h-3 text-[#00FF88]" />
                  </button>
                )}
              </div>

              {/* Фильтр команд */}
              <div className="relative w-full sm:w-auto">
                <button
                  onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                  className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-xl text-xs sm:text-sm hover:bg-[#00FF88]/10 transition-all w-full sm:w-auto"
                >
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 text-[#00FF88] flex-shrink-0" />
                  <span className="text-white flex-1 sm:flex-none truncate">{selectedTeam || 'Все команды'}</span>
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-[#00FF88] flex-shrink-0" />
                </button>
                
                {showTeamDropdown && (
                  <div className="absolute top-full mt-2 left-0 right-0 sm:left-auto sm:right-0 sm:w-52 bg-black/95 border border-[#00FF88]/20 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl">
                    <button
                      onClick={() => { setSelectedTeam(null); setShowTeamDropdown(false); }}
                      className="w-full px-4 py-3 text-left text-xs sm:text-sm hover:bg-[#00FF88]/10 transition-all flex items-center gap-2 text-white"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#00FF88]" />
                      Все команды
                    </button>
                    {analytics?.teams.map(team => (
                      <button
                        key={team.team}
                        onClick={() => { setSelectedTeam(team.team); setShowTeamDropdown(false); }}
                        className="w-full px-4 py-3 text-left text-xs sm:text-sm hover:bg-[#00FF88]/10 transition-all flex items-center gap-2 text-white"
                      >
                        <TeamAvatar teamName={team.team} size="sm" />
                        <span className="text-sm">{team.team}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 🔄 Кнопка синхронизации с IAE Agent */}
              <button
                onClick={async () => {
                  // Обновляем данные
                  refetch();
                  
                  // Опционально: запускаем IAE Agent проверку (только если нужно)
                  // try {
                  //   const iaeCheck = await axios.post(`${API_URL}/api/iae-agent/trigger`, { sendToTelegram: false });
                  //   if (iaeCheck.data.healthScore < 70) {
                  //     console.warn('⚠️ IAE Agent: Health issues detected', iaeCheck.data.healthScore);
                  //   }
                  // } catch (err) {
                  //   console.error('IAE Agent check failed:', err);
                  // }
                }}
                disabled={isFetching}
                className={`px-3 sm:px-4 py-2 bg-black/50 border rounded-xl flex items-center justify-center gap-2 font-medium transition-all w-full sm:w-auto ${
                  isFetching
                    ? 'border-[#00FF88]/50 text-[#00FF88] cursor-wait'
                    : 'border-[#00FF88]/20 text-white hover:bg-[#00FF88]/10 hover:border-[#00FF88]/40 hover:shadow-lg hover:shadow-[#00FF88]/20'
                }`}
                title="Обновить данные вручную (+ IAE Agent проверка)"
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isFetching ? 'animate-spin text-[#00FF88]' : 'text-[#00FF88]'}`} />
                <span className="text-xs sm:text-sm">
                  {isFetching ? 'Обновление...' : 'Обновить'}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-16 h-16 border-3 border-[#00FF88] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[#00FF88]/80 text-lg font-medium">Загрузка аналитики...</p>
              </div>
            </div>
          ) : (
            <>
              {/* 📊 KPI Карточки */}
              <div data-tour="metrics-cards" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                {/* Доход */}
                <div className="col-span-1 bg-gradient-to-br from-[#00FF88]/10 to-[#00FF88]/5 border border-[#00FF88]/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 hover:shadow-lg hover:shadow-[#00FF88]/10 transition-all">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-[#00FF88]/20 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-[#00FF88]" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-[#00FF88] uppercase tracking-wider flex items-center">
                      Доход
                      <MetricTooltip metricKey="revenue" />
                    </span>
                  </div>
                  <p className="text-base sm:text-xl md:text-2xl font-bold text-white truncate">{formatMoney(analytics?.totals?.revenue || 0, 'revenue')}</p>
                  <p className="text-[10px] sm:text-xs text-[#00FF88]/60 mt-0.5 sm:mt-1">{analytics?.totals?.sales || 0} продаж</p>
                </div>

                {/* Затраты */}
                <div className="col-span-1 bg-gradient-to-br from-gray-500/10 to-gray-600/5 border border-gray-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gray-500/20 flex items-center justify-center flex-shrink-0">
                      <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-gray-300 uppercase tracking-wider flex items-center">
                      Затраты
                      <MetricTooltip metricKey="spend" />
                    </span>
                  </div>
                  <p className="text-base sm:text-xl md:text-2xl font-bold text-white truncate">{formatMoney(analytics?.totals?.spend || 0, 'spend')}</p>
                  <p className="text-xs text-gray-400 mt-1">Facebook Ads</p>
                </div>

                {/* ROAS */}
                <div className={`col-span-1 bg-gradient-to-br ${getRoasColor(analytics?.totals?.roas || 0).bg} border ${getRoasColor(analytics?.totals?.roas || 0).border} rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 hover:shadow-lg hover:${getRoasColor(analytics?.totals?.roas || 0).glow} transition-all`}>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg ${getRoasColor(analytics?.totals?.roas || 0).bg} flex items-center justify-center flex-shrink-0`}>
                      <TrendingUp className={`w-3 h-3 sm:w-4 sm:h-4 ${getRoasColor(analytics?.totals?.roas || 0).text}`} />
                    </div>
                    <span className={`text-[10px] sm:text-xs font-medium ${getRoasColor(analytics?.totals?.roas || 0).text} uppercase tracking-wider flex items-center`}>
                      ROAS
                      <MetricTooltip metricKey="roas" />
                    </span>
                  </div>
                  <p className="text-base sm:text-xl md:text-2xl font-bold text-white">{(analytics?.totals?.roas || 0).toFixed(1)}x</p>
                  <p className={`text-[10px] sm:text-xs ${getRoasColor(analytics?.totals?.roas || 0).text} opacity-70 mt-0.5 sm:mt-1`}>
                    {getRoasStatus(analytics?.totals?.roas || 0)}
                  </p>
                </div>

                {/* CPA */}
                <div className="col-span-1 bg-gradient-to-br from-[#00FF88]/5 to-transparent border border-[#00FF88]/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                      <Target className="w-3 h-3 sm:w-4 sm:h-4 text-[#00FF88]/80" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-[#00FF88]/80 uppercase tracking-wider flex items-center">
                      CPA
                      <MetricTooltip metricKey="cpa" />
                    </span>
                  </div>
                  <p className="text-base sm:text-xl md:text-2xl font-bold text-white truncate">{formatMoney(analytics?.totals?.cpa || 0, 'spend')}</p>
                  <p className="text-[10px] sm:text-xs text-[#00FF88]/50 mt-0.5 sm:mt-1">За продажу</p>
                </div>

                {/* Клики */}
                <div className="col-span-1 bg-white/[0.02] border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-[#00FF88]/60" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center">
                      Клики
                      <MetricTooltip metricKey="clicks" />
                    </span>
                  </div>
                  <p className="text-base sm:text-xl md:text-2xl font-bold text-white">{formatNumber(analytics?.totals?.clicks || 0)}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 flex items-center gap-1">
                    CTR: {formatPercent(analytics?.totals?.ctr || 0)}
                    <MetricTooltip metricKey="ctr" />
                  </p>
                </div>

                {/* Показы */}
                <div className="col-span-1 bg-white/[0.02] border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-[#00FF88]/60" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center">
                      Показы
                      <MetricTooltip metricKey="impressions" />
                    </span>
                  </div>
                  <p className="text-base sm:text-xl md:text-2xl font-bold text-white">{formatNumber(analytics?.totals?.impressions || 0)}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Охват</p>
                </div>
              </div>

              {/* Таблица команд - Desktop only (lg+) */}
              <div data-tour="results-table" className="hidden lg:block bg-black/40 border border-[#00FF88]/10 rounded-2xl overflow-hidden mb-4 sm:mb-6 md:mb-8 backdrop-blur-sm">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#00FF88]/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-[#00FF88]" />
                    <h2 className="text-base sm:text-lg font-semibold text-white">Результаты Команд</h2>
                  </div>
                  <span className="text-xs text-gray-400 hidden md:block">
                    {analytics?.period?.since} → {analytics?.period?.until}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#00FF88]/10 bg-[#00FF88]/[0.02]">
                        <th className="px-6 py-4 text-left text-xs font-medium text-[#00FF88]/80 uppercase tracking-wider">Команда</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-[#00FF88]/80 uppercase tracking-wider">
                          <span className="inline-flex items-center justify-end gap-1">
                            Затраты
                            <MetricTooltip metricKey="spend" />
                          </span>
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-[#00FF88]/80 uppercase tracking-wider">
                          <span className="inline-flex items-center justify-end gap-1">
                            Доход
                            <MetricTooltip metricKey="revenue" />
                          </span>
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-[#00FF88]/80 uppercase tracking-wider">
                          <span className="inline-flex items-center justify-end gap-1">
                            ROAS
                            <MetricTooltip metricKey="roas" />
                          </span>
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-[#00FF88]/80 uppercase tracking-wider">
                          <span className="inline-flex items-center justify-end gap-1">
                            Продаж
                            <MetricTooltip metricKey="sales" />
                          </span>
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-[#00FF88]/80 uppercase tracking-wider">
                          <span className="inline-flex items-center justify-end gap-1">
                            CPA
                            <MetricTooltip metricKey="cpa" />
                          </span>
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-[#00FF88]/80 uppercase tracking-wider">
                          <span className="inline-flex items-center justify-end gap-1">
                            Клики
                            <MetricTooltip metricKey="clicks" />
                          </span>
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-[#00FF88]/80 uppercase tracking-wider">
                          <span className="inline-flex items-center justify-end gap-1">
                            CTR
                            <MetricTooltip metricKey="ctr" />
                          </span>
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-[#00FF88]/80 uppercase tracking-wider">AI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#00FF88]/5">
                      {rankedTeams.filter(t => !selectedTeam || t.team === selectedTeam).map((team) => {
                        const colors = TEAM_COLORS[team.team] || { primary: '#00FF88', gradient: 'from-[#00FF88]/15 to-[#00FF88]/5' };
                        const roasColor = getRoasColor(team.roas);
                        const rankInfo = team.rankInfo;
                        
                        return (
                          <tr 
                            key={team.team} 
                            className="hover:bg-[#00FF88]/[0.02] transition-all relative overflow-hidden"
                            style={{
                              background: rankInfo.gradientStyle,
                            }}
                          >
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                {/* 🏆 Медаль + Ранг */}
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-2xl">{rankInfo.medal}</span>
                                  <span className="text-[10px] font-bold" style={{ color: rankInfo.color }}>
                                    #{team.rank}
                                  </span>
                                </div>
                                
                                <TeamAvatar teamName={team.team} size="md" showLabel />
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right font-mono text-sm text-gray-300">
                              {formatMoney(team.spend, 'spend')}
                            </td>
                            <td className="px-6 py-5 text-right font-mono text-sm text-[#00FF88]">
                              {formatMoney(team.revenue, 'revenue')}
                            </td>
                            <td className="px-6 py-5 text-right">
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${roasColor.bg} ${roasColor.text} border ${roasColor.border}`}>
                                {team.roas.toFixed(1)}x
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right font-mono text-sm text-white font-bold">
                              {team.sales}
                            </td>
                            <td className="px-6 py-5 text-right font-mono text-sm text-gray-400">
                              {team.cpa > 0 ? formatMoney(team.cpa, 'spend') : '—'}
                            </td>
                            <td className="px-6 py-5 text-right font-mono text-sm text-gray-400">
                              {formatNumber(team.clicks)}
                            </td>
                            <td className="px-6 py-5 text-right font-mono text-sm text-gray-400">
                              {formatPercent(team.ctr)}
                            </td>
                            <td className="px-6 py-5 text-center">
                              {/* AI рекомендации только для своей команды */}
                              {(!currentUserTeam || team.team === currentUserTeam) ? (
                                <button
                                  data-tour="ai-recommendations"
                                  onClick={() => fetchRecommendations(team.team)}
                                  disabled={loadingRecs === team.team}
                                  className="p-2 hover:bg-[#00FF88]/20 rounded-lg transition-all group"
                                  title="Получить AI-рекомендации"
                                >
                                  {loadingRecs === team.team ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-[#00FF88]" />
                                  ) : (
                                    <Sparkles className="w-4 h-4 text-gray-400 group-hover:text-[#00FF88] transition-colors" />
                                  )}
                                </button>
                              ) : (
                                <div className="p-2 text-gray-600" title="Доступно только для вашей команды">
                                  —
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 🎯 Карточки команд - Mobile/Tablet (до lg) */}
              <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 sm:mb-6">
                {rankedTeams.filter(t => !selectedTeam || t.team === selectedTeam).map(team => {
                  const colors = TEAM_COLORS[team.team] || { primary: '#00FF88', gradient: 'from-[#00FF88]/15 to-[#00FF88]/5' };
                  const roasColor = getRoasColor(team.roas);
                  const rankInfo = team.rankInfo;

                  return (
                    <div 
                      key={team.team}
                      className={`bg-gradient-to-br ${colors.gradient} border ${roasColor.border} rounded-xl p-4 relative overflow-hidden`}
                      style={{
                        background: rankInfo.gradientStyle,
                      }}
                    >
                      {/* Медаль в углу */}
                      <div className="absolute top-2 right-2 flex flex-col items-center gap-0.5">
                        <span className="text-xl">{rankInfo.medal}</span>
                        <span className="text-[8px] font-bold" style={{ color: rankInfo.color }}>
                          #{team.rank}
                        </span>
                      </div>

                      {/* Заголовок команды */}
                      <div className="flex items-center gap-2 mb-4">
                        <TeamAvatar teamName={team.team} size="lg" showLabel />
                      </div>

                      {/* Метрики сеткой 2x3 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase mb-1">Доход</p>
                          <p className="text-sm font-bold text-[#00FF88]">{formatMoney(team.revenue, 'revenue')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase mb-1">Затраты</p>
                          <p className="text-sm font-bold text-gray-300">{formatMoney(team.spend, 'spend')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase mb-1">ROAS</p>
                          <p className={`text-sm font-bold ${roasColor.text}`}>{team.roas.toFixed(1)}x</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase mb-1">Продаж</p>
                          <p className="text-sm font-bold text-white">{team.sales}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase mb-1">CPA</p>
                          <p className="text-sm font-bold text-gray-300">{formatMoney(team.cpa, 'spend')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase mb-1">CTR</p>
                          <p className="text-sm font-bold text-white">{formatPercent(team.ctr)}</p>
                        </div>
                      </div>

                      {/* AI кнопка внизу - только для своей команды */}
                      {(!currentUserTeam || team.team === currentUserTeam) ? (
                        <button
                          onClick={() => fetchRecommendations(team.team)}
                          disabled={loadingRecs === team.team}
                          className="w-full mt-4 px-3 py-2 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-lg flex items-center justify-center gap-2 hover:bg-[#00FF88]/20 transition-all disabled:opacity-50"
                        >
                          {loadingRecs === team.team ? (
                            <Loader2 className="w-3 h-3 text-[#00FF88] animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-[#00FF88]" />
                          )}
                          <span className="text-xs font-medium text-[#00FF88]">
                            {loadingRecs === team.team ? 'Генерация...' : 'AI Рекомендации'}
                          </span>
                        </button>
                      ) : (
                        <div className="w-full mt-4 px-3 py-2 bg-gray-800/20 border border-gray-700/20 rounded-lg flex items-center justify-center gap-2 text-gray-600 text-xs">
                          Доступно только для вашей команды
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 🎯 Карточки команд - Desktop (lg+) */}
              <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
                {rankedTeams.filter(t => !selectedTeam || t.team === selectedTeam).map(team => {
                  const colors = TEAM_COLORS[team.team] || { primary: '#00FF88', gradient: 'from-[#00FF88]/15 to-[#00FF88]/5' };
                  const roasColor = getRoasColor(team.roas);
                  const rankInfo = team.rankInfo;
                  
                  return (
                    <div 
                      key={team.team}
                      className="relative rounded-xl sm:rounded-2xl p-4 sm:p-6 cursor-pointer overflow-hidden group transition-all hover:scale-[1.02]"
                      style={{
                        background: rankInfo.gradientStyle,
                        border: rankInfo.borderStyle,
                      }}
                    >
                      {/* 🗡️ Анимированное "лезвие" - свет слева направо */}
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `linear-gradient(90deg, transparent 0%, rgba(0,255,136,${rankInfo.shimmerOpacity}) 50%, transparent 100%)`,
                          animation: `shimmer ${rankInfo.shimmerSpeed} ease-in-out infinite`,
                          transform: 'translateX(-100%)',
                        }}
                      />
                      
                      {/* 🏆 Медаль слева вверху */}
                      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-1 sm:gap-1.5 z-10">
                        <span className="text-xl sm:text-2xl drop-shadow-lg">{rankInfo.medal}</span>
                        <span 
                          className="text-[10px] sm:text-xs font-bold"
                          style={{ color: rankInfo.color }}
                        >
                          #{team.rank}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <TeamAvatar teamName={team.team} size="lg" />
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-white">{team.team}</h3>
                            <p className="text-[10px] sm:text-xs flex items-center gap-1">
                              <span style={{ color: rankInfo.color }}>#{team.rank}</span>
                              <span className="text-gray-400">• {team.sales} продаж</span>
                            </p>
                          </div>
                        </div>
                        <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold ${roasColor.bg} ${roasColor.text} border ${roasColor.border}`}>
                          {team.roas.toFixed(1)}x
                        </div>
                      </div>

                      <div className="space-y-2 sm:space-y-3 relative z-10">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-400">Затраты</span>
                          <span className="font-mono text-gray-300">{formatMoney(team.spend, 'spend')}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-400">Доход</span>
                          <span className="font-mono text-[#00FF88] font-bold">{formatMoney(team.revenue, 'revenue')}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-400">CPA</span>
                          <span className="font-mono text-white">{team.cpa > 0 ? formatMoney(team.cpa, 'spend') : '—'}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-400">CTR</span>
                          <span className="font-mono text-white">{formatPercent(team.ctr)}</span>
                        </div>
                      </div>

                      {/* Progress bar для ROAS */}
                      <div className="mt-4 pt-4 border-t border-[#00FF88]/10 relative z-10">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-gray-400">Цель ROAS: 2.0x</span>
                          <span className={roasColor.text}>{team.roas >= 2 ? '✓ Достигнуто' : 'В работе'}</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${team.roas >= 2 ? 'bg-[#00FF88]' : team.roas >= 1 ? 'bg-[#00FF88]/60' : 'bg-gray-500'}`}
                            style={{ width: `${Math.min(team.roas / 3 * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Кнопка AI-рекомендаций - только для своей команды */}
                      {(!currentUserTeam || team.team === currentUserTeam) ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); fetchRecommendations(team.team); }}
                          disabled={loadingRecs === team.team}
                          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#00FF88]/10 hover:bg-[#00FF88]/20 border border-[#00FF88]/30 rounded-xl text-sm font-medium text-[#00FF88] transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-[#00FF88]/20 relative z-10"
                        >
                          {loadingRecs === team.team ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Анализ...</>
                          ) : (
                            <><Sparkles className="w-4 h-4" /> AI Рекомендации</>
                          )}
                        </button>
                      ) : (
                        <div className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800/20 border border-gray-700/20 rounded-xl text-xs text-gray-600 relative z-10">
                          Доступно только для вашей команды
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 🏷️ ТОП UTM МЕТОК - 3 секции */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
                
                {/* 💰 ТОП по ПРОДАЖАМ */}
                {analytics?.topUtmBySales && analytics.topUtmBySales.length > 0 && (
                  <div className="bg-black/40 border border-[#00FF88]/10 rounded-xl sm:rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-[#00FF88]/10 flex items-center gap-2">
                      <span className="text-lg">💰</span>
                      <div>
                        <h3 className="text-sm font-semibold text-white">ТОП UTM по продажам</h3>
                        <p className="text-[10px] text-gray-500">Данные из AmoCRM</p>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      {analytics.topUtmBySales.slice(0, 5).map((item, idx) => (
                        <div 
                          key={item.campaign}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#00FF88]/5 transition-all"
                        >
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-[#00FF88]/20 text-[#00FF88]' :
                            idx === 1 ? 'bg-[#00FF88]/15 text-[#00FF88]/80' :
                            idx === 2 ? 'bg-[#00FF88]/10 text-[#00FF88]/60' :
                            'bg-gray-800 text-gray-500'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate font-medium">{item.campaign}</p>
                            <p className="text-[10px] text-gray-500">{item.team}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#00FF88]">{item.sales}</p>
                            <p className="text-[10px] text-gray-500">продаж</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 📈 ТОП по CTR */}
                {analytics?.topCampaignsByCtr && analytics.topCampaignsByCtr.length > 0 && (
                  <div className="bg-black/40 border border-[#00FF88]/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="px-4 py-3 border-b border-[#00FF88]/10 flex items-center gap-2">
                      <span className="text-lg">📈</span>
                      <div>
                        <h3 className="text-sm font-semibold text-white">ТОП кампаний по CTR</h3>
                        <p className="text-[10px] text-gray-500">Кликабельность рекламы</p>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      {analytics.topCampaignsByCtr.slice(0, 5).map((item, idx) => (
                        <div 
                          key={item.name}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#00FF88]/5 transition-all"
                        >
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-[#00FF88]/20 text-[#00FF88]' :
                            idx === 1 ? 'bg-[#00FF88]/15 text-[#00FF88]/80' :
                            idx === 2 ? 'bg-[#00FF88]/10 text-[#00FF88]/60' :
                            'bg-gray-800 text-gray-500'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate font-medium">{item.name}</p>
                            <p className="text-[10px] text-gray-500">{item.team} • {formatNumber(item.clicks)} кликов</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#00FF88]">{item.ctr}%</p>
                            <p className="text-[10px] text-gray-500">CTR</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🎬 ТОП по ВИДЕО */}
                {analytics?.topCampaignsByVideo && analytics.topCampaignsByVideo.length > 0 && (
                  <div className="bg-black/40 border border-[#00FF88]/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="px-4 py-3 border-b border-[#00FF88]/10 flex items-center gap-2">
                      <span className="text-lg">🎬</span>
                      <div>
                        <h3 className="text-sm font-semibold text-white">ТОП по видео-вовлечённости</h3>
                        <p className="text-[10px] text-gray-500">Просмотры и досмотры</p>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      {analytics.topCampaignsByVideo.slice(0, 5).map((item, idx) => (
                        <div 
                          key={item.name}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#00FF88]/5 transition-all"
                        >
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-[#00FF88]/20 text-[#00FF88]' :
                            idx === 1 ? 'bg-[#00FF88]/15 text-[#00FF88]/80' :
                            idx === 2 ? 'bg-[#00FF88]/10 text-[#00FF88]/60' :
                            'bg-gray-800 text-gray-500'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate font-medium">{item.name}</p>
                            <p className="text-[10px] text-gray-500">{item.team} • {formatNumber(item.plays)} просмотров</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#00FF88]">{item.completionRate}%</p>
                            <p className="text-[10px] text-gray-500">досмотр</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 🎬 ТОП ВИДЕО ПО ВОВЛЕЧЕННОСТИ */}
              {rankedTeams.some(t => t.topVideoCreatives && t.topVideoCreatives.length > 0) && (
                <div className="mb-8">
                  <div className="bg-black/40 border border-[#00FF88]/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="px-6 py-4 border-b border-[#00FF88]/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center">
                          <span className="text-xl">🎬</span>
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-white">ТОП ВИДЕО ПО ВОВЛЕЧЕННОСТИ</h2>
                          <p className="text-xs text-gray-400">Лучшие креативы по просмотрам и досмотрам</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      {rankedTeams.map(team => {
                        if (!team.topVideoCreatives || team.topVideoCreatives.length === 0) return null;
                        const colors = TEAM_COLORS[team.team] || { primary: '#00FF88', gradient: 'from-[#00FF88]/15 to-[#00FF88]/5', emoji: '📊' };
                        const rankInfo = team.rankInfo;
                        
                        return (
                          <div key={`videos-${team.team}`} className="space-y-3">
                            {/* Заголовок команды */}
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{rankInfo.medal}</span>
                              <TeamAvatar teamName={team.team} size="md" />
                              <h3 className="font-bold text-white">{team.team}</h3>
                              <span className="text-xs text-gray-500">({team.topVideoCreatives.length} видео)</span>
                            </div>
                            
                            {/* Список видео */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                              {team.topVideoCreatives.map((video, idx) => (
                                <div 
                                  key={`${team.team}-${idx}`}
                                  className="bg-gradient-to-br from-[#00FF88]/5 to-black/20 border border-[#00FF88]/20 rounded-xl p-4 hover:border-[#00FF88]/40 transition-all"
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-[#00FF88]">#{idx + 1}</span>
                                        <span className="text-xs text-gray-400 truncate">{video.name}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Метрики */}
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-400">👁️ Просмотры</span>
                                      <span className="text-white font-mono">{video.plays?.toLocaleString() || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-400">✅ Dosмотры</span>
                                      <span className="text-[#00FF88] font-mono font-bold">{video.completions?.toLocaleString() || 0} ({video.completionRate})</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-400">⏱️ Ср. время</span>
                                      <span className="text-white font-mono">{video.avgWatchTime}</span>
                                    </div>
                                    {video.ctr && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">🖱️ CTR</span>
                                        <span className="text-white font-mono">{video.ctr}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Прогресс бар досмотров */}
                                  <div className="mt-3 pt-3 border-t border-[#00FF88]/10">
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-[#00FF88] to-green-400 rounded-full"
                                        style={{ width: video.completionRate }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="text-center py-8 border-t border-[#00FF88]/10">
                <p className="text-xs text-gray-400">
                  Обновление каждые 60 секунд • Последнее обновление: {analytics?.updatedAt ? new Date(analytics.updatedAt).toLocaleString('ru-RU') : '—'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Facebook Ads API + AmoCRM + Groq AI
                </p>
              </div>
            </>
          )}
        </main>
      </div>

      {/* AI Recommendations Modal */}
      {showRecommendations && recommendations[showRecommendations] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRecommendations(null)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-2xl bg-black/95 border border-[#00FF88]/20 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#00FF88]/10 bg-[#00FF88]/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#00FF88]/20 flex items-center justify-center border border-[#00FF88]/30">
                  <Bot className="w-6 h-6 text-[#00FF88]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">AI Рекомендации • {showRecommendations}</h3>
                  <p className="text-xs text-[#00FF88]/60">Анализ на основе текущих метрик</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecommendations(null)}
                className="p-2 hover:bg-[#00FF88]/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="space-y-4">
                  {recommendations[showRecommendations].split('\n').map((line, idx) => {
                    if (!line.trim()) return null;
                    
                    // Check if it's a numbered item
                    const isNumbered = /^\d+\./.test(line.trim());
                    const isBullet = /^[-•\*]/.test(line.trim());
                    const isHeader = line.includes('**') || line.startsWith('#');
                    
                    if (isNumbered || isBullet) {
                      return (
                        <div key={idx} className="flex gap-3 items-start">
                          <div className="w-6 h-6 rounded-full bg-[#00FF88]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Lightbulb className="w-3.5 h-3.5 text-[#00FF88]" />
                          </div>
                          <p className="text-gray-200 leading-relaxed">
                            {line.replace(/^[\d\.\ \-•\*]+/, '').trim()}
                          </p>
                        </div>
                      );
                    }
                    
                    if (isHeader) {
                      return (
                        <h4 key={idx} className="text-white font-semibold mt-4">
                          {line.replace(/[\*#]/g, '').trim()}
                        </h4>
                      );
                    }
                    
                    return (
                      <p key={idx} className="text-gray-400 leading-relaxed">
                        {line.trim()}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#00FF88]/10 bg-[#00FF88]/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Sparkles className="w-4 h-4 text-[#00FF88]/60" />
                <span>Groq AI • Llama 3.3 70B</span>
              </div>
              <button
                onClick={() => {
                  delete recommendations[showRecommendations];
                  setRecommendations({ ...recommendations });
                  fetchRecommendations(showRecommendations);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#00FF88]/10 hover:bg-[#00FF88]/20 border border-[#00FF88]/30 rounded-lg text-sm transition-all text-[#00FF88]"
              >
                <RefreshCw className="w-4 h-4" />
                Обновить рекомендации
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
