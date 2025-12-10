import { Card } from '@/components/ui/card';
import { getStreamTime, getStreamCountdown } from '@/lib/tripwire-utils';
import { motion } from 'framer-motion';
import { Lock, Radio, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface LiveStreamModuleProps {
  modulesCompleted: number;
}

/**
 * 🔴 LIVE STREAM MODULE - REDESIGN
 * - Замена эмоджи на 3D иконку (Radio)
 * - Адаптация под общий стиль
 */
export default function LiveStreamModule({ modulesCompleted }: LiveStreamModuleProps) {
  const [streamTime, setStreamTime] = useState(getStreamTime());
  const [countdown, setCountdown] = useState(getStreamCountdown());
  const isUnlocked = modulesCompleted >= 3;

  // Обновляем время каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      setStreamTime(getStreamTime());
      setCountdown(getStreamCountdown());
    }, 60000); // каждую минуту

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
          {isUnlocked ? (
            <div className="relative flex-shrink-0 mt-1">
               <div className="absolute inset-0 bg-[#FF3366] blur-lg opacity-50 animate-pulse" />
               <Radio className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-[#FF3366] animate-pulse relative z-10" />
            </div>
          ) : (
            <Radio className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white/20 flex-shrink-0 mt-1" />
          )}
          
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
        <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4 md:mb-6">
          <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full
                          ${isUnlocked 
                            ? 'bg-[#FF3366]/20 border border-[#FF3366]/40' 
                            : 'bg-white/5 border border-white/10'}`}>
            <span className={`text-xs sm:text-sm font-bold font-['JetBrains_Mono'] whitespace-nowrap
                            ${isUnlocked ? 'text-[#FF3366]' : 'text-white/40'}`}>
              {streamTime}
            </span>
          </div>
          
          {/* Обратный отсчёт */}
          <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full
                          ${isUnlocked 
                            ? 'bg-[#00FF94]/10 border border-[#00FF94]/30' 
                            : 'bg-white/5 border border-white/10'}`}>
            <Clock className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isUnlocked ? 'text-[#00FF94]' : 'text-white/30'}`} />
            <span className={`text-[10px] sm:text-xs font-semibold font-['JetBrains_Mono'] whitespace-nowrap
                            ${isUnlocked ? 'text-[#00FF94]' : 'text-white/40'}`}>
              До эфира: {countdown}
            </span>
          </div>
        </div>

        {/* Описание */}
        <div className="space-y-2 mb-4 sm:mb-6">
          <p className={`text-sm sm:text-base md:text-lg font-bold font-['JetBrains_Mono'] 
                        tracking-tight sm:tracking-normal md:tracking-wide break-words leading-snug
                        ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
            Как создать платформу стоимостью 20 000$
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

        {isUnlocked && (
          <div className="p-3 sm:p-4 md:p-5 bg-[#00FF94]/10 border border-[#00FF94]/30 rounded-xl 
                         flex items-start gap-2 sm:gap-3">
             <div className="mt-0.5 text-base sm:text-lg text-[#00FF94] flex-shrink-0">✅</div>
             <p className="text-xs sm:text-sm md:text-base text-[#00FF94] font-['Manrope'] break-words 
                          leading-relaxed min-w-0 flex-1">
               Ссылка на эфир будет доступна вам в WhatsApp сообществе
             </p>
          </div>
        )}
      </div>
    </Card>
  );
}
