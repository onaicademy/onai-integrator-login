/**
 * Overall Metrics Card
 * Карточка с агрегированными метриками по всем продуктам
 *
 * Tripwire Brand: черный фон + #00FF88 акценты
 */

import { AllProductsData } from '@/types/traffic-products.types';

interface OverallMetricsCardProps {
  data: AllProductsData | null;
  language: 'ru' | 'kz';
}

export function OverallMetricsCard({ data, language }: OverallMetricsCardProps) {
  if (!data || !data.totalRevenue || data.totalRevenue === undefined) {
    return (
      <div className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl rounded-2xl border-2 border-gray-800 p-8 mb-6 shadow-2xl">
        <div className="flex items-center justify-center text-gray-500">
          {language === 'ru' ? 'Загрузка данных...' : 'Деректер жүктелуде...'}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: language === 'ru' ? 'Общая выручка' : 'Жалпы табыс',
      value: `$${(data.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: '💰',
      color: '#00FF88',
      trend: (data.totalRevenue || 0) > 0 ? 'up' : 'neutral',
    },
    {
      label: language === 'ru' ? 'Чистая прибыль' : 'Таза пайда',
      value: `$${(data.totalProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: '📈',
      color: (data.totalProfit || 0) > 0 ? '#00FF88' : '#FF4444',
      trend: (data.totalProfit || 0) > 0 ? 'up' : 'down',
    },
    {
      label: language === 'ru' ? 'ROAS (общий)' : 'ROAS (жалпы)',
      value: (data.overallROAS || 0).toFixed(2) + 'x',
      icon: '🎯',
      color: (data.overallROAS || 0) >= 2.0 ? '#00FF88' : (data.overallROAS || 0) >= 1.0 ? '#FFB800' : '#FF4444',
      trend: (data.overallROAS || 0) >= 2.0 ? 'up' : (data.overallROAS || 0) >= 1.0 ? 'neutral' : 'down',
    },
    {
      label: language === 'ru' ? 'ROI (общий)' : 'ROI (жалпы)',
      value: (data.overallROI || 0).toFixed(1) + '%',
      icon: '💎',
      color: (data.overallROI || 0) >= 50 ? '#00FF88' : (data.overallROI || 0) >= 0 ? '#FFB800' : '#FF4444',
      trend: (data.overallROI || 0) >= 50 ? 'up' : (data.overallROI || 0) >= 0 ? 'neutral' : 'down',
    },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl rounded-2xl border-2 border-gray-800 p-6 md:p-8 mb-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
        <div className="text-3xl">📊</div>
        <div>
          <h2 className="text-2xl font-bold text-white">
            {language === 'ru' ? 'Общая статистика' : 'Жалпы статистика'}
          </h2>
          <p className="text-sm text-gray-500">
            {language === 'ru' ? 'Агрегированные метрики по всем продуктам' : 'Барлық өнімдер бойынша жиынтық метрикалар'}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="relative bg-black/60 backdrop-blur-xl rounded-xl border-2 border-gray-700 p-5 hover:border-[#00FF88]/50 transition-all group"
          >
            {/* Trend Indicator */}
            <div className="absolute top-3 right-3">
              {metric.trend === 'up' && (
                <span className="text-[#00FF88] text-xl">↗</span>
              )}
              {metric.trend === 'down' && (
                <span className="text-[#FF4444] text-xl">↘</span>
              )}
              {metric.trend === 'neutral' && (
                <span className="text-[#FFB800] text-xl">→</span>
              )}
            </div>

            {/* Icon */}
            <div className="text-4xl mb-3">{metric.icon}</div>

            {/* Label */}
            <div className="text-sm text-gray-400 mb-2 font-medium">
              {metric.label}
            </div>

            {/* Value */}
            <div
              className="text-2xl font-bold transition-all"
              style={{ color: metric.color }}
            >
              {metric.value}
            </div>

            {/* Hover Effect */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
              style={{ backgroundColor: metric.color }}
            />
          </div>
        ))}
      </div>

      {/* Total Spend */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">
              {language === 'ru' ? 'Общие расходы на рекламу:' : 'Жарнамаға жалпы шығындар:'}
            </span>
            <span className="font-bold text-white">
              ${(data.totalSpend || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">
              {language === 'ru' ? 'Всего продаж:' : 'Барлығы сатылымдар:'}
            </span>
            <span className="font-bold text-[#00FF88]">{data.totalPurchases || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
