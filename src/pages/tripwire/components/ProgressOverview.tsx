import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getModuleInfo } from '@/lib/tripwire-utils';
import { motion } from 'framer-motion';
import { CheckCircle2, Lock, PlayCircle, Clock, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LiveStreamModule from './LiveStreamModule';

interface ProgressOverviewProps {
  modulesCompleted: number;
  moduleProgress: Array<{
    module_number: number;
    is_started: boolean;
    is_completed: boolean;
    lessons_completed: number;
    total_lessons: number;
    completion_percentage?: number;
    real_watch_time?: number;
    completed_at?: string;
  }>;
}

/**
 * 📊 PROGRESS OVERVIEW - REDESIGN 3.0
 * - Элитные карточки (как в ModuleProgress)
 * - Замена эмоджи на 3D Lucide иконки
 * - Полная русификация и единый стиль
 */
export default function ProgressOverview({ modulesCompleted, moduleProgress }: ProgressOverviewProps) {
  const navigate = useNavigate();

  const handleModuleClick = (moduleNumber: number) => {
    navigate('/tripwire');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 
          className="text-3xl font-bold text-white mb-2 font-['Space_Grotesk'] uppercase tracking-wider"
          style={{ textShadow: '0 0 30px rgba(0, 255, 148, 0.4)' }}
        >
          ПРОГРЕСС ПО МОДУЛЯМ
        </h2>
        <p className="text-sm text-[#9CA3AF] font-['JetBrains_Mono'] uppercase">
          /// ВАШ ПУТЬ ОБУЧЕНИЯ
        </p>
      </div>

      {/* 3 активных модуля */}
      <div className="grid grid-cols-1 gap-6">
        {[1, 2, 3].map((moduleNumber, index) => {
          const moduleInfo = getModuleInfo(moduleNumber);
          const progress = moduleProgress.find(p => p.module_number === moduleNumber);
          
          const isCompleted = progress?.is_completed || false;
          const isStarted = progress?.is_started || false;
          // Логика доступности: 1 модуль доступен всегда, остальные если предыдущий завершен
          const isLocked = moduleNumber > 1 && modulesCompleted < moduleNumber - 1;
          const isActive = !isLocked && !isCompleted;

          // Данные для отображения (если нет прогресса - нули)
          const completionPercent = progress?.completion_percentage || 0;
          const watchTime = progress?.real_watch_time || 0;

          return (
            <motion.div
              key={moduleNumber}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group"
            >
              {/* Active Glow */}
              {isActive && (
                <div className="absolute -inset-1 bg-gradient-to-r from-[#00FF94]/20 via-[#00FF94]/10 to-transparent rounded-3xl blur-xl opacity-70" />
              )}

              <div className={`
                relative rounded-3xl border overflow-hidden transition-all duration-300
                ${isCompleted 
                  ? 'bg-[#0A0A0A]/90 border-[#00FF94]/50 shadow-[0_0_30px_rgba(0,255,148,0.15)]' 
                  : isActive
                    ? 'bg-[#0A0A0A]/90 border-[#00FF94]/30 hover:border-[#00FF94]/50'
                    : 'bg-[#050505]/80 border-white/5'
                }
              `}>
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
                  {/* Icon Section */}
                  <div className="shrink-0">
                    <div className={`
                      w-20 h-20 rounded-2xl flex items-center justify-center border-2
                      ${isCompleted
                        ? 'bg-[#00FF94]/10 border-[#00FF94]/50 text-[#00FF94]'
                        : isActive
                          ? 'bg-[#00FF94]/5 border-[#00FF94]/30 text-[#00FF94]'
                          : 'bg-white/5 border-white/10 text-gray-600'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle2 size={40} strokeWidth={1.5} />
                      ) : isActive ? (
                        <PlayCircle size={40} strokeWidth={1.5} />
                      ) : (
                        <Lock size={40} strokeWidth={1.5} />
                      )}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 min-w-0 space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="text-xs font-['JetBrains_Mono'] text-[#00FF94] uppercase tracking-widest">
                          МОДУЛЬ 0{moduleNumber}
                        </span>
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded bg-[#00FF94]/20 text-[#00FF94] text-[10px] font-['JetBrains_Mono'] uppercase border border-[#00FF94]/30">
                            ЗАВЕРШЕНО
                          </span>
                        )}
                      </div>
                      
                      <h3 className={`text-2xl font-bold font-['Space_Grotesk'] uppercase leading-tight mb-2
                                    ${isLocked ? 'text-white/30' : 'text-white'}`}>
                        {moduleInfo.title}
                      </h3>
                      <p className={`text-sm font-['Manrope']
                                   ${isLocked ? 'text-white/20' : 'text-white/60'}`}>
                        {moduleInfo.description}
                      </p>
                    </div>

                    {/* Stats & Action */}
                    {!isLocked && (
                      <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center gap-6">
                        {/* Stats */}
                        <div className="flex items-center gap-6 flex-1 w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-white/40" />
                            <div>
                              <span className="text-[10px] text-white/40 font-['Space_Grotesk'] uppercase block">ПРОГРЕСС</span>
                              <span className="text-sm font-bold text-white">{Math.round(completionPercent)}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-white/40" />
                            <div>
                              <span className="text-[10px] text-white/40 font-['Space_Grotesk'] uppercase block">ВРЕМЯ</span>
                              <span className="text-sm font-bold text-white">{Math.floor(watchTime / 60)} мин</span>
                            </div>
                          </div>
                        </div>

                        {/* Button */}
                        <Button
                          onClick={() => handleModuleClick(moduleNumber)}
                          className={`
                            w-full sm:w-auto min-w-[140px] h-10 font-['JetBrains_Mono'] uppercase tracking-wide font-bold
                            ${isCompleted
                              ? 'bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/50 hover:bg-[#00FF94]/20'
                              : 'bg-[#00FF94] text-black hover:bg-[#00CC6A]'
                            }
                          `}
                        >
                          {isCompleted ? 'ПОВТОРИТЬ' : isActive ? 'ПРОДОЛЖИТЬ' : 'НАЧАТЬ'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar Bottom */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#00FF94]/20">
                    <div 
                      className="h-full bg-[#00FF94] shadow-[0_0_10px_#00FF94]" 
                      style={{ width: `${completionPercent}%` }} 
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 4-й блок: Прямой эфир - обновленный */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <LiveStreamModule modulesCompleted={modulesCompleted} />
      </motion.div>
    </div>
  );
}
