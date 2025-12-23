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

        {/* Заглушка - СКОРО */}
        <div className="flex items-center justify-center p-6 sm:p-8 md:p-10">
          <div className="inline-flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-white/5 border border-white/10">
            <span className="text-base sm:text-lg md:text-xl font-bold font-['JetBrains_Mono'] uppercase text-white/60">
              СКОРО
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
});

export default LiveStreamModule;
