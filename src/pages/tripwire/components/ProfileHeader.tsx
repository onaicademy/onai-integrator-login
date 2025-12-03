import { TripwireUserProfile } from '@/lib/tripwire-utils';
import { TrendingUp } from 'lucide-react';

interface ProfileHeaderProps {
  profile: TripwireUserProfile;
}

/**
 * 👤 PROFILE HEADER - AVATAR REMOVED & OPTIMIZED
 * - Удален блок с аватаром полностью
 * - Адаптирован layout (убрана зависимость от gap-8 с аватаром)
 * - Центрирование контента на мобильных, выравнивание влево на desktop
 */
export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  // Clean name and get initial
  const cleanName = (profile.full_name || 'ПОЛЬЗОВАТЕЛЬ').replace(/\[CEO\]/g, '').trim();
  
  return (
    <div className="relative">
      {/* Cyber Grid Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 rounded-3xl">
        {[20, 40, 60, 80].map((top) => (
          <div
            key={top}
            className="absolute left-0 right-0 h-px"
            style={{
              top: `${top}%`,
              background: 'linear-gradient(90deg, transparent, rgba(0, 255, 148, 0.3), transparent)'
            }}
          />
        ))}
      </div>

      <div className="relative w-full">
        {/* Info Section - Now Full Width */}
        <div className="flex flex-col lg:flex-row items-start justify-between gap-8 w-full">
          {/* Name & Email Block */}
          <div className="space-y-3 flex-1">
            <h1 className="text-4xl lg:text-6xl font-bold text-white font-['Space_Grotesk'] 
                         uppercase tracking-wider leading-tight"
                style={{ 
                  textShadow: '0 0 40px rgba(0, 255, 148, 0.5), 0 0 80px rgba(0, 255, 148, 0.2)' 
                }}>
              {cleanName}
              <span className="block text-2xl lg:text-3xl text-[#00FF94] mt-2 font-['JetBrains_Mono'] tracking-wider">
                ДИРЕКТОР
              </span>
            </h1>
            
            <div className="flex flex-col gap-2">
              <p className="text-[#9CA3AF] text-lg lg:text-xl font-['Manrope']">{profile.email}</p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-['JetBrains_Mono'] text-[#00FF94] uppercase tracking-widest">
                    /// ID ПОЛЬЗОВАТЕЛЯ: {profile.user_id.slice(0, 8).toUpperCase()}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(profile.user_id);
                      // Simple toast feedback
                      const toast = document.createElement('div');
                      toast.textContent = '✅ ID скопирован';
                      toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #00FF94; color: #000; padding: 12px 20px; border-radius: 8px; font-family: JetBrains Mono; font-weight: bold; z-index: 9999; animation: slideIn 0.3s ease-out;';
                      document.body.appendChild(toast);
                      setTimeout(() => {
                        toast.style.animation = 'slideOut 0.3s ease-in';
                        setTimeout(() => document.body.removeChild(toast), 300);
                      }, 2000);
                    }}
                    className="p-1.5 rounded-md bg-[#00FF94]/10 border border-[#00FF94]/30 hover:bg-[#00FF94]/20 transition-all duration-200 group"
                    title="Скопировать полный ID"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="text-[#00FF94] group-hover:scale-110 transition-transform"
                    >
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                    </svg>
                  </button>
                </div>
                <span className="text-xs text-gray-500 font-['JetBrains_Mono'] uppercase tracking-wider">
                  В СИСТЕМЕ С {new Date(profile.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Card - Adjusted width for better balance without avatar */}
          <div className="w-full lg:w-auto lg:min-w-[450px]">
            <div className="relative group">
              {/* Animated glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#00FF94]/30 to-transparent 
                            rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              
              <div className="relative bg-[rgba(10,10,10,0.9)] backdrop-blur-2xl border-2 border-[#00FF94]/40 
                            rounded-2xl p-6 lg:p-8 hover:border-[#00FF94] transition-all duration-300
                            shadow-[0_0_40px_rgba(0,255,148,0.3)]">
                <div className="flex items-start gap-4 mb-4">
                  {/* Icon container */}
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-[#00FF94] blur-xl opacity-50 animate-pulse" />
                    <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-gradient-to-br 
                                  from-[#00FF94]/20 to-[#00FF94]/5 
                                  flex items-center justify-center border border-[#00FF94]/30">
                      <TrendingUp className="w-8 h-8 lg:w-10 lg:h-10 text-[#00FF94]" strokeWidth={2.5} />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase tracking-widest block mb-2">
                      /// ОБЩИЙ ПРОГРЕСС
                    </span>
                    <p className="text-5xl lg:text-6xl font-bold text-white font-['JetBrains_Mono'] leading-none">
                      {Math.round(profile.completion_percentage)}%
                    </p>
                  </div>
                </div>
                
                {/* Enhanced progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#9CA3AF] font-['JetBrains_Mono']">
                      {profile.modules_completed}/{profile.total_modules} МОДУЛЕЙ
                    </span>
                    <span className="text-[#00FF94] font-bold font-['JetBrains_Mono']">
                      {profile.modules_completed === profile.total_modules ? 'ЗАВЕРШЕНО' : 'В ПРОЦЕССЕ'}
                    </span>
                  </div>
                  
                  <div className="relative w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                    <div 
                      className="h-full bg-gradient-to-r from-[#00FF94] via-[#00DD7A] to-[#00CC6A] rounded-full 
                               transition-all duration-700 ease-out relative overflow-hidden"
                      style={{ 
                        width: `${profile.completion_percentage}%`,
                      }}
                    >
                      {/* Animated shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent 
                                    animate-[shine_2s_ease-in-out_infinite]" 
                           style={{ 
                             animation: 'shine 2s ease-in-out infinite',
                             backgroundSize: '200% 100%'
                           }} />
                    </div>
                    
                    {/* Glow effect */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-[#00FF94]/50 to-[#00CC6A]/50 blur-md"
                      style={{ 
                        width: `${profile.completion_percentage}%`,
                        opacity: 0.6
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Corner accents */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-l-2 border-t-2 border-[#00FF94]/60" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-2 border-b-2 border-[#00FF94]/60" />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}
