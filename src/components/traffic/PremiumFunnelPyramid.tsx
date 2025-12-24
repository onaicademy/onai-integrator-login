/**
 * Premium Funnel Pyramid Component - 4 Stage Sales Funnel
 * 
 * 4-stage sales funnel (pyramid shape):
 * 1. 💰 Затраты (Facebook Ads) - widest
 * 2. 👥 ProfTest Лиды - registrations
 * 3. 📚 Купили Express - purchases (5,000₸)
 * 4. 🏆 Купили Flagman - main product (490,000₸) - narrowest
 * 
 * Design: Pyramid shape (wide top → narrow bottom)
 * Brand colors: #00FF88 (green), black background
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Users, ShoppingCart, Award, Loader2, ChevronDown } from 'lucide-react';

interface FunnelStage {
  id: string;
  label: string;
  sublabel: string;
  value: number | string;
  revenue?: number;
  conversionRate?: number;
  icon: React.ReactNode;
}

interface PremiumFunnelPyramidProps {
  teamFilter?: string | null;
  compact?: boolean;
}

export function PremiumFunnelPyramid({ teamFilter, compact = false }: PremiumFunnelPyramidProps) {
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    fetchFunnelData();
  }, [teamFilter]);

  const fetchFunnelData = async () => {
    try {
      setLoading(true);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const url = teamFilter 
        ? `${apiUrl}/api/traffic-dashboard/funnel?team=${teamFilter}`
        : `${apiUrl}/api/traffic-dashboard/funnel`;
      
      const response = await axios.get(url);

      if (response.data.success) {
        const apiStages = response.data.stages || [];
        
        // Extract stages from API response
        const spendStage = apiStages.find((s: any) => s.id === 'spend');
        const proftestStage = apiStages.find((s: any) => s.id === 'proftest');
        const expressStage = apiStages.find((s: any) => s.id === 'express');
        const mainStage = apiStages.find((s: any) => s.id === 'main');

        // Extract values
        const spendUSD = spendStage?.metrics?.spend_usd || 0;
        const spendKZT = spendStage?.metrics?.spend_kzt || 0;
        const proftestLeads = proftestStage?.metrics?.proftest_leads || 0;
        const expressPurchases = expressStage?.metrics?.express_purchases || 0;
        const expressRevenue = expressStage?.metrics?.express_revenue || 0;
        const mainPurchases = mainStage?.metrics?.main_purchases || 0;
        const mainRevenue = mainStage?.metrics?.main_revenue || 0;

        // Calculate conversions
        const spendToLeads = spendUSD > 0 ? (proftestLeads / (spendUSD * 100)) * 100 : 0; // leads per $100
        const leadsToExpress = proftestLeads > 0 ? (expressPurchases / proftestLeads) * 100 : 0;
        const expressToMain = expressPurchases > 0 ? (mainPurchases / expressPurchases) * 100 : 0;

        const mappedStages: FunnelStage[] = [
          {
            id: 'spend',
            label: 'Затраты',
            sublabel: 'Facebook Ads',
            value: `$${spendUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            revenue: spendKZT,
            conversionRate: undefined,
            icon: <DollarSign className="w-5 h-5" />,
          },
          {
            id: 'proftest',
            label: 'ProfTest Лиды',
            sublabel: 'Регистрации',
            value: proftestLeads,
            conversionRate: undefined, // First real metric stage
            icon: <Users className="w-5 h-5" />,
          },
          {
            id: 'express',
            label: 'Купили Express',
            sublabel: '5,000₸ за курс',
            value: expressPurchases,
            revenue: expressRevenue,
            conversionRate: leadsToExpress,
            icon: <ShoppingCart className="w-5 h-5" />,
          },
          {
            id: 'main',
            label: 'Купили Flagman',
            sublabel: '490,000₸ за курс',
            value: mainPurchases,
            revenue: mainRevenue,
            conversionRate: expressToMain,
            icon: <Award className="w-5 h-5" />,
          },
        ];

        setStages(mappedStages);
        setTotalRevenue(response.data.totalRevenue || expressRevenue + mainRevenue);
      } else {
        setStages(getPlaceholderStages());
      }
    } catch (err: any) {
      console.error('Error fetching funnel:', err);
      setStages(getPlaceholderStages());
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholderStages = (): FunnelStage[] => [
    {
      id: 'spend',
      label: 'Затраты',
      sublabel: 'Facebook Ads',
      value: '$0',
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      id: 'proftest',
      label: 'ProfTest Лиды',
      sublabel: 'Регистрации',
      value: 0,
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'express',
      label: 'Купили Express',
      sublabel: '5,000₸ за курс',
      value: 0,
      revenue: 0,
      conversionRate: 0,
      icon: <ShoppingCart className="w-5 h-5" />,
    },
    {
      id: 'main',
      label: 'Купили Flagman',
      sublabel: '490,000₸ за курс',
      value: 0,
      revenue: 0,
      conversionRate: 0,
      icon: <Award className="w-5 h-5" />,
    },
  ];

  const formatNumber = (value: number) => {
    return value.toLocaleString('ru-RU');
  };

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₸`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}K ₸`;
    return `${value.toLocaleString('ru-RU')} ₸`;
  };

  // Pyramid widths: widest (Spend) → narrowest (Flagman)
  const widthPercentages = [100, 85, 65, 45];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#00FF88]" />
      </div>
    );
  }

  const displayStages = stages.length > 0 ? stages : getPlaceholderStages();
  const hasData = displayStages.some(s => {
    const v = s.value;
    return typeof v === 'number' ? v > 0 : (v && v !== '$0');
  });

  return (
    <div className={`w-full ${compact ? 'py-4' : 'py-6'}`}>
      {/* Title */}
      {!compact && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-1">Воронка продаж</h3>
          <p className="text-xs text-gray-500">От регистрации до покупки</p>
        </div>
      )}

      {/* Funnel with LEFT side arrows showing conversions */}
      <div className="relative">
        {displayStages.map((stage, index) => (
          <div key={stage.id} className="relative">
            {/* Conversion Arrow - LEFT SIDE (shown before stage, except first) */}
            {index > 0 && displayStages[index].conversionRate !== undefined && (
              <div className="flex items-center mb-2">
                {/* Left Arrow with Conversion % */}
                <div className="flex flex-col items-center mr-4 min-w-[60px]">
                  <div className="flex flex-col items-center">
                    <ChevronDown className="w-5 h-5 text-[#00FF88] -mb-1" />
                    <div className={`
                      px-2 py-1 rounded text-xs font-bold tabular-nums
                      ${stage.conversionRate! >= 30 ? 'bg-[#00FF88]/20 text-[#00FF88]' : ''}
                      ${stage.conversionRate! >= 10 && stage.conversionRate! < 30 ? 'bg-[#00FF88]/10 text-[#00FF88]/80' : ''}
                      ${stage.conversionRate! < 10 ? 'bg-gray-800 text-gray-400' : ''}
                    `}>
                      {stage.conversionRate!.toFixed(1)}%
                    </div>
                    <ChevronDown className="w-5 h-5 text-[#00FF88] -mt-1" />
                  </div>
                </div>
                
                {/* Connecting line to stage */}
                <div className="flex-1 h-px bg-gradient-to-r from-[#00FF88]/30 to-transparent" />
              </div>
            )}

            {/* Stage Block */}
            <div className="flex items-start gap-4">
              {/* Left placeholder for alignment when no arrow */}
              {index === 0 && <div className="min-w-[60px] mr-4" />}
              
              {/* Stage Content */}
              <div 
                className="flex-1 transition-all duration-300"
                style={{ maxWidth: `${widthPercentages[index]}%` }}
              >
                <div className={`
                  relative py-4 px-5
                  bg-[#0a0a0a] border border-gray-800
                  rounded-lg
                  hover:border-[#00FF88]/30 transition-colors
                  ${!hasData ? 'opacity-60' : ''}
                `}>
                  {/* Stage Number Badge */}
                  <div className="absolute -left-2 -top-2 w-6 h-6 rounded-full bg-[#00FF88] flex items-center justify-center">
                    <span className="text-xs font-bold text-black">{index + 1}</span>
                  </div>
                  
                  {/* Content */}
                  <div className="flex items-center justify-between">
                    {/* Left: Icon + Label */}
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center
                        ${index === 0 ? 'bg-[#00FF88]/10 text-[#00FF88]' : ''}
                        ${index === 1 ? 'bg-[#00FF88]/8 text-[#00FF88]/80' : ''}
                        ${index === 2 ? 'bg-[#00FF88]/5 text-[#00FF88]/60' : ''}
                      `}>
                        {stage.icon}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{stage.label}</p>
                        <p className="text-gray-500 text-xs">{stage.sublabel}</p>
                      </div>
                    </div>

                    {/* Right: Value + Revenue */}
                    <div className="text-right">
                      <p className="text-white font-bold text-xl tabular-nums">
                        {typeof stage.value === 'string' ? stage.value : formatNumber(stage.value)}
                      </p>
                      {stage.revenue !== undefined && stage.revenue > 0 && (
                        <p className="text-[#00FF88] text-xs font-medium">
                          {formatCurrency(stage.revenue)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Spacer between stages */}
            {index < displayStages.length - 1 && <div className="h-2" />}
          </div>
        ))}
      </div>

      {/* No Data Indicator */}
      {!hasData && (
        <div className="text-center mt-4">
          <p className="text-xs text-gray-600">Ожидание данных...</p>
        </div>
      )}

      {/* Total Revenue Footer */}
      {totalRevenue > 0 && !compact && (
        <div className="mt-6 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs uppercase tracking-wide">Общая выручка</span>
            <span className="text-[#00FF88] font-bold text-lg tabular-nums">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PremiumFunnelPyramid;
