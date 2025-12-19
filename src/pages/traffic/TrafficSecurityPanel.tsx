/**
 * Traffic Security Panel
 * 
 * Панель безопасности для админа:
 * - История входов всех пользователей
 * - IP адреса, устройства, браузеры
 * - Подозрительная активность (частая смена IP)
 * - Детальный анализ по каждому пользователю
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { TrafficCabinetLayout } from '@/components/traffic/TrafficCabinetLayout';
import { 
  Shield, AlertTriangle, Users, Activity, Globe, Monitor, 
  Smartphone, Tablet, ChevronDown, ChevronUp, Calendar,
  Search, Filter, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';

interface Session {
  id: string;
  email: string;
  team_name: string;
  role: string;
  ip_address: string;
  user_agent: string;
  device_type: string;
  browser_name: string;
  browser_version: string;
  os_name: string;
  os_version: string;
  device_fingerprint: string;
  login_at: string;
  is_suspicious: boolean;
  suspicious_reason?: string;
}

interface SuspiciousUser {
  email: string;
  team_name: string;
  unique_ips: number;
  unique_devices: number;
  total_logins: number;
  last_login: string;
  all_ips: string;
}

export default function TrafficSecurityPanel() {
  const [activeTab, setActiveTab] = useState<'sessions' | 'suspicious' | 'users'>('suspicious');
  const [days, setDays] = useState(7);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const token = localStorage.getItem('traffic_token');

  // Fetch all sessions
  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ['traffic-sessions', days],
    queryFn: async () => {
      const response = await axios.get(
        `${API_URL}/api/traffic-security/all-sessions?days=${days}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.sessions as Session[];
    }
  });

  // Fetch suspicious users
  const { data: suspiciousData, isLoading: loadingSuspicious } = useQuery({
    queryKey: ['traffic-suspicious'],
    queryFn: async () => {
      const response = await axios.get(
        `${API_URL}/api/traffic-security/suspicious`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.suspicious as SuspiciousUser[];
    }
  });

  // Fetch user summary
  const { data: userSummary, isLoading: loadingUser } = useQuery({
    queryKey: ['traffic-user-summary', selectedUser],
    queryFn: async () => {
      if (!selectedUser) return null;
      const response = await axios.get(
        `${API_URL}/api/traffic-security/user-summary/${selectedUser}?days=30`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.summary;
    },
    enabled: !!selectedUser
  });

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <TrafficCabinetLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-[#00FF88]" />
            <h1 className="text-3xl font-bold text-white">Безопасность</h1>
          </div>
          <p className="text-gray-400">Мониторинг входов и подозрительной активности</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#00FF88]/10">
          <TabButton
            active={activeTab === 'suspicious'}
            onClick={() => setActiveTab('suspicious')}
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Подозрительные"
            count={suspiciousData?.length || 0}
          />
          <TabButton
            active={activeTab === 'sessions'}
            onClick={() => setActiveTab('sessions')}
            icon={<Activity className="w-4 h-4" />}
            label="Все входы"
            count={sessionsData?.length || 0}
          />
          <TabButton
            active={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            icon={<Users className="w-4 h-4" />}
            label="По пользователю"
          />
        </div>

        {/* Suspicious Tab */}
        {activeTab === 'suspicious' && (
          <div className="space-y-4">
            {loadingSuspicious ? (
              <div className="text-center py-12 text-gray-400">Загрузка...</div>
            ) : suspiciousData && suspiciousData.length > 0 ? (
              <div className="space-y-3">
                {suspiciousData.map((user) => (
                  <div 
                    key={user.email}
                    className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 hover:bg-red-500/15 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                          <div>
                            <p className="font-bold text-white">{user.email}</p>
                            <p className="text-sm text-gray-400">{user.team_name}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-500">Уникальных IP</p>
                            <p className="text-lg font-bold text-red-400">{user.unique_ips}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Устройств</p>
                            <p className="text-lg font-bold text-white">{user.unique_devices}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Всего входов</p>
                            <p className="text-lg font-bold text-white">{user.total_logins}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Последний вход</p>
                            <p className="text-sm text-white">{formatDate(user.last_login)}</p>
                          </div>
                        </div>

                        <div className="mt-3 p-3 bg-black/30 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">IP адреса (последние 7 дней):</p>
                          <p className="text-xs text-[#00FF88] font-mono">{user.all_ips}</p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => setSelectedUser(user.email)}
                        variant="outline"
                        size="sm"
                        className="ml-4 border-[#00FF88]/20 text-[#00FF88] hover:bg-[#00FF88]/10"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Детали
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative overflow-hidden">
                {/* Premium Empty State */}
                <div className="text-center py-16 bg-gradient-to-br from-[#00FF88]/5 via-black/20 to-[#00FF88]/5 rounded-2xl border border-[#00FF88]/30 relative">
                  {/* Animated glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00FF88]/10 to-transparent animate-pulse" />
                  
                  <div className="relative z-10">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#00FF88]/10 flex items-center justify-center ring-4 ring-[#00FF88]/20">
                      <Shield className="w-10 h-10 text-[#00FF88]" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-3">Всё под контролем! 🛡️</h3>
                    <p className="text-gray-300 mb-2">Подозрительной активности не обнаружено</p>
                    <p className="text-sm text-gray-500">Все пользователи входят с привычных устройств и локаций</p>
                    
                    <div className="mt-8 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                      <div className="bg-black/40 rounded-xl p-4 border border-[#00FF88]/10">
                        <Globe className="w-6 h-6 text-[#00FF88] mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Стабильные IP</p>
                      </div>
                      <div className="bg-black/40 rounded-xl p-4 border border-[#00FF88]/10">
                        <Monitor className="w-6 h-6 text-[#00FF88] mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Знакомые устройства</p>
                      </div>
                      <div className="bg-black/40 rounded-xl p-4 border border-[#00FF88]/10">
                        <Activity className="w-6 h-6 text-[#00FF88] mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Нормальная активность</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 mb-4">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-4 py-2 bg-black/50 border border-[#00FF88]/20 rounded-lg text-white"
              >
                <option value={1}>Сегодня</option>
                <option value={3}>3 дня</option>
                <option value={7}>7 дней</option>
                <option value={14}>14 дней</option>
                <option value={30}>30 дней</option>
              </select>
            </div>

            {loadingSessions ? (
              <div className="text-center py-12 text-gray-400">
                <Activity className="w-8 h-8 mx-auto mb-3 animate-pulse text-[#00FF88]" />
                <p>Загрузка сессий...</p>
              </div>
            ) : sessionsData && sessionsData.length > 0 ? (
              <div className="space-y-2">
                {sessionsData?.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-lg border transition-all ${
                      session.is_suspicious
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-black/40 border-[#00FF88]/10 hover:bg-black/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(session.device_type)}
                          {session.is_suspicious && <AlertTriangle className="w-4 h-4 text-red-400" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{session.email}</p>
                          <p className="text-xs text-gray-400">{session.team_name} • {session.role}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="hidden md:block">
                          <p className="text-gray-400 text-xs">IP</p>
                          <p className="text-[#00FF88] font-mono">{session.ip_address}</p>
                        </div>
                        
                        <div className="hidden lg:block">
                          <p className="text-gray-400 text-xs">Устройство</p>
                          <p className="text-white">{session.browser_name} • {session.os_name}</p>
                        </div>
                        
                        <div>
                          <p className="text-gray-400 text-xs">Вход</p>
                          <p className="text-white">{formatDate(session.login_at)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {session.is_suspicious && session.suspicious_reason && (
                      <div className="mt-3 p-2 bg-red-500/20 rounded text-xs text-red-300">
                        ⚠️ {session.suspicious_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gradient-to-br from-black/40 to-black/20 rounded-2xl border border-[#00FF88]/20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Нет данных о входах</h3>
                <p className="text-gray-400 mb-4">За выбранный период ({days} дн.) входов не было</p>
                <Button
                  onClick={() => setDays(30)}
                  variant="outline"
                  className="border-[#00FF88]/20 text-[#00FF88] hover:bg-[#00FF88]/10"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Увеличить период до 30 дней
                </Button>
              </div>
            )}
          </div>
        )}

        {/* User Details Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="Email пользователя..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedUser(searchEmail)}
                className="flex-1 bg-black/50 border-[#00FF88]/20 text-white"
              />
              <Button
                onClick={() => setSelectedUser(searchEmail)}
                disabled={!searchEmail}
                className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4 mr-2" />
                Найти
              </Button>
            </div>

            {!selectedUser && !loadingUser && (
              <div className="text-center py-16 bg-gradient-to-br from-black/40 to-black/20 rounded-2xl border border-[#00FF88]/20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#00FF88]/10 flex items-center justify-center">
                  <Users className="w-8 h-8 text-[#00FF88]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Введите email для поиска</h3>
                <p className="text-gray-400">Вы сможете увидеть полную историю входов пользователя</p>
              </div>
            )}

            {loadingUser && (
              <div className="text-center py-12 text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-3 animate-pulse text-[#00FF88]" />
                <p>Поиск данных...</p>
              </div>
            )}
            
            {userSummary && (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-2">Всего входов</p>
                    <p className="text-2xl font-bold text-white">{userSummary.totalLogins}</p>
                  </div>
                  <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-2">Уникальных IP</p>
                    <p className="text-2xl font-bold text-[#00FF88]">{userSummary.uniqueIPs}</p>
                  </div>
                  <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-2">Устройств</p>
                    <p className="text-2xl font-bold text-white">{userSummary.uniqueDevices}</p>
                  </div>
                  <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-2">Подозрительных</p>
                    <p className={`text-2xl font-bold ${userSummary.suspiciousCount > 0 ? 'text-red-400' : 'text-[#00FF88]'}`}>
                      {userSummary.suspiciousCount}
                    </p>
                  </div>
                </div>

                {/* IP Changes */}
                {userSummary.ipChanges && userSummary.ipChanges.length > 0 && (
                  <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">История смены IP</h3>
                    <div className="space-y-2">
                      {userSummary.ipChanges.map((change: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <span className="text-white font-mono text-sm">{change.from}</span>
                            <span className="text-gray-500">→</span>
                            <span className="text-[#00FF88] font-mono text-sm">{change.to}</span>
                          </div>
                          <span className="text-xs text-gray-400">{formatDate(change.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All IPs */}
                <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Все IP адреса</h3>
                  <div className="flex flex-wrap gap-2">
                    {userSummary.allIPs?.map((ip: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-lg text-[#00FF88] font-mono text-sm">
                        {ip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </TrafficCabinetLayout>
  );
}

function TabButton({ active, onClick, icon, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-3 transition-all
        ${active 
          ? 'text-[#00FF88] border-b-2 border-[#00FF88]' 
          : 'text-gray-400 hover:text-white'
        }
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {count !== undefined && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
          active ? 'bg-[#00FF88]/20 text-[#00FF88]' : 'bg-gray-800 text-gray-400'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
