/**
 * Conversion Funnel Component
 * 
 * Визуализация воронки продаж ONAI Academy:
 * - 5 этапов: ProfTest → Express → Payment → Tripwire → Main
 * - Responsive: Desktop (side-by-side), Tablet (2-col), Mobile (vertical)
 * - Color-coded по conversion rate
 * - Drill-down functionality
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, Award, Target, Loader2, AlertCircle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface FunnelMetrics {
  visitors?: number;
  passed?: number;
  views?: number;
  addedCart?: number;
  purchases?: number;
  revenue?: number;
  completed?: number;
  deals?: number;
  upsells?: number;
  active?: number;
  avgTime?: number;
  avgValue?: number;
  conversions?: number;
}

interface FunnelStage {
  id: string;
  title: string;
  emoji: string;
  metrics: FunnelMetrics;
  conversionRate: number;
  status: 'success' | 'warning' | 'danger' | 'neutral';
  churnRisk?: number;
  description?: string;
}

interface FunnelData {
  success: boolean;
  stages: FunnelStage[];
  totalRevenue: number;
  totalConversions: number;
  overallConversionRate: number;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ConversionFunnel() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════
  // FETCH DATA
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    fetchFunnelData();
  }, []);

  const fetchFunnelData = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await axios.get(`${apiUrl}/api/traffic-dashboard/funnel`);

      if (response.data.success) {
        setData(response.data);
      } else {
        setError('Failed to load funnel data');
      }
    } catch (err: any) {
      console.error('Error fetching funnel:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'warning':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'danger':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M KZT`;
    } else if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K KZT`;
    }
    return `${value.toLocaleString()} KZT`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const toggleExpand = (stageId: string) => {
    setExpandedStage(expandedStage === stageId ? null : stageId);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: LOADING
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#00FF88]" />
          <p className="text-white/60">Загрузка воронки продаж...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: ERROR
  // ═══════════════════════════════════════════════════════════════

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-red-400">Ошибка загрузки</h3>
            <p className="text-red-400/80 text-sm">{error || 'Не удалось загрузить данные воронки'}</p>
          </div>
        </div>
        <button
          onClick={fetchFunnelData}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: SUCCESS
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER: TOTAL STATS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <Target className="w-6 h-6 text-[#00FF88]" />
          Воронка Продаж ONAI Academy
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-white/60 text-sm">Общая выручка</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(data.totalRevenue)}</p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-white/60 text-sm">Всего конверсий</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">{formatNumber(data.totalConversions)}</p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-[#00FF88]" />
              <span className="text-white/60 text-sm">Общая конверсия</span>
            </div>
            <p className="text-2xl font-bold text-[#00FF88]">{data.overallConversionRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FUNNEL STAGES (RESPONSIVE) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        {data.stages.map((stage, index) => (
          <div key={stage.id}>
            {/* Stage Card */}
            <div
              className={`
                bg-white/5 backdrop-blur-sm rounded-xl border transition-all
                ${getStatusColor(stage.status)}
                hover:bg-white/10 cursor-pointer
              `}
              onClick={() => toggleExpand(stage.id)}
            >
              {/* Main Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  {/* Left: Title & Emoji */}
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{stage.emoji}</span>
                    <div>
                      <h3 className="text-xl font-bold text-white">{stage.title}</h3>
                      {stage.description && (
                        <p className="text-sm text-white/60">{stage.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Conversion Rate */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white">{stage.conversionRate.toFixed(1)}%</p>
                      <p className="text-sm text-white/60">конверсия</p>
                    </div>
                    {expandedStage === stage.id ? (
                      <ChevronUp className="w-5 h-5 text-white/60" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/60" />
                    )}
                  </div>
                </div>

                {/* Metrics Grid (Compact - always visible) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Metric 1 */}
                  {stage.metrics.visitors !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">Посещения</p>
                      <p className="text-lg font-bold text-white">{formatNumber(stage.metrics.visitors)}</p>
                    </div>
                  )}
                  {stage.metrics.views !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">Просмотры</p>
                      <p className="text-lg font-bold text-white">{formatNumber(stage.metrics.views)}</p>
                    </div>
                  )}
                  {stage.metrics.active !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">Активные</p>
                      <p className="text-lg font-bold text-white">{formatNumber(stage.metrics.active)}</p>
                    </div>
                  )}

                  {/* Metric 2 */}
                  {stage.metrics.passed !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">Завершили</p>
                      <p className="text-lg font-bold text-white">{formatNumber(stage.metrics.passed)}</p>
                    </div>
                  )}
                  {stage.metrics.addedCart !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">В корзину</p>
                      <p className="text-lg font-bold text-white">{formatNumber(stage.metrics.addedCart)}</p>
                    </div>
                  )}
                  {stage.metrics.purchases !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">Покупки</p>
                      <p className="text-lg font-bold text-white">{formatNumber(stage.metrics.purchases)}</p>
                    </div>
                  )}
                  {stage.metrics.completed !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">Завершили</p>
                      <p className="text-lg font-bold text-white">{formatNumber(stage.metrics.completed)}</p>
                    </div>
                  )}
                  {stage.metrics.conversions !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">Конверсии</p>
                      <p className="text-lg font-bold text-white">{formatNumber(stage.metrics.conversions)}</p>
                    </div>
                  )}

                  {/* Metric 3 */}
                  {stage.metrics.revenue !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">Выручка</p>
                      <p className="text-lg font-bold text-green-400">{formatCurrency(stage.metrics.revenue)}</p>
                    </div>
                  )}
                  {stage.metrics.deals !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">Сделки</p>
                      <p className="text-lg font-bold text-white">{formatNumber(stage.metrics.deals)}</p>
                    </div>
                  )}
                  {stage.metrics.upsells !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">Апсейлы</p>
                      <p className="text-lg font-bold text-[#00FF88]">{formatNumber(stage.metrics.upsells)}</p>
                    </div>
                  )}

                  {/* Metric 4 */}
                  {stage.metrics.avgTime !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">Ср. время</p>
                      <p className="text-lg font-bold text-white">{stage.metrics.avgTime} мин</p>
                    </div>
                  )}
                  {stage.metrics.avgValue !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-1">Ср. чек</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(stage.metrics.avgValue)}</p>
                    </div>
                  )}
                </div>

                {/* Churn Risk Warning */}
                {stage.churnRisk !== undefined && stage.churnRisk > 10 && (
                  <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <p className="text-sm text-yellow-400">
                      Риск оттока: <span className="font-bold">{stage.churnRisk}%</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {expandedStage === stage.id && (
                <div className="border-t border-white/10 p-6 bg-white/5">
                  <h4 className="text-lg font-semibold text-white mb-4">Детальная статистика</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/60 text-sm mb-2">Статус этапа</p>
                      <p className="text-white font-medium">
                        {stage.status === 'success' && '✅ Отличная конверсия'}
                        {stage.status === 'warning' && '⚠️ Требует внимания'}
                        {stage.status === 'danger' && '🚨 Критическая проблема'}
                        {stage.status === 'neutral' && 'ℹ️ Нейтрально'}
                      </p>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/60 text-sm mb-2">ID этапа</p>
                      <p className="text-white font-mono text-sm">{stage.id}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Arrow Down (except for last stage) */}
            {index < data.stages.length - 1 && (
              <div className="flex justify-center py-2">
                <ChevronDown className="w-6 h-6 text-white/40" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FOOTER: TIMESTAMP */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="text-center text-white/40 text-sm">
        Последнее обновление: {new Date(data.timestamp).toLocaleString('ru-RU')}
      </div>
    </div>
  );
}
