import { Users, UserCheck, Trophy, TrendingUp } from 'lucide-react';
import { Icon } from '@iconify/react';

interface Stats {
  total_students: number; // 🔥 FIX: Changed from total_users
  active_students: number; // 🔥 FIX: Changed from active_users
  completed_students: number;
  course_completed_students?: number; // 🎓 Количество завершивших курс (modules_completed >= 3)
  students_this_month: number; // 🔥 FIX: Changed from this_month
  total_revenue?: string | number; // 🔥 FIX: Can be string from RPC
  revenue_this_month?: string | number; // 🔥 FIX: Changed from monthly_revenue
}

interface StatsCardsProps {
  stats: Stats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  // Форматирование суммы в тенге
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ₸';
  };

  const cards = [
    {
      title: 'ВСЕГО ПРОДАЖ',
      value: stats.total_students, // 🔥 FIX: Changed from total_users
      subtitle: stats.total_revenue ? formatCurrency(Number(stats.total_revenue)) : '0 ₸',
      icon: Users,
      iconifyIcon: 'solar:users-group-rounded-bold-duotone',
      color: '#00FF94',
      gradient: 'from-green-500/30 to-emerald-500/20',
    },
    {
      title: 'АКТИВНЫХ',
      value: stats.active_students, // 🔥 FIX: Changed from active_users
      icon: UserCheck,
      iconifyIcon: 'solar:user-check-rounded-bold-duotone',
      color: '#3B82F6',
      gradient: 'from-blue-500/30 to-cyan-500/20',
    },
    {
      title: 'ЗАВЕРШИЛИ КУРС',
      value: stats.course_completed_students || 0, // 🎓 Показываем тех, кто прошел все 3 модуля
      icon: Trophy,
      iconifyIcon: 'solar:cup-star-bold-duotone',
      color: '#F59E0B',
      gradient: 'from-amber-500/30 to-orange-500/20',
    },
    {
      title: 'ЭТОТ МЕСЯЦ',
      value: stats.students_this_month, // 🔥 FIX: Changed from this_month
      subtitle: stats.revenue_this_month ? formatCurrency(Number(stats.revenue_this_month)) : '0 ₸',
      icon: TrendingUp,
      iconifyIcon: 'solar:graph-up-bold-duotone',
      color: '#8B5CF6',
      gradient: 'from-purple-500/30 to-pink-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, idx) => (
        <div key={idx} className="relative group">
          {/* Glow effect */}
          <div
            className={`absolute -inset-2 bg-gradient-to-br ${card.gradient} rounded-2xl blur-2xl 
                        opacity-0 group-hover:opacity-100 transition-all duration-500`}
          />

          {/* Card */}
          <div
            className="relative bg-[rgba(10,10,10,0.9)] backdrop-blur-xl border-2 border-white/10 
                        rounded-2xl p-6 hover:border-[#00FF94]/60 transition-all duration-300
                        shadow-[0_0_40px_rgba(0,255,148,0.015)]"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase tracking-wider block mb-2">
                  /// {card.title}
                </span>
                <p className="text-4xl font-bold text-white font-['JetBrains_Mono']">
                  {card.value}
                </p>
                {(card as any).subtitle && (
                  <p className="text-sm font-['JetBrains_Mono'] text-[#00FF94] mt-2">
                    {(card as any).subtitle}
                  </p>
                )}
              </div>

              <div className="relative">
                <div
                  className="absolute inset-0 blur-xl opacity-50"
                  style={{ backgroundColor: card.color }}
                />
                <div
                  className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-white/5 to-white/0
                              flex items-center justify-center border border-white/10"
                >
                  <Icon icon={card.iconifyIcon} style={{ fontSize: '32px', color: card.color }} />
                </div>
              </div>
            </div>

            {/* Bottom accent */}
            <div
              className="h-1 bg-gradient-to-r rounded-full"
              style={{
                backgroundImage: `linear-gradient(90deg, ${card.color}, transparent)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}


