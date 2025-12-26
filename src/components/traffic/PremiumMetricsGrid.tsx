/**
 * Premium Metrics Grid Component - Minimalist Design
 * 
 * Key metrics display for the right side of the dashboard:
 * - Revenue & Spend
 * - ROAS & CPA
 * - Clicks & Impressions
 * 
 * Design: Strict minimalism, premium admin panel feel
 * Brand colors: #00FF88 (green), black background
 * No glows, shadows, or excessive visual effects
 */

import { DollarSign, TrendingUp, Target, Zap, Eye, Users } from 'lucide-react';

interface MetricItem {
  id: string;
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
  accent?: boolean;
  status?: 'positive' | 'negative' | 'neutral';
}

interface PremiumMetricsGridProps {
  revenue: number;
  spend: number;
  roas: number;
  cpa: number;
  clicks: number;
  impressions: number;
  sales: number;
  ctr: number;
  currency?: 'USD' | 'KZT';
  exchangeRate?: number;
}

export function PremiumMetricsGrid({
  revenue,
  spend,
  roas,
  cpa,
  clicks,
  impressions,
  sales,
  ctr,
  currency = 'USD',
  exchangeRate = 500,
}: PremiumMetricsGridProps) {

  const formatMoney = (value: number, type: 'spend' | 'revenue' = 'spend') => {
    if (currency === 'KZT') {
      const valueKZT = type === 'revenue' ? value : value * exchangeRate;
      return `${valueKZT.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₸`;
    }
    const valueUSD = type === 'revenue' ? value / exchangeRate : value;
    return `$${valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString('ru-RU');
  };

  const getRoasStatus = (value: number): 'positive' | 'negative' | 'neutral' => {
    if (value >= 3) return 'positive';  // ✅ GREEN for ROAS > 3.0
    if (value >= 1) return 'neutral';
    return 'negative';  // ✅ RED for ROAS < 1.0
  };

  const metrics: MetricItem[] = [
    {
      id: 'revenue',
      label: 'Доход',
      value: formatMoney(revenue, 'revenue'),
      sublabel: `${sales} продаж`,
      icon: <DollarSign className="w-4 h-4" />,
      accent: true,
      status: 'positive',
    },
    {
      id: 'spend',
      label: 'Затраты',
      value: formatMoney(spend, 'spend'),
      sublabel: 'Facebook Ads',
      icon: <TrendingUp className="w-4 h-4" />,
      status: 'neutral',
    },
    {
      id: 'roas',
      label: 'ROAS',
      value: `${roas.toFixed(2)}x`,
      sublabel: roas >= 3 ? '🟢 Отлично' : roas >= 1 ? 'Прибыльно' : '🔴 Требует работы',
      icon: <Target className="w-4 h-4" />,
      status: getRoasStatus(roas),
    },
    {
      id: 'cpa',
      label: 'CPA',
      value: cpa > 0 ? formatMoney(cpa, 'spend') : '—',
      sublabel: 'За продажу',
      icon: <Users className="w-4 h-4" />,
      status: 'neutral',
    },
    {
      id: 'clicks',
      label: 'Клики',
      value: formatNumber(clicks),
      sublabel: `CTR: ${ctr.toFixed(2)}%`,
      icon: <Zap className="w-4 h-4" />,
      status: 'neutral',
    },
    {
      id: 'impressions',
      label: 'Показы',
      value: formatNumber(impressions),
      sublabel: 'Охват',
      icon: <Eye className="w-4 h-4" />,
      status: 'neutral',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className={`
            p-4 rounded-lg border transition-colors
            ${metric.accent 
              ? 'bg-[#00FF88]/5 border-[#00FF88]/20' 
              : 'bg-[#0a0a0a] border-gray-800 hover:border-gray-700'
            }
          `}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`
              w-7 h-7 rounded flex items-center justify-center
              ${metric.accent ? 'bg-[#00FF88]/10 text-[#00FF88]' : 'bg-gray-800 text-gray-400'}
            `}>
              {metric.icon}
            </div>
            <span className={`
              text-xs font-medium uppercase tracking-wide
              ${metric.accent ? 'text-[#00FF88]' : 'text-gray-500'}
            `}>
              {metric.label}
            </span>
          </div>

          {/* Value */}
          <p className={`
            text-xl font-bold tabular-nums
            ${metric.status === 'positive' ? 'text-[#00FF88]' : ''}
            ${metric.status === 'negative' ? 'text-red-400' : ''}
            ${metric.status === 'neutral' ? 'text-white' : ''}
          `}>
            {metric.value}
          </p>

          {/* Sublabel */}
          {metric.sublabel && (
            <p className="text-xs text-gray-500 mt-1">{metric.sublabel}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default PremiumMetricsGrid;
