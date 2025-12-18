import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, Calendar, ArrowUp, ArrowDown, Minus, RefreshCw, DollarSign, Target, Percent } from 'lucide-react';
import { useState, useMemo } from 'react';
import { landingSupabase } from '@/lib/supabase-landing';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import axios from 'axios';

interface Lead {
  id: string;
  source: string;
  created_at: string;
}

interface SalesTeamData {
  team: string;
  emoji: string;
  color: string;
  count: number;
  today: number;
  yesterday: number;
  last7Days: number;
  last30Days: number;
  revenue: number;
  revenueToday: number;
  revenueLast7Days: number;
  revenueLast30Days: number;
  campaignsCount: number;
  adsetsCount: number;
  campaigns: string[];
}

interface SalesData {
  success: boolean;
  stats: {
    total: number;
    today: number;
    yesterday: number;
    last7Days: number;
    last30Days: number;
    teamsCount: number;
    revenue: number;
    revenueToday: number;
    revenueLast7Days: number;
    revenueLast30Days: number;
    revenuePerSale: number;
  };
  teams: SalesTeamData[];
  chartData: any[];
  updatedAt: string;
}

// 💰 Format currency in KZT
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'KZT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// 💰 Format short currency (e.g., 50K)
const formatShortCurrency = (amount: number): string => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M ₸`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K ₸`;
  return `${amount} ₸`;
};

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// 🎯 Traffic team source mapping with display names
const TRAFFIC_SOURCES: Record<string, { name: string; emoji: string; color: string }> = {
  'TF4': { name: 'Траф 4', emoji: '🔴', color: '#ef4444' },
  'proftest_traf4': { name: 'Траф 4', emoji: '🔴', color: '#ef4444' },
  'proftest_muha': { name: 'Muha', emoji: '🐝', color: '#eab308' },
  'proftest_arystan': { name: 'Arystan', emoji: '⚡', color: '#8b5cf6' },
  'proftest_kenesary': { name: 'Kenesary', emoji: '👨‍💼', color: '#3b82f6' },
  'muha': { name: 'Muha', emoji: '🐝', color: '#eab308' },
  'arystan': { name: 'Arystan', emoji: '⚡', color: '#8b5cf6' },
  'kenesary': { name: 'Kenesary', emoji: '👨‍💼', color: '#3b82f6' },
  'traf4': { name: 'Траф 4', emoji: '🔴', color: '#ef4444' },
};

// 🎯 Helper to get traffic team display info
const getTrafficDisplay = (source: string): { name: string; emoji: string; color: string } => {
  return TRAFFIC_SOURCES[source] || { name: source, emoji: '📌', color: '#6b7280' };
};

// 🎯 Check if source is from traffic team
const isTrafficSource = (source: string): boolean => {
  const trafficKeywords = ['traf', 'muha', 'arystan', 'kenesary'];
  const lowerSource = source.toLowerCase();
  return trafficKeywords.some(keyword => lowerSource.includes(keyword));
};

// 🎯 Date range options
type DateRange = '7d' | '14d' | '30d' | 'all';

export default function TrafficCommandDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'leads' | 'sales'>('leads');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  // 🎯 Main traffic teams (priority display)
  const MAIN_TRAFFIC_TEAMS = ['Kenesary', 'Arystan', 'Muha', 'Traf4'];

  // 🔥 Fetch sales data from AmoCRM via backend
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useQuery<SalesData>({
    queryKey: ['traffic-sales'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/traffic/sales`);
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 2,
  });

  // 🔥 Fetch all leads from landing_leads table
  const { data: allLeads, isLoading, refetch, isFetching } = useQuery<Lead[]>({
    queryKey: ['traffic-leads'],
    queryFn: async () => {
      if (!landingSupabase) {
        throw new Error('Supabase client not initialized');
      }
      
      const { data, error } = await landingSupabase
        .from('landing_leads')
        .select('id, source, created_at')
        .order('created_at', { ascending: false })
        .limit(5000);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  // 🎯 Filter leads by traffic source only
  const trafficLeads = useMemo(() => {
    return allLeads?.filter(lead => isTrafficSource(lead.source || '')) || [];
  }, [allLeads]);

  // 🎯 Filter by date range
  const filteredLeads = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    let daysBack = 0;
    switch (dateRange) {
      case '7d': daysBack = 7; break;
      case '14d': daysBack = 14; break;
      case '30d': daysBack = 30; break;
      case 'all': daysBack = 365; break;
    }
    
    const cutoff = now - (daysBack * dayMs);
    return trafficLeads.filter(lead => new Date(lead.created_at).getTime() >= cutoff);
  }, [trafficLeads, dateRange]);

  // 🎯 Group leads by source with stats
  const sourceStats = useMemo(() => {
    const stats: Record<string, { 
      count: number; 
      today: number; 
      yesterday: number;
      last7Days: number;
    }> = {};
    
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    filteredLeads.forEach(lead => {
      const source = lead.source || 'unknown';
      if (!stats[source]) {
        stats[source] = { count: 0, today: 0, yesterday: 0, last7Days: 0 };
      }
      
      const leadTime = new Date(lead.created_at).getTime();
      
      stats[source].count++;
      
      if (leadTime >= todayStart) {
        stats[source].today++;
      }
      if (leadTime >= yesterdayStart && leadTime < todayStart) {
        stats[source].yesterday++;
      }
      if (leadTime >= weekAgo) {
        stats[source].last7Days++;
      }
    });
    
    return stats;
  }, [filteredLeads]);

  // 🎯 Sorted sources by lead count
  const sortedSources = useMemo(() => {
    return Object.entries(sourceStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([source]) => source);
  }, [sourceStats]);

  // 🎯 Generate chart data (daily leads for selected period)
  const chartData = useMemo(() => {
    const daysCount = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : dateRange === '30d' ? 30 : 30;
    
    const days = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (daysCount - 1 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });
    
    return days.map(date => {
      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const dayLeads = filteredLeads.filter(lead => {
        const leadTime = new Date(lead.created_at).getTime();
        return leadTime >= dayStart && leadTime < dayEnd;
      });
      
      // Group by source for stacked chart
      const bySource: Record<string, number> = {};
      sortedSources.forEach(source => {
        bySource[source] = dayLeads.filter(l => l.source === source).length;
      });
      
      return {
        date: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        fullDate: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
        total: dayLeads.length,
        ...bySource,
      };
    });
  }, [filteredLeads, sortedSources, dateRange]);

  // 🎯 Get trend indicator
  const getTrend = (today: number, yesterday: number) => {
    if (today > yesterday) return { icon: ArrowUp, color: 'text-green-400', label: `+${today - yesterday}` };
    if (today < yesterday) return { icon: ArrowDown, color: 'text-red-400', label: `${today - yesterday}` };
    return { icon: Minus, color: 'text-gray-400', label: '0' };
  };

  // 🎯 Total stats
  const totalToday = Object.values(sourceStats).reduce((sum, s) => sum + s.today, 0);
  const totalYesterday = Object.values(sourceStats).reduce((sum, s) => sum + s.yesterday, 0);
  const totalAll = Object.values(sourceStats).reduce((sum, s) => sum + s.count, 0);
  const totalTrend = getTrend(totalToday, totalYesterday);

  // 🎯 Colors for chart
  const sourceColors: Record<string, string> = {};
  sortedSources.forEach(source => {
    sourceColors[source] = getTrafficDisplay(source).color;
  });

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-[#00FF94] to-[#00CC77] text-transparent bg-clip-text">
            📊 Статистика Трафик-Команд
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Лиды с рекламных кампаний • Обновляется каждые 30 секунд
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-2 mb-6 md:mb-8">
          {/* Date range */}
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
            {(['7d', '14d', '30d', 'all'] as DateRange[]).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  dateRange === range
                    ? 'bg-[#00FF94]/20 text-[#00FF94] border border-[#00FF94]/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {range === '7d' ? '7 дней' : range === '14d' ? '14 дней' : range === '30d' ? '30 дней' : 'Все'}
              </button>
            ))}
          </div>
          
          {/* Refresh */}
          <button
            onClick={() => { refetch(); refetchSales(); }}
            disabled={isFetching || salesLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={(isFetching || salesLoading) ? 'animate-spin' : ''} />
            <span className="hidden md:inline">Обновить</span>
          </button>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-[#00FF94] mx-auto mb-3" />
              <p className="text-gray-400">Загрузка статистики...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
              {/* Leads Stats */}
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 md:p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="text-[#00FF94]" size={20} />
                  <span className="text-gray-400 text-xs uppercase">Лидов</span>
                </div>
                <p className="text-2xl md:text-3xl font-bold">{totalAll}</p>
                <p className="text-xs text-gray-500">за период</p>
              </div>
              
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 md:p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="text-blue-400" size={20} />
                  <span className="text-gray-400 text-xs uppercase">Сегодня</span>
                </div>
                <div className="flex items-end gap-2">
                  <p className="text-2xl md:text-3xl font-bold">{totalToday}</p>
                  <div className={`flex items-center text-sm ${totalTrend.color}`}>
                    <totalTrend.icon size={14} />
                    <span>{totalTrend.label}</span>
                  </div>
                </div>
              </div>
              
              {/* Sales Stats from AmoCRM */}
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4 md:p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="text-green-400" size={20} />
                  <span className="text-green-400 text-xs uppercase">Продаж</span>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-green-400">
                  {salesLoading ? '...' : salesData?.stats?.total || 0}
                </p>
                <p className="text-xs text-green-500/70">
                  {salesLoading ? '' : formatShortCurrency(salesData?.stats?.revenue || 0)}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4 md:p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="text-green-400" size={20} />
                  <span className="text-green-400 text-xs uppercase">За 7 дней</span>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-green-400">
                  {salesLoading ? '...' : salesData?.stats?.last7Days || 0}
                </p>
                <p className="text-xs text-green-500/70">
                  {salesLoading ? '' : formatShortCurrency(salesData?.stats?.revenueLast7Days || 0)}
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 md:p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="text-yellow-400" size={20} />
                  <span className="text-gray-400 text-xs uppercase">Конверсия</span>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-yellow-400">
                  {totalAll > 0 && salesData?.stats?.total 
                    ? `${((salesData.stats.total / totalAll) * 100).toFixed(1)}%` 
                    : '0%'}
                </p>
                <p className="text-xs text-gray-500">лид → продажа</p>
              </div>
              
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 md:p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-orange-400" size={20} />
                  <span className="text-gray-400 text-xs uppercase">Команд</span>
                </div>
                <p className="text-2xl md:text-3xl font-bold">{sortedSources.length}</p>
                <p className="text-xs text-gray-500">в работе</p>
              </div>
            </div>

            {/* Main Chart */}
            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 md:p-6 mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="text-[#00FF94]" size={20} />
                Динамика лидов
              </h2>
              
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00FF94" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00FF94" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF" 
                      style={{ fontSize: 10 }} 
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      stroke="#9CA3AF" 
                      style={{ fontSize: 10 }} 
                      tick={{ fontSize: 10 }}
                      width={35}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload;
                        return item?.fullDate || label;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#00FF94" 
                      fill="url(#colorTotal)" 
                      strokeWidth={2}
                      name="Всего лидов"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Teams breakdown */}
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {/* Left: Stacked bar chart by source */}
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 md:p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  📊 По командам (за период)
                </h2>
                
                <div className="h-64 md:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF" 
                        style={{ fontSize: 9 }} 
                        tick={{ fontSize: 9 }}
                      />
                      <YAxis 
                        stroke="#9CA3AF" 
                        style={{ fontSize: 9 }} 
                        tick={{ fontSize: 9 }}
                        width={30}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0,0,0,0.95)', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          fontSize: 11,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {sortedSources.map(source => {
                        const display = getTrafficDisplay(source);
                        return (
                          <Bar 
                            key={source}
                            dataKey={source} 
                            stackId="a"
                            fill={display.color}
                            name={`${display.emoji} ${display.name}`}
                          />
                        );
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right: Team cards */}
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 md:p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  🏆 Рейтинг команд
                </h2>
                
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {sortedSources.map((source, index) => {
                    const stats = sourceStats[source];
                    const display = getTrafficDisplay(source);
                    const trend = getTrend(stats.today, stats.yesterday);
                    
                    return (
                      <div 
                        key={source}
                        className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                      >
                        {/* Rank */}
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' : 
                            index === 1 ? 'bg-gray-400/20 text-gray-300' : 
                            index === 2 ? 'bg-orange-500/20 text-orange-400' : 
                            'bg-white/5 text-gray-500'}
                        `}>
                          {index + 1}
                        </div>
                        
                        {/* Emoji & Name */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{display.emoji}</span>
                            <span className="font-medium truncate" style={{ color: display.color }}>
                              {display.name}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {source}
                          </div>
                        </div>
                        
                        {/* Stats */}
                        <div className="text-right">
                          <div className="text-xl font-bold">{stats.count}</div>
                          <div className={`flex items-center justify-end text-xs ${trend.color}`}>
                            <trend.icon size={12} />
                            <span>{stats.today} сегодня</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {sortedSources.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Нет данных за выбранный период
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Daily breakdown table */}
            <div className="mt-6 md:mt-8 bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
              <div className="p-4 md:p-6 border-b border-white/5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  📅 Ежедневная статистика
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Дата</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Всего</th>
                      {sortedSources.slice(0, 4).map(source => {
                        const display = getTrafficDisplay(source);
                        return (
                          <th 
                            key={source}
                            className="px-4 py-3 text-right text-xs font-medium uppercase"
                            style={{ color: display.color }}
                          >
                            {display.emoji} {display.name}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[...chartData].reverse().slice(0, 14).map((day, i) => (
                      <tr 
                        key={i} 
                        className={`border-b border-white/5 ${i === 0 ? 'bg-[#00FF94]/5' : 'hover:bg-white/[0.02]'}`}
                      >
                        <td className="px-4 py-3 font-medium">
                          {i === 0 && <span className="text-[#00FF94] mr-2">●</span>}
                          {day.fullDate}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#00FF94]">{day.total}</td>
                        {sortedSources.slice(0, 4).map(source => {
                          const count = (day as any)[source] || 0;
                          return (
                            <td key={source} className="px-4 py-3 text-right text-gray-300">
                              {count > 0 ? count : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 💰 Sales by Traffic Team */}
            {salesData?.teams && salesData.teams.length > 0 && (
              <div className="mt-6 md:mt-8 bg-gradient-to-br from-green-500/5 to-green-600/5 border border-green-500/20 rounded-xl overflow-hidden">
                {/* Search & Filter */}
                <div className="p-4 border-b border-green-500/10 bg-black/20">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="🔍 Поиск по источнику..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                      />
                    </div>
                    {selectedTeam && (
                      <button
                        onClick={() => { setSelectedTeam(null); setSearchQuery(''); }}
                        className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-sm"
                      >
                        ✕ Сбросить фильтр
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 md:p-6 border-b border-green-500/10">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold flex items-center gap-2 text-green-400">
                        💰 Продажи по командам (AmoCRM)
                      </h2>
                      <p className="text-xs text-green-500/70 mt-1">
                        Данные из этапа "Успешно реализовано" • {salesData?.stats?.revenuePerSale || 5000}₸/продажа
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Всего выручка</div>
                        <div className="text-xl font-bold text-green-400">
                          {formatCurrency(salesData?.stats?.revenue || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 md:p-6">
                  {/* 🏆 Main Traffic Teams */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-green-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                      🎯 Трафик-команды
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {salesData.teams
                        .filter(t => MAIN_TRAFFIC_TEAMS.includes(t.team))
                        .filter(t => !searchQuery || t.team.toLowerCase().includes(searchQuery.toLowerCase()))
                        .filter(t => !selectedTeam || t.team === selectedTeam)
                        .map((teamData, index) => {
                          const allMainTeams = salesData.teams.filter(t => MAIN_TRAFFIC_TEAMS.includes(t.team));
                          const mainIndex = allMainTeams.findIndex(t => t.team === teamData.team);
                          return renderTeamCard(teamData, mainIndex);
                        })}
                      {salesData.teams.filter(t => MAIN_TRAFFIC_TEAMS.includes(t.team)).length === 0 && (
                        <div className="col-span-2 text-center py-4 text-gray-500">
                          Нет данных по трафик-командам
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 📊 Other Sources */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                      📊 Остальные источники
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {salesData.teams
                        .filter(t => !MAIN_TRAFFIC_TEAMS.includes(t.team))
                        .filter(t => !searchQuery || t.team.toLowerCase().includes(searchQuery.toLowerCase()))
                        .filter(t => !selectedTeam || t.team === selectedTeam)
                        .map((teamData, index) => {
                          const allOtherTeams = salesData.teams.filter(t => !MAIN_TRAFFIC_TEAMS.includes(t.team));
                          const otherIndex = allOtherTeams.findIndex(t => t.team === teamData.team);
                          return renderTeamCard(teamData, otherIndex, true);
                        })}
                      {salesData.teams.filter(t => !MAIN_TRAFFIC_TEAMS.includes(t.team)).length === 0 && (
                        <div className="col-span-2 text-center py-4 text-gray-500">
                          Нет других источников
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {(searchQuery || selectedTeam) && 
                   salesData.teams.filter(t => 
                     (!searchQuery || t.team.toLowerCase().includes(searchQuery.toLowerCase())) &&
                     (!selectedTeam || t.team === selectedTeam)
                   ).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Ничего не найдено
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 text-center text-gray-500 text-xs">
              <p>Данные обновляются автоматически каждые 30 секунд</p>
              <p className="mt-1">Последнее обновление: {new Date().toLocaleString('ru-RU')}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // 🎨 Render team card helper
  function renderTeamCard(teamData: SalesTeamData, index: number, isOther: boolean = false) {
    const leadsForTeam = sourceStats[teamData.team]?.count || 
                         sourceStats[teamData.team.toLowerCase()]?.count || 0;
    const conversionRate = leadsForTeam > 0 ? ((teamData.count / leadsForTeam) * 100).toFixed(1) : '-';
    
    return (
      <div
        key={teamData.team}
        onClick={() => setSelectedTeam(selectedTeam === teamData.team ? null : teamData.team)}
        className={`bg-black/30 border rounded-xl p-4 transition-all cursor-pointer ${
          selectedTeam === teamData.team 
            ? 'border-green-500/50 ring-2 ring-green-500/30 bg-green-500/5' 
            : isOther 
              ? 'border-gray-500/10 hover:border-gray-500/30' 
              : 'border-green-500/10 hover:border-green-500/30'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
              ${!isOther && index === 0 ? 'bg-yellow-500/20 text-yellow-400 ring-2 ring-yellow-500/30' : 
                !isOther && index === 1 ? 'bg-gray-400/20 text-gray-300' : 
                !isOther && index === 2 ? 'bg-orange-500/20 text-orange-400' : 
                'bg-white/5 text-gray-500'}
            `}>
              {teamData.emoji || '📊'}
            </div>
            <div>
              <div className="font-bold text-lg" style={{ color: teamData.color || '#00FF94' }}>
                {teamData.team}
              </div>
              <div className="text-xs text-gray-500">
                {teamData.campaignsCount || 0} кампаний • {teamData.adsetsCount || 0} объявлений
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">
              {teamData.count}
            </div>
            <div className="text-sm text-green-500">
              {formatShortCurrency(teamData.revenue)}
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 text-center mb-3">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-[10px] text-gray-400">Сегодня</div>
            <div className="font-bold text-green-400">{teamData.today}</div>
            <div className="text-[9px] text-green-600">{formatShortCurrency(teamData.revenueToday)}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-[10px] text-gray-400">7 дней</div>
            <div className="font-bold text-white">{teamData.last7Days}</div>
            <div className="text-[9px] text-gray-500">{formatShortCurrency(teamData.revenueLast7Days)}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-[10px] text-gray-400">30 дней</div>
            <div className="font-bold text-white">{teamData.last30Days}</div>
            <div className="text-[9px] text-gray-500">{formatShortCurrency(teamData.revenueLast30Days)}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-[10px] text-gray-400">CR</div>
            <div className="font-bold text-yellow-400">{conversionRate}%</div>
            <div className="text-[9px] text-gray-500">лиды: {leadsForTeam}</div>
          </div>
        </div>
        
        {/* Top Campaigns */}
        {teamData.campaigns && teamData.campaigns.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="text-[10px] text-gray-500 mb-1">Топ кампании:</div>
            <div className="flex flex-wrap gap-1">
              {teamData.campaigns.slice(0, 3).map((campaign, i) => (
                <span 
                  key={i}
                  className="text-[9px] px-2 py-0.5 bg-white/5 rounded-full text-gray-400 truncate max-w-[120px]"
                  title={campaign}
                >
                  {campaign}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}
