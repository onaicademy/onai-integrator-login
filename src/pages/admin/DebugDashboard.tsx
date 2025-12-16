/**
 * Debug Dashboard
 * Мониторинг ошибок и состояния системы
 */
import { useState, useEffect } from 'react';
import { api } from '@/utils/apiClient';
import { Activity, AlertCircle, CheckCircle, XCircle, TrendingUp, Database, Server, Clock } from 'lucide-react';

interface HealthStatus {
  status: string;
  timestamp: string;
  server: {
    uptime: number;
    isShuttingDown: boolean;
    activeRequests: number;
    memory: {
      used: string;
      total: string;
    };
    nodeVersion: string;
    platform: string;
    env: string;
  };
  services: {
    redis: string;
    database: string;
  };
  recentErrors: {
    count: number;
    last: any;
  };
}

interface ErrorLog {
  id: string;
  severity: string;
  category: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  context?: any;
}

export default function DebugDashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchData = async () => {
    try {
      const [healthRes, errorsRes, statsRes] = await Promise.all([
        api.get('/api/debug/health'),
        api.get('/api/debug/errors?limit=20'),
        api.get('/api/debug/errors/stats?hours=24'),
      ]);

      setHealth(healthRes.data);
      setErrors(errorsRes.data.errors || []);
      setStats(statsRes.data.stats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching debug data:', error);
      setLoading(false);
    }
  };

  const resolveError = async (errorId: string) => {
    try {
      await api.post(`/api/debug/errors/${errorId}/resolve`);
      fetchData();
    } catch (error) {
      console.error('Error resolving error:', error);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500 bg-red-500/10';
      case 'high':
        return 'text-orange-500 bg-orange-500/10';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'low':
        return 'text-green-500 bg-green-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F0F0F]">
        <div className="text-white text-xl">Loading debug dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-[#00FF94]" />
          <h1 className="text-3xl font-bold text-white font-['JetBrains_Mono']">
            Debug Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-white/60 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            Auto-refresh (5s)
          </label>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* System Status Cards */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Server Status */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Server className="w-6 h-6 text-[#00FF94]" />
              {health.server.isShuttingDown ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
            </div>
            <h3 className="text-white/60 text-sm mb-2">Server</h3>
            <div className="text-white text-2xl font-bold mb-1">
              {health.status.toUpperCase()}
            </div>
            <div className="text-white/40 text-xs">
              Uptime: {formatUptime(health.server.uptime)}
            </div>
          </div>

          {/* Redis Status */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Database className="w-6 h-6 text-[#00D9FF]" />
              {health.services.redis === 'connected' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <h3 className="text-white/60 text-sm mb-2">Redis</h3>
            <div className="text-white text-2xl font-bold mb-1">
              {health.services.redis.toUpperCase()}
            </div>
            <div className="text-white/40 text-xs">Queue System</div>
          </div>

          {/* Memory Usage */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="text-white/60 text-sm mb-2">Memory</h3>
            <div className="text-white text-2xl font-bold mb-1">
              {health.server.memory.used}
            </div>
            <div className="text-white/40 text-xs">
              / {health.server.memory.total}
            </div>
          </div>

          {/* Recent Errors */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-white/60 text-sm mb-2">Recent Errors</h3>
            <div className="text-white text-2xl font-bold mb-1">
              {health.recentErrors.count}
            </div>
            <div className="text-white/40 text-xs">Last 10 errors</div>
          </div>
        </div>
      )}

      {/* Error Statistics */}
      {stats && (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 font-['JetBrains_Mono']">
            📊 Error Statistics (24h)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-white/60 text-sm mb-1">Total</div>
              <div className="text-white text-3xl font-bold">{stats.total || 0}</div>
            </div>
            {stats.by_severity &&
              Object.entries(stats.by_severity).map(([severity, count]) => (
                <div key={severity} className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-white/60 text-sm mb-1 capitalize">{severity}</div>
                  <div className={`text-3xl font-bold ${getSeverityColor(severity)}`}>
                    {count as number}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Error Logs Table */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 font-['JetBrains_Mono']">
          🐛 Recent Errors
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-3 text-white/60 font-normal">Time</th>
                <th className="pb-3 text-white/60 font-normal">Severity</th>
                <th className="pb-3 text-white/60 font-normal">Category</th>
                <th className="pb-3 text-white/60 font-normal">Message</th>
                <th className="pb-3 text-white/60 font-normal">Status</th>
                <th className="pb-3 text-white/60 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((error) => (
                <tr key={error.id} className="border-b border-white/5">
                  <td className="py-3 text-white/80 text-sm">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(
                        error.severity
                      )}`}
                    >
                      {error.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 text-white/80 text-sm">{error.category}</td>
                  <td className="py-3 text-white/80 text-sm max-w-md truncate">
                    {error.message}
                  </td>
                  <td className="py-3">
                    {error.resolved ? (
                      <span className="text-green-500 text-sm">✓ Resolved</span>
                    ) : (
                      <span className="text-orange-500 text-sm">⚠ Active</span>
                    )}
                  </td>
                  <td className="py-3">
                    {!error.resolved && (
                      <button
                        onClick={() => resolveError(error.id)}
                        className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded text-xs transition-colors"
                      >
                        Resolve
                      </button>
                    )}
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

