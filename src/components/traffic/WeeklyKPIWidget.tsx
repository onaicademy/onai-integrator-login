/**
 * Weekly KPI Widget
 * 
 * Displays current week's plan vs actual performance
 * Shows progress bars and AI recommendations
 */

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Target, TrendingUp, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';

interface WeeklyKPIWidgetProps {
  team: string;
}

export function WeeklyKPIWidget({ team }: WeeklyKPIWidgetProps) {
  const { data: planData, isLoading, error } = useQuery({
    queryKey: ['weekly-plan', team],
    queryFn: async () => {
      const token = localStorage.getItem('traffic_token');
      if (!token) throw new Error('No auth token');
      
      const response = await axios.get(`${API_URL}/api/traffic-plans/current`, {
        params: { team },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data.plan;
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 2
  });
  
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-[#00FF88]/10 to-black/20 border border-[#00FF88]/20 rounded-2xl p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#00FF88] animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Загрузка плана...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-500/10 to-black/20 border border-red-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-6 h-6" />
          <div>
            <p className="font-bold">Ошибка загрузки плана</p>
            <p className="text-sm">Попробуйте обновить страницу</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!planData) {
    return (
      <div className="bg-gradient-to-br from-yellow-500/10 to-black/20 border border-yellow-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 text-yellow-400">
          <AlertCircle className="w-6 h-6" />
          <div>
            <p className="font-bold">План не найден</p>
            <p className="text-sm">План на эту неделю пока не создан</p>
          </div>
        </div>
      </div>
    );
  }
  
  const plan = planData;
  
  // Calculate progress percentages
  const progress = {
    revenue: Math.round((plan.actual_revenue / plan.plan_revenue) * 100),
    sales: Math.round((plan.actual_sales / plan.plan_sales) * 100),
    roas: Math.round((plan.actual_roas / plan.plan_roas) * 100)
  };
  
  const overallProgress = Math.round(
    (progress.revenue + progress.sales + progress.roas) / 3
  );
  
  // Status
  const isCompleted = overallProgress >= 100;
  const isOnTrack = overallProgress >= 70;
  
  return (
    <div className="bg-gradient-to-br from-[#00FF88]/10 to-black/20 border border-[#00FF88]/20 rounded-2xl p-6 shadow-2xl shadow-[#00FF88]/10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#00FF88]/20 flex items-center justify-center border border-[#00FF88]/30">
          <Target className="w-6 h-6 text-[#00FF88]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">ПЛАН НЕДЕЛИ</h2>
          <p className="text-sm text-gray-400">
            {new Date(plan.week_start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - 
            {' '}{new Date(plan.week_end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>
      
      {/* Progress Bars */}
      <div className="space-y-4 mb-6">
        <ProgressBar 
          label="Revenue (Доход)"
          current={plan.actual_revenue}
          target={plan.plan_revenue}
          progress={progress.revenue}
          unit="₸"
          format="currency"
        />
        <ProgressBar 
          label="Sales (Продажи)"
          current={plan.actual_sales}
          target={plan.plan_sales}
          progress={progress.sales}
          unit=""
          format="number"
        />
        <ProgressBar 
          label="ROAS"
          current={plan.actual_roas}
          target={plan.plan_roas}
          progress={progress.roas}
          unit="x"
          format="decimal"
        />
      </div>
      
      {/* AI Recommendations */}
      {plan.ai_recommendations && (
        <div className="mb-6 p-4 bg-[#00FF88]/5 rounded-xl border border-[#00FF88]/10">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#00FF88] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#00FF88] mb-1">AI Рекомендации</p>
              <p className="text-sm text-gray-300 leading-relaxed">
                {plan.ai_recommendations}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Status Badge */}
      <div className="text-center">
        {isCompleted ? (
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#00FF88]/20 border border-[#00FF88]/30 rounded-xl">
            <span className="text-2xl">✅</span>
            <div className="text-left">
              <p className="text-[#00FF88] font-bold text-lg">ПЛАН ВЫПОЛНЕН!</p>
              <p className="text-xs text-[#00FF88]/70">{overallProgress}% достигнуто</p>
            </div>
          </div>
        ) : isOnTrack ? (
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
            <span className="text-2xl">🎯</span>
            <div className="text-left">
              <p className="text-yellow-400 font-bold text-lg">В РАБОТЕ</p>
              <p className="text-xs text-yellow-400/70">{overallProgress}% выполнено</p>
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-red-500/20 border border-red-500/30 rounded-xl">
            <span className="text-2xl">⚠️</span>
            <div className="text-left">
              <p className="text-red-400 font-bold text-lg">ТРЕБУЕТ ВНИМАНИЯ</p>
              <p className="text-xs text-red-400/70">{overallProgress}% выполнено</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Previous Week Comparison */}
      <div className="mt-6 pt-6 border-t border-[#00FF88]/10">
        <p className="text-xs text-gray-500 mb-3">Рост относительно прошлой недели:</p>
        <div className="grid grid-cols-3 gap-3">
          <ComparisonStat
            label="Revenue"
            current={plan.actual_revenue}
            previous={plan.prev_week_revenue}
          />
          <ComparisonStat
            label="Sales"
            current={plan.actual_sales}
            previous={plan.prev_week_sales}
          />
          <ComparisonStat
            label="ROAS"
            current={plan.actual_roas}
            previous={plan.prev_week_roas}
          />
        </div>
      </div>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  current: number;
  target: number;
  progress: number;
  unit: string;
  format: 'currency' | 'number' | 'decimal';
}

function ProgressBar({ label, current, target, progress, unit, format }: ProgressBarProps) {
  const formatValue = (value: number) => {
    if (format === 'currency') {
      return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toFixed(0);
    }
    if (format === 'decimal') {
      return value.toFixed(2);
    }
    return value.toString();
  };
  
  const color = progress >= 100 ? 'from-[#00FF88] to-green-400' : 
                progress >= 70 ? 'from-yellow-400 to-yellow-500' : 
                'from-gray-400 to-gray-500';
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-400 font-medium">{label}</span>
        <span className="text-white font-mono font-bold">
          {formatValue(current)}{unit} / {formatValue(target)}{unit}
        </span>
      </div>
      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${color} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex justify-end mt-1">
        <span className={`text-xs font-bold ${progress >= 100 ? 'text-[#00FF88]' : progress >= 70 ? 'text-yellow-400' : 'text-gray-400'}`}>
          {progress}%
        </span>
      </div>
    </div>
  );
}

interface ComparisonStatProps {
  label: string;
  current: number;
  previous: number;
}

function ComparisonStat({ label, current, previous }: ComparisonStatProps) {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = change > 0;
  
  return (
    <div className="text-center p-2 bg-black/40 rounded-lg border border-[#00FF88]/10">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center justify-center gap-1">
        <TrendingUp className={`w-3 h-3 ${isPositive ? 'text-[#00FF88]' : 'text-red-400'} ${!isPositive && 'rotate-180'}`} />
        <span className={`text-sm font-bold ${isPositive ? 'text-[#00FF88]' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{change.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

