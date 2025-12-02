import { Card } from '@/components/ui/card';
import { getStreamTime } from '@/lib/tripwire-utils';
import { motion } from 'framer-motion';
import { Lock, Radio } from 'lucide-react';
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
  const isUnlocked = modulesCompleted >= 3;

  // Обновляем время каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      setStreamTime(getStreamTime());
    }, 60000); // каждую минуту

    return () => clearInterval(interval);
  }, []);

  return (
    <Card 
      className={`
        p-4 sm:p-6 md:p-8 rounded-3xl border transition-all duration-300 relative overflow-hidden
        ${isUnlocked 
          ? 'bg-[rgba(255,51,102,0.1)] border-[#FF3366]/50' 
          : 'bg-[#0A0A0A]/90 border-white/10'
        }
      `}
    >
      {/* Анимированный фон для разблокированного */}
      {isUnlocked && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FF3366]/10 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      )}

      <div className="relative z-10">
        {/* Заголовок с LIVE иконкой */}
        <div className="flex items-start gap-3 sm:gap-4 mb-4">
          {isUnlocked ? (
            <div className="relative flex-shrink-0 mt-1">
               <div className="absolute inset-0 bg-[#FF3366] blur-lg opacity-50 animate-pulse" />
               <Radio className="w-6 h-6 sm:w-8 sm:h-8 text-[#FF3366] animate-pulse relative z-10" />
            </div>
          ) : (
            <Radio className="w-6 h-6 sm:w-8 sm:h-8 text-white/20 flex-shrink-0 mt-1" />
          )}
          
          <h2 
            className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold uppercase 
                       tracking-wider font-['Space_Grotesk'] break-words leading-tight
                       ${isUnlocked ? 'text-[#FF3366]' : 'text-white/40'}`}
          >
            ЗАКЛЮЧИТЕЛЬНЫЙ ПРЯМОЙ ЭФИР
          </h2>
        </div>

        {/* Подзаголовок */}
        <p className={`text-base sm:text-lg mb-4 sm:mb-6 font-['Manrope'] break-words 
                      ${isUnlocked ? 'text-white/80' : 'text-white/40'}`}>
          С основателями академии
        </p>

        {/* Время эфира */}
        {isUnlocked && (
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#FF3366]/20 
                         border border-[#FF3366]/40 rounded-full mb-4 sm:mb-6">
            <span className="text-xs sm:text-sm font-bold text-[#FF3366] font-['JetBrains_Mono']">
              {streamTime}
            </span>
          </div>
        )}

        {/* Описание */}
        <div className="space-y-2 mb-4 sm:mb-6">
          <p className={`text-base sm:text-lg font-bold font-['JetBrains_Mono'] 
                        tracking-wide break-words leading-snug
                        ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
            Как создать платформу стоимостью 10 000$
          </p>
          <p className={`text-xs sm:text-sm font-['Manrope'] uppercase tracking-wider break-words 
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
          <div className="p-3 sm:p-4 bg-[#00FF94]/10 border border-[#00FF94]/30 rounded-xl 
                         flex items-start gap-2 sm:gap-3">
             <div className="mt-0.5 text-[#00FF94] flex-shrink-0">✅</div>
             <p className="text-xs sm:text-sm text-[#00FF94] font-['Manrope'] break-words 
                          leading-relaxed min-w-0 flex-1">
               Вы получите ссылку на эфир после завершения всех модулей
             </p>
          </div>
        )}
      </div>
    </Card>
  );
}
