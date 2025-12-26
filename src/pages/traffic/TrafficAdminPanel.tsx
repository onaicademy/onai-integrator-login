/**
 * Traffic Admin Panel - Full Dashboard
 * 
 * Comprehensive admin interface for managing:
 * - Dashboard with stats overview
 * - User management with email sending
 * - Team management
 * - AI settings
 * - Security overview
 * - Sales sources status
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrafficCabinetLayout } from '@/components/traffic/TrafficCabinetLayout';
import { AttributionPanel } from '@/components/traffic/AttributionPanel';
import {
  Settings, Users, Sparkles, Loader2, CheckCircle, AlertCircle, RefreshCw,
  BarChart3, Shield, PieChart, Building2, TrendingUp, UserCheck, UserX,
  Mail, Send, Calendar, Clock, Target, Activity, GitBranch
} from 'lucide-react';
import toast from 'react-hot-toast';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';

// Helper for domain-aware paths
const getPath = (path: string) => {
  const isProduction = window.location.hostname === 'traffic.onai.academy' || window.location.hostname.startsWith('traffic.');
  return isProduction ? path : `/traffic${path}`;
};

export default function TrafficAdminPanel() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'attribution' | 'settings' | 'generate'>('dashboard');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Check admin role - verify from backend API to avoid stale localStorage
  useEffect(() => {
    const verifyAdminAccess = async () => {
      const token = localStorage.getItem('traffic_token');
      if (!token) {
        navigate(getPath('/login'));
        return;
      }

      try {
        // Verify role from backend API
        const response = await axios.get(`${API_URL}/api/traffic-auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const user = response.data.user;

        // Update localStorage with latest user data
        localStorage.setItem('traffic_user', JSON.stringify(user));

        // Check if admin
        if (user.role !== 'admin') {
          toast.error('Доступ запрещен: требуется роль администратора');
          navigate(getPath(`/cabinet/${user.team?.toLowerCase()}`));
        }
      } catch (error: any) {
        console.error('Failed to verify admin access:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          toast.error('Сессия истекла, войдите снова');
          localStorage.removeItem('traffic_token');
          localStorage.removeItem('traffic_user');
          navigate(getPath('/login'));
        }
      }
    };

    verifyAdminAccess();
  }, [navigate]);
  
  return (
    <TrafficCabinetLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Админ Панель</h1>
          <p className="text-gray-400">Управление системой Traffic Dashboard • Администратор: Александр</p>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#00FF88]/10 overflow-x-auto pb-1">
          <TabButton
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={<BarChart3 className="w-4 h-4" />}
            label="Дашборд"
          />
          <TabButton
            active={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            icon={<Users className="w-4 h-4" />}
            label="Пользователи"
          />
          <TabButton
            active={activeTab === 'attribution'}
            onClick={() => setActiveTab('attribution')}
            icon={<GitBranch className="w-4 h-4" />}
            label="Атрибуция"
          />
          <TabButton
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={<Settings className="w-4 h-4" />}
            label="Настройки AI"
          />
          <TabButton
            active={activeTab === 'generate'}
            onClick={() => setActiveTab('generate')}
            icon={<Sparkles className="w-4 h-4" />}
            label="Генерация планов"
          />
        </div>
        
        {/* Content */}
        {activeTab === 'dashboard' && <DashboardPanel />}
        {activeTab === 'users' && <UsersPanel />}
        {activeTab === 'attribution' && <AttributionPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
        {activeTab === 'generate' && <GeneratePanel />}
      </div>
    </TrafficCabinetLayout>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-3 transition-all whitespace-nowrap
        ${active 
          ? 'text-[#00FF88] border-b-2 border-[#00FF88]' 
          : 'text-gray-400 hover:text-white'
        }
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

// =====================
// DASHBOARD PANEL
// =====================
function DashboardPanel() {
  const token = localStorage.getItem('traffic_token');
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/traffic-admin/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.stats;
    }
  });
  
  if (isLoading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 text-[#00FF88] animate-spin mx-auto" /></div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<Users className="w-6 h-6" />}
          label="Пользователей"
          value={stats?.users?.total || 0}
          subtitle={`${stats?.users?.active || 0} активных`}
          color="green"
        />
        <StatCard 
          icon={<Building2 className="w-6 h-6" />}
          label="Команд"
          value={stats?.teams?.total || 0}
          subtitle="Таргетологов"
          color="blue"
        />
        <StatCard 
          icon={<Calendar className="w-6 h-6" />}
          label="Планов"
          value={stats?.plans?.total || 0}
          subtitle={`${stats?.plans?.inProgress || 0} в работе`}
          color="purple"
        />
        <StatCard 
          icon={<CheckCircle className="w-6 h-6" />}
          label="Выполнено"
          value={stats?.plans?.completed || 0}
          subtitle={`${stats?.plans?.averageCompletion || 0}% средний`}
          color="emerald"
        />
      </div>
      
      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStatCard 
          icon={<Target className="w-4 h-4" />}
          label="Таргетологов"
          value={stats?.users?.targetologists || 0}
          color="purple"
        />
        <MiniStatCard 
          icon={<Shield className="w-4 h-4" />}
          label="Админов"
          value={stats?.users?.admins || 0}
          color="orange"
        />
        <MiniStatCard 
          icon={<Activity className="w-4 h-4" />}
          label="В работе"
          value={stats?.plans?.inProgress || 0}
          color="yellow"
        />
        <MiniStatCard 
          icon={<Settings className="w-4 h-4" />}
          label="Настроек"
          value={stats?.settings?.total || 0}
          color="gray"
        />
      </div>
      
      {/* Quick Actions */}
      <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Быстрые действия</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            icon={<Building2 className="w-6 h-6" />}
            title="Конструктор команд"
            description="Управление командами и пользователями"
            href={getPath('/admin/team-constructor')}
          />
          <QuickActionCard
            icon={<Shield className="w-6 h-6" />}
            title="Безопасность"
            description="Логи входов и IP-адреса"
            href={getPath('/admin/security')}
          />
          <QuickActionCard
            icon={<PieChart className="w-6 h-6" />}
            title="Источники продаж"
            description="UTM аналитика и статистика"
            href={getPath('/admin/utm-sources')}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtitle, color }: any) {
  const colorClasses: Record<string, string> = {
    green: 'bg-[#00FF88]/10 border-[#00FF88]/20 text-[#00FF88]',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  };
  
  return (
    <div className={`p-5 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-1">{icon}</div>
        <div className="flex-1">
          <p className="text-xs opacity-70 mb-1">{label}</p>
          <p className="text-3xl font-bold mb-0.5">{value}</p>
          {subtitle && <p className="text-xs opacity-60">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function MiniStatCard({ icon, label, value, color }: any) {
  const colorClasses: Record<string, string> = {
    green: 'text-[#00FF88]',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    yellow: 'text-yellow-400',
    gray: 'text-gray-400',
  };
  
  return (
    <div className="p-3 bg-black/40 border border-[#00FF88]/10 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <div className={colorClasses[color]}>{icon}</div>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
      <p className={`text-xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

function QuickActionCard({ icon, title, description, href }: any) {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate(href)}
      className="p-4 bg-black/30 border border-[#00FF88]/10 rounded-xl text-left hover:bg-black/50 hover:border-[#00FF88]/30 transition-all group"
    >
      <div className="text-[#00FF88] mb-3 group-hover:scale-110 transition-transform">{icon}</div>
      <h4 className="font-bold text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </button>
  );
}

// =====================
// USERS PANEL
// =====================
function UsersPanel() {
  const token = localStorage.getItem('traffic_token');
  const queryClient = useQueryClient();
  
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/traffic-admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.users;
    }
  });
  
  const resendCredentialsMutation = useMutation({
    mutationFn: async ({ userId, email }: { userId: string; email: string }) => {
      const newPassword = prompt(`Введите новый пароль для ${email} (или оставьте пустым для автогенерации):`, '');
      if (newPassword === null) throw new Error('Отменено');
      
      const response = await axios.post(
        `${API_URL}/api/traffic-constructor/users/${userId}/send-credentials`,
        { newPassword: newPassword || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.emailSent) {
        toast.success('✉️ Данные доступа отправлены!');
      } else {
        toast.error('Пароль обновлен, но email не отправлен');
      }
    },
    onError: (error: any) => {
      if (error.message !== 'Отменено') {
        toast.error('Ошибка отправки');
      }
    }
  });
  
  if (isLoading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 text-[#00FF88] animate-spin mx-auto" /></div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Пользователи системы ({usersData?.length || 0})</h2>
        <Button
          onClick={() => window.location.href = getPath('/admin/team-constructor')}
          className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black"
        >
          Добавить пользователя
        </Button>
      </div>
      
      <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/60">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Статус</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Имя</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Команда</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Роль</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Последний вход</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#00FF88]/10">
              {usersData?.map((user: any) => (
                <tr key={user.id} className="hover:bg-black/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-[#00FF88]' : 'bg-gray-500'}`} />
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{user.full_name}</td>
                  <td className="px-4 py-3 text-gray-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-[#00FF88]/10 text-[#00FF88] rounded text-sm">
                      {user.team_name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      user.role === 'admin' 
                        ? 'bg-purple-500/20 text-purple-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {user.role === 'admin' ? 'Админ' : 'Таргетолог'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {user.last_login_at 
                      ? new Date(user.last_login_at).toLocaleDateString('ru-RU')
                      : 'Не входил'
                    }
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      onClick={() => resendCredentialsMutation.mutate({ userId: user.id, email: user.email })}
                      variant="outline"
                      size="sm"
                      disabled={resendCredentialsMutation.isPending}
                      className="border-[#00FF88]/20 text-[#00FF88] hover:bg-[#00FF88]/10"
                      title="Отправить данные доступа"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =====================
// SETTINGS PANEL
// =====================
function SettingsPanel() {
  const token = localStorage.getItem('traffic_token');
  
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/traffic-admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.settings;
    }
  });
  
  const [growthPercentage, setGrowthPercentage] = useState('10.0');
  const [minRoas, setMinRoas] = useState('1.5');
  const [maxCpa, setMaxCpa] = useState('60.0');
  
  const updateMutation = useMutation({
    mutationFn: async (data: { key: string; value: any }) => {
      await axios.put(
        `${API_URL}/api/traffic-admin/settings/${data.key}`,
        { value: data.value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      toast.success('Настройка обновлена');
    },
    onError: () => {
      toast.error('Ошибка обновления');
    }
  });
  
  if (isLoading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 text-[#00FF88] animate-spin mx-auto" /></div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Настройки Groq AI</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Процент роста (%)
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.1"
                value={growthPercentage}
                onChange={(e) => setGrowthPercentage(e.target.value)}
                className="bg-black/50 border-[#00FF88]/20 text-white"
              />
              <Button
                onClick={() => updateMutation.mutate({ 
                  key: 'ai_growth_percentage', 
                  value: growthPercentage 
                })}
                className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black"
              >
                Сохранить
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Целевой % роста для еженедельных планов</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Минимальный ROAS
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.1"
                value={minRoas}
                onChange={(e) => setMinRoas(e.target.value)}
                className="bg-black/50 border-[#00FF88]/20 text-white"
              />
              <Button
                onClick={() => updateMutation.mutate({ 
                  key: 'min_roas_target', 
                  value: minRoas 
                })}
                className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black"
              >
                Сохранить
              </Button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Максимальный CPA ($)
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="1"
                value={maxCpa}
                onChange={(e) => setMaxCpa(e.target.value)}
                className="bg-black/50 border-[#00FF88]/20 text-white"
              />
              <Button
                onClick={() => updateMutation.mutate({ 
                  key: 'max_cpa_target', 
                  value: maxCpa 
                })}
                className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black"
              >
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {settingsData && settingsData.length > 0 && (
        <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Все настройки</h3>
          <div className="space-y-2">
            {settingsData.map((setting: any) => (
              <div key={setting.id} className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                <div>
                  <p className="text-white font-medium">{setting.setting_key}</p>
                  <p className="text-xs text-gray-400">{setting.description}</p>
                </div>
                <span className="text-[#00FF88] font-mono text-sm">
                  {String(setting.setting_value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================
// GENERATE PANEL
// =====================
function GeneratePanel() {
  const token = localStorage.getItem('traffic_token');
  const [results, setResults] = useState<any>(null);
  
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${API_URL}/api/traffic-admin/generate-all-plans`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setResults(data);
      toast.success(`Создано ${data.summary.successful} из ${data.summary.total} планов`);
    },
    onError: () => {
      toast.error('Ошибка генерации планов');
    }
  });
  
  return (
    <div className="space-y-6">
      <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Генерация планов для всех команд</h2>
        <p className="text-gray-400 mb-6">
          Создание еженедельных планов с использованием Groq AI для всех 4 команд
        </p>
        
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold px-8 py-6 text-lg"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Генерация...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Создать планы для всех
            </>
          )}
        </Button>
      </div>
      
      {results && (
        <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Результаты генерации</h3>
          
          <div className="space-y-3">
            {results.results.map((result: any) => (
              <div 
                key={result.team}
                className={`flex items-center gap-3 p-4 rounded-lg ${
                  result.success 
                    ? 'bg-[#00FF88]/10 border border-[#00FF88]/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-[#00FF88]" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                <div className="flex-1">
                  <p className="font-bold text-white">{result.team}</p>
                  {result.success ? (
                    <p className="text-sm text-gray-400">
                      План создан: Week {result.plan.week_number}
                    </p>
                  ) : (
                    <p className="text-sm text-red-400">{result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

