import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { landingSupabase } from '@/lib/supabase-landing';
import axios from 'axios';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Target, 
  BarChart3, RefreshCw, ChevronDown, Sparkles, ArrowUpRight,
  Zap, Activity, PieChart, Calendar, Filter
} from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Types
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
}

interface CombinedAnalytics {
  success: boolean;
  period: { since: string; until: string; preset: string };
  teams: CombinedTeamData[];
  totals: CombinedTeamData;
  updatedAt: string;
}

// Format helpers
const formatCurrency = (value: number, currency = '$') => {
  if (value >= 1000000) return `${currency}${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${currency}${(value / 1000).toFixed(1)}K`;
  return `${currency}${value.toFixed(2)}`;
};

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

// ROAS color coding
const getRoasColor = (roas: number) => {
  if (roas >= 3) return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };
  if (roas >= 2) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
  if (roas >= 1) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
  return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
};

// Team colors
const TEAM_COLORS: Record<string, { primary: string; gradient: string }> = {
  'Kenesary': { primary: '#3b82f6', gradient: 'from-blue-500/20 to-blue-600/5' },
  'Arystan': { primary: '#8b5cf6', gradient: 'from-violet-500/20 to-violet-600/5' },
  'Muha': { primary: '#f59e0b', gradient: 'from-amber-500/20 to-amber-600/5' },
  'Traf4': { primary: '#ef4444', gradient: 'from-red-500/20 to-red-600/5' },
};

export default function TrafficCommandDashboard() {
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);

  // Fetch combined analytics (FB Ads + AmoCRM)
  const { data: analytics, isLoading, refetch, isFetching } = useQuery<CombinedAnalytics>({
    queryKey: ['combined-analytics', dateRange],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/traffic/combined-analytics?preset=${dateRange}`);
      return response.data;
    },
    refetchInterval: 60000,
    retry: 2,
  });

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
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">Traffic Analytics</h1>
                  <p className="text-sm text-gray-500">Facebook Ads + AmoCRM Performance</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Date Range Selector */}
                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                  {(['7d', '14d', '30d'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setDateRange(range)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        dateRange === range
                          ? 'bg-white/10 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : '30 Days'}
                    </button>
                  ))}
                </div>

                {/* Team Filter */}
                <div className="relative">
                  <button
                    onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-all"
                  >
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span>{selectedTeam || 'All Teams'}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  {showTeamDropdown && (
                    <div className="absolute top-full mt-2 right-0 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                      <button
                        onClick={() => { setSelectedTeam(null); setShowTeamDropdown(false); }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-all flex items-center gap-2"
                      >
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        All Teams
                      </button>
                      {analytics?.teams.map(team => (
                        <button
                          key={team.team}
                          onClick={() => { setSelectedTeam(team.team); setShowTeamDropdown(false); }}
                          className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-all flex items-center gap-2"
                        >
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: TEAM_COLORS[team.team]?.primary || '#6b7280' }}
                          />
                          {team.team}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Refresh */}
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-6 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading analytics...</p>
              </div>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                {/* Total Revenue */}
                <div className="col-span-1 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Revenue</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatCurrency(analytics?.totals?.revenue || 0, '₸')}</p>
                  <p className="text-xs text-emerald-500/70 mt-1">{analytics?.totals?.sales || 0} sales</p>
                </div>

                {/* Total Spend */}
                <div className="col-span-1 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Ad Spend</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatCurrency(analytics?.totals?.spend || 0)}</p>
                  <p className="text-xs text-red-500/70 mt-1">Facebook Ads</p>
                </div>

                {/* ROAS */}
                <div className={`col-span-1 bg-gradient-to-br ${getRoasColor(analytics?.totals?.roas || 0).bg} border ${getRoasColor(analytics?.totals?.roas || 0).border} rounded-2xl p-5`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg ${getRoasColor(analytics?.totals?.roas || 0).bg} flex items-center justify-center`}>
                      <TrendingUp className={`w-4 h-4 ${getRoasColor(analytics?.totals?.roas || 0).text}`} />
                    </div>
                    <span className={`text-xs font-medium ${getRoasColor(analytics?.totals?.roas || 0).text} uppercase tracking-wider`}>ROAS</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{(analytics?.totals?.roas || 0).toFixed(1)}x</p>
                  <p className={`text-xs ${getRoasColor(analytics?.totals?.roas || 0).text} opacity-70 mt-1`}>
                    {(analytics?.totals?.roas || 0) >= 1 ? 'Profitable' : 'Needs optimization'}
                  </p>
                </div>

                {/* CPA */}
                <div className="col-span-1 bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <Target className="w-4 h-4 text-violet-400" />
                    </div>
                    <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">CPA</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatCurrency(analytics?.totals?.cpa || 0)}</p>
                  <p className="text-xs text-violet-500/70 mt-1">Cost per acquisition</p>
                </div>

                {/* Clicks */}
                <div className="col-span-1 bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Clicks</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatNumber(analytics?.totals?.clicks || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">CTR: {formatPercent(analytics?.totals?.ctr || 0)}</p>
                </div>

                {/* Impressions */}
                <div className="col-span-1 bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Impressions</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatNumber(analytics?.totals?.impressions || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Ad views</p>
                </div>
              </div>

              {/* Team Performance Table */}
              <div className="bg-[#12121a] border border-white/5 rounded-2xl overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PieChart className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-semibold">Team Performance</h2>
                  </div>
                  <span className="text-xs text-gray-500">
                    {analytics?.period?.since} → {analytics?.period?.until}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Team</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Spend</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Revenue</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">ROAS</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Sales</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">CPA</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Clicks</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">CTR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {displayTeams.map((team, idx) => {
                        const colors = TEAM_COLORS[team.team] || { primary: '#6b7280', gradient: 'from-gray-500/20 to-gray-600/5' };
                        const roasColor = getRoasColor(team.roas);
                        
                        return (
                          <tr key={team.team} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: colors.primary }}
                                />
                                <span className="font-medium">{team.team}</span>
                                {topByRoas?.team === team.team && (
                                  <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded-full">
                                    TOP ROAS
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right font-mono text-sm text-red-400">
                              {formatCurrency(team.spend)}
                            </td>
                            <td className="px-6 py-5 text-right font-mono text-sm text-emerald-400">
                              {formatCurrency(team.revenue, '₸')}
                            </td>
                            <td className="px-6 py-5 text-right">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium ${roasColor.bg} ${roasColor.text}`}>
                                {team.roas.toFixed(1)}x
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right font-mono text-sm">
                              {team.sales}
                            </td>
                            <td className="px-6 py-5 text-right font-mono text-sm text-gray-400">
                              {team.cpa > 0 ? formatCurrency(team.cpa) : '—'}
                            </td>
                            <td className="px-6 py-5 text-right font-mono text-sm text-gray-400">
                              {formatNumber(team.clicks)}
                            </td>
                            <td className="px-6 py-5 text-right font-mono text-sm text-gray-400">
                              {formatPercent(team.ctr)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Team Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {displayTeams.map(team => {
                  const colors = TEAM_COLORS[team.team] || { primary: '#6b7280', gradient: 'from-gray-500/20 to-gray-600/5' };
                  const roasColor = getRoasColor(team.roas);
                  
                  return (
                    <div 
                      key={team.team}
                      className={`bg-gradient-to-br ${colors.gradient} border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all cursor-pointer`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                            style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                          >
                            {team.team.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold">{team.team}</h3>
                            <p className="text-xs text-gray-500">{team.sales} sales</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${roasColor.bg} ${roasColor.text}`}>
                          {team.roas.toFixed(1)}x
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Spend</span>
                          <span className="font-mono text-red-400">{formatCurrency(team.spend)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Revenue</span>
                          <span className="font-mono text-emerald-400">{formatCurrency(team.revenue, '₸')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">CPA</span>
                          <span className="font-mono">{team.cpa > 0 ? formatCurrency(team.cpa) : '—'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">CTR</span>
                          <span className="font-mono">{formatPercent(team.ctr)}</span>
                        </div>
                      </div>

                      {/* Mini progress bar for ROAS */}
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-gray-500">ROAS Target: 2.0x</span>
                          <span className={roasColor.text}>{team.roas >= 2 ? '✓ Met' : 'Needs work'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${team.roas >= 2 ? 'bg-emerald-500' : team.roas >= 1 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(team.roas / 3 * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="text-center py-8 border-t border-white/5">
                <p className="text-xs text-gray-500">
                  Data updates every 60 seconds • Last updated: {analytics?.updatedAt ? new Date(analytics.updatedAt).toLocaleString('ru-RU') : '—'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Powered by Facebook Ads API + AmoCRM
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
