/**
 * Premium Traffic Dashboard - Main Layout Component
 * 
 * Layout:
 * - Desktop: Funnel on left (50%), Metrics + Teams on right (50%)
 * - Mobile: Stacked vertically
 * 
 * Design: Strict minimalism, premium admin panel feel
 * Brand colors: #00FF88 (green), black background
 * No glows, shadows, or excessive visual effects
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  LogOut, Settings, BarChart3, User, Users, Globe,
  RefreshCw, Calendar, ChevronDown, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnAILogo } from '@/components/OnAILogo';
import { AuthManager, AuthUser } from '@/lib/auth';
import { useLanguage } from '@/hooks/useLanguage';
import { PremiumFunnelPyramid } from './PremiumFunnelPyramid';
import { PremiumMetricsGrid } from './PremiumMetricsGrid';
import { TeamAvatar } from './TeamAvatar';
import { TRAFFIC_API_URL } from '@/config/traffic-api';

const API_URL = TRAFFIC_API_URL;

interface PremiumTrafficDashboardProps {
  showOnlyMyTeam?: boolean;
}

export function PremiumTrafficDashboard({ showOnlyMyTeam = false }: PremiumTrafficDashboardProps) {
  const { team } = useParams<{ team: string }>();
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();
  
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'KZT'>('USD');
  const [filterMyTeam, setFilterMyTeam] = useState(showOnlyMyTeam);

  // Auth validation
  useEffect(() => {
    const token = AuthManager.getAccessToken();
    const userData = AuthManager.getUser();
    
    if (!token || !userData) {
      navigate('/traffic/login');
      return;
    }

    if (userData.role === 'admin') {
      navigate('/traffic/admin/dashboard');
      return;
    }

    setUser(userData);
    setLoading(false);
  }, [navigate]);

  const teamName = team?.charAt(0).toUpperCase() + team?.slice(1).toLowerCase() || user?.team;

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading, refetch, isFetching } = useQuery({
    queryKey: ['combined-analytics', dateRange, customDate],
    queryFn: async () => {
      const url = customDate 
        ? `${API_URL}/api/traffic/combined-analytics?date=${customDate}`
        : `${API_URL}/api/traffic/combined-analytics?preset=${dateRange}`;
      const response = await axios.get(url);
      return response.data;
    },
    refetchInterval: 600000, // 10 minutes
    retry: 2,
  });

  const exchangeRate = analytics?.exchangeRate?.usdToKzt || 500;

  const handleLogout = () => {
    AuthManager.clearAll();
    fetch('/api/traffic-auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {});
    navigate('/traffic/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totals = analytics?.totals || {
    revenue: 0, spend: 0, roas: 0, cpa: 0, clicks: 0, impressions: 0, sales: 0, ctr: 0
  };

  // Filter teams
  const displayTeams = filterMyTeam && teamName 
    ? analytics?.teams?.filter((t: any) => t.team === teamName) || []
    : analytics?.teams || [];

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Logo + User */}
            <div className="flex items-center gap-4">
              <OnAILogo className="h-8 w-auto text-white" />
              
              {user && (
                <div className="hidden md:flex items-center gap-3 pl-4 border-l border-gray-800">
                  <div className="w-9 h-9 rounded-lg bg-[#0a0a0a] border border-gray-800 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#00FF88]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user.fullName}</p>
                    <p className="text-xs text-gray-500">{user.team}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              {/* Language */}
              <Button
                onClick={toggleLanguage}
                variant="ghost"
                size="sm"
                className="h-9 px-3 bg-transparent border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
              >
                <Globe className="w-4 h-4 mr-1" />
                <span className="text-xs uppercase">{language === 'ru' ? 'РУС' : 'ҚАЗ'}</span>
              </Button>

              {/* Settings */}
              <Button
                onClick={() => navigate('/traffic/settings')}
                variant="ghost"
                size="sm"
                className="h-9 px-3 bg-transparent border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
              >
                <Settings className="w-4 h-4" />
              </Button>

              {/* Analytics */}
              <Button
                onClick={() => navigate('/traffic/detailed-analytics')}
                variant="ghost"
                size="sm"
                className="h-9 px-3 bg-transparent border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>

              {/* My Results Toggle */}
              <Button
                onClick={() => setFilterMyTeam(!filterMyTeam)}
                variant="ghost"
                size="sm"
                className={`h-9 px-3 border ${
                  filterMyTeam 
                    ? 'bg-[#00FF88] border-[#00FF88] text-black hover:bg-[#00FF88]/90' 
                    : 'bg-transparent border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                {filterMyTeam ? <User className="w-4 h-4 mr-1" /> : <Users className="w-4 h-4 mr-1" />}
                <span className="hidden sm:inline text-xs">
                  {filterMyTeam ? 'Мои' : 'Все'}
                </span>
              </Button>

              {/* Logout */}
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="h-9 px-3 bg-transparent border border-gray-800 text-red-400 hover:text-red-300 hover:border-red-400/30"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* Currency Toggle */}
            <div className="flex bg-[#0a0a0a] rounded-lg border border-gray-800 p-0.5">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  currency === 'USD'
                    ? 'bg-[#00FF88] text-black'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                $ USD
              </button>
              <button
                onClick={() => setCurrency('KZT')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  currency === 'KZT'
                    ? 'bg-[#00FF88] text-black'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                ₸ KZT
              </button>
            </div>

            {/* Date Range */}
            <div className="flex bg-[#0a0a0a] rounded-lg border border-gray-800 p-0.5">
              {(['7d', '14d', '30d'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRange(range);
                    setCustomDate(null);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    dateRange === range && !customDate
                      ? 'bg-[#00FF88] text-black'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {range === '7d' ? '7д' : range === '14d' ? '14д' : '30д'}
                </button>
              ))}
            </div>

            {/* Custom Date */}
            <div className="flex items-center gap-2 bg-[#0a0a0a] rounded-lg border border-gray-800 px-3 py-1.5">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={customDate || ''}
                onChange={(e) => setCustomDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="bg-transparent text-white text-xs border-none outline-none"
                style={{ colorScheme: 'dark' }}
              />
              {customDate && (
                <button onClick={() => setCustomDate(null)} className="p-0.5 hover:text-white">
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#0a0a0a] rounded-lg border border-gray-800 text-xs text-gray-400 hover:text-white hover:border-gray-700 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Обновить</span>
            </button>

            {/* Exchange Rate */}
            {analytics?.exchangeRate && (
              <span className="text-xs text-gray-600 hidden md:inline">
                1 USD = {analytics.exchangeRate.usdToKzt.toFixed(0)} ₸
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        {analyticsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Split Layout: Funnel (Left) + Metrics (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Left: Funnel Pyramid */}
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
                <PremiumFunnelPyramid teamFilter={filterMyTeam ? teamName : null} />
              </div>

              {/* Right: Metrics Grid */}
              <div className="space-y-4">
                <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                    Ключевые метрики
                  </h3>
                  <PremiumMetricsGrid
                    revenue={totals.revenue}
                    spend={totals.spend}
                    roas={totals.roas}
                    cpa={totals.cpa}
                    clicks={totals.clicks}
                    impressions={totals.impressions}
                    sales={totals.sales}
                    ctr={totals.ctr}
                    currency={currency}
                    exchangeRate={exchangeRate}
                  />
                </div>
              </div>
            </div>

            {/* Teams Section */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Результаты команд
                </h3>
                <span className="text-xs text-gray-600">
                  {analytics?.period?.since} → {analytics?.period?.until}
                </span>
              </div>

              {/* Teams Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayTeams.map((team: any, index: number) => {
                  const roasStatus = team.roas >= 2 ? 'excellent' : team.roas >= 1 ? 'good' : team.roas >= 0.5 ? 'warning' : 'danger';
                  
                  return (
                    <div
                      key={team.team}
                      className={`
                        p-4 rounded-xl border transition-colors
                        ${index === 0 ? 'border-[#00FF88]/30 bg-[#00FF88]/5' : 'border-gray-800 bg-[#050505] hover:border-gray-700'}
                      `}
                    >
                      {/* Team Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <TeamAvatar teamName={team.team} size="md" />
                        <div>
                          <p className="font-medium text-white">{team.team}</p>
                          <p className="text-xs text-gray-500">#{index + 1}</p>
                        </div>
                      </div>

                      {/* Team Metrics */}
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">ROAS</span>
                          <span className={`text-sm font-bold ${
                            roasStatus === 'excellent' ? 'text-[#00FF88]' :
                            roasStatus === 'good' ? 'text-green-400' :
                            roasStatus === 'warning' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {team.roas.toFixed(1)}x
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Продажи</span>
                          <span className="text-sm font-medium text-white">{team.sales}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">CTR</span>
                          <span className="text-sm text-gray-400">{team.ctr.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 mt-8">
        <div className="max-w-[1600px] mx-auto px-4">
          <p className="text-xs text-gray-600 text-center">
            ⚠️ IP-адреса отслеживаются. Передача доступа запрещена.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PremiumTrafficDashboard;
