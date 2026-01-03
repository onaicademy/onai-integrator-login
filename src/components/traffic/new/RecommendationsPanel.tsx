/**
 * Recommendations Panel
 * Панель с рекомендациями по оптимизации кампании
 *
 * Показывает:
 * - Автоматические рекомендации на основе метрик
 * - Приоритет (high, medium, low)
 * - Прогнозируемый эффект (impact)
 * - Действия (actionable insights)
 *
 * Tripwire Brand: черный фон + #00FF88 акценты
 */

import { Recommendation } from '@/types/traffic-products.types';

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  language: 'ru' | 'kz';
}

function getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
  const colors = {
    high: '#FF4444',
    medium: '#FFB800',
    low: '#00D9FF',
  };
  return colors[priority];
}

function getPriorityIcon(priority: 'high' | 'medium' | 'low'): string {
  const icons = {
    high: '🔴',
    medium: '🟡',
    low: '🔵',
  };
  return icons[priority];
}

function getPriorityLabel(priority: 'high' | 'medium' | 'low', language: 'ru' | 'kz'): string {
  const labels = {
    high: language === 'ru' ? 'Высокий' : 'Жоғары',
    medium: language === 'ru' ? 'Средний' : 'Орташа',
    low: language === 'ru' ? 'Низкий' : 'Төмен',
  };
  return labels[priority];
}

function getImpactLabel(impact: 'high' | 'medium' | 'low', language: 'ru' | 'kz'): string {
  const labels = {
    high: language === 'ru' ? '+50%' : '+50%',
    medium: language === 'ru' ? '+25%' : '+25%',
    low: language === 'ru' ? '+10%' : '+10%',
  };
  return labels[impact];
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    scale_campaign: '📈',
    optimize_creative: '🎨',
    reduce_spend: '💰',
    improve_targeting: '🎯',
    ab_test: '🔬',
    pause_campaign: '⏸️',
    increase_budget: '💵',
    optimize_landing: '🌐',
  };
  return icons[type] || '💡';
}

export function RecommendationsPanel({ recommendations, language }: RecommendationsPanelProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl rounded-2xl border-2 border-gray-800 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">💡</div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {language === 'ru' ? 'Рекомендации' : 'Ұсыныстар'}
            </h3>
          </div>
        </div>
        <p className="text-gray-500 text-center py-8">
          {language === 'ru' ? 'Рекомендаций нет' : 'Ұсыныстар жоқ'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl rounded-2xl border-2 border-gray-800 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
        <div className="text-3xl">💡</div>
        <div>
          <h3 className="text-xl font-bold text-white">
            {language === 'ru' ? 'Рекомендации' : 'Ұсыныстар'}
          </h3>
          <p className="text-sm text-gray-500">
            {language === 'ru' ? 'Автоматические советы по оптимизации' : 'Оңтайландыру бойынша автоматты кеңестер'}
          </p>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.map((rec, index) => {
          const priorityColor = getPriorityColor(rec.priority);
          const priorityIcon = getPriorityIcon(rec.priority);
          const typeIcon = getTypeIcon(rec.type);

          return (
            <div
              key={index}
              className="relative bg-black/60 backdrop-blur-xl rounded-xl border-2 p-5 hover:scale-102 transition-all group"
              style={{ borderColor: priorityColor }}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between gap-4 mb-3">
                {/* Icon + Title */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-3xl mt-1">{typeIcon}</div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">
                      {language === 'ru' ? rec.title : rec.titleKz}
                    </h4>
                    <p className="text-sm text-gray-400">
                      {language === 'ru' ? rec.description : rec.descriptionKz}
                    </p>
                  </div>
                </div>

                {/* Priority Badge */}
                <div
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                  style={{
                    backgroundColor: `${priorityColor}20`,
                    color: priorityColor,
                    borderWidth: '1px',
                    borderColor: priorityColor,
                  }}
                >
                  <span>{priorityIcon}</span>
                  <span>{getPriorityLabel(rec.priority, language)}</span>
                </div>
              </div>

              {/* Impact Row */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-800">
                {/* Expected Impact */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {language === 'ru' ? 'Прогноз:' : 'Болжам:'}
                  </span>
                  <span className="text-sm font-bold text-[#00FF88]">
                    {getImpactLabel(rec.expectedImpact, language)}
                  </span>
                </div>

                {/* Action Button */}
                {rec.actionUrl && (
                  <a
                    href={rec.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto px-4 py-2 rounded-lg bg-[#00FF88]/20 border border-[#00FF88] text-[#00FF88] text-xs font-bold hover:bg-[#00FF88]/30 transition-all"
                  >
                    {language === 'ru' ? 'Применить' : 'Қолдану'} →
                  </a>
                )}
              </div>

              {/* Hover Effect */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"
                style={{ backgroundColor: priorityColor }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
