import { Card } from '@/components/ui/card';
import { getStreamTime, getStreamCountdown } from '@/lib/tripwire-utils';
import { motion } from 'framer-motion';
import { Lock, Radio, Clock } from 'lucide-react';
import { useState, useEffect, memo } from 'react';

interface LiveStreamModuleProps {
  modulesCompleted: number;
}

/**
 * 🔴 LIVE STREAM MODULE - REDESIGN
 * - Замена эмоджи на 3D иконку (Radio)
 * - Адаптация под общий стиль
 * - 🚀 OPTIMIZATION: Memoized with React.memo
 */
const LiveStreamModule = memo(function LiveStreamModule({ modulesCompleted }: LiveStreamModuleProps) {
  const [streamTime, setStreamTime] = useState(getStreamTime());
  const [countdown, setCountdown] = useState(getStreamCountdown());
  // 🚫 МОДУЛЬ ВРЕМЕННО ЗАБЛОКИРОВАН
  const isUnlocked = false; // modulesCompleted >= 3;

  // 🚀 OPTIMIZATION: Update every 10 seconds instead of 1 second (less re-renders)
  useEffect(() => {
    const interval = setInterval(() => {
      setStreamTime(getStreamTime());
      setCountdown(getStreamCountdown());
    }, 10000); // каждые 10 секунд вместо 1

    return () => clearInterval(interval);
  }, []);

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

        {/* Подзаголовок */}
        <p className={`text-sm sm:text-base md:text-lg mb-3 sm:mb-4 md:mb-6 font-['Manrope'] break-words 
                      ${isUnlocked ? 'text-white/80' : 'text-white/40'}`}>
          С основателями академии
        </p>

        {/* Время эфира и обратный отсчёт - ПОКАЗЫВАЕТСЯ ВСЕГДА */}
        <div className="flex flex-col gap-3 sm:gap-3.5 md:gap-4 lg:gap-5 mb-3 sm:mb-4 md:mb-6">
          {/* Дата эфира */}
          <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full w-fit
                          ${isUnlocked 
                            ? 'bg-[#FF3366]/20 border border-[#FF3366]/40' 
                            : 'bg-white/5 border border-white/10'}`}>
            <span className={`text-xs sm:text-sm font-bold font-['JetBrains_Mono'] whitespace-nowrap
                            ${isUnlocked ? 'text-[#FF3366]' : 'text-white/40'}`}>
              {streamTime}
            </span>
          </div>
          
          {/* Обратный отсчёт */}
          <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full w-fit
                          ${isUnlocked 
                            ? 'bg-[#00FF94]/10 border border-[#00FF94]/30' 
                            : 'bg-white/5 border border-white/10'}`}>
            <Clock className={`w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 ${isUnlocked ? 'text-[#00FF94]' : 'text-white/30'}`} />
            <span className={`text-[10px] sm:text-xs font-semibold font-['JetBrains_Mono'] whitespace-nowrap
                            ${isUnlocked ? 'text-[#00FF94]' : 'text-white/40'}`}>
              До эфира: {countdown}
            </span>
          </div>
        </div>

        {/* Описание */}
        <div className="space-y-2 mb-4 sm:mb-6">
          <p className={`text-sm sm:text-base md:text-lg font-bold font-['Manrope'] 
                        tracking-tight leading-snug
                        ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
            Как создать платформу стоимостью<br />20 000$
          </p>
          <p className={`text-[10px] sm:text-xs md:text-sm font-['Manrope'] uppercase 
                        tracking-wide sm:tracking-wider break-words 
                        ${isUnlocked ? 'text-white/70' : 'text-white/30'}`}>
            БЕЗ НАВЫКОВ ПРОГРАММИРОВАНИЯ
          </p>
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
