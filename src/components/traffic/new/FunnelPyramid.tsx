/**
 * Funnel Pyramid
 * Пирамидальная визуализация воронки продаж
 *
 * Показывает:
 * - Все этапы воронки (от показов до покупок/завершения)
 * - Количество на каждом этапе
 * - Процент конверсии от предыдущего этапа
 * - Цветовую индикацию (градиент от широкого к узкому)
 *
 * Tripwire Brand: черный фон + #00FF88 акценты
 */

import { ProductFunnel } from '@/types/traffic-products.types';

interface FunnelPyramidProps {
  funnel: ProductFunnel;
  language: 'ru' | 'kz';
}

export function FunnelPyramid({ funnel, language }: FunnelPyramidProps) {
  // Находим максимальное значение для расчета ширины блоков
  const maxCount = funnel.stages[0]?.count || 1;

  return (
    <div className="space-y-3">
      {funnel.stages.map((stage, index) => {
        // Рассчитываем ширину блока относительно первого этапа
        const widthPercent = (stage.count / maxCount) * 100;

        // Цвет блока (градиент от #00FF88 к #FFB800)
        const hue = 155 - (index * 25); // От зеленого к желтому
        const saturation = 100 - (index * 10);
        const lightness = 50 + (index * 5);

        return (
          <div key={stage.id} className="relative">
            {/* Funnel Block */}
            <div
              className="relative mx-auto rounded-lg overflow-hidden transition-all hover:scale-105 group cursor-pointer"
              style={{
                width: `${Math.max(widthPercent, 20)}%`,
                minWidth: '120px',
              }}
            >
              {/* Background with gradient */}
              <div
                className="relative px-4 py-3 border-2 backdrop-blur-xl"
                style={{
                  backgroundColor: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.15)`,
                  borderColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                }}
              >
                {/* Stage Name */}
                <div className="text-sm font-bold text-white mb-1 text-center">
                  {language === 'ru' ? stage.name : stage.nameKz}
                </div>

                {/* Count */}
                <div
                  className="text-2xl font-bold text-center"
                  style={{ color: `hsl(${hue}, ${saturation}%, ${lightness}%)` }}
                >
                  {stage.count.toLocaleString('en-US')}
                </div>

                {/* Conversion Percentage */}
                {stage.previousStage && (
                  <div className="text-xs text-gray-400 text-center mt-1">
                    {stage.percentage.toFixed(1)}% {language === 'ru' ? 'конверсия' : 'конверсия'}
                  </div>
                )}

                {/* Hover Effect */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
                  style={{ backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)` }}
                />
              </div>
            </div>

            {/* Arrow Connector */}
            {index < funnel.stages.length - 1 && (
              <div className="flex items-center justify-center my-1">
                <div className="text-gray-600 text-2xl">↓</div>
              </div>
            )}
          </div>
        );
      })}

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-800 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {language === 'ru' ? 'Всего лидов:' : 'Барлығы лидтер:'}
          </span>
          <span className="font-bold text-[#00FF88]">
            {funnel.totalLeads.toLocaleString('en-US')}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {language === 'ru' ? 'Всего покупок/завершений:' : 'Барлығы сатып алулар/аяқталулар:'}
          </span>
          <span className="font-bold text-[#00FF88]">
            {funnel.totalPurchases.toLocaleString('en-US')}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {language === 'ru' ? 'Общая конверсия:' : 'Жалпы конверсия:'}
          </span>
          <span className="font-bold text-white">
            {funnel.overallConversion.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
