import { useState, useEffect } from 'react';
import { api } from '@/utils/apiClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, CheckCircle, XCircle, Clock, Bug, Trash, ChevronLeft, ChevronRight } from 'lucide-react';
import { trackError } from '@/lib/error-tracker';
import { useDebouncedCallback } from 'use-debounce';

interface DebugStats {
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
  error_rate: number;
  avg_response_time: number;
  errors_by_type: { [key: string]: number };
  slowest_endpoints: Array<{
    path: string;
    avg_time: number;
    count: number;
  }>;
}

interface ErrorLog {
  id: number;
  event_type: string;
  message: string;
  metadata: any;
  created_at: string;
}

export default function DebugPanel() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  const [stats, setStats] = useState<DebugStats | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [allLogs, setAllLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [filterType, setFilterType] = useState<'ALL' | 'ERROR' | 'INFO' | 'WARNING'>('ALL');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const LOGS_PER_PAGE = 20;

  // Users tab state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [userLogsLoading, setUserLogsLoading] = useState(false);

  // Debounced refresh - less aggressive than 10s
  const debouncedRefresh = useDebouncedCallback(() => {
    loadDebugData();
  }, 15000); // 15s instead of 10s

  useEffect(() => {
    loadDebugData();
    const interval = setInterval(() => debouncedRefresh(), 15000);
    return () => clearInterval(interval);
  }, [period, filterType]);

  async function loadDebugData() {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (period === '24h') {
        startDate.setHours(startDate.getHours() - 24);
      } else if (period === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      }

      const [statsData, errorsData, logsData] = await Promise.all([
        api.get(`/api/tripwire/debug/stats?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
        api.get(`/api/tripwire/debug/errors?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=50`),
        api.get(`/api/tripwire/debug/logs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=100${filterType !== 'ALL' ? `&eventType=${filterType}` : ''}`),
      ]);

      setStats(statsData);
      setErrors(errorsData.errors || []);
      setAllLogs(logsData.logs || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to load debug data:', error);
      trackError(error, { component: 'DebugPanel', action: 'loadDebugData' });
      setLoading(false);
    }
  }

  async function handleCleanup() {
    if (!confirm('Удалить все логи старше 7 дней?')) return;

    try {
      await api.post('/api/tripwire/debug/cleanup');
      alert('✅ Старые логи удалены');
      loadDebugData();
    } catch (error: any) {
      alert(`❌ Ошибка: ${error.message}`);
    }
  }

  // Users tab functions
  async function searchUsers() {
    if (searchTerm.length < 3) {
      alert('Введите минимум 3 символа для поиска');
      return;
    }
    
    try {
      const response = await api.get(`/api/tripwire/debug/search-users?q=${encodeURIComponent(searchTerm)}`);
      setSearchResults(response.users || []);
      if (response.users.length === 0) {
        alert('Пользователи не найдены');
      }
    } catch (error: any) {
      console.error('Failed to search users:', error);
      trackError(error, { component: 'DebugPanel', action: 'searchUsers' });
      alert(`Ошибка поиска: ${error.message}`);
    }
  }

  async function loadUserLogs(userId: string) {
    setUserLogsLoading(true);
    try {
      const [logsResponse, statsResponse] = await Promise.all([
        api.get(`/api/tripwire/debug/user-logs/${userId}?limit=100`),
        api.get(`/api/tripwire/debug/user-stats/${userId}`),
      ]);
      
      setSelectedUser(logsResponse.user);
      setUserLogs(logsResponse.logs || []);
      setUserStats(statsResponse);
    } catch (error: any) {
      console.error('Failed to load user logs:', error);
      trackError(error, { component: 'DebugPanel', action: 'loadUserLogs' });
      alert(`Ошибка загрузки логов: ${error.message}`);
    } finally {
      setUserLogsLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FF88] mx-auto mb-4"></div>
          <p className="text-white/70 font-['Space_Grotesk',sans-serif]">Загрузка Debug панели...</p>
        </div>
      </div>
    );
  }

  const successRate = stats ? ((stats.successful_operations / stats.total_operations) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bug size={36} className="text-[#00FF88]" />
            <h1 className="text-4xl font-bold text-white tracking-tight" 
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Debug Panel
            </h1>
          </div>
          <p className="text-white/60 text-lg">
            Полицейский следит за всеми операциями. Auto-cleanup: 7 дней.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveTab('overview')}
            size="lg"
            className={activeTab === 'overview' 
              ? 'bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }
          >
            Overview
          </Button>
          <Button
            onClick={() => setActiveTab('users')}
            size="lg"
            className={activeTab === 'users' 
              ? 'bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }
          >
            Users
          </Button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Period Selector */}
            <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            {(['24h', '7d', '30d'] as const).map((p) => (
              <Button
                key={p}
                onClick={() => setPeriod(p)}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                className={period === p 
                  ? 'bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold border-[#00FF88]'
                  : 'bg-transparent hover:bg-white/10 text-white/70 hover:text-white border-white/20'
                }
              >
                {p === '24h' ? 'Последние 24 часа' : p === '7d' ? 'Последние 7 дней' : 'Последние 30 дней'}
              </Button>
            ))}
          </div>
          
          <Button 
            onClick={handleCleanup} 
            variant="destructive" 
            size="sm"
            className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/40"
          >
            <Trash size={16} className="mr-2" />
            Очистить старые логи (7+ дней)
          </Button>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Всего операций"
            value={stats?.total_operations || 0}
            icon={<BarChart3 size={28} />}
            color="blue"
          />
          <StatCard
            label="Успешно"
            value={stats?.successful_operations || 0}
            icon={<CheckCircle size={28} />}
            color="green"
            subtitle={`${successRate}%`}
          />
          <StatCard
            label="Ошибки"
            value={stats?.failed_operations || 0}
            icon={<XCircle size={28} />}
            color="red"
            subtitle={`${stats?.error_rate.toFixed(2)}%`}
          />
          <StatCard
            label="Avg время"
            value={`${stats?.avg_response_time || 0}ms`}
            icon={<Clock size={28} />}
            color="yellow"
          />
        </div>

        {/* Errors by Type */}
        {stats && Object.keys(stats.errors_by_type).length > 0 && (
          <Card className="relative group bg-[#0A0A0A] border border-white/10 backdrop-blur-xl p-6">
            {/* Glow effect */}
            <div className="absolute -inset-0.5 bg-red-500 rounded-xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500" />
            
            <div className="relative">
              <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2" 
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <XCircle size={28} className="text-red-400" />
                Ошибки по типам
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(stats.errors_by_type)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg border border-red-500/30 hover:border-red-500/50 transition-colors">
                      <span className="font-medium text-red-300">{type}</span>
                      <Badge className="bg-red-600 text-white">{count}</Badge>
                    </div>
                  ))}
              </div>
            </div>
          </Card>
        )}

        {/* Slowest Endpoints */}
        {stats && stats.slowest_endpoints.length > 0 && (
          <Card className="relative group bg-[#0A0A0A] border border-white/10 backdrop-blur-xl p-6">
            {/* Glow effect */}
            <div className="absolute -inset-0.5 bg-yellow-500 rounded-xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500" />
            
            <div className="relative">
              <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <Clock size={28} className="text-yellow-400" />
                Самые медленные endpoints
              </h2>
              <div className="space-y-2">
                {stats.slowest_endpoints.map((endpoint, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30 hover:border-yellow-500/50 transition-colors"
                  >
                    <span className="font-mono text-sm text-yellow-200">{endpoint.path}</span>
                    <div className="flex gap-3 items-center">
                      <span className="text-sm text-white/50">{endpoint.count} req</span>
                      <Badge className="bg-yellow-600 text-white">{Math.round(endpoint.avg_time)}ms</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Recent Errors */}
        <Card className="relative group bg-[#0A0A0A] border border-white/10 backdrop-blur-xl p-6">
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-[#00FF88] rounded-xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500" />
          
          <div className="relative">
            <h2 className="text-2xl font-bold mb-4 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Последние ошибки (Top 20)
            </h2>
            {errors.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                <CheckCircle size={48} className="mx-auto mb-2 text-[#00FF88]" />
                <p>Нет ошибок за выбранный период</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {errors.slice(0, 20).map((error) => (
                  <div
                    key={error.id}
                    className="p-3 rounded-lg border-l-4 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                    style={{
                      borderLeftColor: error.event_type === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                    }}
                    onClick={() => setExpandedLog(expandedLog === error.id ? null : error.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex gap-2 items-center mb-1">
                          <Badge
                            className={`text-xs ${
                              error.event_type === 'CRITICAL'
                                ? 'bg-red-600/30 text-red-300 border border-red-600/50'
                                : 'bg-yellow-600/30 text-yellow-300 border border-yellow-600/50'
                            }`}
                          >
                            {error.event_type}
                          </Badge>
                          <span className="text-xs text-white/40">
                            {new Date(error.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white/90">{error.message}</p>
                      </div>
                    </div>
                    
                    {expandedLog === error.id && error.metadata && (
                      <pre className="mt-2 p-2 bg-black/50 rounded text-xs overflow-x-auto text-white/70 border border-white/10">
                        {JSON.stringify(error.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* All Logs */}
        <Card className="relative group bg-[#0A0A0A] border border-white/10 backdrop-blur-xl p-6">
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-[#00FF88] rounded-xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500" />
          
          <div className="relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Все логи (Last 100)
              </h2>
              
              <div className="flex gap-2">
                {(['ALL', 'ERROR', 'WARNING', 'INFO'] as const).map((type) => (
                  <Button
                    key={type}
                    onClick={() => setFilterType(type)}
                    variant={filterType === type ? 'default' : 'outline'}
                    size="sm"
                    className={filterType === type 
                      ? 'bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold'
                      : 'bg-transparent hover:bg-white/10 text-white/70 hover:text-white border-white/20'
                    }
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            {allLogs.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                <p>Нет логов за выбранный период</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {allLogs.slice((currentPage - 1) * LOGS_PER_PAGE, currentPage * LOGS_PER_PAGE).map((log) => (
                    <div
                      key={log.id}
                      className="flex gap-4 items-start p-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm border-l-4 transition-colors"
                      style={{
                        borderLeftColor:
                          log.event_type === 'ERROR' || log.event_type === 'CRITICAL'
                            ? '#ef4444'
                            : log.event_type === 'WARNING'
                            ? '#f59e0b'
                            : log.event_type === 'SWITCH'
                            ? '#3b82f6'
                            : '#00FF88',
                      }}
                    >
                      <span className="text-white/40 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('ru-RU')}
                      </span>
                      <Badge
                        className={`text-xs ${
                          log.event_type === 'ERROR' || log.event_type === 'CRITICAL'
                            ? 'bg-red-600/30 text-red-300 border border-red-600/50'
                            : log.event_type === 'WARNING'
                            ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-600/50'
                            : log.event_type === 'SWITCH'
                            ? 'bg-blue-600/30 text-blue-300 border border-blue-600/50'
                            : 'bg-[#00FF88]/30 text-[#00FF88] border border-[#00FF88]/50'
                        }`}
                      >
                        {log.event_type}
                      </Badge>
                      <span className="flex-1 text-white/90">{log.message}</span>
                      {log.metadata && (
                        <details className="text-xs text-white/50 cursor-pointer">
                          <summary>Подробнее</summary>
                          <pre className="mt-2 p-2 bg-black/50 rounded text-xs overflow-x-auto border border-white/10">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {allLogs.length > LOGS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                    <div className="text-sm text-white/50">
                      Показано {((currentPage - 1) * LOGS_PER_PAGE) + 1}-{Math.min(currentPage * LOGS_PER_PAGE, allLogs.length)} из {allLogs.length}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        size="sm"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 disabled:opacity-30"
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <span className="px-3 py-1 text-sm text-white/70">
                        {currentPage} / {Math.ceil(allLogs.length / LOGS_PER_PAGE)}
                      </span>
                      <Button
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(allLogs.length / LOGS_PER_PAGE), p + 1))}
                        disabled={currentPage >= Math.ceil(allLogs.length / LOGS_PER_PAGE)}
                        size="sm"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 disabled:opacity-30"
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
          </>
        )}

        {/* Users Tab Content */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search Section */}
            <Card className="relative group bg-[#0A0A0A] border border-white/10 backdrop-blur-xl p-6">
              <div className="absolute -inset-0.5 bg-[#00FF88] rounded-xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500" />
              
              <div className="relative">
                <h2 className="text-2xl font-bold mb-4 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Search User
                </h2>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Email or phone (min 3 chars)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded text-white placeholder:text-white/40 focus:outline-none focus:border-[#00FF88]"
                  />
                  <Button onClick={searchUsers} className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold">
                    Search
                  </Button>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.user_id}
                        onClick={() => loadUserLogs(user.user_id)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded cursor-pointer border border-white/10 transition-colors"
                      >
                        <div className="font-bold text-white">{user.full_name}</div>
                        <div className="text-sm text-white/60">{user.email}</div>
                        {user.phone && <div className="text-sm text-white/60">{user.phone}</div>}
                        <div className="text-xs text-white/40 mt-1">
                          Created: {new Date(user.created_at).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
            
            {/* User Stats & Logs */}
            {userLogsLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FF88] mx-auto"></div>
                <p className="text-white/60 mt-4">Loading user data...</p>
              </div>
            )}

            {!userLogsLoading && selectedUser && (
              <>
                <Card className="relative group bg-[#0A0A0A] border border-white/10 backdrop-blur-xl p-6">
                  <div className="absolute -inset-0.5 bg-[#00FF88] rounded-xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500" />
                  
                  <div className="relative">
                    <h2 className="text-2xl font-bold mb-4 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {selectedUser.full_name} - Statistics
                    </h2>
                    
                    {userStats && (
                      <div className="grid grid-cols-4 gap-4">
                        <div className="p-4 bg-blue-500/10 rounded border border-blue-500/30">
                          <div className="text-sm text-blue-300">Total Events</div>
                          <div className="text-3xl font-bold text-blue-300">{userStats.totalEvents}</div>
                        </div>
                        <div className="p-4 bg-red-500/10 rounded border border-red-500/30">
                          <div className="text-sm text-red-300">Errors</div>
                          <div className="text-3xl font-bold text-red-300">{userStats.errorCount}</div>
                        </div>
                        <div className="p-4 bg-red-600/10 rounded border border-red-600/30">
                          <div className="text-sm text-red-400">Critical</div>
                          <div className="text-3xl font-bold text-red-400">{userStats.criticalCount}</div>
                        </div>
                        <div className="p-4 bg-yellow-500/10 rounded border border-yellow-500/30">
                          <div className="text-sm text-yellow-300">Error Rate</div>
                          <div className="text-3xl font-bold text-yellow-300">{userStats.errorRate}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
                
                <Card className="relative group bg-[#0A0A0A] border border-white/10 backdrop-blur-xl p-6">
                  <div className="absolute -inset-0.5 bg-[#00FF88] rounded-xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500" />
                  
                  <div className="relative">
                    <h2 className="text-2xl font-bold mb-4 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Activity Logs ({userLogs.length})
                    </h2>
                    
                    {userLogs.length === 0 ? (
                      <div className="text-center py-8 text-white/50">
                        <p>No activity logs for this user</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {userLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded border-l-4 transition-colors"
                            style={{
                              borderLeftColor: 
                                log.severity === 'critical' ? '#dc2626' :
                                log.severity === 'error' ? '#ef4444' :
                                log.severity === 'warning' ? '#f59e0b' :
                                '#00FF88'
                            }}
                          >
                            <div className="flex gap-3 items-start">
                              <Badge className={
                                log.event_category === 'error' 
                                  ? 'bg-red-600/30 text-red-300 border border-red-600/50'
                                  : log.event_category === 'auth'
                                  ? 'bg-blue-600/30 text-blue-300 border border-blue-600/50'
                                  : log.event_category === 'content'
                                  ? 'bg-purple-600/30 text-purple-300 border border-purple-600/50'
                                  : 'bg-[#00FF88]/30 text-[#00FF88] border border-[#00FF88]/50'
                              }>
                                {log.event_type}
                              </Badge>
                              
                              <div className="flex-1">
                                <div className="text-white font-medium">{log.message}</div>
                                <div className="text-xs text-white/40 mt-1">
                                  {new Date(log.created_at).toLocaleString('ru-RU')}
                                </div>
                              </div>
                              
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <details className="text-xs text-white/50 cursor-pointer">
                                  <summary className="hover:text-white/70">Details</summary>
                                  <pre className="mt-2 p-2 bg-black/50 rounded text-xs overflow-x-auto border border-white/10 max-w-md">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'yellow';
  subtitle?: string;
}

function StatCard({ label, value, icon, color, subtitle }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    green: 'bg-[#00FF88]/10 border-[#00FF88]/30 text-[#00FF88]',
    red: 'bg-red-500/10 border-red-500/30 text-red-300',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
  };

  return (
    <Card className={`relative group p-4 border-2 backdrop-blur-xl ${colorClasses[color]}`}
          style={{ background: 'rgba(10, 10, 10, 0.6)' }}>
      {/* Glow effect */}
      <div className={`absolute -inset-0.5 ${color === 'green' ? 'bg-[#00FF88]' : `bg-${color}-500`} rounded-xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500`} />
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{icon}</span>
          <div className="text-sm font-medium">{label}</div>
        </div>
        <div className="text-3xl font-bold">{value}</div>
        {subtitle && <div className="text-sm mt-1">{subtitle}</div>}
      </div>
    </Card>
  );
}
