/**
 * Target Dashboard Content (for Admin Panel Tab)
 *
 * Pure content component without auth validation/redirects
 * Used inside TrafficAdminPanel as a tab
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PremiumFunnelPyramid } from './PremiumFunnelPyramid';
import { PremiumMetricsGrid } from './PremiumMetricsGrid';
import { AuthManager } from '@/lib/auth';
import { TRAFFIC_API_URL } from '@/config/traffic-api';
import { DateRangePicker } from './DateRangePicker';
import { ForceSyncButton } from './ForceSyncButton';

const API_URL = TRAFFIC_API_URL;

type FunnelType = 'express' | 'challenge3d' | 'intensive1d';

const FUNNELS = {
  express: { name: 'Экспресс-курс', icon: '🚀', color: '#00FF88' },
  challenge3d: { name: 'Трехдневник', icon: '📚', color: '#3B82F6' },
  intensive1d: { name: 'Однодневник', icon: '⚡', color: '#F59E0B' }
};

export function TargetDashboardContent() {
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'KZT'>('USD');
  const [activeFunnel, setActiveFunnel] = useState<FunnelType>('express');

  const user = AuthManager.getUser();
  const hasCustomRange = Boolean(rangeStart && rangeEnd);

  const { data: analytics, isLoading: analyticsLoading, refetch, isFetching } = useQuery({
    queryKey: ['combined-analytics-admin', user?.id, dateRange, customDate, rangeStart, rangeEnd, activeFunnel],
    queryFn: async () => {
      const url = hasCustomRange
        ? `${API_URL}/api/traffic/combined-analytics?start=${rangeStart}&end=${rangeEnd}`
        : customDate
          ? `${API_URL}/api/traffic/combined-analytics?date=${customDate}`
          : `${API_URL}/api/traffic/combined-analytics?preset=${dateRange}`;
      const response = await axios.get(`${url}&userId=${user?.id}&funnel=${activeFunnel}`);
      return response.data;
    },
    enabled: !!user?.id,
    refetchInterval: 600000,
    retry: 2,
  });

  const exchangeRate = analytics?.exchangeRate?.usdToKzt || 500;

  return (
    <div className="space-y-6">
      {/* Header with date range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Таргет Dashboard</h2>
          <p className="text-sm text-gray-400">Аналитика рекламных кампаний по воронкам</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex gap-2">
            {(['7d', '14d', '30d'] as const).map((range) => (
              <Button
                key={range}
                onClick={() => {
                  setDateRange(range);
                  setCustomDate(null);
                  setRangeStart(null);
                  setRangeEnd(null);
                }}
                variant={dateRange === range && !customDate && !hasCustomRange ? 'default' : 'outline'}
                size="sm"
                className={
                  dateRange === range && !customDate && !hasCustomRange
                    ? 'bg-[#00FF88] text-black hover:bg-[#00cc88]'
                    : 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
                }
              >
                <Calendar className="w-3 h-3 mr-1" />
                {range === '7d' ? '7 дней' : range === '14d' ? '14 дней' : '30 дней'}
              </Button>
            ))}

            {/* Custom Date Range Picker */}
            <DateRangePicker
              onRangeSelect={(start, end) => {
                setRangeStart(start);
                setRangeEnd(end);
                if (start && end) {
                  setDateRange('7d'); // Reset preset
                  setCustomDate(null);
                }
              }}
              currentRange={{ start: rangeStart, end: rangeEnd }}
            />
          </div>

          {/* Refresh Button */}
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>

          {/* Force Sync Button */}
          <ForceSyncButton />

          {/* Currency Toggle */}
          <div className="flex bg-black/60 rounded-lg border border-gray-700">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 text-xs font-medium rounded-l-lg transition-all ${
                currency === 'USD'
                  ? 'bg-[#00FF88] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              USD
            </button>
            <button
              onClick={() => setCurrency('KZT')}
              className={`px-3 py-1.5 text-xs font-medium rounded-r-lg transition-all ${
                currency === 'KZT'
                  ? 'bg-[#00FF88] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              KZT
            </button>
          </div>
        </div>
      </div>

      {/* Funnel Tabs */}
      <div className="flex gap-3">
        {(Object.entries(FUNNELS) as [FunnelType, typeof FUNNELS[FunnelType]][]).map(([funnelId, funnel]) => {
          const isActive = activeFunnel === funnelId;
          return (
            <button
              key={funnelId}
              onClick={() => setActiveFunnel(funnelId)}
              className={`
                flex-1 px-6 py-4 rounded-xl font-bold text-base transition-all
                border-2 backdrop-blur-xl
                ${
                  isActive
                    ? 'bg-gradient-to-r from-[#00FF88]/20 to-[#00FF88]/10 border-[#00FF88] text-white shadow-lg shadow-[#00FF88]/30'
                    : 'bg-black/60 border-gray-700 text-gray-400 hover:bg-gray-800/60 hover:border-gray-600'
                }
              `}
              style={{
                transform: isActive ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">{funnel.icon}</span>
                <span>{funnel.name}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {analyticsLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Dashboard Content */}
      {!analyticsLoading && analytics && (
        <div>
          {/* Active Funnel Info Badge */}
          <div className="mb-4 flex items-center gap-2">
            <div
              className="px-4 py-2 rounded-lg border-2 flex items-center gap-2"
              style={{
                borderColor: FUNNELS[activeFunnel].color,
                backgroundColor: `${FUNNELS[activeFunnel].color}20`
              }}
            >
              <span className="text-xl">{FUNNELS[activeFunnel].icon}</span>
              <span className="font-bold text-white">
                Воронка: {FUNNELS[activeFunnel].name}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Funnel Pyramid */}
            <div className="bg-[#0a0a0f]/60 backdrop-blur-xl rounded-xl border border-[#00FF88]/10 p-6">
              <PremiumFunnelPyramid
                userId={user?.id || ''}
                preset={dateRange}
                startDate={rangeStart}
                endDate={rangeEnd}
                funnel={activeFunnel}
                refreshTrigger={0}
              />
            </div>

            {/* Right: Metrics Grid */}
            <div className="space-y-6">
              <PremiumMetricsGrid
                revenue={analytics?.metrics?.revenue || 0}
                spend={analytics?.metrics?.spend || 0}
                roas={analytics?.metrics?.roas || 0}
                cpa={analytics?.metrics?.cpa || 0}
                clicks={analytics?.metrics?.clicks || 0}
                impressions={analytics?.metrics?.impressions || 0}
                sales={analytics?.metrics?.sales || 0}
                ctr={analytics?.metrics?.ctr || 0}
                currency={currency}
                exchangeRate={exchangeRate}
              />
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!analyticsLoading && !analytics && (
        <div className="text-center py-12 text-gray-500">
          <p>Нет данных для отображения</p>
        </div>
      )}
    </div>
  );
}
