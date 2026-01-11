import { useState, useEffect } from 'react';
import { api } from '@/utils/apiClient';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { trackError } from '@/lib/error-tracker';

interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface HealthLog {
  id: number;
  event_type: 'INFO' | 'WARNING' | 'ERROR' | 'SWITCH';
  message: string;
  metadata?: any;
  created_at: string;
}

export default function MainPlatformSystemHealth() {
  const [mode, setMode] = useState<'async_queue' | 'sync_direct'>('async_queue');
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  async function loadHealth() {
    try {
      const [modeData, metricsData, logsData] = await Promise.all([
        api.get('/api/admin/system/mode'),
        api.get('/api/admin/system/metrics'),
        api.get('/api/admin/system/logs?limit=50'),
      ]);

      setMode(modeData.mode);
      setMetrics(metricsData);
      setLogs(logsData.logs || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to load system health:', error);
      trackError(error, { component: 'MainPlatformSystemHealth', action: 'loadHealth' });
      setLoading(false);
    }
  }

  async function toggleMode() {
    const newMode = mode === 'async_queue' ? 'sync_direct' : 'async_queue';

    const confirmation = confirm(
      `🔄 Вы уверены что хотите переключить систему в ${
        newMode === 'async_queue' ? 'ASYNC режим (очередь)' : 'SYNC режим (прямой)'
      }?\n\n${
        newMode === 'async_queue'
          ? '✅ Создание пользователей будет асинхронным через очередь Redis (быстрее, устойчивее)'
          : '⚠️ Создание пользователей будет синхронным (медленнее, но без зависимости от Redis)'
      }`
    );

    if (confirmation) {
      setSwitching(true);
      try {
        await api.post('/api/admin/system/mode', { mode: newMode });
        setMode(newMode);
        await loadHealth(); // Refresh logs
      } catch (error: any) {
        alert(`❌ Ошибка переключения режима: ${error.message}`);
      } finally {
        setSwitching(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FF88] mx-auto mb-4"></div>
          <p className="text-white/70 font-['Space_Grotesk',sans-serif]">Загрузка данных о системе...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity size={36} className="text-[#00FF88]" />
            <h1 className="text-3xl font-['Space_Grotesk',sans-serif] font-bold">System Health Monitor</h1>
          </div>
          <p className="text-white/60">Мониторинг и управление режимом создания пользователей</p>
        </div>

        {/* Mode Switch Card */}
        <Card className="bg-[#0A0A0A] border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-['Space_Grotesk',sans-serif] font-semibold mb-2">Режим создания пользователей</h2>
              <p className="text-white/60 text-sm">
                {mode === 'async_queue'
                  ? '✅ ASYNC режим активен: создание через очередь Redis (рекомендуется)'
                  : '⚠️ SYNC режим активен: прямое создание (медленнее, без Redis)'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={mode === 'async_queue' ? 'default' : 'secondary'} className="text-sm">
                {mode === 'async_queue' ? 'ASYNC QUEUE' : 'SYNC DIRECT'}
              </Badge>
              <Switch
                checked={mode === 'async_queue'}
                onCheckedChange={toggleMode}
                disabled={switching}
              />
            </div>
          </div>
        </Card>

        {/* Queue Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-[#0A0A0A] border-white/10 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="text-yellow-400" size={24} />
                <h3 className="text-lg font-['Space_Grotesk',sans-serif]">Waiting</h3>
              </div>
              <p className="text-3xl font-bold">{metrics.waiting}</p>
            </Card>

            <Card className="bg-[#0A0A0A] border-white/10 p-6">
              <div className="flex items-center gap-3 mb-2">
                <RefreshCw className="text-blue-400" size={24} />
                <h3 className="text-lg font-['Space_Grotesk',sans-serif]">Active</h3>
              </div>
              <p className="text-3xl font-bold">{metrics.active}</p>
            </Card>

            <Card className="bg-[#0A0A0A] border-white/10 p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="text-[#00FF88]" size={24} />
                <h3 className="text-lg font-['Space_Grotesk',sans-serif]">Completed</h3>
              </div>
              <p className="text-3xl font-bold">{metrics.completed}</p>
            </Card>

            <Card className="bg-[#0A0A0A] border-white/10 p-6">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="text-red-400" size={24} />
                <h3 className="text-lg font-['Space_Grotesk',sans-serif]">Failed</h3>
              </div>
              <p className="text-3xl font-bold">{metrics.failed}</p>
            </Card>
          </div>
        )}

        {/* System Logs */}
        <Card className="bg-[#0A0A0A] border-white/10 p-6">
          <h2 className="text-xl font-['Space_Grotesk',sans-serif] font-semibold mb-4">System Logs</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-white/40 text-center py-8">Нет логов</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded border ${
                    log.event_type === 'ERROR'
                      ? 'bg-red-500/10 border-red-500/20'
                      : log.event_type === 'WARNING'
                      ? 'bg-yellow-500/10 border-yellow-500/20'
                      : log.event_type === 'SWITCH'
                      ? 'bg-blue-500/10 border-blue-500/20'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {log.event_type === 'ERROR' && <XCircle size={18} className="text-red-400" />}
                      {log.event_type === 'WARNING' && <Activity size={18} className="text-yellow-400" />}
                      {log.event_type === 'SWITCH' && <RefreshCw size={18} className="text-blue-400" />}
                      {log.event_type === 'INFO' && <CheckCircle size={18} className="text-[#00FF88]" />}
                      <p className="text-sm">{log.message}</p>
                    </div>
                    <p className="text-xs text-white/40">
                      {new Date(log.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  {log.metadata && (
                    <pre className="text-xs text-white/60 mt-2 overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
