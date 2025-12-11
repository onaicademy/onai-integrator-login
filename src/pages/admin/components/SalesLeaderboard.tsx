import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, User } from 'lucide-react';
import { Icon } from '@iconify/react';
import { api } from '@/utils/apiClient';

interface ManagerStats {
  manager_id: string;
  manager_name: string;
  total_sales: number;
  total_revenue: number;
  active_users: number;
  completed_users: number;
  this_month_sales: number;
  this_month_revenue: number;
}

interface SalesLeaderboardProps {
  currentManagerId?: string;
}

export default function SalesLeaderboard({ currentManagerId }: SalesLeaderboardProps) {
  const [managers, setManagers] = useState<ManagerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        setLoading(true);
        const data = await api.get('/api/admin/tripwire/leaderboard');
        // API возвращает массив напрямую, не обернутый в объект
        setManagers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ₸';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#00FF94] text-xl font-['JetBrains_Mono']">
          ЗАГРУЗКА РЕЙТИНГА...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-[#F59E0B]" />
        <h2
          className="text-xl md:text-2xl font-bold text-white font-['JetBrains_Mono'] uppercase tracking-wider break-words"
          style={{ textShadow: '0 0 20px rgba(0, 255, 148, 0.3)' }}
        >
          РЕЙТИНГ МЕНЕДЖЕРОВ
        </h2>
      </div>

      {managers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Нет данных по продажам</p>
        </div>
      ) : (
        <div className="space-y-4">
          {managers.map((manager, index) => {
            const isCurrentManager = manager.manager_id === currentManagerId;
            const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
            const medalColor = medalColors[index] || '#9CA3AF';

            return (
              <div
                key={manager.manager_id}
                className={`relative group transition-all duration-300 ${
                  isCurrentManager ? 'ring-2 ring-[#00FF94]' : ''
                }`}
              >
                {/* Glow effect */}
                <div
                  className={`absolute -inset-2 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl blur-2xl ${
                    index === 0
                      ? 'from-yellow-500/30 to-orange-500/20'
                      : index === 1
                      ? 'from-gray-400/30 to-gray-500/20'
                      : index === 2
                      ? 'from-orange-600/30 to-orange-700/20'
                      : 'from-blue-500/30 to-blue-600/20'
                  }`}
                />

                {/* Card */}
                <div className="relative bg-[rgba(10,10,10,0.9)] backdrop-blur-xl border-2 border-white/10 hover:border-[#00FF94]/60 rounded-2xl p-4 sm:p-6 transition-all duration-300">
                  {/* 🔥 MOBILE: Вертикальный layout на маленьких экранах */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
                    {/* Left: Position & Manager Info */}
                    <div className="flex items-center gap-4 sm:gap-6">
                      {/* Position Badge */}
                      <div className="relative flex-shrink-0">
                        <div
                          className="absolute inset-0 blur-xl opacity-50"
                          style={{ backgroundColor: medalColor }}
                        />
                        <div
                          className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-4"
                          style={{ borderColor: medalColor, backgroundColor: 'rgba(0,0,0,0.5)' }}
                        >
                          <span
                            className="text-2xl sm:text-3xl font-bold font-['JetBrains_Mono']"
                            style={{ color: medalColor }}
                          >
                            {index + 1}
                          </span>
                        </div>
                      </div>

                      {/* Manager Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#00FF94] flex-shrink-0" />
                          <h3 className="text-base sm:text-lg md:text-xl font-bold text-white font-['JetBrains_Mono'] truncate">
                            {manager.manager_name}
                          </h3>
                          {isCurrentManager && (
                            <span className="px-2 py-1 bg-[#00FF94]/20 border border-[#00FF94]/30 rounded-full text-xs font-['JetBrains_Mono'] text-[#00FF94]">
                              ВЫ
                            </span>
                          )}
                        </div>

                        {/* Stats Grid - Mobile: Компактный, Desktop: Полный */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                          <div>
                            <span className="text-[10px] sm:text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase block">
                              Всего продаж
                            </span>
                            <p className="text-sm sm:text-lg font-bold text-white font-['JetBrains_Mono']">
                              {manager.total_sales}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] sm:text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase block">
                              Этот месяц
                            </span>
                            <p className="text-sm sm:text-lg font-bold text-[#00FF94] font-['JetBrains_Mono']">
                              {manager.this_month_sales}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Revenue - Mobile: Полная ширина снизу, Desktop: Справа */}
                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-white/10 sm:border-none">
                      <span className="text-[10px] sm:text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase block mb-1 sm:mb-2">
                        Общая выручка
                      </span>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-['JetBrains_Mono'] mb-1 break-words">
                        {formatCurrency(manager.total_revenue)}
                      </p>
                      <span className="text-xs sm:text-sm font-['JetBrains_Mono'] text-[#00FF94]">
                        {formatCurrency(manager.this_month_revenue)} / месяц
                      </span>
                    </div>
                  </div>

                  {/* Bottom bar - Performance indicators */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="font-['JetBrains_Mono'] text-gray-400 whitespace-nowrap">
                          Активных: {manager.active_users}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        <span className="font-['JetBrains_Mono'] text-gray-400 whitespace-nowrap">
                          Завершили: {manager.completed_users}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


