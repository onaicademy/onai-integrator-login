/**
 * Metrics Grid
 * Сетка с ключевыми метриками кампании
 *
 * Показывает:
 * - CTR, CPC, CPM, CPL, CPA
 * - ROAS, ROI, Revenue, Profit
 * - Индикаторы критичности (цветовая кодировка)
 *
 * Tripwire Brand: черный фон + #00FF88 акценты
 */

import { CampaignMetrics, MetricCriticality, CriticalityLevel } from '@/types/traffic-products.types';

interface MetricsGridProps {
  metrics: CampaignMetrics;
  criticality: MetricCriticality[];
  language: 'ru' | 'kz';
}

interface MetricCardData {
  key: keyof CampaignMetrics;
  label: string;
  labelKz: string;
  icon: string;
  formatValue: (value: number) => string;
  description?: string;
  descriptionKz?: string;
}

const METRIC_CARDS: MetricCardData[] = [
  {
    key: 'ctr',
    label: 'CTR',
    labelKz: 'CTR',
    icon: '👆',
    formatValue: (v) => `${v.toFixed(2)}%`,
    description: 'Click-Through Rate',
    descriptionKz: 'Басу жылдамдығы',
  },
  {
    key: 'cpc',
    label: 'CPC',
    labelKz: 'CPC',
    icon: '💲',
    formatValue: (v) => `$${v.toFixed(2)}`,
    description: 'Cost Per Click',
    descriptionKz: 'Басу құны',
  },
  {
    key: 'cpm',
    label: 'CPM',
    labelKz: 'CPM',
    icon: '📺',
    formatValue: (v) => `$${v.toFixed(2)}`,
    description: 'Cost Per 1000 Impressions',
    descriptionKz: '1000 көрсетілім құны',
  },
  {
    key: 'cpl',
    label: 'CPL',
    labelKz: 'CPL',
    icon: '🎣',
    formatValue: (v) => `$${v.toFixed(2)}`,
    description: 'Cost Per Lead',
    descriptionKz: 'Лид құны',
  },
  {
    key: 'cpa',
    label: 'CPA',
    labelKz: 'CPA',
    icon: '🛒',
    formatValue: (v) => `$${v.toFixed(2)}`,
    description: 'Cost Per Acquisition',
    descriptionKz: 'Сатып алу құны',
  },
  {
    key: 'roas',
    label: 'ROAS',
    labelKz: 'ROAS',
    icon: '🎯',
    formatValue: (v) => `${v.toFixed(2)}x`,
    description: 'Return on Ad Spend',
    descriptionKz: 'Жарнама қайтарымы',
  },
  {
    key: 'roi',
    label: 'ROI',
    labelKz: 'ROI',
    icon: '💎',
    formatValue: (v) => `${v.toFixed(1)}%`,
    description: 'Return on Investment',
    descriptionKz: 'Инвестиция қайтарымы',
  },
  {
    key: 'revenue',
    label: 'Выручка',
    labelKz: 'Табыс',
    icon: '💰',
    formatValue: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    description: 'Total Revenue',
    descriptionKz: 'Жалпы табыс',
  },
  {
    key: 'profit',
    label: 'Прибыль',
    labelKz: 'Пайда',
    icon: '📈',
    formatValue: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    description: 'Net Profit',
    descriptionKz: 'Таза пайда',
  },
  {
    key: 'profitability',
    label: 'Рентабельность',
    labelKz: 'Рентабельділік',
    icon: '📊',
    formatValue: (v) => `${v.toFixed(1)}%`,
    description: 'Profitability',
    descriptionKz: 'Рентабельділік',
  },
];

function getCriticalityColor(level: CriticalityLevel): string {
  const colors: Record<CriticalityLevel, string> = {
    critical: '#FF4444',
    warning: '#FFB800',
    normal: '#A0A0A0',
    good: '#00D9FF',
    excellent: '#00FF88',
  };
  return colors[level];
}

function getCriticalityIcon(level: CriticalityLevel): string {
  const icons: Record<CriticalityLevel, string> = {
    critical: '🔴',
    warning: '🟡',
    normal: '⚪',
    good: '🔵',
    excellent: '🟢',
  };
  return icons[level];
}

export function MetricsGrid({ metrics, criticality, language }: MetricsGridProps) {
  // Создаем мапу критичности для быстрого доступа
  const criticalityMap = new Map<keyof CampaignMetrics, MetricCriticality>();
  criticality.forEach((c) => criticalityMap.set(c.metric, c));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {METRIC_CARDS.map((card) => {
        const value = metrics[card.key];
        const crit = criticalityMap.get(card.key);
        const color = crit ? getCriticalityColor(crit.level) : '#A0A0A0';
        const critIcon = crit ? getCriticalityIcon(crit.level) : '';

        return (
          <div
            key={card.key}
            className="relative bg-black/60 backdrop-blur-xl rounded-lg border-2 p-4 hover:scale-105 transition-all group cursor-pointer"
            style={{
              borderColor: color,
            }}
          >
            {/* Criticality Icon */}
            {critIcon && (
              <div className="absolute top-2 right-2 text-lg">{critIcon}</div>
            )}

            {/* Icon */}
            <div className="text-3xl mb-2">{card.icon}</div>

            {/* Label */}
            <div className="text-xs text-gray-400 mb-1">
              {language === 'ru' ? card.label : card.labelKz}
            </div>

            {/* Value */}
            <div className="text-xl font-bold" style={{ color }}>
              {card.formatValue(value)}
            </div>

            {/* Description */}
            {card.description && (
              <div className="text-xs text-gray-600 mt-1">
                {language === 'ru' ? card.description : card.descriptionKz}
              </div>
            )}

            {/* Criticality Message (shown on hover) */}
            {crit && (
              <div className="absolute inset-0 bg-black/95 backdrop-blur-xl rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-2">{critIcon}</div>
                  <div className="text-xs text-gray-300">
                    {language === 'ru' ? crit.message : crit.messageKz}
                  </div>
                </div>
              </div>
            )}

            {/* Hover Effect */}
            <div
              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
              style={{ backgroundColor: color }}
            />
          </div>
        );
      })}
    </div>
  );
}
