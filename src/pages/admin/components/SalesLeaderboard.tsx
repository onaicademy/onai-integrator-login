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
  onManagerSelect?: (managerId: string) => void;
}

export default function SalesLeaderboard({ currentManagerId, onManagerSelect }: SalesLeaderboardProps) {
  const [managers, setManagers] = useState<ManagerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        setLoading(true);
        const data = await api.get('/api/admin/tripwire/leaderboard');
        setManagers(data.managers || []);
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
          className="text-2xl font-bold text-white font-['Space_Grotesk'] uppercase tracking-wider"
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
                onClick={() => onManagerSelect?.(manager.manager_id)}
                className={`relative group cursor-pointer transition-all duration-300 ${
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
                <div className="relative bg-[rgba(10,10,10,0.9)] backdrop-blur-xl border-2 border-white/10 hover:border-[#00FF94]/60 rounded-2xl p-6 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    {/* Left: Position & Manager Info */}
                    <div className="flex items-center gap-6">
                      {/* Position Badge */}
                      <div className="relative">
                        <div
                          className="absolute inset-0 blur-xl opacity-50"
                          style={{ backgroundColor: medalColor }}
                        />
                        <div
                          className="relative w-16 h-16 rounded-full flex items-center justify-center border-4"
                          style={{ borderColor: medalColor, backgroundColor: 'rgba(0,0,0,0.5)' }}
                        >
                          <span
                            className="text-3xl font-bold font-['Space_Grotesk']"
                            style={{ color: medalColor }}
                          >
                            {index + 1}
                          </span>
                        </div>
                      </div>

                      {/* Manager Info */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-5 h-5 text-[#00FF94]" />
                          <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
                            {manager.manager_name}
                          </h3>
                          {isCurrentManager && (
                            <span className="px-2 py-1 bg-[#00FF94]/20 border border-[#00FF94]/30 rounded-full text-xs font-['JetBrains_Mono'] text-[#00FF94]">
                              ВЫ
                            </span>
                          )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase">
                              Всего продаж
                            </span>
                            <p className="text-lg font-bold text-white font-['Space_Grotesk']">
                              {manager.total_sales}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase">
                              Этот месяц
                            </span>
                            <p className="text-lg font-bold text-[#00FF94] font-['Space_Grotesk']">
                              {manager.this_month_sales}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Revenue */}
                    <div className="text-right">
                      <span className="text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase block mb-2">
                        Общая выручка
                      </span>
                      <p className="text-3xl font-bold text-white font-['Space_Grotesk'] mb-1">
                        {formatCurrency(manager.total_revenue)}
                      </p>
                      <span className="text-sm font-['JetBrains_Mono'] text-[#00FF94]">
                        {formatCurrency(manager.this_month_revenue)} / месяц
                      </span>
                    </div>
                  </div>

                  {/* Bottom bar - Performance indicators */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="font-['JetBrains_Mono'] text-gray-400">
                          Активных: {manager.active_users}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="font-['JetBrains_Mono'] text-gray-400">
                          Завершили: {manager.completed_users}
                        </span>
                      </div>
                    </div>

                    {onManagerSelect && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onManagerSelect(manager.manager_id);
                        }}
                        className="px-4 py-2 bg-[#00FF94]/10 hover:bg-[#00FF94]/20 border border-[#00FF94]/30 
                                 rounded-lg text-sm font-['JetBrains_Mono'] text-[#00FF94] transition-colors"
                      >
                        СМОТРЕТЬ УЧЕНИКОВ
                      </button>
                    )}
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


