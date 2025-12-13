import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  Users,
  Mic,
  DollarSign,
  TrendingUp,
  Activity,
  FileText
} from 'lucide-react'
import { apiRequest } from '@/utils/apiClient'

interface DashboardStats {
  total_students: number
  active_students: number
  completed_students: number
  completion_rate: number
  total_transcriptions: number
  transcriptions_completed: number
  total_costs: number
  monthly_costs: number
}

export default function TripwireAdminDashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['tripwire', 'admin', 'stats'],
    queryFn: async () => apiRequest<DashboardStats>('/api/tripwire/admin/stats'),
    refetchInterval: 30000
  })

  return (
    <div className="relative">
      {/* ✅ HEADER */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 
              className="text-2xl lg:text-3xl font-bold text-white tracking-tight" 
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                АДМИН-ПАНЕЛЬ TRIPWIRE
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Центр управления платформой
              </p>
            </div>

            {/* ✅ LIVE METRICS */}
            {!isLoading && stats && (
            <div className="flex flex-wrap items-center gap-4 lg:gap-8">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-[#00FF00]" />
                  <span className="text-sm">
                    <span className="text-white font-bold text-lg">{stats.total_students}</span>
                    <span className="text-gray-400 ml-1">студентов</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-blue-400" />
                  <span className="text-sm">
                    <span className="text-white font-bold text-lg">{stats.active_students}</span>
                    <span className="text-gray-400 ml-1">активных</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#00FF00]" />
                  <span className="text-sm">
                    <span className="text-white font-bold text-lg">{stats.completion_rate.toFixed(1)}%</span>
                    <span className="text-gray-400 ml-1">завершили</span>
                  </span>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* ✅ MAIN CONTENT */}
      <div className="relative">

        {/* ✅ CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Аналитика */}
          <Link to="/integrator/admin/analytics" className="group relative block">
            {/* Glow Effect */}
            <div 
              className="absolute -inset-0.5 bg-[#00FF00] rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500"
            />
            
            {/* Card Content */}
            <div 
              className="relative rounded-3xl p-8 border border-white/5 group-hover:border-[#00FF00]/30 transition-all duration-300"
              style={{
                background: 'rgba(10, 10, 10, 0.6)',
                backdropFilter: 'blur(32px)'
              }}
            >
              {/* Icon + Title */}
              <div className="mb-6">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 255, 0, 0.2) 0%, rgba(0, 255, 0, 0.05) 100%)',
                    borderColor: 'rgba(0, 255, 0, 0.2)'
                  }}
                >
                  <BarChart3 size={28} className="text-[#00FF00]" />
                </div>
                <h3 
                  className="text-2xl font-bold text-white mb-2 group-hover:text-[#00FF00] transition-colors"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Аналитика
                </h3>
                <p className="text-gray-400 text-sm">
                  Метрики студентов и воронка конверсии
                </p>
              </div>

              {/* ✅ METRICS PREVIEW */}
              {!isLoading && stats ? (
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Завершили
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-[#00FF00]">
                        {stats.completion_rate.toFixed(1)}%
                      </span>
                      <TrendingUp size={14} className="text-[#00FF00]" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Активных
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {stats.active_students}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Всего
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {stats.total_students}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-6 border-t border-white/5">
                  <div className="animate-pulse flex gap-4">
                    <div className="h-12 bg-white/5 rounded-lg flex-1" />
                    <div className="h-12 bg-white/5 rounded-lg flex-1" />
                    <div className="h-12 bg-white/5 rounded-lg flex-1" />
                  </div>
                </div>
              )}
            </div>
          </Link>

          {/* Card 2: Студенты */}
          <Link to="/integrator/admin/students" className="group relative block">
            <div className="absolute -inset-0.5 bg-blue-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500" />
            
            <div 
              className="relative rounded-3xl p-8 border border-white/5 group-hover:border-blue-500/30 transition-all duration-300"
              style={{ background: 'rgba(10, 10, 10, 0.6)', backdropFilter: 'blur(32px)' }}
            >
              <div className="mb-6">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%)',
                    borderColor: 'rgba(59, 130, 246, 0.2)'
                  }}
                >
                  <Users size={28} className="text-blue-400" />
                </div>
                <h3 
                  className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Студенты
                </h3>
                <p className="text-gray-400 text-sm">
                  Управление и прогресс обучения
                </p>
              </div>

              {!isLoading && stats ? (
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Всего
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {stats.total_students}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Активных
                    </div>
                    <div className="text-3xl font-bold text-blue-400">
                      {stats.active_students}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-6 border-t border-white/5">
                  <div className="animate-pulse flex gap-4">
                    <div className="h-12 bg-white/5 rounded-lg flex-1" />
                    <div className="h-12 bg-white/5 rounded-lg flex-1" />
                  </div>
                </div>
              )}
            </div>
          </Link>

          {/* Card 3: Транскрибации */}
          <Link to="/integrator/admin/transcriptions" className="group relative block">
            <div className="absolute -inset-0.5 bg-yellow-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500" />
            
            <div 
              className="relative rounded-3xl p-8 border border-white/5 group-hover:border-yellow-500/30 transition-all duration-300"
              style={{ background: 'rgba(10, 10, 10, 0.6)', backdropFilter: 'blur(32px)' }}
            >
              <div className="mb-6">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.05) 100%)',
                    borderColor: 'rgba(234, 179, 8, 0.2)'
                  }}
                >
                  <Mic size={28} className="text-yellow-400" />
                </div>
                <h3 
                  className="text-2xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Транскрибации
                </h3>
                <p className="text-gray-400 text-sm">
                  Автосубтитры через Groq Whisper
                </p>
              </div>

              {!isLoading && stats ? (
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Готовых
                    </div>
                    <div className="text-3xl font-bold text-yellow-400">
                      {stats.transcriptions_completed}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Всего
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {stats.total_transcriptions}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-6 border-t border-white/5">
                  <div className="animate-pulse flex gap-4">
                    <div className="h-12 bg-white/5 rounded-lg flex-1" />
                    <div className="h-12 bg-white/5 rounded-lg flex-1" />
                  </div>
                </div>
              )}
            </div>
          </Link>

          {/* Card 4: Затраты AI */}
          <Link to="/integrator/admin/costs" className="group relative block">
            <div className="absolute -inset-0.5 bg-red-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500" />
            
            <div 
              className="relative rounded-3xl p-8 border border-white/5 group-hover:border-red-500/30 transition-all duration-300"
              style={{ background: 'rgba(10, 10, 10, 0.6)', backdropFilter: 'blur(32px)' }}
            >
              <div className="mb-6">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)',
                    borderColor: 'rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <DollarSign size={28} className="text-red-400" />
                </div>
                <h3 
                  className="text-2xl font-bold text-white mb-2 group-hover:text-red-400 transition-colors"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Затраты AI
                </h3>
                <p className="text-gray-400 text-sm">
                  Расходы на API и токены
                </p>
              </div>

              {/* ✅ Превью затрат УБРАНО по запросу */}
              <div className="pt-6 border-t border-white/5">
                <p className="text-gray-500 text-sm text-center">
                  Перейдите в раздел для просмотра детальной статистики
                </p>
              </div>
            </div>
          </Link>

        </div>

        {/* Back Link */}
        <div className="mt-12 text-center">
          <Link
            to="/integrator"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-[#00FF00] transition-colors"
          >
            ← Вернуться на платформу
          </Link>
        </div>
      </div>
    </div>
  )
}
