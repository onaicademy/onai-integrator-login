import { Card } from '@/components/ui/card';
import { Lock, Radio } from 'lucide-react';
import { memo } from 'react';

interface LiveStreamModuleProps {
  modulesCompleted: number;
}

/**
 * 🔴 LIVE STREAM MODULE - ВРЕМЕННО ЗАБЛОКИРОВАН
 * - Модуль полностью заблокирован для всех пользователей
 * - Заглушка: "Информация будет позже"
 */
const LiveStreamModule = memo(function LiveStreamModule({ modulesCompleted }: LiveStreamModuleProps) {
  // 🚫 МОДУЛЬ ПОЛНОСТЬЮ ЗАБЛОКИРОВАН
  const isUnlocked = false;

  return (
    <Card 
      className={`
        p-2 sm:p-3 md:p-4 lg:p-6 rounded-2xl md:rounded-3xl border transition-all duration-300 relative overflow-hidden
        ${isUnlocked 
          ? 'bg-[rgba(255,51,102,0.1)] border-[#FF3366]/50' 
          : 'bg-[#0A0A0A]/90 border-white/10'
        }
      `}
    >
      {/* Анимация отключена по запросу пользователя */}

      <div className="relative z-10">
        {/* Заголовок с LIVE иконкой */}
        <div className="flex items-start gap-3 sm:gap-4 mb-4">
          {/* Icon with Badge - КАК У МОДУЛЕЙ */}
          <div className="relative flex-shrink-0">
            {isUnlocked ? (
              <div className="relative">
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'rgba(255, 51, 102, 0.2)',
                    border: '1px solid rgba(255, 51, 102, 0.3)'
                  }}
                >
                  <div className="absolute inset-0 bg-[#FF3366] blur-lg opacity-50 animate-pulse" />
                  <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF3366] animate-pulse relative z-10" />
                </div>
                {/* Module Number Badge */}
                <div 
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: '#FF3366',
                    color: '#000000',
                    fontFamily: "'JetBrains Mono', monospace",
                    boxShadow: '0 0 8px #FF3366',
                  }}
                >
                  4
                </div>
              </div>
            ) : (
              <div className="relative">
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}
                >
                  <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-white/20" />
                </div>
                {/* Module Number Badge */}
                <div 
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(156, 163, 175, 0.6)',
                    fontFamily: "'JetBrains Mono', monospace",
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  4
                </div>
              </div>
            )}
          </div>
          
          <h2 
            className={`text-sm sm:text-base md:text-xl lg:text-2xl xl:text-3xl font-bold uppercase 
                       tracking-wide md:tracking-wider font-['JetBrains_Mono'] break-words leading-tight
                       ${isUnlocked ? 'text-[#FF3366]' : 'text-white/40'}`}
          >
            ЗАКЛЮЧИТЕЛЬНЫЙ ПРЯМОЙ ЭФИР
          </h2>
        </div>

        {/* Заглушка - информация будет позже */}
        <div className="mb-4 sm:mb-6">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full w-fit bg-white/5 border border-white/10">
            <span className="text-xs sm:text-sm font-bold font-['JetBrains_Mono'] whitespace-nowrap text-white/60">
              Информация будет позже
            </span>
          </div>
        </div>

        {/* Статус разблокировки */}
        {!isUnlocked && (
          <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="p-2 bg-white/5 rounded-lg flex-shrink-0">
               <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-semibold text-white/60 font-['JetBrains_Mono'] 
                           uppercase break-words">
                ЗАБЛОКИРОВАНО
              </p>
              <p className="text-xs text-white/40 font-['Manrope'] break-words leading-relaxed mt-1">
                Завершите все 3 модуля, чтобы получить доступ
              </p>
            </div>
          </div>
        )}

        {/* Заглушка для всех пользователей */}
        <div className="p-3 sm:p-4 md:p-5 bg-white/5 border border-white/10 rounded-xl 
                       flex items-start gap-2 sm:gap-3">
           <div className="mt-0.5 text-base sm:text-lg text-white/60 flex-shrink-0">📢</div>
           <p className="text-xs sm:text-sm md:text-base text-white/70 font-['Manrope'] break-words 
                        leading-relaxed min-w-0 flex-1">
             Скоро вся информация будет в сообществе
           </p>
        </div>
      </div>
    </Card>
  );
});

export default LiveStreamModule;
