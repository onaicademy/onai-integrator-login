/**
 * UTM Sources Analysis Panel
 * 
 * Админ панель для анализа ВСЕХ источников продаж по UTM-меткам
 * Не только таргетологи, но все источники трафика
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { TrafficCabinetLayout } from '@/components/traffic/TrafficCabinetLayout';
import { 
  TrendingUp, DollarSign, Target, BarChart3, 
  Search, Filter, AlertTriangle, Eye, Calendar,
  ExternalLink, PieChart, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';
import { AuthManager } from '@/lib/auth';

export default function UTMSourcesPanel() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'campaigns' | 'noUtm'>('overview');
  const [days, setDays] = useState(30);
  const [searchQuery, setSearchQuery] = useState('');
  const token = AuthManager.getAccessToken();

  // Fetch overview
  const { data: overview, isLoading: loadingOverview, refetch: refetchOverview } = useQuery({
    queryKey: ['utm-overview', days],
    queryFn: async () => {
      const response = await axios.get(
        `${API_URL}/api/utm-analytics/overview?days=${days}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    }
  });

  // Fetch sales without UTM
  const { data: noUtmData, isLoading: loadingNoUtm } = useQuery({
    queryKey: ['utm-without'],
    queryFn: async () => {
      const response = await axios.get(
        `${API_URL}/api/utm-analytics/without-utm`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    enabled: activeTab === 'noUtm'
  });

  const formatMoney = (amount: number) => {
    if (amount >= 1000000) return `₸${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `₸${(amount / 1000).toFixed(1)}K`;
    return `₸${amount.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <TrafficCabinetLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <PieChart className="w-8 h-8 text-[#00FF88]" />
            <h1 className="text-3xl font-bold text-white">Источники Продаж</h1>
          </div>
          <p className="text-gray-400">Анализ всех UTM-меток и источников трафика</p>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-6">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-4 py-2 bg-black/50 border border-[#00FF88]/20 rounded-lg text-white"
          >
            <option value={7}>7 дней</option>
            <option value={14}>14 дней</option>
            <option value={30}>30 дней</option>
            <option value={60}>60 дней</option>
            <option value={90}>90 дней</option>
          </select>

          <Button
            onClick={() => refetchOverview()}
            variant="outline"
            className="border-[#00FF88]/20 text-[#00FF88] hover:bg-[#00FF88]/10"
          >
            Обновить
          </Button>
        </div>

        {/* Loading State */}
        {loadingOverview && (
          <div className="text-center py-16">
            <Activity className="w-12 h-12 mx-auto mb-4 animate-pulse text-[#00FF88]" />
            <p className="text-gray-400">Загрузка данных...</p>
          </div>
        )}

        {/* Summary Cards */}
        {!loadingOverview && overview && overview.summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl p-4">
              <p className="text-xs text-[#00FF88]/60 mb-2">Всего продаж</p>
              <p className="text-2xl font-bold text-white">{overview.summary.total_sales}</p>
            </div>
            <div className="bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl p-4">
              <p className="text-xs text-[#00FF88]/60 mb-2">Общая выручка</p>
              <p className="text-2xl font-bold text-[#00FF88]">{formatMoney(overview.summary.total_revenue)}</p>
            </div>
            <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2">Средний чек</p>
              <p className="text-2xl font-bold text-white">{formatMoney(overview.summary.avg_sale)}</p>
            </div>
            <div className={`${overview.summary.sales_without_utm > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-black/40 border-[#00FF88]/20'} rounded-xl p-4`}>
              <p className="text-xs text-gray-400 mb-2">Без UTM</p>
              <p className={`text-2xl font-bold ${overview.summary.sales_without_utm > 0 ? 'text-red-400' : 'text-[#00FF88]'}`}>
                {overview.summary.sales_without_utm}
              </p>
            </div>
            <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2">UTM покрытие</p>
              <p className="text-2xl font-bold text-white">{overview.summary.utm_coverage}%</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#00FF88]/10">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon={<BarChart3 className="w-4 h-4" />}
            label="Обзор"
          />
          <TabButton
            active={activeTab === 'sources'}
            onClick={() => setActiveTab('sources')}
            icon={<Activity className="w-4 h-4" />}
            label="По источникам"
            count={overview?.by_source?.length}
          />
          <TabButton
            active={activeTab === 'campaigns'}
            onClick={() => setActiveTab('campaigns')}
            icon={<Target className="w-4 h-4" />}
            label="По кампаниям"
            count={overview?.by_campaign?.length}
          />
          <TabButton
            active={activeTab === 'noUtm'}
            onClick={() => setActiveTab('noUtm')}
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Без UTM"
            count={overview?.summary?.sales_without_utm}
            alert={overview?.summary?.sales_without_utm > 0}
          />
        </div>

        {/* Empty State */}
        {!loadingOverview && !overview?.summary && (
          <div className="text-center py-16 bg-gradient-to-br from-black/40 to-black/20 rounded-2xl border border-[#00FF88]/20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800/50 flex items-center justify-center">
              <PieChart className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Нет данных о продажах</h3>
            <p className="text-gray-400 mb-2">За выбранный период продаж с UTM метками не найдено</p>
            <p className="text-sm text-gray-500">Проверьте подключение AmoCRM или увеличьте период</p>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && !loadingOverview && overview && overview.summary && (
          <div className="space-y-6">
            {/* By Targetologist */}
            <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">По таргетологам</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {overview.by_targetologist?.map((stat: any) => (
                  <div key={stat.targetologist} className="bg-black/60 border border-[#00FF88]/10 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-2">{stat.targetologist}</p>
                    <p className="text-xl font-bold text-[#00FF88] mb-1">{formatMoney(stat.revenue)}</p>
                    <p className="text-xs text-gray-500">{stat.sales} продаж</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sources Tab */}
        {activeTab === 'sources' && !loadingOverview && overview?.by_source && overview.by_source.length > 0 && (
          <div className="space-y-3">
            {overview.by_source?.map((source: any, idx: number) => (
              <div key={source.source} className="bg-black/40 border border-[#00FF88]/10 rounded-xl p-4 hover:bg-black/60 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                      idx === 0 ? 'bg-[#00FF88]/20 text-[#00FF88]' :
                      idx === 1 ? 'bg-[#00FF88]/15 text-[#00FF88]/80' :
                      idx === 2 ? 'bg-[#00FF88]/10 text-[#00FF88]/60' :
                      'bg-gray-800 text-gray-500'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-white">{source.source}</p>
                      <p className="text-sm text-gray-400">{source.sales} продаж</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xl font-bold text-[#00FF88]">{formatMoney(source.revenue)}</p>
                    <p className="text-xs text-gray-400">Средний: {formatMoney(source.revenue / source.sales)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sources' && !loadingOverview && (!overview?.by_source || overview.by_source.length === 0) && (
          <div className="text-center py-12 bg-black/40 rounded-xl border border-[#00FF88]/20">
            <Activity className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p className="text-white font-bold">Нет данных по источникам</p>
            <p className="text-sm text-gray-400 mt-1">Продажи без UTM source меток</p>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && overview && (
          <div className="space-y-3">
            <div className="mb-4">
              <Input
                placeholder="Поиск по кампании..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black/50 border-[#00FF88]/20 text-white"
              />
            </div>

            {overview.by_campaign
              ?.filter((c: any) => 
                searchQuery === '' || 
                c.campaign.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((campaign: any, idx: number) => (
                <div key={campaign.campaign} className="bg-black/40 border border-[#00FF88]/10 rounded-xl p-4 hover:bg-black/60 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-white mb-1">{campaign.campaign}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Источник: <span className="text-[#00FF88]">{campaign.source || 'N/A'}</span></span>
                        <span>{campaign.sales} продаж</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#00FF88]">{formatMoney(campaign.revenue)}</p>
                      <p className="text-xs text-gray-400">CPA: {formatMoney(campaign.revenue / campaign.sales)}</p>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* No UTM Tab */}
        {activeTab === 'noUtm' && (
          <div className="space-y-4">
            {loadingNoUtm ? (
              <div className="text-center py-12 text-gray-400">Загрузка...</div>
            ) : noUtmData && noUtmData.count > 0 ? (
              <div className="space-y-3">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <div>
                      <p className="font-bold text-white">Внимание! {noUtmData.count} продаж без UTM-меток</p>
                      <p className="text-sm text-gray-400">Эти продажи невозможно привязать к источнику трафика</p>
                    </div>
                  </div>
                </div>

                {noUtmData.sales?.map((sale: any) => (
                  <div key={sale.id} className="bg-black/40 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">{sale.contact_name || sale.lead_name}</p>
                        <p className="text-sm text-gray-400">Lead ID: {sale.lead_id}</p>
                        <p className="text-xs text-gray-500">{formatDate(sale.sale_date)}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xl font-bold text-[#00FF88]">{formatMoney(sale.sale_amount)}</p>
                        {sale.targetologist && sale.targetologist !== 'Unknown' && (
                          <p className="text-xs text-gray-400">{sale.targetologist}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#00FF88]/5 rounded-xl border border-[#00FF88]/20">
                <Target className="w-12 h-12 text-[#00FF88] mx-auto mb-4" />
                <p className="text-white font-bold mb-2">Отлично! Все продажи с UTM-метками</p>
                <p className="text-sm text-gray-400">100% покрытие трекинга</p>
              </div>
            )}
          </div>
        )}
      </div>
    </TrafficCabinetLayout>
  );
}

function TabButton({ active, onClick, icon, label, count, alert }: any) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-3 transition-all relative
        ${active 
          ? 'text-[#00FF88] border-b-2 border-[#00FF88]' 
          : 'text-gray-400 hover:text-white'
        }
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {count !== undefined && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
          alert ? 'bg-red-500/20 text-red-400' :
          active ? 'bg-[#00FF88]/20 text-[#00FF88]' : 'bg-gray-800 text-gray-400'
        }`}>
          {count}
        </span>
      )}
      {alert && count > 0 && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </button>
  );
}
