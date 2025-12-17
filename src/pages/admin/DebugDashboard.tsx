import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Database, 
  HardDrive, 
  RefreshCw, 
  Server, 
  TrendingUp,
  XCircle,
  Zap
} from 'lucide-react';
import { apiRequest } from '@/utils/apiClient';

interface HealthData {
  status: string;
  timestamp: string;
  server: {
    uptime: number;
    memory: {
      used: string;
      total: string;
    };
    nodeVersion: string;
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

interface ErrorStats {
  total: number;
  byCategory: Record<string, number>;
  byHour: Record<string, number>;
}

interface QueueStats {
  active: number;
  waiting: number;
  failed: number;
  completed: number;
}

export default function DebugDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [healthRes, errorsRes, queueRes] = await Promise.all([
        apiRequest('/api/debug/health'),
        apiRequest('/api/debug/errors/stats?hours=24'),
        apiRequest('/api/debug/queue'),
      ]);

      setHealth(healthRes);
      setErrorStats(errorsRes.stats);
      setQueueStats(queueRes.queue);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
      fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (loading && !health) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-[#00FF94] animate-spin mx-auto mb-4" />
          <p className="text-white/60 font-['JetBrains_Mono']">Loading system metrics...</p>
        </div>
      </div>
    );
  }

  const isHealthy = health?.status === 'ok' && 
                    health?.services.redis === 'connected' &&
                    health?.services.database === 'connected';

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold font-['JetBrains_Mono'] mb-2">
              🛡️ System Debug Dashboard
          </h1>
            <p className="text-white/60 font-['Manrope']">
              Real-time monitoring & crash analytics
            </p>
        </div>
          
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#00FF94]/10 hover:bg-[#00FF94]/20 
                     border border-[#00FF94]/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="font-['JetBrains_Mono'] text-sm">Refresh</span>
          </button>
      </div>

        {/* Overall Status */}
        <Card className={`p-6 border-2 ${isHealthy ? 'bg-[#00FF94]/5 border-[#00FF94]/30' : 'bg-red-500/5 border-red-500/30'}`}>
          <div className="flex items-center gap-4">
            {isHealthy ? (
              <CheckCircle className="w-8 h-8 text-[#00FF94]" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold font-['JetBrains_Mono'] mb-1">
                System Status: {isHealthy ? 'OPERATIONAL' : 'DEGRADED'}
              </h2>
              <p className="text-white/60 text-sm font-['Manrope']">
                Last updated: {lastUpdate.toLocaleTimeString('ru-RU')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold font-['JetBrains_Mono']">
                {health?.server.uptime ? formatUptime(health.server.uptime) : '-'}
            </div>
              <div className="text-xs text-white/60">Uptime</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Server Metrics */}
        <Card className="p-6 bg-[#0A0A0A] border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-6 h-6 text-[#00FF94]" />
            <h3 className="text-lg font-bold font-['JetBrains_Mono']">Server Metrics</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-white/60">Memory Usage</span>
                <span className="text-sm font-['JetBrains_Mono']">
                  {health?.server.memory.used} / {health?.server.memory.total}
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#00FF94] to-[#00D67F]"
                  style={{ 
                    width: health?.server.memory.used && health?.server.memory.total
                      ? `${(parseInt(health.server.memory.used) / parseInt(health.server.memory.total)) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <div className="text-xs text-white/40 mb-1">Environment</div>
                <div className="text-sm font-['JetBrains_Mono'] text-white/80">
                  {health?.server.env || '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">Node Version</div>
                <div className="text-sm font-['JetBrains_Mono'] text-white/80">
                  {health?.server.nodeVersion || '-'}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Services Status */}
        <Card className="p-6 bg-[#0A0A0A] border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-[#00FF94]" />
            <h3 className="text-lg font-bold font-['JetBrains_Mono']">Services</h3>
          </div>

          <div className="space-y-3">
            {[
              { name: 'PostgreSQL', status: health?.services.database },
              { name: 'Redis', status: health?.services.redis },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="font-['Manrope']">{service.name}</span>
                <div className="flex items-center gap-2">
                  {service.status === 'connected' ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse" />
                      <span className="text-sm text-[#00FF94] font-['JetBrains_Mono']">
                        Connected
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-sm text-red-500 font-['JetBrains_Mono']">
                        Offline
                      </span>
                    </>
                  )}
            </div>
            </div>
            ))}
            </div>
        </Card>

        {/* Error Analytics */}
        <Card className="p-6 bg-[#0A0A0A] border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <h3 className="text-lg font-bold font-['JetBrains_Mono']">Errors (24h)</h3>
          </div>

          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-4xl font-bold font-['JetBrains_Mono'] mb-1">
                {errorStats?.total || 0}
              </div>
              <div className="text-sm text-white/60">Total Errors</div>
            </div>

            {health?.recentErrors.last && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="text-xs text-white/40 mb-1">Last Error</div>
                <div className="text-sm text-red-400 font-['JetBrains_Mono'] truncate">
                  {health.recentErrors.last.message || 'Unknown error'}
            </div>
                <div className="text-xs text-white/40 mt-1">
                  {new Date(health.recentErrors.last.timestamp).toLocaleString('ru-RU')}
          </div>
        </div>
      )}
          </div>
        </Card>

        {/* Queue Stats */}
        <Card className="p-6 bg-[#0A0A0A] border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-[#00FF94]" />
            <h3 className="text-lg font-bold font-['JetBrains_Mono']">Job Queue</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Active', value: queueStats?.active || 0, color: 'text-blue-400' },
              { label: 'Waiting', value: queueStats?.waiting || 0, color: 'text-yellow-400' },
              { label: 'Completed', value: queueStats?.completed || 0, color: 'text-[#00FF94]' },
              { label: 'Failed', value: queueStats?.failed || 0, color: 'text-red-400' },
            ].map((stat) => (
              <div key={stat.label} className="p-3 bg-white/5 rounded-lg">
                <div className="text-xs text-white/40 mb-1">{stat.label}</div>
                <div className={`text-2xl font-bold font-['JetBrains_Mono'] ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* PM2 Auto-Restart */}
        <Card className="p-6 bg-[#0A0A0A] border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-6 h-6 text-[#00FF94]" />
            <h3 className="text-lg font-bold font-['JetBrains_Mono']">PM2 Protection</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#00FF94]/5 border border-[#00FF94]/20 rounded-lg">
              <span className="text-sm font-['Manrope']">Auto-Restart</span>
              <CheckCircle className="w-5 h-5 text-[#00FF94]" />
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold font-['JetBrains_Mono'] text-[#00FF94]">
                  0
                </div>
                <div className="text-xs text-white/60 mt-1">Restarts (24h)</div>
                  </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold font-['JetBrains_Mono']">
                  15
                </div>
                <div className="text-xs text-white/60 mt-1">Max Allowed</div>
              </div>
            </div>

            <div className="text-xs text-white/40 mt-4 p-3 bg-white/5 rounded">
              <div className="font-['JetBrains_Mono'] mb-1">Config:</div>
              <div>• Min uptime: 5s</div>
              <div>• Max memory: 500MB</div>
              <div>• Exp backoff: 100ms</div>
            </div>
          </div>
        </Card>

        {/* Sentry Monitoring */}
        <Card className="p-6 bg-[#0A0A0A] border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-bold font-['JetBrains_Mono']">Sentry</h3>
        </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
              <span className="text-sm font-['Manrope']">Error Tracking</span>
              <CheckCircle className="w-5 h-5 text-purple-400" />
            </div>

            <div className="text-xs text-white/60 space-y-1">
              <div>✓ Exception capture enabled</div>
              <div>✓ Performance monitoring</div>
              <div>✓ Source maps uploaded</div>
              <div>✓ Release tracking active</div>
            </div>

            <a
              href="https://sentry.io"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-2 px-4 bg-purple-500/10 hover:bg-purple-500/20 
                       border border-purple-500/30 rounded-lg transition-colors text-sm
                       font-['JetBrains_Mono'] text-purple-400"
            >
              Open Sentry →
            </a>
          </div>
        </Card>
        </div>

      {/* Footer */}
      <div className="max-w-[1600px] mx-auto mt-8 text-center">
        <p className="text-white/40 text-sm font-['Manrope']">
          System monitoring powered by PM2 + Sentry + Redis
        </p>
      </div>
    </div>
  );
}
