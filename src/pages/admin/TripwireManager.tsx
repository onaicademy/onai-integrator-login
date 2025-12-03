import { useState, useEffect } from 'react';
import { Users, UserPlus, Activity, TrendingUp, Filter } from 'lucide-react';
import { Icon } from '@iconify/react';
import { startOfMonth } from 'date-fns';
import { OnAILogo } from '@/components/OnAILogo';
import { useAuth } from '@/hooks/useAuth';
import CreateUserForm from './components/CreateUserForm';
import UsersTable from './components/UsersTable';
import StatsCards from './components/StatsCards';
import ActivityLog from './components/ActivityLog';
import SalesLeaderboard from './components/SalesLeaderboard';
import SalesChart from './components/SalesChart';
import { SafeDateFilter } from '@/components/SafeDateFilter';
import { api } from '@/utils/apiClient';

interface Stats {
  total_users: number;
  active_users: number;
  completed_users: number;
  this_month: number;
  total_revenue: number;
  monthly_revenue: number;
}

export default function TripwireManager() {
  console.log('🚀 TripwireManager: Render started');
  
  const { user } = useAuth();
  console.log('👤 Auth User:', user, 'User ID:', user?.id);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string | undefined>(undefined);
  
  // 🎯 ARCHITECT APPROVED: Safe Date Filter (no react-day-picker)
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  
  const [stats, setStats] = useState<Stats>({
    total_users: 0,
    active_users: 0,
    completed_users: 0,
    this_month: 0,
    total_revenue: 0,
    monthly_revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Загрузка статистики
  useEffect(() => {
    async function loadStats() {
      try {
        const params = new URLSearchParams({
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        });
        
        const data = await api.get<Stats>(`/api/admin/tripwire/stats?${params}`);
        setStats(data);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [refreshTrigger, dateRange]);

  // Обработчик успешного создания пользователя
  const handleUserCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#030303] relative overflow-hidden">
      {/* Cyber Grid Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {[20, 40, 60, 80].map((top) => (
          <div
            key={top}
            className="absolute left-0 right-0 h-px"
            style={{
              top: `${top}%`,
              background:
                'linear-gradient(90deg, transparent, rgba(0, 255, 148, 0.3), transparent)',
            }}
          />
        ))}
      </div>

      {/* Radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at top right, rgba(0, 255, 148, 0.08) 0%, transparent 50%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <OnAILogo variant="full" className="h-12 w-auto text-white" />
              <div className="h-12 w-px bg-gradient-to-b from-transparent via-[#00FF94] to-transparent" />
            </div>
            
            {/* Title */}
            <div>
              <h1
                className="text-4xl lg:text-5xl font-bold text-white font-['Space_Grotesk'] 
                           uppercase tracking-wider mb-2"
                style={{ textShadow: '0 0 40px rgba(0, 255, 148, 0.5)' }}
              >
                SALES MANAGER
              </h1>
              <p className="text-[#9CA3AF] text-lg font-['JetBrains_Mono']">
                /// СИСТЕМА УПРАВЛЕНИЯ ПРОДАЖАМИ TRIPWIRE
              </p>
            </div>
          </div>

          {/* Create User Button */}
          <button
            onClick={() => setShowCreateForm(true)}
            className="group relative px-8 py-4 bg-gradient-to-r from-[#00FF94] to-[#00CC6A] 
                     hover:from-[#00CC6A] hover:to-[#00FF94]
                     text-black font-bold font-['JetBrains_Mono'] uppercase tracking-wider
                     rounded-xl transition-all duration-300 flex items-center gap-3
                     shadow-[0_0_40px_rgba(0,255,148,0.6)]"
          >
            <UserPlus className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span>ДОБАВИТЬ УЧЕНИКА</span>
          </button>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[#00FF94] text-xl font-['JetBrains_Mono']">
              ЗАГРУЗКА...
            </div>
          </div>
        ) : (
          <StatsCards stats={stats} />
        )}

        {/* Sales Leaderboard - Рейтинг менеджеров */}
        <div
          className="bg-[rgba(15,15,15,0.6)] backdrop-blur-xl border border-white/10 
                      rounded-3xl p-8 shadow-[0_0_60px_rgba(0,255,148,0.15)]"
        >
          <SalesLeaderboard
            currentManagerId={user?.id}
            onManagerSelect={(managerId) => setSelectedManagerId(managerId)}
          />
        </div>

        {/* Sales Chart - График продаж */}
        <div
          className="bg-[rgba(15,15,15,0.6)] backdrop-blur-xl border border-white/10 
                      rounded-3xl p-8 shadow-[0_0_60px_rgba(0,255,148,0.15)]"
        >
          <SalesChart managerId={selectedManagerId} period="custom" dateRange={dateRange} />
        </div>

        {/* Manager Filter (только для admin) */}
        {user?.user_metadata?.role === 'admin' && selectedManagerId && (
          <div className="flex items-center justify-between bg-[#00FF94]/10 border border-[#00FF94]/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-[#00FF94]" />
              <span className="text-white font-['JetBrains_Mono']">
                Показаны ученики выбранного менеджера
              </span>
            </div>
            <button
              onClick={() => setSelectedManagerId(undefined)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-['JetBrains_Mono'] text-white transition-colors"
            >
              ПОКАЗАТЬ ВСЕХ
            </button>
          </div>
        )}

        {/* Users Table */}
        <div
          className="bg-[rgba(15,15,15,0.6)] backdrop-blur-xl border border-white/10 
                      rounded-3xl p-8 shadow-[0_0_60px_rgba(0,255,148,0.15)]"
        >
          <UsersTable refreshTrigger={refreshTrigger} managerId={selectedManagerId} dateRange={dateRange} />
        </div>

        {/* Activity Log */}
        <div
          className="bg-[rgba(15,15,15,0.6)] backdrop-blur-xl border border-white/10 
                      rounded-3xl p-8 shadow-[0_0_60px_rgba(0,255,148,0.15)]"
        >
          <ActivityLog refreshTrigger={refreshTrigger} dateRange={dateRange} />
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <CreateUserForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleUserCreated}
        />
      )}
    </div>
  );
}

