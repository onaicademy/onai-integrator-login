import { PlayCircle, CheckCircle2, Lock, Clock, BarChart3 } from 'lucide-react';
import { getModuleInfo } from '@/lib/tripwire-utils';

interface Lesson {
  id: number;
  title: string;
  is_completed: boolean;
  video_progress_percent: number;
  watch_time_seconds: number;
  completed_at: string | null;
}

interface ModuleData {
  module_number: number;
  is_completed: boolean;
  is_started?: boolean;
  lessons_completed?: number;
  total_lessons?: number;
  lessons: Lesson[];
  completion_percentage?: number;
  real_watch_time?: number;
  completed_at?: string;
  title?: string; // Добавляем опциональные поля для совместимости
  description?: string;
}

interface ModuleProgressProps {
  modules: ModuleData[];
}

/**
 * 📚 MODULE PROGRESS - ELITE CARDS REDESIGN
 * Элитные карточки с глубиной, shimmer анимацией и неоном
 */
export default function ModuleProgress({ modules }: ModuleProgressProps) {
  // Сортируем модули по номеру
  const sortedModules = [...modules].sort((a, b) => a.module_number - b.module_number);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl lg:text-4xl font-bold text-white font-['JetBrains_Mono']
                     uppercase tracking-wider mb-2"
            style={{ textShadow: '0 0 30px rgba(0, 255, 148, 0.4)' }}>
          ПРОГРЕСС ПО МОДУЛЯМ
        </h2>
        <p className="text-sm text-[#9CA3AF] font-['JetBrains_Mono']">
          /// MODULE COMPLETION STATUS
        </p>
      </div>

      {/* Modules List */}
      <div className="space-y-6">
        {sortedModules.map((module, idx) => {
           // Получаем инфо о модуле из утилиты, если в данных нет заголовка
          const moduleInfo = getModuleInfo(module.module_number);
          const title = module.title || moduleInfo.title;
          // description пока не используем в новом дизайне или можно добавить

          const isCompleted = module.is_completed;
          const isStarted = module.is_started || module.lessons.some(l => l.video_progress_percent > 0);
          const isActive = !isCompleted && isStarted; // Считаем активным если начат или первый (если ни один не начат - логика может варьироваться, возьмем по данным)
          // Если данных о started нет, то активный - первый незавершенный
          const actualIsActive = isActive || (!isCompleted && idx === 0 && !sortedModules.some(m => m.is_started && !m.is_completed)); 
          
          // Расчет процентов и времени если их нет в объекте модуля (для совместимости)
          const calculatedCompletion = module.completion_percentage !== undefined 
            ? module.completion_percentage 
            : (module.lessons.length > 0 
                ? Math.round((module.lessons.filter(l => l.is_completed).length / module.lessons.length) * 100)
                : 0);
          
          const calculatedTime = module.real_watch_time !== undefined
            ? module.real_watch_time
            : module.lessons.reduce((acc, l) => acc + l.watch_time_seconds, 0);

          return (
            <div key={module.module_number} className="relative group">
              {/* Animated background glow для активного */}
              {actualIsActive && (
                <div className="absolute -inset-2 bg-gradient-to-r from-[#00FF94]/30 via-[#00FF94]/10 to-transparent 
                              rounded-3xl blur-2xl animate-pulse" />
              )}

              {/* Main card */}
              <div className={`
                relative rounded-3xl overflow-hidden transition-all duration-500
                ${isCompleted 
                  ? 'bg-[rgba(10,10,10,0.9)] border-2 border-[#00FF94]/50 shadow-[0_0_40px_rgba(0,255,148,0.3)]' 
                  : actualIsActive 
                    ? 'bg-[rgba(10,10,10,0.9)] border-2 border-[#00FF94]/30 hover:border-[#00FF94]/60 shadow-[0_0_30px_rgba(0,255,148,0.2)]' 
                    : 'bg-[rgba(10,10,10,0.6)] border border-gray-800 opacity-60'
                }
              `}>
                <div className="p-8">
                  <div className="flex flex-col lg:flex-row items-start gap-8">
                    {/* Left: Icon + Status */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        {/* Icon glow */}
                        {(isCompleted || actualIsActive) && (
                          <div className="absolute inset-0 bg-[#00FF94] blur-2xl opacity-40 animate-pulse" />
                        )}
                        
                        {/* Icon container */}
                        <div className={`
                          relative w-24 h-24 lg:w-28 lg:h-28 rounded-2xl flex items-center justify-center
                          border-2 transition-all duration-300
                          ${isCompleted 
                            ? 'bg-gradient-to-br from-[#00FF94]/30 to-[#00FF94]/10 border-[#00FF94]/60' 
                            : actualIsActive 
                              ? 'bg-gradient-to-br from-[#00FF94]/20 to-[#00FF94]/5 border-[#00FF94]/40' 
                              : 'bg-gray-900/50 border-gray-800'
                          }
                        `}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-14 h-14 text-[#00FF94]" strokeWidth={2.5} />
                          ) : actualIsActive ? (
                            <PlayCircle className="w-14 h-14 text-[#00FF94]" strokeWidth={2.5} />
                          ) : (
                            <Lock className="w-14 h-14 text-gray-700" strokeWidth={2} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Content */}
                    <div className="flex-1 space-y-6 w-full">
                      {/* Title & Status */}
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm font-['JetBrains_Mono'] text-[#00FF94] uppercase tracking-widest">
                            /// MODULE {String(module.module_number).padStart(2, '0')}
                          </span>
                          
                          {isCompleted && (
                            <span className="px-4 py-1.5 rounded-full bg-[#00FF94]/20 text-[#00FF94] 
                                         text-xs font-['JetBrains_Mono'] uppercase tracking-wider
                                         border border-[#00FF94]/30">
                              ✓ COMPLETED
                            </span>
                          )}
                          
                          {actualIsActive && (
                            <span className="px-4 py-1.5 rounded-full bg-orange-500/20 text-orange-500 
                                         text-xs font-['JetBrains_Mono'] uppercase tracking-wider
                                         border border-orange-500/30 animate-pulse">
                              ▶ IN PROGRESS
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-2xl lg:text-3xl font-bold text-white font-['JetBrains_Mono'] 
                                     uppercase leading-tight">
                          {title}
                        </h3>
                      </div>

                      {/* Stats - только для completed/active */}
                      {(isCompleted || actualIsActive) && (
                        <>
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Completion */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-[#9CA3AF]" />
                                <span className="text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase">
                                  ПРОСМОТР
                                </span>
                              </div>
                              <p className="text-3xl font-bold text-white font-['JetBrains_Mono']">
                                {calculatedCompletion}%
                              </p>
                            </div>

                            {/* Watch Time */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#9CA3AF]" />
                                <span className="text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase">
                                  ВРЕМЯ
                                </span>
                              </div>
                              <p className="text-3xl font-bold text-white font-['JetBrains_Mono'] flex items-baseline gap-1">
                                {Math.floor(calculatedTime / 60)}
                                <span className="text-lg text-[#9CA3AF]">мин</span>
                              </p>
                            </div>

                            {/* Date - только для completed */}
                            {isCompleted && module.completed_at && (
                              <div className="space-y-2">
                                <span className="text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase block">
                                  ЗАВЕРШЕНО
                                </span>
                                <p className="text-lg font-bold text-[#00FF94] font-['JetBrains_Mono']">
                                  {new Date(module.completed_at).toLocaleDateString('ru-RU', {
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-[#9CA3AF] font-['JetBrains_Mono']">
                                PROGRESS STATUS
                              </span>
                              <span className={`font-bold font-['JetBrains_Mono'] ${
                                calculatedCompletion >= 80 ? 'text-[#00FF94]' : 'text-orange-500'
                              }`}>
                                {calculatedCompletion >= 100 ? 'COMPLETE' : 'ONGOING'}
                              </span>
                            </div>
                            
                            <div className="relative w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                              <div 
                                className="h-full bg-gradient-to-r from-[#00FF94] via-[#00DD7A] to-[#00CC6A] 
                                         rounded-full transition-all duration-700 relative"
                                style={{ 
                                  width: `${calculatedCompletion}%`,
                                  boxShadow: '0 0 15px rgba(0, 255, 148, 0.8)'
                                }}
                              >
                                {/* Animated shine */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent 
                                              animate-[shimmer_2s_ease-in-out_infinite]" />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom accent line */}
                {isCompleted && (
                  <div className="h-1 bg-gradient-to-r from-[#00FF94] to-[#00CC6A]" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
