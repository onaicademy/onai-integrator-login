/**
 * Sales Funnel Component
 * Visual pyramid showing conversion funnel stages
 */

import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface SalesFunnelProps {
  data: {
    impressions: number;
    registrations: number;
    expressSales: number;
    mainSales: number;
    conversionRate1: number;
    conversionRate2: number;
    conversionRate3: number;
  };
}

interface FunnelStage {
  label: string;
  sublabel: string;
  value: number;
  width: number;
  color: string;
  conversion?: number;
}

export const SalesFunnel = ({ data }: SalesFunnelProps) => {
  // ENHANCEMENT: Handle empty data
  const hasData = data.impressions > 0 || data.registrations > 0;
  
  if (!hasData) {
    return (
      <div className="funnel-container py-8 text-center">
        <h3 className="text-xl font-bold text-white mb-4">Sales Funnel</h3>
        <p className="text-gray-400">Нет данных за выбранный период</p>
      </div>
    );
  }
  
  const stages: FunnelStage[] = [
    { 
      label: 'IMPRESSIONS', 
      sublabel: 'Facebook Ads',
      value: data.impressions, 
      width: 100, 
      color: '#00FF88' 
    },
    { 
      label: 'REGISTRATIONS', 
      sublabel: 'Proftest',
      value: data.registrations, 
      width: 85, 
      color: '#00DD70', 
      conversion: data.conversionRate1 
    },
    { 
      label: 'EXPRESS SALES', 
      sublabel: 'Tripwire',
      value: data.expressSales, 
      width: 60, 
      color: '#00BB58', 
      conversion: data.conversionRate2 
    },
    { 
      label: 'MAIN SALES', 
      sublabel: 'Main Course',
      value: data.mainSales, 
      width: 35, 
      color: '#009940', 
      conversion: data.conversionRate3 
    }
  ];
  
  return (
    <div className="funnel-container py-8 bg-black/40 border border-[#00FF88]/10 rounded-2xl">
      <h3 className="text-xl font-bold text-white mb-6 text-center px-4">
        🔄 Sales Funnel
      </h3>
      
      <div className="relative space-y-4 px-4 md:px-8">
        {stages.map((stage, i) => (
          <div key={i} className="funnel-stage">
            {/* Pyramid Stage Block */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${stage.width}%`, opacity: 1 }}
              transition={{ duration: 0.8, delay: i * 0.2 }}
              className="mx-auto relative"
            >
              <div
                className="h-24 rounded-lg flex flex-col items-center justify-center text-white font-semibold shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                style={{ 
                  backgroundColor: stage.color,
                  opacity: 0.9
                }}
              >
                <span className="text-xs uppercase tracking-wide opacity-80">
                  {stage.label}
                </span>
                <span className="text-2xl font-bold">
                  {stage.value.toLocaleString()}
                </span>
                <span className="text-[10px] opacity-70">
                  {stage.sublabel}
                </span>
              </div>
            </motion.div>
            
            {/* Conversion Rate Arrow */}
            {stage.conversion !== undefined && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.2 + 0.4 }}
                className="text-center mt-2 mb-2"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/60 border border-[#00FF88]/20 rounded-lg">
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span 
                    className={`text-sm font-bold ${
                      stage.conversion >= 2 ? 'text-green-400' : 'text-orange-400'
                    }`}
                  >
                    {stage.conversion.toFixed(2)}%
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
      
      {/* Overall Conversion Summary */}
      <div className="mt-8 pt-6 border-t border-[#00FF88]/10 px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Total Conversion</p>
            <p className="text-lg font-bold text-[#00FF88]">
              {data.impressions > 0 
                ? ((data.mainSales / data.impressions) * 100).toFixed(3)
                : '0.000'
              }%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Reg Rate</p>
            <p className="text-lg font-bold text-white">
              {data.conversionRate1.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Express Rate</p>
            <p className="text-lg font-bold text-white">
              {data.conversionRate2.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Main Rate</p>
            <p className="text-lg font-bold text-white">
              {data.conversionRate3.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
