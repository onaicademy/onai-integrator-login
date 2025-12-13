import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/utils/apiClient';
import { Link } from 'react-router-dom';
import { ArrowLeft, DollarSign, Calendar, Zap, MessageSquare, Mic, Video } from 'lucide-react';

// ✅ НОВЫЙ интерфейс для tripwire_ai_costs
interface Cost {
  id: string;
  user_id: string;
  cost_type: string; // 'curator_chat' | 'curator_whisper' | 'lesson_transcription' | 'lesson_generation'
  service: string; // 'openai' | 'groq'
  model: string;
  tokens_used: number;
  cost_usd: number;
  metadata: any;
  created_at: string;
}

interface CostsData {
  costs: Cost[];
  by_cost_type: Record<string, { total: number; count: number }>;
  by_service: Record<string, { total: number; count: number }>;
  by_model: Record<string, { total: number; count: number }>;
  total: number;
  total_students: number;
}

// ✅ Иконки по типу затрат (БЕЗ AI-куратора - его нет на Tripwire)
const costTypeIcons = {
  'lesson_transcription': Video,
  'lesson_generation': Zap
};

const costTypeLabels = {
  'lesson_transcription': 'Транскрибации видео',
  'lesson_generation': 'Генерация описаний/советов'
};

const costTypeColors = {
  'lesson_transcription': '#F59E0B',
  'lesson_generation': '#8B5CF6'
};

export default function TripwireCosts() {
  const { data, isLoading } = useQuery<CostsData>({
    queryKey: ['tripwire', 'admin', 'costs'],
    queryFn: async () => apiRequest<CostsData>('/api/tripwire/admin/costs'),
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
          to="/integrator/admin" 
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
            Затраты на AI
          </h1>
          <p className="text-[#9CA3AF] text-lg mb-2">
            Отдельный трекинг затрат для Tripwire (начат с нуля)
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-[#9CA3AF]">
              Студентов с затратами: {data?.total_students || 0}
            </span>
            <span className="text-white">•</span>
            <span className="text-[#FF3366] font-bold font-mono text-2xl">
              {isLoading ? '...' : `$${data?.total.toFixed(4) || '0.0000'}`}
            </span>
          </div>
        </div>

        {/* ✅ По типу затрат (curator_chat, curator_whisper, lesson_transcription) */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            По типу AI-сервиса
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              <>
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-[rgba(20,20,20,0.6)] backdrop-blur-xl rounded-3xl p-8 border border-white/5 h-48" />
                ))}
              </>
            ) : data?.by_cost_type && Object.entries(data.by_cost_type).length > 0 ? (
              Object.entries(data.by_cost_type).map(([costType, stats]) => {
                const Icon = costTypeIcons[costType as keyof typeof costTypeIcons] || Zap;
                const color = costTypeColors[costType as keyof typeof costTypeColors];
                const label = costTypeLabels[costType as keyof typeof costTypeLabels] || costType;
                
                return (
                  <div key={costType} className="group relative">
                    <div 
                      className="absolute -inset-0.5 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500" 
                      style={{ background: `linear-gradient(to right, ${color}, ${color}80)` }}
                    />
                    <div className="relative bg-[rgba(20,20,20,0.6)] backdrop-blur-xl rounded-3xl p-8 border border-white/5 hover:border-white/10 transition-all duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <div 
                          className="w-14 h-14 rounded-2xl flex items-center justify-center"
                          style={{ 
                            background: `${color}15`,
                            border: `1px solid ${color}30`
                          }}
                        >
                          <Icon size={28} style={{ color }} />
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[#9CA3AF] mb-1">Запросов</div>
                          <div className="text-xl font-bold text-white">{stats.count}</div>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="text-sm text-[#9CA3AF] mb-2">{label}</div>
                        <div className="text-3xl font-bold text-white font-mono">
                          ${stats.total.toFixed(4)}
                        </div>
                      </div>
                      <div className="text-xs text-[#9CA3AF]">
                        Средний: ${stats.count > 0 ? (stats.total / stats.count).toFixed(5) : '0.00000'}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 text-center py-12 text-[#9CA3AF]">
                Затрат пока нет. Трекинг начнётся с первого использования AI.
              </div>
            )}
          </div>
        </div>

        {/* ✅ По сервису (OpenAI, Groq) */}
        {!isLoading && data?.by_service && Object.keys(data.by_service).length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              По провайдеру
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(data.by_service).map(([service, stats]) => (
                <div 
                  key={service}
                  className="bg-[rgba(20,20,20,0.6)] backdrop-blur-xl rounded-2xl p-6 border border-white/5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-[#9CA3AF] mb-1">
                        {service === 'openai' ? 'OpenAI' : service === 'groq' ? 'Groq' : service}
                      </div>
                      <div className="text-2xl font-bold text-white font-mono">
                        ${stats.total.toFixed(4)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#9CA3AF] mb-1">Запросов</div>
                      <div className="text-lg font-bold text-[#00FF94]">{stats.count}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✅ По модели */}
        {!isLoading && data?.by_model && Object.keys(data.by_model).length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              По модели AI
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.by_model).map(([model, stats]) => (
                <div 
                  key={model}
                  className="bg-[rgba(20,20,20,0.6)] backdrop-blur-xl rounded-xl p-4 border border-white/5"
                >
                  <div className="text-xs text-[#9CA3AF] mb-1">{model}</div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-xl font-bold text-white font-mono">
                      ${stats.total.toFixed(4)}
                    </div>
                    <div className="text-sm text-[#9CA3AF]">{stats.count} req</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✅ История транзакций */}
        <div className="bg-[rgba(20,20,20,0.6)] backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-8 border-b border-white/5">
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              История транзакций
            </h2>
            <p className="text-[#9CA3AF] text-sm mt-2">
              Последние {data?.costs.length || 0} записей
            </p>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-16 bg-white/5 rounded-xl" />
                ))}
              </div>
            ) : data?.costs && data.costs.length > 0 ? (
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                      Дата
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                      Тип
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                      Провайдер
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                      Модель
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                      Токены
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                      Стоимость
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.costs.map((cost) => {
                    const Icon = costTypeIcons[cost.cost_type as keyof typeof costTypeIcons] || Zap;
                    const color = costTypeColors[cost.cost_type as keyof typeof costTypeColors] || '#9CA3AF';
                    const label = costTypeLabels[cost.cost_type as keyof typeof costTypeLabels] || cost.cost_type;
                    
                    return (
                      <tr key={cost.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-sm text-[#9CA3AF]">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            {new Date(cost.created_at).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Icon size={16} style={{ color }} />
                            <span className="text-sm text-white">{label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#9CA3AF]">
                          {cost.service === 'openai' ? 'OpenAI' : cost.service === 'groq' ? 'Groq' : cost.service}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-white">
                          {cost.model}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-mono text-[#9CA3AF]">
                          {cost.tokens_used.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-mono font-bold text-[#FF3366]">
                          ${cost.cost_usd.toFixed(6)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center">
                <DollarSign size={48} className="mx-auto mb-4 text-[#9CA3AF] opacity-50" />
                <p className="text-[#9CA3AF] text-lg">Транзакций пока нет</p>
                <p className="text-[#9CA3AF] text-sm mt-2">
                  Трекинг начнётся автоматически при первом использовании AI
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
