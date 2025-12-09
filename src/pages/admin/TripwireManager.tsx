import { useState, useEffect } from 'react';
import { Users, UserPlus, Activity, TrendingUp, Filter } from 'lucide-react';
import { Icon } from '@iconify/react';
import { startOfMonth } from 'date-fns';
import { OnAILogo } from '@/components/OnAILogo';
import { tripwireSupabase } from '@/lib/supabase-tripwire'; // 🔥 TRIPWIRE AUTH!
import CreateUserForm from './components/CreateUserForm';
import UsersTable from './components/UsersTable';
import StatsCards from './components/StatsCards';
import ActivityLog from './components/ActivityLog';
import SalesLeaderboard from './components/SalesLeaderboard';
import SalesChart from './components/SalesChart';
import { SafeDateFilter } from '@/components/SafeDateFilter';
import { api } from '@/utils/apiClient';

interface Stats {
  total_students: number; // 🔥 FIX: Changed from total_users
  active_students: number; // 🔥 FIX: Changed from active_users
  completed_students: number;
  students_this_month: number; // 🔥 FIX: Changed from this_month
  total_revenue: string | number; // 🔥 FIX: Can be string from RPC
  revenue_this_month: string | number; // 🔥 FIX: Changed from monthly_revenue
}

interface MyStats {
  totalSales: number;       // 🔥 BACKEND returns totalSales, not total_students!
  activeUsers: number;      // 🔥 activeUsers, not active_students!
  thisMonthSales: number;   // 🔥 thisMonthSales
  totalRevenue: number;     // 🔥 totalRevenue
  userId?: string;          // 🔥 Debug field
}

export default function TripwireManager() {
  console.log('🚀 TripwireManager: Render started');
  
  // 🔥 TRIPWIRE AUTH: Get user from Tripwire Supabase session
  const [tripwireUser, setTripwireUser] = useState<any>(null);
  const [isUserLoading, setIsUserLoading] = useState(true); // 🔥 FIX: Track loading state
  
  useEffect(() => {
    tripwireSupabase.auth.getSession().then(({ data: { session } }) => {
      setTripwireUser(session?.user || null);
      setIsUserLoading(false); // 🔥 FIX: Mark as loaded
      console.log('✅ Tripwire User Loaded:', session?.user?.email, 'User ID:', session?.user?.id);
    });
  }, []);
  
  console.log('👤 Current Tripwire User State:', tripwireUser?.email, 'User ID:', tripwireUser?.id, 'Loading:', isUserLoading);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string | undefined>(undefined);
  
  // 🎯 ARCHITECT APPROVED: Safe Date Filter (no react-day-picker)
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // +1 день вперед чтобы включить сегодня
  });
  
  const [stats, setStats] = useState<Stats>({
    total_students: 0, // 🔥 FIX: Changed from total_users
    active_students: 0, // 🔥 FIX: Changed from active_users
    completed_students: 0,
    students_this_month: 0, // 🔥 FIX: Changed from this_month
    total_revenue: "0",
    revenue_this_month: "0", // 🔥 FIX: Changed from monthly_revenue
  });
  
  // 🎯 МОИ ПРОДАЖИ - личная статистика менеджера
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [myStatsLoading, setMyStatsLoading] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Загрузка общей статистики
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

  // 🎯 Загрузка МОИХ продаж (только для текущего менеджера)
  useEffect(() => {
    async function loadMyStats() {
      if (!tripwireUser?.id) return;
      
      try {
        const data = await api.get<MyStats>('/api/admin/tripwire/my-stats');
        setMyStats(data);
      } catch (error) {
        console.error('Error loading my stats:', error);
      } finally {
        setMyStatsLoading(false);
      }
    }

    loadMyStats();
  }, [refreshTrigger, tripwireUser?.id]);

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
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
            {/* Logo - скрыт на мобильных */}
            <div className="hidden sm:flex items-center gap-3">
              <OnAILogo variant="full" className="h-10 sm:h-12 w-auto text-white" />
              <div className="h-10 sm:h-12 w-px bg-gradient-to-b from-transparent via-[#00FF94] to-transparent" />
            </div>
            
            {/* Title */}
            <div className="w-full sm:w-auto">
              <h1
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white font-['JetBrains_Mono'] 
                           uppercase tracking-wider mb-2 break-words leading-tight"
              >
                SALES MANAGER
              </h1>
              <p className="text-[#9CA3AF] text-sm sm:text-base lg:text-lg font-['JetBrains_Mono'] break-words">
                /// СИСТЕМА УПРАВЛЕНИЯ
                <span className="hidden sm:inline"> ПРОДАЖАМИ TRIPWIRE</span>
              </p>
            </div>
          </div>

          {/* Create User Button */}
          <button
            onClick={() => setShowCreateForm(true)}
            className="group relative w-full lg:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#00FF94] to-[#00CC6A] 
                     hover:from-[#00CC6A] hover:to-[#00FF94]
                     text-black font-bold font-['JetBrains_Mono'] uppercase tracking-wider text-sm sm:text-base
                     rounded-xl transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3"
          >
            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform flex-shrink-0" />
            <span className="whitespace-nowrap">ДОБАВИТЬ УЧЕНИКА</span>
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
                      rounded-3xl p-8"
        >
          <SalesLeaderboard
            currentManagerId={tripwireUser?.id}
          />
        </div>

        {/* Date Filter */}
        <div className="flex justify-center">
          <SafeDateFilter value={dateRange} onChange={setDateRange} />
        </div>

        {/* Sales Chart - График продаж */}
        <div
          className="bg-[rgba(15,15,15,0.6)] backdrop-blur-xl border border-white/10 
                      rounded-3xl p-8"
        >
          <SalesChart managerId={selectedManagerId} period="custom" dateRange={dateRange} />
        </div>

        {/* Manager Filter (только для admin) */}
        {tripwireUser?.user_metadata?.role === 'admin' && selectedManagerId && (
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
                      rounded-3xl p-8"
        >
          <UsersTable refreshTrigger={refreshTrigger} managerId={selectedManagerId} dateRange={dateRange} />
        </div>

        {/* Activity Log */}
        <div
          className="bg-[rgba(15,15,15,0.6)] backdrop-blur-xl border border-white/10 
                      rounded-3xl p-8"
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

