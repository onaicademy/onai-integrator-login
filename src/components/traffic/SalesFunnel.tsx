/**
 * Sales Funnel Component - PYRAMID STYLE
 * Визуальная воронка продаж как на референсе
 */

import { motion } from 'framer-motion';
import { ArrowDown, TrendingUp } from 'lucide-react';

interface SalesFunnelProps {
  data: {
    impressions: number;
    clicks: number;
    registrations: number;
    expressSales: number;
    mainSales: number;
  };
}

export const SalesFunnel = ({ data }: SalesFunnelProps) => {
  // Calculate conversion rates
  const clickRate = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
  const regRate = data.clicks > 0 ? (data.registrations / data.clicks) * 100 : 0;
  const expressRate = data.registrations > 0 ? (data.expressSales / data.registrations) * 100 : 0;
  const mainRate = data.expressSales > 0 ? (data.mainSales / data.expressSales) * 100 : 0;
  
  const hasData = data.impressions > 0;
  
  if (!hasData) {
    return (
      <div className="w-full py-12 text-center">
        <div className="inline-flex items-center gap-2 text-gray-400">
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm">Нет данных для воронки</span>
        </div>
      </div>
    );
  }

  const stages = [
    {
      label: 'Показы',
      sublabel: 'Facebook Ads Impressions',
      value: data.impressions,
      width: 100,
      color: 'from-blue-600 to-blue-500',
      conversionRate: null,
    },
    {
      label: 'Клики',
      sublabel: 'Переход на сайт',
      value: data.clicks,
      width: 80,
      color: 'from-blue-500 to-blue-400',
      conversionRate: clickRate,
    },
    {
      label: 'Регистрации',
      sublabel: 'Proftest + UTM',
      value: data.registrations,
      width: 60,
      color: 'from-blue-500 to-blue-400',
      conversionRate: regRate,
    },
    {
      label: 'Express Course',
      sublabel: 'Tripwire Purchase',
      value: data.expressSales,
      width: 45,
      color: 'from-blue-600 to-blue-500',
      conversionRate: expressRate,
    },
    {
      label: 'Main Course',
      sublabel: 'Main Product Purchase',
      value: data.mainSales,
      width: 30,
      color: 'from-blue-700 to-blue-600',
      conversionRate: mainRate,
    },
  ];

  return (
    <div className="w-full py-8 px-4">
      {/* Title */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-white mb-2">
          Воронка продаж
        </h3>
        <p className="text-sm text-gray-400">
          От показов до покупки основного продукта
        </p>
      </div>

      {/* Funnel Pyramid */}
      <div className="relative max-w-4xl mx-auto space-y-1">
        {stages.map((stage, index) => (
          <div key={index} className="relative">
            {/* Stage Block */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative mx-auto"
              style={{ width: `${stage.width}%` }}
            >
              <div
                className={`
                  relative h-24 rounded-xl
                  bg-gradient-to-r ${stage.color}
                  shadow-lg shadow-blue-500/20
                  border border-blue-400/30
                  flex flex-col items-center justify-center
                  text-white
                  transition-all duration-300
                  hover:shadow-xl hover:shadow-blue-500/30
                  hover:scale-105
                  cursor-pointer
                `}
              >
                {/* Stage Label */}
                <div className="text-xs font-semibold uppercase tracking-wider opacity-90">
                  {stage.label}
                </div>
                
                {/* Stage Value */}
                <div className="text-3xl font-bold">
                  {stage.value.toLocaleString()}
                </div>
                
                {/* Sublabel */}
                <div className="text-[10px] opacity-70 mt-0.5">
                  {stage.sublabel}
                </div>
              </div>
            </motion.div>

            {/* Conversion Arrow */}
            {stage.conversionRate !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className="flex items-center justify-center my-2"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/60 border border-blue-500/30 rounded-lg backdrop-blur-sm">
                  <ArrowDown className="w-4 h-4 text-blue-400" />
                  <span className={`text-sm font-bold ${
                    stage.conversionRate >= 10 
                      ? 'text-green-400' 
                      : stage.conversionRate >= 5 
                      ? 'text-yellow-400' 
                      : 'text-orange-400'
                  }`}>
                    {stage.conversionRate.toFixed(2)}%
                  </span>
                  <span className="text-xs text-gray-400">конверсия</span>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Overall Stats */}
      <div className="mt-10 pt-6 border-t border-gray-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-black/40 border border-gray-800 rounded-xl">
            <div className="text-xs text-gray-400 uppercase mb-1">Общая конверсия</div>
            <div className="text-2xl font-bold text-blue-400">
              {data.impressions > 0 
                ? ((data.mainSales / data.impressions) * 100).toFixed(3)
                : '0.000'
              }%
            </div>
            <div className="text-[10px] text-gray-500 mt-1">Показы → Main</div>
          </div>
          
          <div className="text-center p-4 bg-black/40 border border-gray-800 rounded-xl">
            <div className="text-xs text-gray-400 uppercase mb-1">CTR</div>
            <div className="text-2xl font-bold text-white">
              {clickRate.toFixed(2)}%
            </div>
            <div className="text-[10px] text-gray-500 mt-1">Клик по рекламе</div>
          </div>
          
          <div className="text-center p-4 bg-black/40 border border-gray-800 rounded-xl">
            <div className="text-xs text-gray-400 uppercase mb-1">Reg Rate</div>
            <div className="text-2xl font-bold text-white">
              {regRate.toFixed(2)}%
            </div>
            <div className="text-[10px] text-gray-500 mt-1">Регистраций</div>
          </div>
          
          <div className="text-center p-4 bg-black/40 border border-gray-800 rounded-xl">
            <div className="text-xs text-gray-400 uppercase mb-1">Purchase Rate</div>
            <div className="text-2xl font-bold text-white">
              {((expressRate + mainRate) / 2).toFixed(2)}%
            </div>
            <div className="text-[10px] text-gray-500 mt-1">Средняя покупка</div>
          </div>
        </div>
      </div>
    </div>
  );
};
