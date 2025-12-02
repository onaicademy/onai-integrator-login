import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Users, Award, TrendingDown } from 'lucide-react';

interface DashboardStats {
  total_students: number;
  active_students: number;
  completed_students: number;
  completion_rate: number;
}

interface FunnelStep {
  step: string;
  label: string;
  count: number;
  percentage: number;
  conversion: number;
}

interface FunnelData {
  funnel: FunnelStep[];
  total_enrolled: number;
}

export default function TripwireAnalytics() {
  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ['tripwire', 'admin', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/tripwire/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  const { data: funnelData, isLoading: isLoadingFunnel } = useQuery<FunnelData>({
    queryKey: ['tripwire', 'admin', 'funnel'],
    queryFn: async () => {
      const response = await fetch('/api/tripwire/admin/funnel', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch funnel');
      return response.json();
    },
    refetchInterval: 30000
  });

  return (
    <div className="min-h-screen relative overflow-hidden rounded-3xl bg-[#030303] border border-white/5">
      {/* ✅ BACKGROUND GRID */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* ✅ HEADER */}
      <div className="relative z-10 px-8 py-8 border-b border-white/5">
        <Link 
          to="/tripwire/admin" 
          className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-[#00FF94] transition-colors"
        >
          <ArrowLeft size={20} />
          Назад в админку
        </Link>
      </div>

      {/* ✅ MAIN CONTENT */}
      <div className="relative z-10 px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Аналитика платформы
          </h1>
          <p className="text-[#9CA3AF] text-lg">
            Ключевые метрики студентов и конверсия воронки
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Total Students */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-blue-500/50 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500" />
            <div className="relative bg-[rgba(20,20,20,0.6)] backdrop-blur-xl rounded-3xl p-8 border border-white/5 group-hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Users size={24} className="text-blue-400" />
                </div>
                <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-medium">
                  Всего
                </div>
              </div>
              <div>
                <p className="text-[#9CA3AF] text-sm mb-2">Всего студентов</p>
                <p className="text-4xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {isLoadingStats ? '...' : stats?.total_students || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Active Students */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00FF94] to-[#00FF94]/50 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500" />
            <div className="relative bg-[rgba(20,20,20,0.6)] backdrop-blur-xl rounded-3xl p-8 border border-white/5 group-hover:border-[#00FF94]/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#00FF94]/10 border border-[#00FF94]/20 flex items-center justify-center">
                  <TrendingUp size={24} className="text-[#00FF94]" />
                </div>
                <div className="px-3 py-1 rounded-full bg-[#00FF94]/10 border border-[#00FF94]/20 text-xs text-[#00FF94] font-medium">
                  Активные
                </div>
              </div>
              <div>
                <p className="text-[#9CA3AF] text-sm mb-2">За последние 7 дней</p>
                <p className="text-4xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {isLoadingStats ? '...' : stats?.active_students || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-yellow-500/50 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500" />
            <div className="relative bg-[rgba(20,20,20,0.6)] backdrop-blur-xl rounded-3xl p-8 border border-white/5 group-hover:border-yellow-500/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <Award size={24} className="text-yellow-400" />
                </div>
                <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 font-medium">
                  Конверсия
                </div>
              </div>
              <div>
                <p className="text-[#9CA3AF] text-sm mb-2">Прошли обучение</p>
                <p className="text-4xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {isLoadingStats ? '...' : `${stats?.completion_rate.toFixed(1)}%` || '0%'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ ВОРОНКА КОНВЕРСИИ */}
        <div className="bg-[rgba(20,20,20,0.6)] backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-8 border-b border-white/5">
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Воронка конверсии
            </h2>
            <p className="text-[#9CA3AF] text-sm">
              Путь студента от регистрации до получения сертификата
            </p>
          </div>

          <div className="p-8">
            {isLoadingFunnel ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                    <div className="h-20 bg-white/5 rounded-2xl flex-1" />
                  </div>
                ))}
              </div>
            ) : funnelData?.funnel && funnelData.funnel.length > 0 ? (
              <div className="space-y-3">
                {funnelData.funnel.map((step, index) => {
                  const isFirst = index === 0;
                  const prevCount = index > 0 ? funnelData.funnel[index - 1].count : step.count;
                  const dropCount = prevCount - step.count;
                  const dropRate = prevCount > 0 ? ((dropCount / prevCount) * 100) : 0;

                  return (
                    <div key={step.step} className="relative">
                      {/* Funnel Bar */}
                      <div 
                        className="group relative overflow-hidden rounded-2xl border border-white/10 hover:border-[#00FF94]/30 transition-all duration-300"
                        style={{
                          background: 'rgba(20, 20, 20, 0.6)',
                        }}
                      >
                        {/* Progress Fill */}
                        <div 
                          className="absolute inset-0 bg-gradient-to-r from-[#00FF94]/20 to-[#00FF94]/5 transition-all duration-500"
                          style={{ width: `${step.percentage}%` }}
                        />

                        {/* Content */}
                        <div className="relative px-6 py-5 flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            {/* Step Number */}
                            <div className="w-10 h-10 rounded-xl bg-[#00FF94]/10 border border-[#00FF94]/20 flex items-center justify-center font-bold text-[#00FF94]">
                              {index + 1}
                            </div>

                            {/* Label */}
                            <div className="flex-1">
                              <p className="text-white font-semibold text-lg mb-1">
                                {step.label}
                              </p>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-[#9CA3AF]">
                                  {step.count} {step.count === 1 ? 'студент' : 'студентов'}
                                </span>
                                {!isFirst && dropCount > 0 && (
                                  <span className="text-red-400 flex items-center gap-1">
                                    <TrendingDown size={14} />
                                    -{dropCount} ({dropRate.toFixed(1)}% отток)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Metrics */}
                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <p className="text-xs text-[#9CA3AF] mb-1">От начала</p>
                              <p className="text-2xl font-bold text-white font-mono">
                                {step.percentage.toFixed(1)}%
                              </p>
                            </div>
                            {!isFirst && (
                              <div className="text-right">
                                <p className="text-xs text-[#9CA3AF] mb-1">Конверсия</p>
                                <p className={`text-2xl font-bold font-mono ${
                                  step.conversion >= 50 ? 'text-[#00FF94]' : 
                                  step.conversion >= 30 ? 'text-yellow-400' : 
                                  'text-red-400'
                                }`}>
                                  {step.conversion.toFixed(1)}%
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Connector Arrow (except for last) */}
                      {index < funnelData.funnel.length - 1 && (
                        <div className="flex justify-center py-2">
                          <div className="text-[#9CA3AF]">↓</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-[#9CA3AF]">
                Нет данных для отображения воронки
              </div>
            )}
          </div>

          {/* Summary */}
          {!isLoadingFunnel && funnelData && funnelData.funnel.length > 0 && (
            <div className="px-8 pb-8">
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                <h3 className="text-white font-bold mb-4">📊 Итоги воронки:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[#9CA3AF] mb-1">Общая конверсия</p>
                    <p className="text-2xl font-bold text-[#00FF94]">
                      {funnelData.funnel[funnelData.funnel.length - 1]?.percentage.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[#9CA3AF] mb-1">Завершили обучение</p>
                    <p className="text-2xl font-bold text-white">
                      {funnelData.funnel[funnelData.funnel.length - 1]?.count || 0} / {funnelData.total_enrolled}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#9CA3AF] mb-1">Средняя конверсия на шаг</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {(funnelData.funnel
                        .slice(1)
                        .reduce((sum, step) => sum + step.conversion, 0) / 
                        (funnelData.funnel.length - 1)).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
