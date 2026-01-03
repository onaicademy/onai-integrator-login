/**
 * Forecast Chart
 * График прогнозов эффективности кампании
 *
 * Показывает:
 * - Прогноз выручки на 7/14/30 дней
 * - Прогноз ROAS
 * - Доверительный интервал (confidence score)
 * - Визуализация трендов
 *
 * Tripwire Brand: черный фон + #00FF88 акценты
 */

import { ForecastData } from '@/types/traffic-products.types';

interface ForecastChartProps {
  forecast: ForecastData;
  language: 'ru' | 'kz';
}

function getForecastPeriodLabel(days: 7 | 14 | 30, language: 'ru' | 'kz'): string {
  const labels = {
    7: language === 'ru' ? '7 дней' : '7 күн',
    14: language === 'ru' ? '14 дней' : '14 күн',
    30: language === 'ru' ? '30 дней' : '30 күн',
  };
  return labels[days];
}

function getConfidenceLabel(score: number, language: 'ru' | 'kz'): string {
  if (score >= 0.8) {
    return language === 'ru' ? 'Высокая' : 'Жоғары';
  } else if (score >= 0.6) {
    return language === 'ru' ? 'Средняя' : 'Орташа';
  } else {
    return language === 'ru' ? 'Низкая' : 'Төмен';
  }
}

function getConfidenceColor(score: number): string {
  if (score >= 0.8) return '#00FF88';
  if (score >= 0.6) return '#FFB800';
  return '#FF4444';
}

export function ForecastChart({ forecast, language }: ForecastChartProps) {
  const confidenceLabel = getConfidenceLabel(forecast.confidence, language);
  const confidenceColor = getConfidenceColor(forecast.confidence);
  const periodLabel = getForecastPeriodLabel(forecast.period, language);

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl rounded-2xl border-2 border-gray-800 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
        <div className="text-3xl">🔮</div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white">
            {language === 'ru' ? 'Прогноз эффективности' : 'Тиімділік болжамы'}
          </h3>
          <p className="text-sm text-gray-500">
            {language === 'ru' ? `Прогноз на ${periodLabel}` : `${periodLabel} үшін болжам`}
          </p>
        </div>
        {/* Confidence Badge */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
          style={{
            backgroundColor: `${confidenceColor}20`,
            color: confidenceColor,
            borderWidth: '1px',
            borderColor: confidenceColor,
          }}
        >
          <span>📊</span>
          <span>
            {language === 'ru' ? 'Точность:' : 'Дәлдік:'} {confidenceLabel} ({(forecast.confidence * 100).toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* Forecast Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Revenue Forecast */}
        <div className="bg-black/60 backdrop-blur-xl rounded-xl border-2 border-gray-700 p-5 hover:border-[#00FF88]/50 transition-all">
          <div className="text-2xl mb-2">💰</div>
          <div className="text-xs text-gray-500 mb-1">
            {language === 'ru' ? 'Прогноз выручки' : 'Табыс болжамы'}
          </div>
          <div className="text-2xl font-bold text-[#00FF88]">
            ${forecast.predictedRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* ROAS Forecast */}
        <div className="bg-black/60 backdrop-blur-xl rounded-xl border-2 border-gray-700 p-5 hover:border-[#00FF88]/50 transition-all">
          <div className="text-2xl mb-2">🎯</div>
          <div className="text-xs text-gray-500 mb-1">
            {language === 'ru' ? 'Прогноз ROAS' : 'ROAS болжамы'}
          </div>
          <div className="text-2xl font-bold text-[#00D9FF]">
            {forecast.predictedROAS.toFixed(2)}x
          </div>
        </div>

        {/* Purchases Forecast */}
        <div className="bg-black/60 backdrop-blur-xl rounded-xl border-2 border-gray-700 p-5 hover:border-[#00FF88]/50 transition-all">
          <div className="text-2xl mb-2">🛒</div>
          <div className="text-xs text-gray-500 mb-1">
            {language === 'ru' ? 'Прогноз покупок' : 'Сатып алулар болжамы'}
          </div>
          <div className="text-2xl font-bold text-white">
            {forecast.predictedPurchases}
          </div>
        </div>

        {/* Spend Forecast */}
        <div className="bg-black/60 backdrop-blur-xl rounded-xl border-2 border-gray-700 p-5 hover:border-[#00FF88]/50 transition-all">
          <div className="text-2xl mb-2">💸</div>
          <div className="text-xs text-gray-500 mb-1">
            {language === 'ru' ? 'Прогноз расходов' : 'Шығындар болжамы'}
          </div>
          <div className="text-2xl font-bold text-gray-400">
            ${forecast.predictedSpend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Visual Forecast Bar (Simple Text-Based) */}
      <div className="bg-black/40 rounded-xl p-5 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">
            {language === 'ru' ? 'Визуальный прогноз' : 'Визуалды болжам'}
          </span>
          <span className="text-xs text-gray-600">
            {language === 'ru' ? 'На основе текущих трендов' : 'Ағымдағы трендтерге негізделген'}
          </span>
        </div>

        {/* Progress Bar for ROAS */}
        <div className="relative h-8 bg-gray-900 rounded-lg overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00FF88] to-[#00D9FF] transition-all"
            style={{
              width: `${Math.min((forecast.predictedROAS / 5.0) * 100, 100)}%`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
            ROAS {forecast.predictedROAS.toFixed(2)}x / 5.00x {language === 'ru' ? 'цель' : 'мақсат'}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-600 text-center">
          {language === 'ru'
            ? '⚠️ Прогноз основан на исторических данных и текущих трендах. Фактические результаты могут отличаться.'
            : '⚠️ Болжам тарихи деректер мен ағымдағы трендтерге негізделген. Нақты нәтижелер өзгеше болуы мүмкін.'}
        </p>
      </div>
    </div>
  );
}
