import { Icon } from '@iconify/react';
import { Lock } from 'lucide-react';
import { TripwireAchievement } from '@/lib/tripwire-utils';

interface AchievementsProps {
  achievements: TripwireAchievement[];
}

const ACHIEVEMENT_CONFIG = [
  {
    id: 'module_1_completed',
    icon: 'solar:cup-star-bold-duotone',
    title: 'ПЕРВЫЙ ШАГ',
    description: 'Завершите первый модуль',
    color: '#00FF94',
    shadowColor: 'rgba(0, 255, 148, 0.6)',
    gradient: 'from-green-500/30 via-emerald-500/20 to-transparent',
  },
  {
    id: 'module_2_completed',
    icon: 'fluent:rocket-24-filled',
    title: 'НА ПУТИ К МАСТЕРСТВУ',
    description: 'Завершите второй модуль',
    color: '#3B82F6',
    shadowColor: 'rgba(59, 130, 246, 0.6)',
    gradient: 'from-blue-500/30 via-cyan-500/20 to-transparent',
  },
  {
    id: 'module_3_completed',
    icon: 'solar:bolt-circle-bold-duotone',
    title: 'ПОЧТИ У ЦЕЛИ',
    description: 'Завершите третий модуль',
    color: '#F59E0B',
    shadowColor: 'rgba(245, 158, 11, 0.6)',
    gradient: 'from-amber-500/30 via-orange-500/20 to-transparent',
  }
];

/**
 * 🏆 ACHIEVEMENTS - FINAL REDESIGN 3.0
 * - 3 в ряд
 * - Светлее фон (чтобы было видно текст)
 * - "Вкусный" визуал
 * - Полный перевод
 */
export default function Achievements({ achievements }: AchievementsProps) {
  // Вычисляем прогресс
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = ACHIEVEMENT_CONFIG.length; // Теперь 3

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white font-['Space_Grotesk']
                       uppercase tracking-wider mb-2"
              style={{ textShadow: '0 0 30px rgba(0, 255, 148, 0.4)' }}>
            ДОСТИЖЕНИЯ
          </h2>
          <p className="text-sm text-[#9CA3AF] font-['JetBrains_Mono'] uppercase">
            /// ВАША КОЛЛЕКЦИЯ НАГРАД
          </p>
        </div>

        <div className="text-right">
          <div className="text-4xl font-bold text-white font-['Space_Grotesk']">
            {unlockedCount}
            <span className="text-[#00FF94]">/{totalCount}</span>
          </div>
          <span className="text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase tracking-widest">
            ПОЛУЧЕНО
          </span>
        </div>
      </div>

      {/* Achievements Grid - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ACHIEVEMENT_CONFIG.map((config) => {
          const achievement = achievements.find(a => a.achievement_type === config.id);
          const isUnlocked = achievement?.unlocked || false;

          return (
            <div key={config.id} className="relative group h-full">
              {/* Outer glow - visible only when unlocked */}
              {isUnlocked && (
                <div 
                  className={`absolute -inset-4 bg-gradient-to-br ${config.gradient} rounded-3xl 
                            blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500`}
                />
              )}

              {/* Card container - Lighter background for readability */}
              <div className={`
                relative rounded-3xl overflow-hidden transition-all duration-500 h-full
                flex flex-col
                ${isUnlocked 
                  ? 'bg-[#1A1A1A]/80 border-2 border-white/10 hover:scale-105 hover:border-opacity-50' 
                  : 'bg-[#111]/60 border border-white/5'
                }
              `}
                   style={{
                     borderColor: isUnlocked ? config.color : undefined,
                     boxShadow: isUnlocked ? `0 0 30px ${config.shadowColor}` : 'none'
                   }}>
                
                {/* Image/Icon Area */}
                <div className="relative h-40 flex items-center justify-center bg-gradient-to-b from-white/5 to-transparent">
                   {/* Lock overlay */}
                   {!isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-10">
                        <Lock className="w-12 h-12 text-white/20" />
                      </div>
                   )}

                   <div className={`relative transition-transform duration-500 ${isUnlocked ? 'scale-110' : 'scale-90 grayscale opacity-50'}`}>
                      {isUnlocked && (
                        <div className="absolute inset-0 blur-xl opacity-50" style={{ backgroundColor: config.color }} />
                      )}
                      <Icon 
                        icon={config.icon} 
                        style={{ 
                          fontSize: '80px',
                          color: isUnlocked ? config.color : '#666',
                          filter: isUnlocked ? 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' : 'none'
                        }}
                      />
                   </div>
                </div>

                {/* Text Content Area - High Contrast */}
                <div className="p-6 pt-4 flex-1 flex flex-col text-center bg-white/[0.02]">
                  <h3 className={`text-xl font-bold font-['Space_Grotesk'] mb-2 uppercase leading-tight
                                ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
                    {config.title}
                  </h3>
                  <p className={`text-sm leading-relaxed font-['Manrope']
                                ${isUnlocked ? 'text-[#CCC]' : 'text-[#555]'}`}>
                    {config.description}
                  </p>
                  
                  {/* Unlocked Date */}
                  {isUnlocked && achievement.unlocked_at && (
                    <div className="mt-auto pt-4">
                      <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#00FF94]">
                        {new Date(achievement.unlocked_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  )}
                  
                  {!isUnlocked && (
                     <div className="mt-auto pt-4">
                        <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-white/20">
                           ЗАБЛОКИРОВАНО
                        </span>
                     </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
